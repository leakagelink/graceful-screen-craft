CREATE TABLE public.manual_payment_methods (
  key text PRIMARY KEY CHECK (key IN ('upi', 'qr', 'bank')),
  label text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  is_demo boolean NOT NULL DEFAULT true,
  payee_name text,
  upi_id text,
  qr_image_url text,
  bank_name text,
  account_holder text,
  account_number text,
  ifsc text,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.manual_payment_methods TO authenticated;
GRANT ALL ON public.manual_payment_methods TO service_role;
ALTER TABLE public.manual_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enabled methods or admin read"
ON public.manual_payment_methods FOR SELECT TO authenticated
USING (enabled = true OR public.has_role(auth.uid(), 'admin'));

INSERT INTO public.manual_payment_methods
  (key, label, enabled, is_demo, payee_name, upi_id, bank_name, account_holder, account_number, ifsc)
VALUES
  ('upi', 'UPI', true, true, 'Vahakam Demo', 'vahakam.demo@upi', NULL, NULL, NULL, NULL),
  ('qr', 'QR Code', true, true, 'Vahakam Demo', 'vahakam.demo@upi', NULL, NULL, NULL, NULL),
  ('bank', 'Bank Transfer', true, true, NULL, NULL, 'Demo Bank of India', 'Vahakam Demo', '000000000000', 'DEMO0000000');

CREATE TABLE public.manual_payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  shipper_id uuid NOT NULL REFERENCES public.profiles(id),
  method_key text NOT NULL REFERENCES public.manual_payment_methods(key),
  amount numeric NOT NULL CHECK (amount > 0),
  transaction_reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.manual_payment_requests TO authenticated;
GRANT ALL ON public.manual_payment_requests TO service_role;
ALTER TABLE public.manual_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shipper own or admin read payment requests"
ON public.manual_payment_requests FOR SELECT TO authenticated
USING (shipper_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX manual_payment_one_active_per_booking
ON public.manual_payment_requests (booking_id)
WHERE status IN ('pending', 'approved');

CREATE UNIQUE INDEX manual_payment_one_active_reference
ON public.manual_payment_requests (method_key, transaction_reference)
WHERE status IN ('pending', 'approved');

CREATE OR REPLACE FUNCTION public.submit_manual_payment(
  _booking_id uuid,
  _method_key text,
  _reference text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%rowtype;
  v_request public.manual_payment_requests%rowtype;
  v_reference text := upper(trim(_reference));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in to submit payment.';
  END IF;
  IF v_reference !~ '^[A-Z0-9][A-Z0-9_-]{5,63}$' THEN
    RAISE EXCEPTION 'Enter a valid transaction ID or UTR (6-64 letters, numbers, hyphens or underscores).';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = _booking_id FOR UPDATE;
  IF NOT FOUND OR v_booking.shipper_id <> auth.uid() THEN
    RAISE EXCEPTION 'Booking not found or access denied.';
  END IF;
  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'Payment cannot be submitted for a cancelled booking.';
  END IF;
  IF v_booking.payment_status = 'PAID' THEN
    RAISE EXCEPTION 'This booking is already marked as paid.';
  END IF;
  IF coalesce(v_booking.agreed_fare, v_booking.total_fare) <= 0 THEN
    RAISE EXCEPTION 'This booking has no payable fare.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.manual_payment_methods WHERE key = _method_key AND enabled = true
  ) THEN
    RAISE EXCEPTION 'This payment method is not available.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.manual_payment_requests
    WHERE booking_id = _booking_id AND status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'A payment request is already pending or approved for this booking.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.manual_payment_requests
    WHERE method_key = _method_key AND transaction_reference = v_reference AND status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'This transaction reference is already under review or approved.';
  END IF;

  INSERT INTO public.manual_payment_requests
    (booking_id, shipper_id, method_key, amount, transaction_reference)
  VALUES
    (_booking_id, auth.uid(), _method_key, coalesce(v_booking.agreed_fare, v_booking.total_fare), v_reference)
  RETURNING * INTO v_request;

  UPDATE public.bookings
  SET payment_status = 'MANUAL_PAYMENT',
      payment_method = 'manual',
      payment_id = v_reference,
      payment_verified_by = NULL,
      payment_verified_at = NULL
  WHERE id = _booking_id;

  RETURN jsonb_build_object('ok', true, 'id', v_request.id, 'status', v_request.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.review_manual_payment(
  _request_id uuid,
  _status text,
  _note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request public.manual_payment_requests%rowtype;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can review payment requests.';
  END IF;
  IF _status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid review status.';
  END IF;

  SELECT * INTO v_request FROM public.manual_payment_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment request not found.';
  END IF;
  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'This payment request has already been reviewed.';
  END IF;

  UPDATE public.manual_payment_requests
  SET status = _status,
      admin_note = nullif(trim(_note), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = _request_id;

  UPDATE public.bookings
  SET payment_status = CASE WHEN _status = 'approved' THEN 'PAID' ELSE 'FAILED' END,
      payment_method = 'manual',
      payment_id = v_request.transaction_reference,
      payment_verified_by = CASE WHEN _status = 'approved' THEN auth.uid() ELSE NULL END,
      payment_verified_at = CASE WHEN _status = 'approved' THEN now() ELSE NULL END
  WHERE id = v_request.booking_id;

  INSERT INTO public.notifications (user_id, title, body)
  VALUES (
    v_request.shipper_id,
    CASE WHEN _status = 'approved' THEN 'Payment confirmed' ELSE 'Payment needs attention' END,
    CASE WHEN _status = 'approved'
      THEN 'Your manual payment of ₹' || v_request.amount || ' has been confirmed.'
      ELSE 'Your payment request was rejected. Please check the reference and submit again.'
    END
  );

  RETURN jsonb_build_object('ok', true, 'status', _status, 'booking_id', v_request.booking_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_manual_payment_method(
  _method_key text,
  _payee_name text DEFAULT NULL,
  _upi_id text DEFAULT NULL,
  _qr_image_url text DEFAULT NULL,
  _bank_name text DEFAULT NULL,
  _account_holder text DEFAULT NULL,
  _account_number text DEFAULT NULL,
  _ifsc text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_upi text := nullif(trim(_upi_id), '');
  v_qr text := nullif(trim(_qr_image_url), '');
  v_account text := nullif(trim(_account_number), '');
  v_ifsc text := upper(nullif(trim(_ifsc), ''));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can update payment methods.';
  END IF;
  IF _method_key NOT IN ('upi', 'qr', 'bank') THEN
    RAISE EXCEPTION 'Invalid payment method.';
  END IF;
  IF _method_key = 'upi' AND v_upi IS NULL THEN
    RAISE EXCEPTION 'UPI ID is required.';
  END IF;
  IF _method_key = 'qr' AND v_upi IS NULL AND v_qr IS NULL THEN
    RAISE EXCEPTION 'Add a UPI ID or QR image.';
  END IF;
  IF v_upi IS NOT NULL AND v_upi !~ '^[A-Za-z0-9._-]{2,}@[A-Za-z0-9._-]{2,}$' THEN
    RAISE EXCEPTION 'Enter a valid UPI ID.';
  END IF;
  IF v_qr IS NOT NULL AND (length(v_qr) > 2000000 OR v_qr !~ '^(https://|data:image/(png|jpeg|webp);base64,)') THEN
    RAISE EXCEPTION 'QR image must be an HTTPS URL or a PNG, JPEG or WebP upload under 2 MB.';
  END IF;
  IF _method_key = 'bank' AND (
    nullif(trim(_bank_name), '') IS NULL OR
    nullif(trim(_account_holder), '') IS NULL OR
    v_account IS NULL OR v_ifsc IS NULL
  ) THEN
    RAISE EXCEPTION 'Bank name, account holder, account number and IFSC are required.';
  END IF;
  IF v_account IS NOT NULL AND v_account !~ '^[0-9]{6,34}$' THEN
    RAISE EXCEPTION 'Account number must contain 6-34 digits.';
  END IF;
  IF v_ifsc IS NOT NULL AND v_ifsc !~ '^[A-Z]{4}0[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'Enter a valid IFSC code.';
  END IF;

  UPDATE public.manual_payment_methods
  SET payee_name = nullif(trim(_payee_name), ''),
      upi_id = v_upi,
      qr_image_url = v_qr,
      bank_name = nullif(trim(_bank_name), ''),
      account_holder = nullif(trim(_account_holder), ''),
      account_number = v_account,
      ifsc = v_ifsc,
      is_demo = false,
      updated_by = auth.uid(),
      updated_at = now()
  WHERE key = _method_key;

  RETURN jsonb_build_object('ok', true, 'key', _method_key, 'is_demo', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_manual_payment_method_enabled(
  _method_key text,
  _enabled boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change payment method availability.';
  END IF;
  UPDATE public.manual_payment_methods
  SET enabled = _enabled, updated_by = auth.uid(), updated_at = now()
  WHERE key = _method_key;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment method not found.';
  END IF;
  RETURN jsonb_build_object('ok', true, 'key', _method_key, 'enabled', _enabled);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_manual_payment(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_manual_payment(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_update_manual_payment_method(text, text, text, text, text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_manual_payment_method_enabled(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_manual_payment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_manual_payment(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_manual_payment_method(text, text, text, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_manual_payment_method_enabled(text, boolean) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_payment_methods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_payment_requests;