import { AdminResourcePage } from '@/components/dashboard/admin-portal';
export default function AdminDoctorsPage() { return <AdminResourcePage resource="doctors" title="Doctors" description="Review professional profiles and approve or suspend access through protected admin operations." columns={['specialization', 'license_number', 'approval_status', 'created_at']} />; }
