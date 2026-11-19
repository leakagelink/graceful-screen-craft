DROP POLICY IF EXISTS driver_open_loads ON public.bookings;
CREATE POLICY driver_open_loads ON public.bookings FOR SELECT TO authenticated USING(
  status IN ('available','offer_made','paid')
  AND driver_id IS NULL
  AND public.has_role(auth.uid(),'driver')
  AND EXISTS(SELECT 1 FROM public.consents WHERE user_id=auth.uid())
  AND EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_online=true)
);

CREATE OR REPLACE FUNCTION public.trip_action(_booking_id uuid,_action text,_offer_id uuid DEFAULT NULL,_amount numeric DEFAULT NULL,_otp text DEFAULT NULL,_reason text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; o public.offers; d public.delivery_codes; actor uuid:=auth.uid(); digits integer; newcode text;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.consents WHERE user_id=actor) THEN RAISE EXCEPTION 'Sign in and accept policies first'; END IF;
 SELECT * INTO b FROM public.bookings WHERE id=_booking_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
 IF _action IN('offer','take','accept_counter') AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=actor AND is_online=true) THEN
  RAISE EXCEPTION 'Go online to accept or offer on loads';
 END IF;
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
  UPDATE public.bookings SET status='in_progress' WHERE id=b.id;
 ELSIF _action='request_delivery' THEN
  IF actor IS DISTINCT FROM b.driver_id OR b.status NOT IN('in_progress','otp_sent') THEN RAISE EXCEPTION 'Start the trip before requesting delivery'; END IF;
  SELECT * INTO d FROM public.delivery_codes WHERE booking_id=b.id;
  IF FOUND AND d.expires_at>now() THEN RETURN jsonb_build_object('ok',true); END IF;
  SELECT greatest(4,least(8,trip_otp_length)) INTO digits FROM public.app_settings WHERE id='default'; digits:=coalesce(digits,6);
  newcode:=lpad((floor(random()*(power(10,digits)-power(10,digits-1)))+power(10,digits-1))::bigint::text,digits,'0');
  INSERT INTO public.delivery_codes(booking_id,shipper_id,code,expires_at) VALUES(b.id,b.shipper_id,newcode,now()+interval '30 minutes') ON CONFLICT(booking_id) DO UPDATE SET code=EXCLUDED.code,expires_at=EXCLUDED.expires_at,attempts=0,verified_at=NULL;
  UPDATE public.bookings SET status='otp_sent',otp_sent_at=now(),delivery_otp=NULL WHERE id=b.id;
  INSERT INTO public.notifications(user_id,title,body) VALUES(b.shipper_id,'Confirm delivery','Your delivery code is ready in Load Details. Share it only after receiving your goods.');
 ELSIF _action='verify_delivery' THEN
  IF actor IS DISTINCT FROM b.driver_id OR b.status<>'otp_sent' THEN RAISE EXCEPTION 'Delivery verification is not available'; END IF;
  SELECT * INTO d FROM public.delivery_codes WHERE booking_id=b.id FOR UPDATE;
  IF NOT FOUND OR d.expires_at<=now() THEN RETURN jsonb_build_object('ok',false,'error','Code expired. Request a new delivery code.'); END IF;
  IF d.attempts>=5 THEN RETURN jsonb_build_object('ok',false,'error','Too many incorrect attempts. Wait for the code to expire.'); END IF;
  IF _otp IS DISTINCT FROM d.code THEN UPDATE public.delivery_codes SET attempts=attempts+1 WHERE booking_id=b.id; RETURN jsonb_build_object('ok',false,'error','Incorrect OTP. Ask the shipper for the code.'); END IF;
  UPDATE public.delivery_codes SET verified_at=now() WHERE booking_id=b.id;
  UPDATE public.bookings SET status='completed',delivery_otp=NULL WHERE id=b.id;
  INSERT INTO public.notifications(user_id,title,body) VALUES(b.shipper_id,'Delivery confirmed','Your trip is complete. Payment status is unchanged.');
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