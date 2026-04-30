'use client'

import { useRef } from 'react'
import { Paperclip, X } from 'lucide-react'
import { MAX_UPLOAD_BYTES } from '@/lib/constants/file-limits'

interface Props {
  value:    File | null
  onChange: (file: File | null) => void
  onError:  (message: string) => void
}

export default function ScreenshotField({ value, onChange, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_UPLOAD_BYTES) {
      onError('Screenshot must be under 5 MB.')
      return
    }
    onChange(file)
  }

  function remove() {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="support-screenshot-row">
      <label htmlFor="screenshot" className="hm-label support-screenshot-label">
        Screenshot
        <span className="hm-label-optional">(optional)</span>
      </label>

      {value ? (
        <div className="support-file-pill">
          <Paperclip size={14} className="support-file-icon" />
          <span className="support-file-name">{value.name}</span>
          <span className="support-file-size">
            {(value.size / 1024).toFixed(0)} KB
          </span>
          <button
            type="button"
            onClick={remove}
            className="support-file-remove"
            aria-label="Remove screenshot"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="support-attach-btn"
          >
            <Paperclip size={14} />
            Add file
          </button>
          <span className="support-attach-hint">
            PNG, JPG, WebP or GIF · max 5 MB
          </span>
        </>
      )}

      <input
        ref={inputRef}
        id="screenshot"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="sr-only"
      />
    </div>
  )
}
