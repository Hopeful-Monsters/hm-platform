'use client'

import { useState } from 'react'

export function DropZone({ onFiles }: { onFiles: (files: FileList) => void }) {
  const [over, setOver] = useState(false)
  return (
    <div
      className={`drop-zone${over ? ' over' : ''}`}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files) }}
    >
      <input
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={e => { if (e.target.files) { onFiles(e.target.files); e.target.value = '' } }}
      />
      <div className="drop-icon">📎</div>
      <div className="drop-text"><strong>Drop files here</strong> or click to browse</div>
      <div className="drop-hint">JPG, PNG, WebP or PDF · Max 5 MB each · Multiple files supported</div>
    </div>
  )
}
