import { createClient } from '@/lib/supabase/server'
import AdminSidebarClient from './AdminSidebarClient'

export default async function AdminSidebar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <AdminSidebarClient userEmail={user?.email} />
}
