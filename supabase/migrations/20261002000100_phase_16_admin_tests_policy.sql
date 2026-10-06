create policy tests_select_admin on public.tests for select to authenticated using (public.is_admin());
