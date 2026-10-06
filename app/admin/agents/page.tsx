import { AdminResourcePage } from '@/components/dashboard/admin-portal';
export default function AdminAgentsPage() { return <AdminResourcePage resource="agents" title="Collection agents" description="Review field agents, service areas, availability, and verification state." columns={['user_id', 'service_area', 'is_available', 'is_verified']} />; }
