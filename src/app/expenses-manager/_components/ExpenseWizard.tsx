'use client'

import { useState } from 'react'
import type { Job, CompanyState, QueueItem, Extracted } from '../_types'
import { fmtSize, isOldDate, buildFilename, afyFolderName, monthLabel } from '../_utils'
import { useExpenses } from '../_hooks/useExpenses'
import { DropZone } from './DropZone'
import { QueueRow } from './QueueRow'
import { CompanyStatus } from './CompanyStatus'
import { SupplierCombobox } from './SupplierCombobox'

// ── StepIndicator ─────────────────────────────────────────────────
// step: 1 = Select Job (JobPicker), 2 = Upload Receipts, 3 = Review & Submit

export function StepIndicator({ step }: { step: number }) {
  const cls = (n: number) =>
    `step${step === n ? ' active' : step > n ? ' done' : ''}`
  return (
    <div className="steps">
      <div className={cls(1)}>
        <div className="step-num">1</div>
        <div className="step-lbl">Select Job</div>
      </div>
      <div className="step-connector" />
      <div className={cls(2)}>
        <div className="step-num">2</div>
        <div className="step-lbl">Upload Receipts</div>
      </div>
      <div className="step-connector" />
      <div className={cls(3)}>
        <div className="step-num">3</div>
        <div className="step-lbl">Review &amp; Submit</div>
      </div>
    </div>
  )
}

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
  const [collapsed, setCollapsed] = useState(false)
  const d      = item.extracted
  const isPdf  = item.mimeType === 'application/pdf'
  const exGST  = parseFloat(String(d.amountExGST)) || 0
  const gstAmt = parseFloat(String(d.gstAmount)) || Math.round(exGST * item.gstPct / 100 * 100) / 100
  const total  = parseFloat(String(d.totalIncGST)) || Math.round((exGST + gstAmt) * 100) / 100
  const sell   = Math.round(total * (1 + item.markup / 100) * 100) / 100
  const fn     = buildFilename(item, job.num, job.id, initials)

  const statusClass = ({ ready: 'sb-ready', done: 'sb-done', error: 'sb-error' } as Record<string, string>)[item.status] ?? 'sb-pending'
  const statusLabel = ({ ready: 'Ready', done: 'Submitted', error: 'Error' } as Record<string, string>)[item.status] ?? item.status

  function patchExtracted(fields: Partial<Extracted>) {
    onUpdate(item.id, i => ({ extracted: { ...i.extracted, ...fields } }))
  }

  function recalcGST(ex: number, pct: number) {
    const gst = Math.round(ex * pct / 100 * 100) / 100
    const tot = Math.round((ex + gst) * 100) / 100
    onUpdate(item.id, i => ({ extracted: { ...i.extracted, amountExGST: ex, gstAmount: gst, totalIncGST: tot } }))
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      {/* Header */}
      <div
        className="card-hdr collapsible"
        style={{ background: 'var(--surface-2)' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{isPdf ? '📄' : '🖼️'}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{item.file.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtSize(item.file.size)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`sbadge ${statusClass}`}>{statusLabel}</span>
          <span className={`chevron${collapsed ? ' is-collapsed' : ''}`}>▾</span>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="card-body">
          <div className="row2">
            {/* Date */}
            <div className="fg">
              <label className="lbl">Date <span className="req">*</span></label>
              <input
                type="date"
                className="fc"
                value={d.date || ''}
                onChange={e => patchExtracted({ date: e.target.value })}
              />
              {isOldDate(d.date) && (
                <div className="alert alert-warning" style={{ marginTop: 6, marginBottom: 0, padding: '7px 11px', fontSize: 12 }}>
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
                onInput={v => onUpdate(item.id, i => ({ extracted: { ...i.extracted, supplier: v }, company: null }))}
                onSelect={(cid, name) => onUpdate(item.id, i => ({
                  extracted: { ...i.extracted, supplier: name },
                  company: { status: 'matched', matchedId: cid, matchedName: name, similar: [], chosenId: cid, chosenName: name, errorMsg: null },
                }))}
                onCreateFromInput={name => onCreate(item.id, name)}
              />
              <div className="co-block">
                <CompanyStatus
                  company={item.company}
                  supplierName={d.supplier}
                  onRecheck={() => onRecheck(item.id)}
                  onChoose={(cid, name) => onChoose(item.id, cid, name)}
                  onCreate={name => onCreate(item.id, name)}
                />
              </div>
            </div>
          </div>

          {/* Expense name */}
          <div className="fg">
            <label className="lbl">Expense Name <span className="req">*</span></label>
            <input type="text" className="fc" value={d.itemName || ''} onChange={e => patchExtracted({ itemName: e.target.value })} />
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
            <input type="text" className="fc" value={d.reference || ''} onChange={e => patchExtracted({ reference: e.target.value })} />
          </div>

          {/* Amounts */}
          <div className="row4" style={{ alignItems: 'end' }}>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="lbl">Cost Ex GST <span className="req">*</span></label>
              <div className="pfx">
                <span className="pfx-lbl">$</span>
                <input
                  type="number" className="fc" value={exGST || ''} step="0.01" min="0"
                  onChange={e => recalcGST(parseFloat(e.target.value) || 0, item.gstPct)}
                />
              </div>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
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
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="lbl">Total Inc GST</label>
              <div className="pfx">
                <span className="pfx-lbl">$</span>
                <input
                  type="number" className="fc" value={total || ''} step="0.01" readOnly
                  style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
                />
              </div>
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
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
          <div className="fg" style={{ marginTop: 14 }}>
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
    driveStatus, driveMsg,
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

  return (
    <>
      <StepIndicator step={step} />

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
              <div style={{ marginTop: 16 }}>
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
            <div className="step-ftr" style={{ marginTop: 16 }}>
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
            <div className="job-banner" style={{ marginBottom: 16 }}>
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
              {driveEnabled && (
                <div>
                  <div className={`drive-status-bar${driveStatus === 'connected' ? ' connected' : driveStatus === 'connecting' ? ' connecting' : driveStatus === 'failed' ? ' failed' : ''}`}>
                    <span>{driveMsg}</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={authDrive}
                      disabled={driveStatus === 'connected' || driveStatus === 'connecting'}
                      style={{ marginLeft: 'auto' }}
                    >
                      {driveStatus === 'connected' ? '✓ Connected' : driveStatus === 'connecting' ? 'Connecting…' : '🔑 Connect Google Account'}
                    </button>
                  </div>
                  <div className="hint" style={{ marginTop: 5 }}>
                    A Google sign-in popup will appear. If it doesn&apos;t, allow popups for this site in your browser&apos;s address bar, then try again.
                  </div>
                </div>
              )}
            </div>
            {submitError && <div className="alert alert-error" style={{ marginTop: 14 }}>{submitError}</div>}
            <div className="step-ftr">
              <button className="btn btn-success btn-lg" disabled={submitting} onClick={handleSubmit}>
                {submitting ? <><span className="spin" style={{ marginRight: 6 }} /> Submitting…</> : '✓ Submit All Expenses'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 4: Success ────────────────────────────────────── */}
      {step === 4 && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '44px 24px' }}>
            <div className="success-circle">✓</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 28, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 8 }}>
              {results.filter(r => r.ok).length === 1 ? 'Expense Logged!' : `${results.filter(r => r.ok).length} Expenses Logged!`}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
              Logged to <strong>{job.full || job.name}</strong>.
              {results.filter(r => !r.ok).length > 0 && (
                <span style={{ color: 'var(--error)' }}> {results.filter(r => !r.ok).length} failed.</span>
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
                      className="btn btn-secondary btn-sm"
                      style={{ marginLeft: 'auto' }}
                    >
                      Drive ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
              <a
                href={`https://hopefulmonsters.app.streamtime.net/#jobs/${job.id}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                View in Streamtime →
              </a>
            </div>
            <div style={{ marginTop: 24 }}>
              <button className="btn btn-primary" onClick={reset}>Log More Expenses</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
