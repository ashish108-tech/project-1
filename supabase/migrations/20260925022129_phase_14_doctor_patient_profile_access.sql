create policy patients_select_consent_doctor on public.patients for select to authenticated using (public.has_valid_record_consent(id, public.current_doctor_id()));
