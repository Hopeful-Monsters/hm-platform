'use client'

import { Button } from '@/components/ui/button'

interface Props {
  identifier: string
  url:        string
  onReset:    () => void
}

export default function SupportSuccess({ identifier, url, onReset }: Props) {
  return (
    <div className="support-success-card">
      <p className="eyebrow hm-accent mb-3">Submitted</p>
      <h2 className="display-md hm-text mb-3">
        We&apos;ve got it.
      </h2>
      <p className="subhead mb-8">
        Logged as{' '}
        <a href={url} target="_blank" rel="noopener noreferrer" className="hm-link">
          {identifier}
        </a>{' '}
        in Linear and added to Triage for review.
      </p>
      <div className="support-success-buttons">
        <Button variant="outline" size="sm" onClick={onReset}>
          Submit another
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            View in Linear →
          </a>
        </Button>
      </div>
    </div>
  )
}
