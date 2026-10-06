import { AdminResourcePage } from '@/components/dashboard/admin-portal';
export default function AdminUsersPage() { return <AdminResourcePage resource="users" title="Users" description="Review authenticated platform accounts and verification state. Role changes are intentionally excluded from the browser UI." columns={['email', 'role', 'is_verified', 'created_at']} />; }
