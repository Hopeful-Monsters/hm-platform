'use client'

import { createContext, useContext, useState, useMemo, ReactNode } from 'react'
import type { TabId } from '../_types'

interface ReportContextShape {
  activeTab: TabId
  setActiveTab: (t: TabId) => void
  isAdmin: boolean
}

const ReportContext = createContext<ReportContextShape | null>(null)

export function ReportProvider({
  children,
  isAdmin,
}: {
  children: ReactNode
  isAdmin: boolean
}) {
  const [activeTab, setActiveTab] = useState<TabId>('current')

  const value = useMemo<ReportContextShape>(
    () => ({ activeTab, setActiveTab, isAdmin }),
    [activeTab, isAdmin],
  )

  return <ReportContext.Provider value={value}>{children}</ReportContext.Provider>
}

export function useReport() {
  const ctx = useContext(ReportContext)
  if (!ctx) throw new Error('useReport must be used inside ReportProvider')
  return ctx
}
