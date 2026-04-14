import type { Metadata } from 'next'
import AdminSidebar from '@/components/AdminSidebar'

export const metadata: Metadata = {
  title:  'Admin',
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - var(--nav-h))',
        background: 'var(--bg)',
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
      }}
    >
      <AdminSidebar />
      <main style={{ minWidth: 0, padding: '36px 40px' }}>
        {children}
      </main>
    </div>
  )
}
