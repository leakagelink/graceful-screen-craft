CREATE TYPE public.app_role AS ENUM ('shipper','driver','admin');
CREATE TABLE public.profiles (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 full_name text NOT NULL DEFAULT '', phone text, business_name text, business_type text,
 business_address text, business_city text, business_state text, business_pincode text, gstin text,
 shipper_profile_completed boolean NOT NULL DEFAULT false,
 bank_name text, bank_account_number text, bank_ifsc text, bank_holder_name text,
 referral_code text, referred_by text, free_until timestamptz,
 kyc_status text NOT NULL DEFAULT 'not_submitted', license_number text, license_url text,
 rc_number text, rc_url text, insurance_url text, vehicle_number text,
 kyc_submitted_at timestamptz, kyc_reviewed_at timestamptz, kyc_rejection_reason text,
 is_online boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name,phone,business_name,business_type,business_address,business_city,business_state,business_pincode,gstin,shipper_profile_completed,bank_name,bank_account_number,bank_ifsc,bank_holder_name,license_number,license_url,rc_number,rc_url,insurance_url,vehicle_number,is_online) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING (id=auth.uid());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id=auth.uid()) WITH CHECK (id=auth.uid());
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,role public.app_role NOT NULL,UNIQUE(user_id));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_read_own ON public.user_roles FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role=_role); $$;
REVOKE ALL ON FUNCTION public.has_role(uuid,public.app_role) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,public.app_role) TO authenticated,service_role;
CREATE POLICY profiles_admin_read ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY roles_admin_read ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TABLE public.consents (user_id uuid PRIMARY KEY,terms_version text NOT NULL,accepted_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY consents_read_own ON public.consents FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY consents_insert_own ON public.consents FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND terms_version='2026-11');
CREATE FUNCTION public.create_account_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 INSERT INTO public.profiles(id,full_name,phone,referred_by) VALUES(NEW.id,coalesce(NEW.raw_user_meta_data->>'full_name',NEW.raw_user_meta_data->>'name',split_part(NEW.email,'@',1),''),nullif(NEW.raw_user_meta_data->>'phone',''),nullif(NEW.raw_user_meta_data->>'referral_code',''));
 IF NEW.raw_user_meta_data->>'account_type' IN ('shipper','driver') THEN INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,(NEW.raw_user_meta_data->>'account_type')::public.app_role); END IF;
 RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.create_account_profile() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER on_vahakam_account_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_account_profile();
