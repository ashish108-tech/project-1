revoke all on function public.has_valid_record_consent(uuid, uuid) from public;
grant execute on function public.has_valid_record_consent(uuid, uuid) to authenticated;
revoke all on function public.current_doctor_id() from public;
grant execute on function public.current_doctor_id() to authenticated;
