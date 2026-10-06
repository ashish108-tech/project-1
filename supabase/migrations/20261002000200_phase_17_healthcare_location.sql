alter table public.healthcare_facilities
  add constraint healthcare_facilities_coordinates_valid check (
    (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)
  );

create index if not exists facilities_approved_coordinates_idx
  on public.healthcare_facilities (is_approved, latitude, longitude)
  where is_approved = true and latitude is not null and longitude is not null;
