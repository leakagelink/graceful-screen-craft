CREATE FUNCTION public.driver_payment_details(_booking_id uuid) RETURNS TABLE(upi_id text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.upi_id FROM public.bookings b JOIN public.profiles p ON p.id=b.driver_id
 WHERE b.id=_booking_id AND auth.uid()=b.shipper_id;
$$;
REVOKE ALL ON FUNCTION public.driver_payment_details(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.driver_payment_details(uuid) TO authenticated;