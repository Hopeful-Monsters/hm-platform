'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ReportProvider, useReport } from './_components/ReportContext'
import CurrentWeekTab from './_components/CurrentWeekTab'
import HistoryTab from './_components/HistoryTab'
import RevenueConfigTab from './_components/RevenueConfigTab'
import type { TabId } from './_types'

function Inner() {
  const { activeTab, setActiveTab, isAdmin } = useReport()

  const tabs: Array<{ id: TabId; label: string; adminOnly?: boolean }> = [
    { id: 'current', label: 'Current Week' },
    { id: 'history', label: 'History' },
    { id: 'config',  label: 'Revenue Config', adminOnly: true },
  ]

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="pow-shell">
      <div className="pow-tabs" role="tablist">
        {visibleTabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`pow-tab ${activeTab === t.id ? 'is-active' : ''} pow-tab--${t.id}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === 'current' && <CurrentWeekTab />}
        {activeTab === 'history' && <HistoryTab />}
        {activeTab === 'config'  && isAdmin && <RevenueConfigTab />}
      </div>
    </div>
  )
}

export default function PaidOurWorthPage() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(user?.user_metadata?.role === 'admin')
    })
  }, [])

  return (
    <ReportProvider isAdmin={isAdmin}>
      <Inner />
    </ReportProvider>
  )
}
