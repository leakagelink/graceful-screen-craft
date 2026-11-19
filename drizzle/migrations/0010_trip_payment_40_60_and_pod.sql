CREATE TABLE public.trip_payments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
 stage text NOT NULL CHECK(stage IN('pickup_40','delivery_60')),
 amount numeric NOT NULL CHECK(amount>0),
 method text NOT NULL CHECK(method IN('cash','online')),
 transaction_reference text,
 status text NOT NULL DEFAULT 'pending_confirmation' CHECK(status IN('pending_confirmation','confirmed')),
 reported_by uuid NOT NULL REFERENCES public.profiles(id),
 confirmed_by uuid REFERENCES public.profiles(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 confirmed_at timestamptz,
 UNIQUE(booking_id,stage)
);
GRANT SELECT ON public.trip_payments TO authenticated;
GRANT ALL ON public.trip_payments TO service_role;
ALTER TABLE public.trip_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY trip_payments_read ON public.trip_payments FOR SELECT TO authenticated USING(
 EXISTS(SELECT 1 FROM public.bookings b WHERE b.id=booking_id AND auth.uid() IN(b.shipper_id,b.driver_id))
 OR public.has_role(auth.uid(),'admin')
);

CREATE TABLE public.delivery_proofs(
 booking_id uuid PRIMARY KEY REFERENCES public.bookings(id) ON DELETE CASCADE,
 driver_id uuid NOT NULL REFERENCES public.profiles(id),
 file_path text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_proofs TO authenticated;
GRANT ALL ON public.delivery_proofs TO service_role;
ALTER TABLE public.delivery_proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_proofs_read ON public.delivery_proofs FOR SELECT TO authenticated USING(
 auth.uid()=driver_id
 OR EXISTS(SELECT 1 FROM public.bookings b WHERE b.id=booking_id AND b.shipper_id=auth.uid())
 OR public.has_role(auth.uid(),'admin')
);

CREATE POLICY delivery_proof_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(
 bucket_id='delivery-proofs'
 AND EXISTS(
  SELECT 1 FROM public.bookings b
  WHERE b.id::text=(storage.foldername(name))[1]
  AND b.driver_id=auth.uid()
  AND b.status IN('in_progress','otp_sent')
 )
);
CREATE POLICY delivery_proof_read ON storage.objects FOR SELECT TO authenticated USING(
 bucket_id='delivery-proofs'
 AND EXISTS(
  SELECT 1 FROM public.bookings b
  WHERE b.id::text=(storage.foldername(name))[1]
  AND (auth.uid() IN(b.shipper_id,b.driver_id) OR public.has_role(auth.uid(),'admin'))
 )
);

CREATE FUNCTION public.register_delivery_proof(_booking_id uuid,_file_path text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO b FROM public.bookings WHERE id=_booking_id;
 IF b.id IS NULL OR actor IS DISTINCT FROM b.driver_id OR b.status NOT IN('in_progress','otp_sent') THEN RAISE EXCEPTION 'POD upload is not available for this trip'; END IF;
 IF _file_path IS NULL OR NOT _file_path LIKE b.id::text||'/%' OR position('..' in _file_path)>0 THEN RAISE EXCEPTION 'Invalid POD file path'; END IF;
 INSERT INTO public.delivery_proofs(booking_id,driver_id,file_path) VALUES(b.id,actor,_file_path)
 ON CONFLICT(booking_id) DO UPDATE SET file_path=EXCLUDED.file_path,created_at=now();
 RETURN jsonb_build_object('ok',true,'file_path',_file_path);
END; $$;
REVOKE ALL ON FUNCTION public.register_delivery_proof(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_delivery_proof(uuid,text) TO authenticated;

CREATE FUNCTION public.report_trip_payment(_booking_id uuid,_stage text,_method text,_reference text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; actor uuid:=auth.uid(); fare numeric; due numeric; ref text:=nullif(trim(coalesce(_reference,'')),''); existing_id uuid;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
 IF b.id IS NULL OR actor IS DISTINCT FROM b.shipper_id OR b.driver_id IS NULL THEN RAISE EXCEPTION 'Only the shipper can report this payment'; END IF;
 IF _method NOT IN('cash','online') THEN RAISE EXCEPTION 'Choose cash or online payment'; END IF;
 IF _method='online' AND (ref IS NULL OR length(ref)<6 OR length(ref)>64 OR ref !~ '^[A-Za-z0-9_-]+$') THEN RAISE EXCEPTION 'Enter a valid online transaction ID or UTR'; END IF;
 fare:=coalesce(b.agreed_fare,b.total_fare);
 IF _stage='pickup_40' THEN
  IF b.status<>'assigned' THEN RAISE EXCEPTION 'Pickup payment can only be reported before the trip starts'; END IF;
  due:=round(fare*0.40);
 ELSIF _stage='delivery_60' THEN
  IF b.status<>'completed' OR NOT EXISTS(SELECT 1 FROM public.delivery_codes d WHERE d.booking_id=b.id AND d.verified_at IS NOT NULL) OR NOT EXISTS(SELECT 1 FROM public.delivery_proofs p WHERE p.booking_id=b.id) THEN RAISE EXCEPTION 'POD and verified delivery OTP are required before the final 60%% payment'; END IF;
  due:=fare-round(fare*0.40);
 ELSE RAISE EXCEPTION 'Invalid payment stage'; END IF;
 SELECT id INTO existing_id FROM public.trip_payments WHERE booking_id=b.id AND stage=_stage;
 IF existing_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.trip_payments WHERE id=existing_id AND status='confirmed') THEN RAISE EXCEPTION 'This payment is already confirmed'; END IF;
 INSERT INTO public.trip_payments(booking_id,stage,amount,method,transaction_reference,reported_by)
 VALUES(b.id,_stage,due,_method,CASE WHEN _method='online' THEN ref ELSE NULL END,actor)
 ON CONFLICT(booking_id,stage) DO UPDATE SET amount=EXCLUDED.amount,method=EXCLUDED.method,transaction_reference=EXCLUDED.transaction_reference,reported_by=EXCLUDED.reported_by,created_at=now();
 UPDATE public.bookings SET payment_status='PENDING',payment_method=_method WHERE id=b.id AND payment_status<>'PAID';
 INSERT INTO public.notifications(user_id,title,body) VALUES(b.driver_id,CASE WHEN _stage='pickup_40' THEN '40% pickup payment reported' ELSE '60% delivery payment reported' END,'Please check the payment and confirm only after you receive it.');
 RETURN jsonb_build_object('ok',true,'amount',due,'stage',_stage);
END; $$;
REVOKE ALL ON FUNCTION public.report_trip_payment(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.report_trip_payment(uuid,text,text,text) TO authenticated;

CREATE FUNCTION public.confirm_trip_payment(_payment_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p public.trip_payments; b public.bookings; actor uuid:=auth.uid();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO p FROM public.trip_payments WHERE id=_payment_id FOR UPDATE;
 IF p.id IS NULL THEN RAISE EXCEPTION 'Payment record not found'; END IF;
 SELECT * INTO b FROM public.bookings WHERE id=p.booking_id FOR UPDATE;
 IF actor IS DISTINCT FROM b.driver_id THEN RAISE EXCEPTION 'Only the assigned driver can confirm this payment'; END IF;
 IF p.status='confirmed' THEN RETURN jsonb_build_object('ok',true); END IF;
 UPDATE public.trip_payments SET status='confirmed',confirmed_by=actor,confirmed_at=now() WHERE id=p.id;
 IF p.stage='pickup_40' THEN
  UPDATE public.bookings SET payment_status='PARTIALLY_PAID',payment_method=p.method,payment_verified_by=actor,payment_verified_at=now(),payout_1_status='paid',payout_1_id=p.id::text WHERE id=b.id;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.delivery_codes d WHERE d.booking_id=b.id AND d.verified_at IS NOT NULL) OR NOT EXISTS(SELECT 1 FROM public.delivery_proofs pr WHERE pr.booking_id=b.id) THEN RAISE EXCEPTION 'Delivery proof is missing'; END IF;
  UPDATE public.bookings SET payment_status='PAID',payment_method=p.method,payment_verified_by=actor,payment_verified_at=now(),payout_2_status='paid',payout_2_id=p.id::text WHERE id=b.id;
 END IF;
 INSERT INTO public.notifications(user_id,title,body) VALUES(b.shipper_id,CASE WHEN p.stage='pickup_40' THEN '40% payment confirmed' ELSE '60% payment confirmed' END,'The driver confirmed receiving your payment.');
 RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.confirm_trip_payment(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_trip_payment(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.trip_action(_booking_id uuid,_action text,_offer_id uuid DEFAULT NULL,_amount numeric DEFAULT NULL,_otp text DEFAULT NULL,_reason text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; o public.offers; d public.delivery_codes; actor uuid:=auth.uid(); digits integer; newcode text;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.consents WHERE user_id=actor) THEN RAISE EXCEPTION 'Sign in and accept policies first'; END IF;
 SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
 IF _action IN('offer','take','accept_counter') AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND is_online=true) THEN RAISE EXCEPTION 'Go online to accept or offer on loads'; END IF;
 IF _action IN('offer','take') THEN
  IF NOT public.has_role(actor,'driver') OR b.driver_id IS NOT NULL OR b.status NOT IN('available','offer_made','paid') THEN RAISE EXCEPTION 'Load is no longer available'; END IF;
  IF _action='offer' THEN
   IF _amount IS NULL OR _amount<=0 OR _amount>10000000 THEN RAISE EXCEPTION 'Enter a valid offer'; END IF;
   INSERT INTO public.offers(booking_id,driver_id,offer_amount) VALUES(b.id,actor,_amount) ON CONFLICT(booking_id,driver_id) DO UPDATE SET offer_amount=EXCLUDED.offer_amount,status='pending',counter_amount=NULL,updated_at=now();
   UPDATE public.bookings SET status='offer_made' WHERE id=b.id;
   INSERT INTO public.notifications(user_id,title,body) VALUES(b.shipper_id,'New driver offer','A driver has sent an offer for your load.');
   RETURN jsonb_build_object('ok',true);
  END IF;
  UPDATE public.bookings SET driver_id=actor,status='assigned',agreed_fare=total_fare,assigned_at=now() WHERE id=b.id;
  UPDATE public.offers SET status='rejected' WHERE booking_id=b.id;
  INSERT INTO public.notifications(user_id,title,body) VALUES(b.shipper_id,'Driver assigned','A driver accepted your load.');
 ELSIF _action IN('accept','reject','counter','accept_counter') THEN
  SELECT * INTO o FROM public.offers WHERE id=_offer_id AND booking_id=b.id FOR UPDATE;
  IF NOT FOUND OR o.status NOT IN('pending','countered') OR b.driver_id IS NOT NULL THEN RAISE EXCEPTION 'Offer is no longer available'; END IF;
  IF _action='accept_counter' THEN
   IF actor<>o.driver_id OR o.status<>'countered' THEN RAISE EXCEPTION 'Not allowed'; END IF;
  ELSIF actor<>b.shipper_id THEN RAISE EXCEPTION 'Only the shipper can manage offers'; END IF;
  IF _action='reject' THEN UPDATE public.offers SET status='rejected',updated_at=now() WHERE id=o.id;
  ELSIF _action='counter' THEN
   IF _amount IS NULL OR _amount<=0 OR _amount>10000000 THEN RAISE EXCEPTION 'Enter a valid counter offer'; END IF;
   UPDATE public.offers SET status='countered',counter_amount=_amount,updated_at=now() WHERE id=o.id;
  ELSE
   UPDATE public.bookings SET driver_id=o.driver_id,status='assigned',agreed_fare=CASE WHEN o.status='countered' THEN o.counter_amount ELSE o.offer_amount END,assigned_at=now() WHERE id=b.id;
   UPDATE public.offers SET status=CASE WHEN id=o.id THEN 'accepted' ELSE 'rejected' END,updated_at=now() WHERE booking_id=b.id;
   INSERT INTO public.notifications(user_id,title,body) VALUES(o.driver_id,'Offer accepted','Your load is assigned and ready to start.');
  END IF;
 ELSIF _action='start' THEN
  IF actor IS DISTINCT FROM b.driver_id OR b.status<>'assigned' THEN RAISE EXCEPTION 'Only the assigned driver can start this trip'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.trip_payments p WHERE p.booking_id=b.id AND p.stage='pickup_40' AND p.status='confirmed') THEN RAISE EXCEPTION 'Confirm receiving the 40%% pickup payment before starting the trip'; END IF;
  UPDATE public.bookings SET status='in_progress' WHERE id=b.id;
 ELSIF _action='request_delivery' THEN
  IF actor IS DISTINCT FROM b.driver_id OR b.status NOT IN('in_progress','otp_sent') THEN RAISE EXCEPTION 'Start the trip before requesting delivery'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.delivery_proofs p WHERE p.booking_id=b.id) THEN RAISE EXCEPTION 'Upload a POD photo before requesting the delivery OTP'; END IF;
  SELECT * INTO d FROM public.delivery_codes WHERE booking_id=b.id;
  IF FOUND AND d.expires_at>now() THEN RETURN jsonb_build_object('ok',true); END IF;
  SELECT greatest(4,least(8,trip_otp_length)) INTO digits FROM public.app_settings WHERE id='default'; digits:=coalesce(digits,6);
  newcode:=lpad((floor(random()*(power(10,digits)-power(10,digits-1)))+power(10,digits-1))::bigint::text,digits,'0');
  INSERT INTO public.delivery_codes(booking_id,shipper_id,code,expires_at) VALUES(b.id,b.shipper_id,newcode,now()+interval '30 minutes') ON CONFLICT(booking_id) DO UPDATE SET code=EXCLUDED.code,expires_at=EXCLUDED.expires_at,attempts=0,verified_at=NULL;
  UPDATE public.bookings SET status='otp_sent',otp_sent_at=now(),delivery_otp=NULL WHERE id=b.id;
  INSERT INTO public.notifications(user_id,title,body) VALUES(b.shipper_id,'Confirm delivery','Your delivery code is ready in Load Details. Share it only after receiving your goods.');
 ELSIF _action='verify_delivery' THEN
  IF actor IS DISTINCT FROM b.driver_id OR b.status<>'otp_sent' THEN RAISE EXCEPTION 'Delivery verification is not available'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.delivery_proofs p WHERE p.booking_id=b.id) THEN RAISE EXCEPTION 'POD proof is required before delivery verification'; END IF;
  SELECT * INTO d FROM public.delivery_codes WHERE booking_id=b.id FOR UPDATE;
  IF NOT FOUND OR d.expires_at<=now() THEN RETURN jsonb_build_object('ok',false,'error','Code expired. Request a new delivery code.'); END IF;
  IF d.attempts>=5 THEN RETURN jsonb_build_object('ok',false,'error','Too many incorrect attempts. Wait for the code to expire.'); END IF;
  IF _otp IS DISTINCT FROM d.code THEN UPDATE public.delivery_codes SET attempts=attempts+1 WHERE booking_id=b.id; RETURN jsonb_build_object('ok',false,'error','Incorrect OTP. Ask the shipper for the code.'); END IF;
  UPDATE public.delivery_codes SET verified_at=now() WHERE booking_id=b.id;
  UPDATE public.bookings SET status='completed',delivery_otp=NULL WHERE id=b.id;
  INSERT INTO public.notifications(user_id,title,body) VALUES(b.shipper_id,'Delivery confirmed','POD and OTP are complete. The remaining 60% payment is now due.');
 ELSIF _action='cancel' THEN
  IF actor<>b.shipper_id OR b.status NOT IN('available','offer_made','assigned','paid') THEN RAISE EXCEPTION 'This trip cannot be cancelled'; END IF;
  IF length(trim(coalesce(_reason,'')))=0 THEN RAISE EXCEPTION 'Cancellation reason required'; END IF;
  UPDATE public.bookings SET status='cancelled',cancel_reason=_reason,cancelled_at=now() WHERE id=b.id;
  UPDATE public.offers SET status='rejected' WHERE booking_id=b.id;
 ELSE RAISE EXCEPTION 'Unknown trip action'; END IF;
 RETURN jsonb_build_object('ok',true);
END; $$;
REVOKE ALL ON FUNCTION public.trip_action(uuid,text,uuid,numeric,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.trip_action(uuid,text,uuid,numeric,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.delivery_receipt(_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings%ROWTYPE; v timestamptz; shipper text; driver text; vehicle text; pod text;
BEGIN
SELECT * INTO b FROM public.bookings WHERE id=_booking_id;
IF b.id IS NULL OR auth.uid() IS NULL OR (auth.uid() IS DISTINCT FROM b.shipper_id AND auth.uid() IS DISTINCT FROM b.driver_id) THEN RAISE EXCEPTION 'Receipt unavailable'; END IF;
SELECT verified_at INTO v FROM public.delivery_codes WHERE booking_id=b.id;
IF b.status NOT IN ('delivered','completed') OR v IS NULL THEN RAISE EXCEPTION 'Delivery has not been verified'; END IF;
SELECT file_path INTO pod FROM public.delivery_proofs WHERE booking_id=b.id;
SELECT full_name INTO shipper FROM public.profiles WHERE id=b.shipper_id;
SELECT full_name,vehicle_number INTO driver,vehicle FROM public.profiles WHERE id=b.driver_id;
RETURN jsonb_build_object('booking_id',b.id,'shipper_name',shipper,'driver_name',driver,'vehicle_number',vehicle,'pickup_location',b.pickup_location,'drop_location',b.drop_location,'material_type',b.material_type,'weight_kg',b.weight_kg,'fare',COALESCE(b.agreed_fare,b.total_fare),'trip_date',b.trip_date,'verified_at',v,'payment_status',b.payment_status,'pod_file_path',pod);
END; $$;
REVOKE ALL ON FUNCTION public.delivery_receipt(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delivery_receipt(uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_payments,public.delivery_proofs;