REVOKE INSERT,UPDATE,DELETE ON public.profiles FROM authenticated,anon;
GRANT UPDATE (full_name,phone,business_name,business_type,business_address,business_city,business_state,business_pincode,gstin,shipper_profile_completed,bank_name,bank_account_number,bank_ifsc,bank_holder_name,license_number,license_url,rc_number,rc_url,insurance_url,vehicle_number,is_online) ON public.profiles TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.user_roles FROM authenticated,anon;
REVOKE INSERT,UPDATE,DELETE ON public.account_emails FROM authenticated,anon;
REVOKE INSERT,UPDATE,DELETE ON public.subscription_events FROM authenticated,anon;
REVOKE INSERT,UPDATE,DELETE ON public.notifications FROM authenticated,anon;
GRANT UPDATE(read) ON public.notifications TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.bookings FROM authenticated,anon;
GRANT INSERT(shipper_id,pickup_location,drop_location,vehicle_type,material_type,weight_kg,notes,trip_date,pickup_lat,pickup_lng,drop_lat,drop_lng,distance_km,base_fare,per_km_rate,total_fare,status) ON public.bookings TO authenticated;