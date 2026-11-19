CREATE OR REPLACE FUNCTION public.notify_booking_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.notifications(user_id,title,body)
  VALUES(NEW.shipper_id,'Booking published',NEW.pickup_location||' → '||NEW.drop_location||' is now visible to drivers.');
  INSERT INTO public.notifications(user_id,title,body)
  SELECT DISTINCT p.id,'New load available',NEW.pickup_location||' → '||NEW.drop_location||' · '||NEW.vehicle_type
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id=p.id AND ur.role='driver'
  WHERE p.is_online=true AND EXISTS(SELECT 1 FROM public.consents c WHERE c.user_id=p.id);
  RETURN NEW;
END; $$;
CREATE TRIGGER booking_created_notifications AFTER INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.notify_booking_created();

CREATE OR REPLACE FUNCTION public.notify_booking_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status='in_progress' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications(user_id,title,body) VALUES(NEW.shipper_id,'Trip started',NEW.pickup_location||' → '||NEW.drop_location||' is now in progress.');
  ELSIF NEW.status='cancelled' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.driver_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id,title,body) VALUES(NEW.driver_id,'Trip cancelled',NEW.pickup_location||' → '||NEW.drop_location||' was cancelled by the shipper.');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER booking_status_notifications AFTER UPDATE OF status ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status();

CREATE OR REPLACE FUNCTION public.notify_offer_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=NEW.booking_id;
  IF NEW.status='countered' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications(user_id,title,body) VALUES(NEW.driver_id,'Counter offer received','The shipper offered ₹'||NEW.counter_amount||' for '||b.pickup_location||' → '||b.drop_location||'.');
  ELSIF NEW.status='rejected' AND OLD.status IS DISTINCT FROM NEW.status AND b.driver_id IS NULL THEN
    INSERT INTO public.notifications(user_id,title,body) VALUES(NEW.driver_id,'Offer not selected','Your offer for '||b.pickup_location||' → '||b.drop_location||' was not selected.');
  ELSIF NEW.status='accepted' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications(user_id,title,body) VALUES(b.shipper_id,'Driver assigned','Your driver is assigned for '||b.pickup_location||' → '||b.drop_location||'.');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER offer_update_notifications AFTER UPDATE OF status ON public.offers FOR EACH ROW EXECUTE FUNCTION public.notify_offer_update();

CREATE OR REPLACE FUNCTION public.notify_message_recipient()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; sender_name text; recipient uuid;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=NEW.booking_id;
  recipient:=CASE WHEN NEW.sender_id=b.shipper_id THEN b.driver_id ELSE b.shipper_id END;
  SELECT full_name INTO sender_name FROM public.profiles WHERE id=NEW.sender_id;
  IF recipient IS NOT NULL AND recipient<>NEW.sender_id THEN
    INSERT INTO public.notifications(user_id,title,body) VALUES(recipient,'New message',coalesce(sender_name,'Trip participant')||': '||left(NEW.body,160));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER message_notifications AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_message_recipient();

CREATE OR REPLACE FUNCTION public.notify_rating_received()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.notifications(user_id,title,body)
  VALUES(NEW.ratee_id,'New '||NEW.rating||'-star rating',coalesce(nullif(left(NEW.review,180),''),'You received a new trip rating.'));
  RETURN NEW;
END; $$;
CREATE TRIGGER rating_notifications AFTER INSERT ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.notify_rating_received();

CREATE OR REPLACE FUNCTION public.notify_dispute_raised()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; recipient uuid;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=NEW.booking_id;
  recipient:=CASE WHEN NEW.raised_by=b.shipper_id THEN b.driver_id ELSE b.shipper_id END;
  IF recipient IS NOT NULL THEN
    INSERT INTO public.notifications(user_id,title,body) VALUES(recipient,'Dispute reported','A dispute was reported for '||b.pickup_location||' → '||b.drop_location||'.');
  END IF;
  INSERT INTO public.notifications(user_id,title,body)
  SELECT ur.user_id,'New dispute to review',b.pickup_location||' → '||b.drop_location||' · '||left(NEW.reason,140)
  FROM public.user_roles ur WHERE ur.role='admin';
  RETURN NEW;
END; $$;
CREATE TRIGGER dispute_notifications AFTER INSERT ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.notify_dispute_raised();

CREATE OR REPLACE FUNCTION public.notify_kyc_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.kyc_status='pending' THEN
    INSERT INTO public.notifications(user_id,title,body)
    SELECT ur.user_id,'New KYC submission',NEW.full_name||' submitted documents for review.' FROM public.user_roles ur WHERE ur.role='admin';
  ELSIF NEW.kyc_status='approved' THEN
    INSERT INTO public.notifications(user_id,title,body) VALUES(NEW.id,'KYC approved','Your driver documents are approved. You can accept loads.');
  ELSIF NEW.kyc_status='rejected' THEN
    INSERT INTO public.notifications(user_id,title,body) VALUES(NEW.id,'KYC needs attention',coalesce(NEW.kyc_rejection_reason,'Please review and resubmit your documents.'));
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER kyc_status_notifications AFTER UPDATE OF kyc_status ON public.profiles FOR EACH ROW WHEN (OLD.kyc_status IS DISTINCT FROM NEW.kyc_status) EXECUTE FUNCTION public.notify_kyc_status();

CREATE OR REPLACE FUNCTION public.notify_delivery_proof()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings;
BEGIN
  SELECT * INTO b FROM public.bookings WHERE id=NEW.booking_id;
  INSERT INTO public.notifications(user_id,title,body) VALUES(b.shipper_id,'POD photo uploaded','Delivery proof is ready for '||b.pickup_location||' → '||b.drop_location||'.');
  RETURN NEW;
END; $$;
CREATE TRIGGER delivery_proof_notifications AFTER INSERT OR UPDATE ON public.delivery_proofs FOR EACH ROW EXECUTE FUNCTION public.notify_delivery_proof();

CREATE OR REPLACE FUNCTION public.admin_send_notification(_audience text,_recipient_id uuid,_title text,_body text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE clean_title text:=trim(coalesce(_title,'')); clean_body text:=trim(coalesce(_body,'')); sent integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Only admins can send notifications'; END IF;
  IF length(clean_title) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Title must be between 1 and 100 characters'; END IF;
  IF length(clean_body) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'Message must be between 1 and 500 characters'; END IF;
  IF _audience='user' THEN
    IF _recipient_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=_recipient_id) THEN RAISE EXCEPTION 'Choose a valid recipient'; END IF;
    INSERT INTO public.notifications(user_id,title,body) VALUES(_recipient_id,clean_title,clean_body);
  ELSIF _audience='all' THEN
    INSERT INTO public.notifications(user_id,title,body) SELECT p.id,clean_title,clean_body FROM public.profiles p;
  ELSIF _audience IN('shippers','drivers') THEN
    INSERT INTO public.notifications(user_id,title,body)
    SELECT DISTINCT p.id,clean_title,clean_body FROM public.profiles p JOIN public.user_roles ur ON ur.user_id=p.id
    WHERE ur.role=CASE WHEN _audience='shippers' THEN 'shipper'::public.app_role ELSE 'driver'::public.app_role END;
  ELSE RAISE EXCEPTION 'Invalid audience'; END IF;
  GET DIAGNOSTICS sent=ROW_COUNT;
  RETURN jsonb_build_object('ok',true,'sent',sent);
END; $$;
REVOKE ALL ON FUNCTION public.admin_send_notification(text,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_send_notification(text,uuid,text,text) TO authenticated;

DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END; $$;