CREATE FUNCTION public.initialize_account(_role text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF _role NOT IN ('shipper','driver') THEN RAISE EXCEPTION 'Invalid account type'; END IF;
 INSERT INTO public.user_roles(user_id,role) VALUES(auth.uid(),_role::public.app_role) ON CONFLICT(user_id) DO NOTHING;
 END; $$;
REVOKE ALL ON FUNCTION public.initialize_account(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.initialize_account(text) TO authenticated;
CREATE TABLE public.subscription_plans(id text PRIMARY KEY,name text NOT NULL,price_inr numeric NOT NULL CHECK(price_inr>=0),duration_days integer NOT NULL CHECK(duration_days>0),features jsonb NOT NULL DEFAULT '[]',is_active boolean NOT NULL DEFAULT true,sort_order integer NOT NULL DEFAULT 0);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY plans_read ON public.subscription_plans FOR SELECT TO authenticated USING(true);
CREATE POLICY plans_admin ON public.subscription_plans FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.shipper_subscriptions(shipper_id uuid PRIMARY KEY REFERENCES public.profiles(id),plan_id text REFERENCES public.subscription_plans(id),start_date timestamptz NOT NULL DEFAULT now(),expiry_date timestamptz NOT NULL,is_active boolean NOT NULL DEFAULT true,is_locked boolean NOT NULL DEFAULT false);
GRANT SELECT,INSERT,UPDATE ON public.shipper_subscriptions TO authenticated;
GRANT ALL ON public.shipper_subscriptions TO service_role;
ALTER TABLE public.shipper_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_read ON public.shipper_subscriptions FOR SELECT TO authenticated USING(shipper_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY subscriptions_admin ON public.shipper_subscriptions FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.subscription_payments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),shipper_id uuid NOT NULL REFERENCES public.profiles(id),plan_id text REFERENCES public.subscription_plans(id),amount_inr numeric NOT NULL CHECK(amount_inr>=0),payment_method text NOT NULL,payment_reference text NOT NULL,paid_on date NOT NULL,verification_status text NOT NULL DEFAULT 'pending',created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY subpayments_read ON public.subscription_payments FOR SELECT TO authenticated USING(shipper_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY subpayments_admin ON public.subscription_payments FOR ALL TO authenticated USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
CREATE TABLE public.subscription_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),shipper_id uuid NOT NULL REFERENCES public.profiles(id),action text NOT NULL,details jsonb NOT NULL DEFAULT '{}',actor_id uuid,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.subscription_events TO authenticated;
GRANT ALL ON public.subscription_events TO service_role;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY subevents_read ON public.subscription_events FOR SELECT TO authenticated USING(shipper_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TABLE public.notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,title text NOT NULL,body text NOT NULL,read boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE(read) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_read ON public.notifications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY notifications_mark ON public.notifications FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE TABLE public.bookings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),shipper_id uuid NOT NULL REFERENCES public.profiles(id),driver_id uuid REFERENCES public.profiles(id),
 pickup_location text NOT NULL,drop_location text NOT NULL,vehicle_type text NOT NULL CHECK(vehicle_type IN ('mini_truck','eicher_14ft','container_20ft','tata_ace','bolero_pickup')),
 material_type text NOT NULL,weight_kg numeric CHECK(weight_kg>0),notes text,trip_date date NOT NULL,
 distance_km numeric NOT NULL CHECK(distance_km>0),base_fare numeric NOT NULL CHECK(base_fare>=0),per_km_rate numeric NOT NULL CHECK(per_km_rate>=0),total_fare numeric NOT NULL CHECK(total_fare>=0),
 status text NOT NULL DEFAULT 'available' CHECK(status IN ('available','paid','offer_made','assigned','in_progress','otp_sent','delivered','completed','cancelled')),
 pickup_lat double precision,pickup_lng double precision,drop_lat double precision,drop_lng double precision,
 payment_id text,platform_fee numeric,driver_payout numeric,payout_status text,payout_id text,
 agreed_fare numeric,assigned_at timestamptz,delivery_otp text,otp_sent_at timestamptz,
 payout_1_status text,payout_1_id text,payout_2_status text,payout_2_id text,commission_amount numeric,driver_total_payout numeric,
 cancel_reason text,cancelled_at timestamptz,driver_rating integer,shipper_rating integer,
 driver_lat double precision,driver_lng double precision,driver_location_updated_at timestamptz,
 payment_status text NOT NULL DEFAULT 'NOT_REQUIRED',payment_method text,payment_verified_by uuid,payment_verified_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bookings TO authenticated;
GRANT INSERT(shipper_id,pickup_location,drop_location,vehicle_type,material_type,weight_kg,notes,trip_date,pickup_lat,pickup_lng,drop_lat,drop_lng,distance_km,base_fare,per_km_rate,total_fare,status) ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY bookings_owner_read ON public.bookings FOR SELECT TO authenticated USING(shipper_id=auth.uid() OR driver_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY bookings_create ON public.bookings FOR INSERT TO authenticated WITH CHECK(shipper_id=auth.uid() AND public.has_role(auth.uid(),'shipper') AND status='available' AND driver_id IS NULL AND EXISTS(SELECT 1 FROM public.consents WHERE user_id=auth.uid()) AND NOT EXISTS(SELECT 1 FROM public.shipper_subscriptions WHERE shipper_id=auth.uid() AND (is_locked OR (is_active AND expiry_date<=now()))));
CREATE INDEX bookings_owner_created ON public.bookings(shipper_id,created_at DESC);
CREATE INDEX bookings_driver_created ON public.bookings(driver_id,created_at DESC);
CREATE INDEX notifications_owner_created ON public.notifications(user_id,created_at DESC);