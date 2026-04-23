import type { Metadata } from 'next'
import AdminSidebar from '@/components/AdminSidebar'

export const metadata: Metadata = {
  title:  'Admin',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] min-h-[calc(100vh-var(--nav-h))]">
      <AdminSidebar />
      <main className="min-w-0 p-9 px-10">
        {children}
      </main>
    </div>
  )
}
