import { AppShell } from '@/components/layout/app-shell';
import { EmptyState, PatientHeader, PortalAuthState, PortalErrorState } from '@/components/dashboard/patient-portal';
import { FacilityDirectory } from '@/components/location/facility-directory';
import { getPatientContext } from '@/lib/patient-portal';

export default async function PatientFacilitiesPage() {
  const { supabase, user, error } = await getPatientContext();
  if (!user) return <AppShell><PatientHeader eyebrow="Care network" title="Healthcare facilities" description="Browse approved hospitals, clinics, laboratories, and health centers in our network." /><PortalAuthState /></AppShell>;
  if (error) return <AppShell><PortalErrorState /></AppShell>;
  const { data: facilities, error: facilitiesError } = await supabase.from('healthcare_facilities').select('id, name, facility_type, address, city, state, postal_code, phone, latitude, longitude').eq('is_approved', true).order('name').limit(100);
  return <AppShell><PatientHeader eyebrow="Care network" title="Healthcare facilities" description="Browse approved facilities in the HealthConnect network, sort them by your location, and open address-based Google Maps directions." />{facilitiesError ? <PortalErrorState /> : facilities?.length ? <FacilityDirectory facilities={facilities} /> : <EmptyState title="No approved facilities yet" description="Approved facilities will appear here when they join the HealthConnect network." />}</AppShell>;
}
