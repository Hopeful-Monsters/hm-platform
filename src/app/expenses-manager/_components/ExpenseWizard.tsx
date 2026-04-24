'use client'

import { useEffect, useRef, useState } from 'react'
import type { Job, QueueItem, Extracted } from '../_types'
import { fmtSize, isOldDate, buildFilename, afyFolderName, monthLabel } from '../_utils'
import { cn } from '@/lib/utils'
import { useExpenses } from '../_hooks/useExpenses'
import { useWizard, type WizardStep } from './WizardContext'
import { DropZone } from './DropZone'
import { QueueRow } from './QueueRow'
import { CompanyStatus } from './CompanyStatus'
import { SupplierCombobox } from './SupplierCombobox'

// Step indicator now lives in ToolHeader (see layout.tsx + StepIndicator.tsx).
// useExpenses still owns the wizard step internally; we mirror it into the
// shared WizardContext so the sub-nav indicator can read it.

// ── ReviewCard ────────────────────────────────────────────────────

function ReviewCard({
  item,
  companies,
  initials,
  job,
  onUpdate,
  onRecheck,
  onChoose,
  onCreate,
}: {
  item: QueueItem
  companies: Array<{ id: string | number; name: string }>
  initials: string
  job: Job
  onUpdate: (id: number, patch: Partial<QueueItem> | ((i: QueueItem) => Partial<QueueItem>)) => void
  onRecheck: (id: number) => void
  onChoose: (id: number, cid: string | number, name: string) => void
  onCreate: (id: number, name: string) => void
}) {
  const hasFieldErrors = Object.keys(item.fieldErrors ?? {}).length > 0
  const [collapsed, setCollapsed] = useState(false)
  // Never collapse while there are validation errors — derive effective state rather than syncing via effect
  const isCollapsed = collapsed && !hasFieldErrors
  const d      = item.extracted
  const fe     = item.fieldErrors ?? {}
  const isPdf  = item.mimeType === 'application/pdf'
  const exGST  = parseFloat(String(d.amountExGST)) || 0
  const gstAmt = parseFloat(String(d.gstAmount)) || Math.round(exGST * item.gstPct / 100 * 100) / 100
  const total  = parseFloat(String(d.totalIncGST)) || Math.round((exGST + gstAmt) * 100) / 100
  const sell   = Math.round(total * (1 + item.markup / 100) * 100) / 100
  const fn     = buildFilename(item, job.num, job.id, initials)

  const statusClass = ({ ready: 'sb-ready', done: 'sb-done', error: 'sb-error' } as Record<string, string>)[item.status] ?? 'sb-pending'
  const statusLabel = ({ ready: 'Ready', done: 'Submitted', error: 'Error' } as Record<string, string>)[item.status] ?? item.status

  function patchExtracted(fields: Partial<Extracted>) {
    onUpdate(item.id, i => ({
      extracted: { ...i.extracted, ...fields },
      // Clear field errors for any key being patched
      fieldErrors: Object.fromEntries(
        Object.entries(i.fieldErrors ?? {}).filter(([k]) => !(k in fields))
      ),
    }))
  }

  function recalcGST(ex: number, pct: number) {
    const gst = Math.round(ex * pct / 100 * 100) / 100
    const tot = Math.round((ex + gst) * 100) / 100
    onUpdate(item.id, i => ({ extracted: { ...i.extracted, amountExGST: ex, gstAmount: gst, totalIncGST: tot } }))
  }

  return (
    <div className={cn('card mb-[14px]', hasFieldErrors && 'has-error')}>
      {/* Header */}
      <div
        className={cn('card-hdr collapsible', hasFieldErrors && 'has-error')}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{isPdf ? '📄' : '🖼️'}</span>
          <div>
            <div className="em-item-name">{item.file.name}</div>
            <div className="em-item-size">{fmtSize(item.file.size)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`sbadge ${statusClass}`}>{statusLabel}</span>
          <span className={`chevron${isCollapsed ? ' is-collapsed' : ''}`}>▾</span>
        </div>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <div className="card-body">
          <div className="row2">
            {/* Date */}
            <div className="fg">
              <label className="lbl">Date <span className="req">*</span></label>
              <input
                type="date"
                className={cn('fc', fe.date && 'has-error')}
                value={d.date || ''}
                onChange={e => patchExtracted({ date: e.target.value })}
              />
              {fe.date && <div className="field-error">{fe.date}</div>}
              {!fe.date && isOldDate(d.date) && (
                <div className="alert alert-warning em-date-warn">
                  Date is before the current month.
                </div>
              )}
            </div>
            {/* Supplier */}
            <div className="fg">
              <label className="lbl">Supplier <span className="req">*</span></label>
              <SupplierCombobox
                value={d.supplier || ''}
                companies={companies}
                hasError={!!(fe.supplier || fe.company)}
                onInput={v => onUpdate(item.id, i => ({ extracted: { ...i.extracted, supplier: v }, company: null, fieldErrors: { ...i.fieldErrors, supplier: undefined, company: undefined } }))}
                onSelect={(cid, name) => onUpdate(item.id, i => ({
                  extracted: { ...i.extracted, supplier: name },
                  company: { status: 'matched', matchedId: cid, matchedName: name, similar: [], chosenId: cid, chosenName: name, errorMsg: null },
                  fieldErrors: { ...i.fieldErrors, supplier: undefined, company: undefined },
                }))}
                onCreateFromInput={name => onCreate(item.id, name)}
              />
              {fe.supplier && <div className="field-error">{fe.supplier}</div>}
              <div className="co-block">
                <CompanyStatus
                  company={item.company}
                  supplierName={d.supplier}
                  hasError={!!fe.company}
                  onRecheck={() => onRecheck(item.id)}
                  onChoose={(cid, name) => onChoose(item.id, cid, name)}
                  onCreate={name => onCreate(item.id, name)}
                />
              </div>
              {fe.company && !fe.supplier && <div className="field-error">{fe.company}</div>}
            </div>
          </div>

          {/* Expense name */}
          <div className="fg">
            <label className="lbl">Expense Name <span className="req">*</span></label>
            <input
              type="text" className={cn('fc', fe.itemName && 'has-error')} value={d.itemName || ''}
              onChange={e => patchExtracted({ itemName: e.target.value })}
            />
            {fe.itemName && <div className="field-error">{fe.itemName}</div>}
          </div>

          {/* Description */}
          <div className="fg">
            <label className="lbl">Notes / Description</label>
            <input
              type="text"
              className="fc"
              value={d.description}
              placeholder={`Submitted by ${initials || 'XX'}`}
              onChange={e => patchExtracted({ description: e.target.value })}
            />
            <div className="hint">Pushed to Streamtime as the expense description</div>
          </div>

          {/* Reference */}
          <div className="fg">
            <label className="lbl">Reference <span className="req">*</span></label>
            <input
              type="text" className={cn('fc', fe.reference && 'has-error')} value={d.reference || ''}
              onChange={e => patchExtracted({ reference: e.target.value })}
            />
            {fe.reference && <div className="field-error">{fe.reference}</div>}
          </div>

          {/* Amounts */}
          <div className="row4 items-end">
            <div className="fg mb-0">
              <label className="lbl">Cost Ex GST <span className="req">*</span></label>
              <div className={cn('pfx', fe.amountExGST && 'has-error')}>
                <span className="pfx-lbl">$</span>
                <input
                  type="number" className="fc" value={exGST || ''} step="0.01" min="0"
                  onChange={e => recalcGST(parseFloat(e.target.value) || 0, item.gstPct)}
                />
              </div>
              {fe.amountExGST && <div className="field-error">{fe.amountExGST}</div>}
            </div>
            <div className="fg mb-0">
              <label className="lbl">GST <span className="req">*</span></label>
              <div className="pfx">
                <input
                  type="number" className="fc" value={item.gstPct} min="0" max="100" step="1"
                  onChange={e => {
                    const pct = parseFloat(e.target.value) || 0
                    onUpdate(item.id, { gstPct: pct })
                    recalcGST(exGST, pct)
                  }}
                />
                <span className="pfx-lbl">%</span>
              </div>
            </div>
            <div className="fg mb-0">
              <label className="lbl">Total Inc GST</label>
              <div className="pfx">
                <span className="pfx-lbl">$</span>
                <input
                  type="number" className="fc fc-readonly" value={total || ''} step="0.01" readOnly
                />
              </div>
            </div>
            <div className="fg mb-0">
              <label className="lbl">Markup <span className="req">*</span></label>
              <div className="pfx">
                <input
                  type="number" className="fc" value={item.markup} min="0" max="200" step="0.5"
                  onChange={e => onUpdate(item.id, { markup: parseFloat(e.target.value) || 0 })}
                />
                <span className="pfx-lbl">%</span>
              </div>
            </div>
          </div>

          {/* Final sum */}
          <div className="final-sum">
            <span className="final-sum-label">Total inc. GST + {item.markup}% Markup</span>
            <span className="final-sum-value">${sell.toFixed(2)}</span>
          </div>

          {/* Drive filename */}
          <div className="fg mt-[14px]">
            <label className="lbl">Drive Filename</label>
            <div className="fname-box">{fn || '—'}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ExpenseWizard ─────────────────────────────────────────────────
// Client component — manages steps 2-4 (upload, review, success).
// Rendered in-place by ExpensesManagerClient; no page navigation needed.

export default function ExpenseWizard({ job, onBack }: { job: Job; onBack: () => void }) {
  const {
    step, setStep,
    companies,
    queue,
    driveEnabled, setDriveEnabled,
    driveStatus, driveMsg: _driveMsg,
    submitError, submitting,
    results, initials,
    readyCount, pendingCount, reviewable,
    addFiles, removeFile, clearQueue, updateItem,
    extractAll,
    checkCompany, chooseCompany, createCompany,
    authDrive,
    handleSubmit,
    reset,
  } = useExpenses(job)

  // Mirror the internal step into the WizardContext so the ToolHeader
  // sub-nav indicator stays in sync. useExpenses moves 2 → 3 → 4.
  const { setStep: setCtxStep } = useWizard()
  useEffect(() => { setCtxStep(step as WizardStep) }, [step, setCtxStep])

  // Track which item IDs have already had checkCompany triggered, so we
  // don't fire duplicate checks when reviewable re-renders.
  const checkedIds = useRef<Set<number>>(new Set())

  // When the review step loads (or when reviewable changes while on step 3),
  // run the supplier check for any item that hasn't been checked yet.
  // Using reviewable in the dep array ensures this runs once items are
  // actually populated — the previous [step]-only dep caused a stale
  // closure where reviewable was empty on first fire.
  useEffect(() => {
    if (step !== 3) return
    for (const item of reviewable) {
      if (item.company === null && !checkedIds.current.has(item.id)) {
        checkedIds.current.add(item.id)
        checkCompany(item.id)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, reviewable])

  return (
    <>
      {/* ── Step 2: Upload Receipts ────────────────────────────── */}
      {step === 2 && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">Upload Receipts</div>
            <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
          </div>
          <div className="card-body">
            <div className="job-banner">
              <div>
                <div className="job-banner-label">Selected Job</div>
                <div className="job-banner-name">{job.full || job.name}</div>
                <div className="job-banner-meta">{[job.num, job.client].filter(Boolean).join(' · ')}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={onBack}>Change</button>
            </div>
            <DropZone onFiles={addFiles} />
            {queue.length > 0 && (
              <div className="mt-4">
                <div className="queue-hdr">
                  <div className="queue-count"><span>{readyCount}</span> receipt(s) ready</div>
                  <button className="btn btn-ghost btn-sm" onClick={clearQueue}>Clear all</button>
                </div>
                <div className="queue-list">
                  {queue.map(item => (
                    <QueueRow key={item.id} item={item} onRemove={removeFile} />
                  ))}
                </div>
              </div>
            )}
            <div className="step-ftr mt-4">
              <button className="btn btn-secondary" disabled={pendingCount === 0} onClick={extractAll}>
                Extract Details
              </button>
              <button className="btn btn-primary" disabled={readyCount === 0} onClick={() => setStep(3)}>
                Review &amp; Submit →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 3: Review & Submit ────────────────────────────── */}
      {step === 3 && (
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">Review &amp; Submit</div>
            <button className="btn btn-secondary btn-sm" onClick={() => setStep(2)}>← Back</button>
          </div>
          <div className="card-body">
            <div className="job-banner mb-4">
              <div>
                <div className="job-banner-label">Job</div>
                <div className="job-banner-name">{job.full || job.name}</div>
              </div>
            </div>
            {reviewable.length === 0
              ? <div className="alert alert-warning">No extracted expenses to review.</div>
              : reviewable.map(item => (
                  <ReviewCard
                    key={item.id}
                    item={item}
                    companies={companies}
                    initials={initials}
                    job={job}
                    onUpdate={updateItem}
                    onRecheck={checkCompany}
                    onChoose={chooseCompany}
                    onCreate={createCompany}
                  />
                ))
            }
            <div className="divider" />
            <div className="fg">
              <div className="toggle-row">
                <div>
                  <div className="toggle-lbl">Save receipts to Google Drive</div>
                  <div className="toggle-sub">Uploads files into a monthly folder (e.g. April 2026)</div>
                </div>
                <input
                  type="checkbox"
                  checked={driveEnabled}
                  onChange={e => {
                    const checked = e.target.checked
                    setDriveEnabled(checked)
                    // Trigger auth immediately when enabling — no separate button press needed.
                    // authDrive() will also call setDriveEnabled(false) if the popup is dismissed.
                    if (checked && driveStatus !== 'connected') {
                      authDrive()
                    }
                  }}
                />
              </div>
              {driveEnabled && driveStatus !== 'connected' && (
                <div className="hint mt-[5px]">
                  A Google sign-in popup will appear. If it doesn&apos;t, allow popups for this site in your browser&apos;s address bar, then try again.
                </div>
              )}
            </div>
            {submitError && <div className="alert alert-error mt-[14px]">{submitError}</div>}
            <div className="step-ftr">
              <button className="btn btn-success btn-lg" disabled={submitting} onClick={handleSubmit}>
                {submitting ? <><span className="spin mr-[6px]" /> Submitting…</> : '✓ Submit All Expenses'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Success ────────────────────────────────────── */}
      {step === 4 && (
        <div className="card">
          <div className="card-body em-result-body">
            <div className="success-circle">✓</div>
            <h2 className="em-result-heading">
              {results.filter(r => r.ok).length === 1 ? 'Expense Logged!' : `${results.filter(r => r.ok).length} Expenses Logged!`}
            </h2>
            <p className="em-result-detail">
              Logged to <strong>{job.full || job.name}</strong>.
              {results.filter(r => !r.ok).length > 0 && (
                <span className="em-error-count"> {results.filter(r => !r.ok).length} failed.</span>
              )}
            </p>
            <div className="bulk-result-list">
              {results.map((r, i) => (
                <div key={i} className={`bulk-result-item${r.ok ? ' ok' : ' err'}`}>
                  <div className="bulk-result-icon">{r.ok ? '✓' : '✗'}</div>
                  <div>
                    <div className="bulk-result-name">{r.item.file.name}</div>
                    <div className="bulk-result-detail">
                      {r.ok
                        ? [
                            r.item.extracted.supplier,
                            `$${parseFloat(String(r.item.extracted.amountExGST)).toFixed(2)} ex GST`,
                            r.driveFileId ? `Drive: ${afyFolderName(r.item.extracted.date) || monthLabel(r.item.extracted.date)}` : null,
                            r.item.company?.status === 'created' ? 'New company created' : null,
                          ].filter(Boolean).join(' · ')
                        : r.error
                      }
                    </div>
                  </div>
                  {r.ok && r.driveFileId && (
                    <a
                      href={`https://drive.google.com/file/d/${r.driveFileId}/view`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary btn-sm ml-auto"
                    >
                      Drive ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
            <div className="em-result-actions">
              <a
                href={`https://hopefulmonsters.app.streamtime.net/#jobs/${job.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                View in Streamtime →
              </a>
            </div>
            <div className="mt-6">
              <button className="btn btn-primary" onClick={reset}>Log More Expenses</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
