create or replace function public.submit_kyc(_license_number text, _rc_number text, _vehicle_number text, _license_url text, _rc_url text, _insurance_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'driver') then raise exception 'Only drivers can submit KYC'; end if;
  if coalesce(trim(_license_number),'') = '' or coalesce(trim(_rc_number),'') = '' or coalesce(trim(_vehicle_number),'') = '' then raise exception 'License, RC and vehicle number are required'; end if;
  if exists (select 1 from profiles where id = auth.uid() and kyc_status = 'approved') then raise exception 'KYC is already approved'; end if;
  update profiles set license_number = left(trim(_license_number),40), rc_number = left(trim(_rc_number),40), vehicle_number = left(trim(_vehicle_number),20),
    license_url = _license_url, rc_url = _rc_url, insurance_url = _insurance_url,
    kyc_status = 'pending', kyc_submitted_at = now(), kyc_reviewed_at = null, kyc_rejection_reason = null
  where id = auth.uid();
end $$;

create or replace function public.admin_review_kyc(_driver_id uuid, _status text, _reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin only'; end if;
  if _status not in ('approved','rejected') then raise exception 'Invalid status'; end if;
  update profiles set kyc_status = _status, kyc_reviewed_at = now(), kyc_rejection_reason = case when _status = 'rejected' then left(_reason, 500) end
  where id = _driver_id and kyc_status = 'pending';
  if not found then raise exception 'No pending KYC for this driver'; end if;
end $$;

create or replace function public.admin_set_payment_status(_booking_id uuid, _status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Admin only'; end if;
  if _status not in ('PAID','FAILED') then raise exception 'Invalid status'; end if;
  update bookings set payment_status = _status, payment_verified_by = auth.uid(), payment_verified_at = now(),
    payout_1_status = case when _status = 'PAID' then 'paid' else payout_1_status end,
    payout_2_status = case when _status = 'PAID' then 'paid' else payout_2_status end
  where id = _booking_id;
  if not found then raise exception 'Booking not found'; end if;
end $$;

revoke all on function public.submit_kyc(text,text,text,text,text,text) from public, anon;
revoke all on function public.admin_review_kyc(uuid,text,text) from public, anon;
revoke all on function public.admin_set_payment_status(uuid,text) from public, anon;
grant execute on function public.submit_kyc(text,text,text,text,text,text) to authenticated;
grant execute on function public.admin_review_kyc(uuid,text,text) to authenticated;
grant execute on function public.admin_set_payment_status(uuid,text) to authenticated;