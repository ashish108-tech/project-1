import { AdminResourcePage } from '@/components/dashboard/admin-portal';
export default function AdminAppointmentsPage() { return <AdminResourcePage resource="appointments" title="Appointments" description="Review appointment operations across patients, doctors, facilities, and scheduling status." columns={['status', 'appointment_type', 'scheduled_start', 'scheduled_end']} />; }
