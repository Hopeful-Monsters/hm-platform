'use client'

import { useState } from 'react'
import SettingsModal from './SettingsModal'

export default function SettingsButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ct-settings-btn"
        aria-label="Open Coverage Tracker Settings"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
          <path fillRule="evenodd" d="M6.34 1.22a.75.75 0 0 1 .75-.72h1.82a.75.75 0 0 1 .75.72l.1 1.02c.36.13.7.3 1.02.5l.87-.52a.75.75 0 0 1 .93.12l1.29 1.29a.75.75 0 0 1 .12.93l-.52.87c.2.32.37.66.5 1.02l1.02.1a.75.75 0 0 1 .72.75v1.82a.75.75 0 0 1-.72.75l-1.02.1a5.25 5.25 0 0 1-.5 1.02l.52.87a.75.75 0 0 1-.12.93l-1.29 1.29a.75.75 0 0 1-.93.12l-.87-.52a5.25 5.25 0 0 1-1.02.5l-.1 1.02a.75.75 0 0 1-.75.72H7.09a.75.75 0 0 1-.75-.72l-.1-1.02a5.25 5.25 0 0 1-1.02-.5l-.87.52a.75.75 0 0 1-.93-.12L2.13 13.1a.75.75 0 0 1-.12-.93l.52-.87a5.25 5.25 0 0 1-.5-1.02l-1.02-.1A.75.75 0 0 1 .29 9.4V7.58a.75.75 0 0 1 .72-.75l1.02-.1c.13-.36.3-.7.5-1.02l-.52-.87a.75.75 0 0 1 .12-.93L3.42 2.62a.75.75 0 0 1 .93-.12l.87.52c.32-.2.66-.37 1.02-.5l.1-1.02Z" clipRule="evenodd"/>
        </svg>
        Settings
      </button>

      {open && <SettingsModal onClose={() => setOpen(false)} />}
    </>
  )
}
