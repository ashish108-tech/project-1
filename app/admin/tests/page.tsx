import { AdminResourcePage } from '@/components/dashboard/admin-portal';
export default function AdminTestsPage() { return <AdminResourcePage resource="tests" title="Diagnostic tests" description="Review the approved test catalog and activate or deactivate tests through the admin API." columns={['name', 'category', 'is_active', 'created_at']} />; }
