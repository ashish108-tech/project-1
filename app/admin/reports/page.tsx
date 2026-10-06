import { AdminResourcePage } from '@/components/dashboard/admin-portal';
export default function AdminReportsPage() { return <AdminResourcePage resource="reports" title="Medical reports" description="Review report metadata and readiness without exposing storage secrets or file contents in the browser." columns={['report_title', 'report_type', 'mime_type', 'created_at']} />; }
