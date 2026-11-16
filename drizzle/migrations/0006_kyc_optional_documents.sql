drop function if exists public.submit_kyc(text,text,text,text,text,text);
create function public.submit_kyc(_license_number text, _rc_number text, _vehicle_number text, _license_url text default null, _rc_url text default null, _insurance_url text default null)
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
revoke all on function public.submit_kyc(text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_kyc(text,text,text,text,text,text) to authenticated;