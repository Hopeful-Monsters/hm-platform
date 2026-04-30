'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ReportProvider, useReport } from './_components/ReportContext'
import ReportHeader from './_components/ReportHeader'
import SummaryTab      from './_components/SummaryTab'
import TimeDetailTab   from './_components/TimeDetailTab'
import JobBreakdownTab from './_components/JobBreakdownTab'
import HistoryTab      from './_components/HistoryTab'

function Inner({ isAdmin }: { isAdmin: boolean }) {
  const { activeTab, setActiveTab, summaryRows, entries, jobBreakdown, savedReports } = useReport()

  const tabs = [
    { id: 'summary',      label: 'Team Summary',   count: summaryRows.length },
    { id: 'timedetail',   label: 'Time Detail',    count: entries.length },
    { id: 'jobbreakdown', label: 'Job Breakdown',  count: jobBreakdown.length },
    { id: 'history',      label: 'History',        count: savedReports.length },
  ] as const

  return (
    <div className="sr-shell">
      <ReportHeader isAdmin={isAdmin} />

      <div className="sr-tabs" role="tablist">
        {tabs.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={activeTab === t.id}
            className={`sr-tab ${activeTab === t.id ? 'is-active' : ''} sr-tab--${t.id}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            <span className="sr-tab-count">{t.count || '—'}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === 'summary'      && <SummaryTab />}
        {activeTab === 'timedetail'   && <TimeDetailTab />}
        {activeTab === 'jobbreakdown' && <JobBreakdownTab />}
        {activeTab === 'history'      && <HistoryTab isAdmin={isAdmin} />}
      </div>
    </div>
  )
}

export default function StreamtimeReviewerPage() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAdmin(user?.user_metadata?.role === 'admin')
    })
  }, [])

  return (
    <ReportProvider>
      <Inner isAdmin={isAdmin} />
    </ReportProvider>
  )
}
