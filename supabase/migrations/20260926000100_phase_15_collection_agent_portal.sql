create policy test_orders_select_assigned_agent on public.test_orders for select to authenticated using (
  exists (
    select 1 from public.collection_requests cr
    join public.collection_agents ca on ca.id = cr.collection_agent_id
    where cr.test_order_id = test_orders.id and ca.user_id = auth.uid()
  )
);

create policy tests_select_assigned_agent on public.tests for select to authenticated using (
  exists (
    select 1 from public.test_orders o
    join public.collection_requests cr on cr.test_order_id = o.id
    join public.collection_agents ca on ca.id = cr.collection_agent_id
    where o.test_id = tests.id and ca.user_id = auth.uid()
  )
);

create policy facility_tests_select_assigned_agent on public.facility_tests for select to authenticated using (
  exists (
    select 1 from public.test_orders o
    join public.collection_requests cr on cr.test_order_id = o.id
    join public.collection_agents ca on ca.id = cr.collection_agent_id
    where o.facility_test_id = facility_tests.id and ca.user_id = auth.uid()
  )
);

create policy facilities_select_assigned_agent on public.healthcare_facilities for select to authenticated using (
  exists (
    select 1 from public.collection_requests cr
    join public.collection_agents ca on ca.id = cr.collection_agent_id
    where cr.facility_id = healthcare_facilities.id and ca.user_id = auth.uid()
  )
);
