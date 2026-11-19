DROP POLICY IF EXISTS "settings_read" ON public.app_settings;
CREATE POLICY "settings_admin_read" ON public.app_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.get_trip_settings()
RETURNS TABLE(trip_otp_length integer, commission_rate numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.trip_otp_length, s.commission_rate FROM public.app_settings s
  WHERE s.id = 'default' AND auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.get_trip_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trip_settings() TO authenticated;