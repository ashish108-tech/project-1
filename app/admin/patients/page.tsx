import { AdminResourcePage } from '@/components/dashboard/admin-portal';
export default function AdminPatientsPage() { return <AdminResourcePage resource="patients" title="Patients" description="Review patient profile coverage without exposing clinical records or unrelated medical content." columns={['user_id', 'city', 'state', 'created_at']} />; }
