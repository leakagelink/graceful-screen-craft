ALTER TABLE public.profiles ADD COLUMN vehicle_type text, ADD COLUMN vehicle_capacity text, ADD COLUMN service_routes text, ADD COLUMN upi_id text;
GRANT UPDATE(vehicle_type,vehicle_capacity,service_routes,upi_id) ON public.profiles TO authenticated;
CREATE FUNCTION public.delivery_receipt(_booking_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings%ROWTYPE; v timestamptz; shipper text; driver text; vehicle text;
BEGIN
SELECT * INTO b FROM public.bookings WHERE id=_booking_id;
IF b.id IS NULL OR auth.uid() IS NULL OR (auth.uid() IS DISTINCT FROM b.shipper_id AND auth.uid() IS DISTINCT FROM b.driver_id) THEN RAISE EXCEPTION 'Receipt unavailable'; END IF;
SELECT verified_at INTO v FROM public.delivery_codes WHERE booking_id=b.id;
IF b.status NOT IN ('delivered','completed') OR v IS NULL THEN RAISE EXCEPTION 'Delivery has not been verified'; END IF;
SELECT full_name INTO shipper FROM public.profiles WHERE id=b.shipper_id;
SELECT full_name,vehicle_number INTO driver,vehicle FROM public.profiles WHERE id=b.driver_id;
RETURN jsonb_build_object('booking_id',b.id,'shipper_name',shipper,'driver_name',driver,'vehicle_number',vehicle,'pickup_location',b.pickup_location,'drop_location',b.drop_location,'material_type',b.material_type,'weight_kg',b.weight_kg,'fare',COALESCE(b.agreed_fare,b.total_fare),'trip_date',b.trip_date,'verified_at',v,'payment_status',b.payment_status);
END; $$;
REVOKE ALL ON FUNCTION public.delivery_receipt(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delivery_receipt(uuid) TO authenticated;