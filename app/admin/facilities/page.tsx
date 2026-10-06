import { AdminResourcePage } from '@/components/dashboard/admin-portal';
export default function AdminFacilitiesPage() { return <AdminResourcePage resource="facilities" title="Healthcare facilities" description="Review facilities, coordinate coverage, and control their approved directory status." columns={['name', 'facility_type', 'latitude', 'longitude', 'is_approved']} />; }
