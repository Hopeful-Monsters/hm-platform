'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import './expenses-manager.css'

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface Job {
  id: string
  name: string
  num: string | null
  full: string | null
  client: string
}

interface Extracted {
  date: string
  supplier: string
  itemName: string
  reference: string
  amountExGST: number | string
  gstAmount: number | string
  totalIncGST: number | string
  description?: string
}

interface Company {
  status: 'checking' | 'matched' | 'similar' | 'notfound' | 'created' | 'error'
  matchedId: string | number | null
  matchedName: string | null
  similar: Array<{ id: string | number; name: string }>
  chosenId: string | number | null
  chosenName: string | null
  errorMsg: string | null
}

interface QueueItem {
  id: number
  file: File
  b64: string | null
  mimeType: string
  status: 'pending' | 'extracting' | 'ready' | 'submitting' | 'done' | 'error'
  extracted: Extracted
  markup: number | null
  gstPct?: number
  company: Company | null
  error: string | null
  driveFileId: string | null
}

// ─────────────────────────────────────────────────────────────────
// Module-level state  (survives re-renders, reset on each mount)
// ─────────────────────────────────────────────────────────────────

let cfg: Record<string, string> = {}
let allJobs: Job[] = []
let jobsById: Record<string, Job> = {}
let selectedJob: Job | null = null
let allCompanies: Array<{ id: string | number; name: string }> = []
let driveToken: string | null = null
let step = 1
let queue: QueueItem[] = []
let nextQueueId = 1
const driveFolderCache: Record<string, string> = {}
const driveFolderInflight: Record<string, Promise<string | null>> = {}

// ─────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────

function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
function setText(id: string, v: string) {
  const el = document.getElementById(id); if (el) el.textContent = v
}
function today(): string { return new Date().toISOString().split('T')[0] }
function sleep(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)) }
function fmtSize(b: number): string {
  if (b < 1024) return b + ' B'
  if (b < 1024 ** 2) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1024 ** 2).toFixed(1) + ' MB'
}
function showErr(id: string, msg: string) {
  const el = document.getElementById(id); if (!el) return
  el.innerHTML = msg; el.classList.remove('hidden')
}

// ─────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────

function loadCfg() {
  try { cfg = JSON.parse(localStorage.getItem('elSettings') || '{}') } catch { cfg = {} }
}



// ─────────────────────────────────────────────────────────────────
// Worker + Jobs
// ─────────────────────────────────────────────────────────────────

async function loadJobs() {
  showState('loading')
  try {
    const res = await fetch('/api/expenses-manager/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wildcardSearch: '', offset: 0, maxResults: 500, filterGroupCollection: { conditionMatchTypeId: 1, filterGroupCollections: [] } }),
    })
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `Error ${res.status}`) }
    const data = await res.json()
    allJobs = (data.searchResults || []).map(normaliseJob).filter((j: Job) => j.id && j.name)
    allJobs.forEach(j => { jobsById[j.id] = j })
    if (!allJobs.length) throw new Error('No jobs returned. Check STREAMTIME_KEY is set.')
    showState('jobs'); renderJobs(allJobs)
    loadAllCompanies()
  } catch (err: unknown) { showState('error', (err as Error).message) }
}

async function loadAllCompanies() {
  try {
    const res = await fetch('/api/expenses-manager/companies/all')
    if (!res.ok) return
    const data = await res.json()
    if (data.companies?.length) allCompanies = data.companies
  } catch {}
}

function normaliseJob(r: Record<string, unknown>): Job {
  return {
    id:     String(r.id ?? r.jobId ?? r['Job ID'] ?? r['ID']),
    name:   String(r.name ?? r.jobName ?? r['Job Name'] ?? r['Name'] ?? ''),
    num:    String(r.number ?? r.jobNumber ?? r['Job Number'] ?? r['Number'] ?? '') || null,
    full:   String(r.fullName ?? r['Full Name'] ?? '') || null,
    client: String((typeof r.company === 'object' ? (r.company as Record<string,unknown>)?.name : r.company) ?? r.companyName ?? r['Company'] ?? r['Client'] ?? ''),
  }
}

function showState(state: string, msg = '') {
  ;['noKey', 'loading', 'error', 'jobs'].forEach(s => document.getElementById(`s1_${s}`)?.classList.add('hidden'))
  const el = document.getElementById(`s1_${state}`)
  if (!el) return
  if (state === 'error') el.innerHTML = '⚠️ ' + msg
  el.classList.remove('hidden')
}

function renderJobs(jobs: Job[]) {
  const list = document.getElementById('jobsList')
  if (!list) return
  if (!jobs.length) { list.innerHTML = '<div class="empty"><div class="empty-ico">🔍</div>No matching jobs</div>'; return }
  list.innerHTML = jobs.map(j => `
    <div class="job-item ${selectedJob?.id === j.id ? 'selected' : ''}" onclick="pickJob('${esc(j.id)}')" data-jid="${esc(j.id)}">
      <div><div class="job-name">${esc(j.full || j.name)}</div>${j.client ? `<div class="job-meta">${esc(j.client)}</div>` : ''}</div>
      ${j.num ? `<span class="job-badge">${esc(j.num)}</span>` : ''}
    </div>`).join('')
}

function filterJobs() {
  const q = (document.getElementById('jobSearch') as HTMLInputElement).value.toLowerCase()
  renderJobs(allJobs.filter(j =>
    (j.name || '').toLowerCase().includes(q) || (j.num || '').toLowerCase().includes(q) ||
    (j.client || '').toLowerCase().includes(q) || (j.full || '').toLowerCase().includes(q)
  ))
}

function pickJob(id: string) {
  selectedJob = jobsById[id]
  if (!selectedJob) return
  document.querySelectorAll('.job-item').forEach(el => el.classList.toggle('selected', (el as HTMLElement).dataset.jid === id))
  document.getElementById('s1_actions')?.classList.remove('hidden')
  const name = selectedJob.full || selectedJob.name || ''
  const meta = [selectedJob.num, selectedJob.client].filter(Boolean).join(' · ')
  setText('s2_jobName', name); setText('s2_jobMeta', meta); setText('s3_jobName', name)
}

// ─────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────

function goStep(n: number) {
  if (n === 2 && !selectedJob) { alert('Please select a job first.'); return }
  if (n === 3 && !queue.some(i => i.status === 'ready' || i.status === 'done')) { alert('Please extract at least one receipt first.'); return }
  if (n === 3) renderReviewList()
  setStep(n)
}

function setStep(n: number) {
  step = n
  for (let i = 1; i <= 4; i++) document.getElementById(`step${i}`)?.classList.toggle('hidden', i !== n)
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`si${i}`); if (!el) continue
    el.classList.remove('active', 'done')
    if (i < n) el.classList.add('done'); else if (i === n) el.classList.add('active')
  }
}

// ─────────────────────────────────────────────────────────────────
// File handling
// ─────────────────────────────────────────────────────────────────

function setupDrop() {
  const zone = document.getElementById('dropZone')
  if (!zone) return
  const over  = () => zone.classList.add('over')
  const leave = () => zone.classList.remove('over')
  const drop  = (e: DragEvent) => {
    e.preventDefault(); zone.classList.remove('over')
    if (e.dataTransfer?.files?.length) handleFileSelect(e.dataTransfer.files)
  }
  zone.addEventListener('dragover', e => { e.preventDefault(); over() })
  zone.addEventListener('dragleave', leave)
  zone.addEventListener('drop', drop as EventListener)
}

function handleFileSelect(files: FileList) {
  document.getElementById('s2_error')?.classList.add('hidden')
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  Array.from(files).forEach(file => {
    if (file.size > 20 * 1024 * 1024) { showErr('s2_error', `${file.name}: too large (max 20 MB).`); return }
    if (!allowed.includes(file.type))  { showErr('s2_error', `${file.name}: unsupported type.`); return }
    const item: QueueItem = {
      id: nextQueueId++, file, b64: null, mimeType: file.type, status: 'pending',
      extracted: { date: today(), supplier: '', itemName: '', reference: '', amountExGST: '', gstAmount: '', totalIncGST: '' },
      markup: null, company: null, error: null, driveFileId: null,
    }
    queue.push(item)
    const reader = new FileReader()
    reader.onload = e => { item.b64 = (e.target?.result as string).split(',')[1] }
    reader.readAsDataURL(file)
  })
  ;(document.getElementById('fileInput') as HTMLInputElement).value = ''
  renderQueueList()
}

function clearQueue()           { queue = []; renderQueueList() }
function removeQueueItem(id: number) { queue = queue.filter(i => i.id !== id); renderQueueList() }

// ─────────────────────────────────────────────────────────────────
// Queue render — Step 2
// ─────────────────────────────────────────────────────────────────

function renderQueueList() {
  const wrap       = document.getElementById('queueWrap')
  const list       = document.getElementById('queueList')
  const extractBtn = document.getElementById('extractAllBtn') as HTMLButtonElement | null
  const proceedBtn = document.getElementById('proceedBtn')   as HTMLButtonElement | null
  if (!wrap || !list) return

  if (!queue.length) {
    wrap.classList.add('hidden')
    if (extractBtn) extractBtn.disabled = true
    if (proceedBtn) proceedBtn.disabled = true
    return
  }
  wrap.classList.remove('hidden')

  const readyCount   = queue.filter(i => i.status === 'ready' || i.status === 'done').length
  const pendingCount = queue.filter(i => i.status === 'pending').length
  setText('queueReadyCount', String(readyCount))
  if (extractBtn) extractBtn.disabled = pendingCount === 0
  if (proceedBtn) proceedBtn.disabled = readyCount === 0

  list.innerHTML = queue.map(item => {
    const d = item.extracted
    const isPdf       = item.mimeType === 'application/pdf'
    const processing  = item.status === 'extracting' || item.status === 'submitting'

    let detail = ''
    if      (item.status === 'pending')    detail = 'Pending extraction'
    else if (item.status === 'extracting') detail = 'Extracting with AI…'
    else if (item.status === 'submitting') detail = 'Submitting…'
    else if (item.status === 'error')      detail = `Error: ${esc(item.error || 'unknown')}`
    else                                   detail = esc(d.supplier || '—')

    const amountStr = (d.amountExGST !== '' && d.amountExGST != null)
      ? `$${parseFloat(String(d.amountExGST)).toFixed(2)} ex GST` : ''

    const sbMap: Record<string, string> = {
      pending: 'sb-pending Pending', extracting: 'sb-extracting Extracting…', ready: 'sb-ready Ready',
      submitting: 'sb-submitting Submitting…', done: 'sb-done Done', error: 'sb-error Error',
    }
    const [sbClass, sbLabel] = (sbMap[item.status] || 'sb-pending Pending').split(' ')

    let coBadge = ''
    if (item.company) {
      if (item.company.status === 'checking')
        coBadge = `<span class="sbadge sb-extracting">Checking…</span>`
      else if (['similar', 'notfound', 'error'].includes(item.company.status))
        coBadge = `<span class="sbadge sb-warn">⚠ Company</span>`
    }

    let dateBadge = ''
    if (item.extracted?.date) {
      const isPast = new Date(item.extracted.date) < new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      if (isPast) dateBadge = `<span class="sbadge sb-warn">⚠ Date</span>`
    }

    return `<div class="qrow" id="qrow_${item.id}">
      <div class="qrow-ico">${processing ? '<span class="spin" style="width:16px;height:16px;border-width:2px;"></span>' : (isPdf ? '📄' : '🖼️')}</div>
      <div class="qrow-main">
        <div class="qrow-filename">${esc(item.file.name)} · ${fmtSize(item.file.size)}</div>
        <div class="qrow-detail">${detail}</div>
      </div>
      ${amountStr ? `<div class="qrow-amount">${amountStr}</div>` : ''}
      <div class="qrow-badges">${dateBadge}${coBadge}<span class="sbadge ${sbClass}">${sbLabel}</span></div>
      ${!processing && item.status !== 'done'
        ? `<button class="btn btn-ghost btn-sm" onclick="removeQueueItem(${item.id})" title="Remove">✕</button>` : ''}
    </div>`
  }).join('')
}

// ─────────────────────────────────────────────────────────────────
// Extraction
// ─────────────────────────────────────────────────────────────────

async function extractAll() {
  const btn = document.getElementById('extractAllBtn') as HTMLButtonElement | null
  if (btn) btn.disabled = true
  for (const item of queue.filter(i => i.status === 'pending')) {
    await extractItem(item)
  }
  renderQueueList()
}

async function extractItem(item: QueueItem) {
  item.status = 'extracting'; item.error = null
  renderQueueList()
  let waited = 0
  while (!item.b64 && waited < 5000) { await sleep(100); waited += 100 }
  if (!item.b64) { item.status = 'error'; item.error = 'Could not read file.'; return }
  try {
    const res = await fetch('/api/expenses-manager/extract', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mimeType: item.mimeType, data: item.b64 }),
    })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error || `Worker error ${res.status}`)
    item.extracted = {
      date:        data.date        || today(),
      supplier:    data.supplier    || '',
      itemName:    data.itemName    || '',
      reference:   data.reference   || '',
      amountExGST: data.amountExGST ?? '',
      gstAmount:   data.gstAmount   ?? '',
      totalIncGST: data.totalIncGST ?? '',
    }
    item.status = 'ready'
  } catch (err: unknown) {
    item.status = 'error'; item.error = (err as Error).message
    await sleep(300); return
  }
  await checkCompany(item)
  await sleep(300)
}

// ─────────────────────────────────────────────────────────────────
// Company validation
// ─────────────────────────────────────────────────────────────────

async function checkCompany(item: QueueItem) {
  const name = item.extracted?.supplier?.trim()
  if (!name) return
  item.company = { status: 'checking', matchedId: null, matchedName: null, similar: [], chosenId: null, chosenName: null, errorMsg: null }
  try {
    const res = await fetch('/api/expenses-manager/companies/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: name }),
    })
    if (!res.ok) throw new Error(`Search error ${res.status}`)
    const data = await res.json()
    const results: Array<{ id: string | number; name: string }> = data.results || []
    if (!results.length) { item.company.status = 'notfound'; return }
    const exact = results.find(r => r.name?.toLowerCase() === name.toLowerCase())
    if (exact) {
      item.company = { status: 'matched', matchedId: exact.id, matchedName: exact.name, similar: [], chosenId: exact.id, chosenName: exact.name, errorMsg: null }
      return
    }
    item.company.status  = 'similar'
    item.company.similar = results.slice(0, 5)
  } catch (err: unknown) {
    item.company.status   = 'error'
    item.company.errorMsg = (err as Error).message
  }
}

async function checkCompanyForItem(itemId: number) {
  const item = queue.find(i => i.id === itemId)
  if (!item) return
  const supplierEl = document.getElementById(`r_supplier_${itemId}`) as HTMLInputElement | null
  if (supplierEl) item.extracted.supplier = supplierEl.value.trim()
  item.company = null
  const coBlock = document.getElementById(`r_co_${itemId}`)
  if (coBlock) coBlock.innerHTML = ''
  await checkCompany(item)
  if (coBlock) coBlock.innerHTML = buildCompanyBlock(item)
  renderQueueList()
}

async function createCompany(itemId: number, name: string) {
  const item = queue.find(i => i.id === itemId)
  if (!item) return
  const btn = document.getElementById(`co_create_${itemId}`) as HTMLButtonElement | null
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…' }
  try {
    const res = await fetch('/api/expenses-manager/companies/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || data.error || `Error ${res.status}`)
    item.company = { status: 'created', matchedId: data.id, matchedName: data.name || name, similar: [], chosenId: data.id, chosenName: data.name || name, errorMsg: null }
    refreshReviewCard(item); renderQueueList()
  } catch (err: unknown) {
    if (btn) { btn.disabled = false; btn.textContent = `✚ Create "${name}"` }
    alert(`Failed to create company: ${(err as Error).message}`)
  }
}

function useCompany(itemId: number, companyId: string | number, companyName: string) {
  const item = queue.find(i => i.id === itemId)
  if (!item) return
  item.company = { status: 'matched', matchedId: companyId, matchedName: companyName, similar: [], chosenId: companyId, chosenName: companyName, errorMsg: null }
  refreshReviewCard(item); renderQueueList()
}

async function revalidateCompany(item: QueueItem) {
  const name = item.extracted?.supplier?.trim()
  if (!name) return false
  const co = item.company
  if ((co?.status === 'matched' || co?.status === 'created') && co.chosenName?.toLowerCase() === name.toLowerCase()) return true
  await checkCompany(item)
  return item.company?.status === 'matched' || item.company?.status === 'created'
}

// ─────────────────────────────────────────────────────────────────
// Step 3 — Review list
// ─────────────────────────────────────────────────────────────────

function renderReviewList() {
  const container = document.getElementById('s3_reviewList')
  if (!container) return
  const reviewable = queue.filter(i => ['ready', 'done', 'error'].includes(i.status))
  if (!reviewable.length) {
    container.innerHTML = '<div class="alert alert-warning">No extracted expenses to review.</div>'; return
  }
  container.innerHTML = reviewable.map(buildReviewCard).join('')
}

function refreshReviewCard(item: QueueItem) {
  const el = document.getElementById(`review_${item.id}`)
  if (el) el.outerHTML = buildReviewCard(item)
}

function buildReviewCard(item: QueueItem): string {
  const d     = item.extracted
  const isPdf = item.mimeType === 'application/pdf'
  const fn    = getFilenameForItem(item)

  const isOldDate  = d.date && new Date(d.date) < new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const dateWarnHtml = `<div class="alert alert-warning" style="margin-top:6px;margin-bottom:0;padding:7px 11px;font-size:12px;${isOldDate ? '' : 'display:none;'}" id="r_datewarn_${item.id}">Date is before the current month.</div>`

  const statusClass = ({ ready: 'sb-ready', done: 'sb-done', error: 'sb-error' } as Record<string,string>)[item.status] || 'sb-pending'
  const statusLabel = ({ ready: 'Ready',    done: 'Submitted', error: 'Error' }  as Record<string,string>)[item.status] || item.status

  const markup  = item.markup  != null ? item.markup  : 15
  const gstPct  = item.gstPct  != null ? item.gstPct  : 10
  const exGST   = parseFloat(String(d.amountExGST)) || 0
  const gstAmt  = parseFloat(String(d.gstAmount))  || Math.round(exGST * gstPct / 100 * 100) / 100
  const total   = parseFloat(String(d.totalIncGST)) || Math.round((exGST + gstAmt) * 100) / 100
  const sellTotal  = Math.round(total * (1 + markup / 100) * 100) / 100
  const descDefault = d.itemName    || ''
  const noteDefault = d.description || `Submitted by ${cfg.initials || 'XX'}`

  const supplierFilter = (d.supplier || '').toLowerCase()
  const ddOptions = allCompanies
    .filter(c => !supplierFilter || c.name.toLowerCase().includes(supplierFilter))
    .slice(0, 8)
    .map(c => `<div class="supplier-opt" onmousedown="selectSupplier(${item.id},'${esc(c.name).replace(/'/g, "\\'")}',${c.id})" data-id="${c.id}">
      <span class="supplier-opt-name">${esc(c.name)}</span>
    </div>`).join('')

  const showNewOpt = d.supplier && !allCompanies.some(c => c.name.toLowerCase() === d.supplier.toLowerCase())
  const newOpt = showNewOpt ? `<div class="supplier-opt" onmousedown="createCompanyFromInput(${item.id})">
    <span class="supplier-opt-new">✚ Create "${esc(d.supplier)}"</span>
  </div>` : ''

  return `<div class="card" style="margin-bottom:14px;" id="review_${item.id}">
    <div class="card-hdr collapsible" style="background:var(--g100);" onclick="toggleReviewCard(${item.id})">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">${isPdf ? '📄' : '🖼️'}</span>
        <div><div style="font-size:13px;font-weight:600;color:var(--g800);">${esc(item.file.name)}</div><div style="font-size:11px;color:var(--g500);">${fmtSize(item.file.size)}</div></div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="sbadge ${statusClass}">${statusLabel}</span>
        <span class="chevron" id="r_chevron_${item.id}">▾</span>
      </div>
    </div>
    <div class="card-body" id="r_body_${item.id}">
      <div class="row2">
        <div class="fg">
          <label class="lbl">Date <span class="req">*</span></label>
          <input type="date" id="r_date_${item.id}" class="fc" value="${esc(d.date || '')}"
            onchange="updateReviewField(${item.id},'date',this.value); checkDateWarn(${item.id},this.value)">
          ${dateWarnHtml}
        </div>
        <div class="fg">
          <label class="lbl">Supplier <span class="req">*</span></label>
          <div class="supplier-wrap">
            <input type="text" id="r_supplier_${item.id}" class="fc" value="${esc(d.supplier || '')}" autocomplete="off"
              oninput="onSupplierInput(${item.id},this.value)"
              onfocus="openSupplierDd(${item.id})"
              onblur="closeSupplierDd(${item.id})"
              onkeydown="supplierKeyNav(event,${item.id})">
            <div class="supplier-dropdown" id="r_sdd_${item.id}">${ddOptions}${newOpt}</div>
          </div>
          <div class="co-block" id="r_co_${item.id}">${buildCompanyBlock(item)}</div>
        </div>
      </div>
      <div class="fg">
        <label class="lbl">Expense Name <span class="req">*</span></label>
        <input type="text" id="r_itemName_${item.id}" class="fc" value="${esc(descDefault)}"
          oninput="updateReviewField(${item.id},'itemName',this.value)">
      </div>
      <div class="fg">
        <label class="lbl">Notes / Description</label>
        <input type="text" id="r_desc_${item.id}" class="fc" value="${esc(noteDefault)}"
          placeholder="Submitted by ${esc(cfg.initials || 'XX')}"
          oninput="updateReviewField(${item.id},'description',this.value)">
        <div class="hint">Pushed to Streamtime as the expense description</div>
      </div>
      <div class="fg">
        <label class="lbl">Reference <span class="req">*</span></label>
        <input type="text" id="r_reference_${item.id}" class="fc" value="${esc(d.reference || '')}"
          oninput="updateReviewField(${item.id},'reference',this.value)">
      </div>
      <div class="row4" style="align-items:end;">
        <div class="fg" style="margin-bottom:0;">
          <label class="lbl">Cost Ex GST <span class="req">*</span></label>
          <div class="pfx"><span class="pfx-lbl">$</span>
          <input type="number" id="r_exGST_${item.id}" class="fc" value="${exGST || ''}" step="0.01" min="0"
            oninput="updateReviewField(${item.id},'amountExGST',parseFloat(this.value)||0);calcReviewGST(${item.id})"></div>
        </div>
        <div class="fg" style="margin-bottom:0;">
          <label class="lbl">GST <span class="req">*</span></label>
          <div class="pfx">
            <input type="number" id="r_gstpct_${item.id}" class="fc" value="${gstPct}" min="0" max="100" step="1"
              oninput="updateReviewGstPct(${item.id},this.value)">
            <span class="pfx-lbl">%</span>
          </div>
        </div>
        <div class="fg" style="margin-bottom:0;">
          <label class="lbl">Total Inc GST</label>
          <div class="pfx"><span class="pfx-lbl">$</span>
          <input type="number" id="r_total_${item.id}" class="fc" value="${total || ''}" step="0.01" readonly
            style="background:var(--g100);color:var(--g500);"></div>
        </div>
        <div class="fg" style="margin-bottom:0;">
          <label class="lbl">Markup <span class="req">*</span></label>
          <div class="pfx">
            <input type="number" id="r_markup_${item.id}" class="fc" value="${markup}" min="0" max="200" step="0.5"
              oninput="updateReviewMarkup(${item.id},this.value)">
            <span class="pfx-lbl">%</span>
          </div>
        </div>
      </div>
      <div class="final-sum" id="r_finalsum_${item.id}">
        <span class="final-sum-label">Total inc. GST + ${markup}% Markup</span>
        <span class="final-sum-value">$${sellTotal.toFixed(2)}</span>
      </div>
      <div class="fg" style="margin-top:14px;">
        <label class="lbl">Drive Filename</label>
        <div class="fname-box" id="r_fname_${item.id}">${esc(fn || '—')}</div>
      </div>
    </div>
  </div>`
}

function buildCompanyBlock(item: QueueItem): string {
  const co = item.company
  if (!co) return ''
  if (co.status === 'checking')
    return `<div class="co-row loading"><span class="spin" style="width:12px;height:12px;border-width:2px;"></span> Checking company in Streamtime…</div>`
  if (co.status === 'matched')
    return `<div class="co-row ok">✓ Matched existing supplier</div>`
  if (co.status === 'created')
    return `<div class="co-row ok">✓ Created new supplier: <strong style="margin-left:4px;">${esc(co.matchedName)}</strong></div>`
  if (co.status === 'error')
    return `<div class="co-row warn">Company check failed: ${esc(co.errorMsg || 'unknown error')}</div>`

  const supplierName  = item.extracted?.supplier?.trim() || ''
  const safeSupplier  = esc(supplierName).replace(/'/g, "\\'")

  if (co.status === 'notfound') return `
    <div class="co-row warn">⚠ <strong>${esc(supplierName)}</strong> not found in Streamtime</div>
    <div class="co-actions">
      <button class="btn btn-warning btn-sm" id="co_create_${item.id}"
        onclick="createCompany(${item.id},'${safeSupplier}')">✚ Create company</button>
      <button class="btn btn-secondary btn-sm" onclick="checkCompanyForItem(${item.id})">↺ Re-check</button>
    </div>`

  if (co.status === 'similar') {
    const rows = co.similar.map(r => `
      <div class="co-similar-item" onclick="useCompany(${item.id},${r.id},'${esc(String(r.name)).replace(/'/g, "\\'")}')">
        <span class="co-similar-name">${esc(r.name)}</span>
        <span style="font-family:var(--font-heading);font-size:11px;font-weight:900;color:var(--accent-label);">Use →</span>
      </div>`).join('')
    return `
      <div class="co-row warn">⚠ No exact match for <strong>${esc(supplierName)}</strong>. Select a match or create:</div>
      <div class="co-similar-list">${rows}</div>
      <div class="co-actions">
        <button class="btn btn-warning btn-sm" id="co_create_${item.id}"
          onclick="createCompany(${item.id},'${safeSupplier}')">✚ Create "${esc(supplierName)}"</button>
        <button class="btn btn-secondary btn-sm" onclick="checkCompanyForItem(${item.id})">↺ Re-check</button>
      </div>`
  }
  return ''
}

// ─────────────────────────────────────────────────────────────────
// Review card helpers
// ─────────────────────────────────────────────────────────────────

function toggleReviewCard(id: number) {
  const body    = document.getElementById(`r_body_${id}`)
  const chevron = document.getElementById(`r_chevron_${id}`)
  if (!body) return
  const collapsed = body.classList.toggle('hidden')
  if (chevron) chevron.classList.toggle('is-collapsed', collapsed)
}

function checkDateWarn(id: number, dateVal: string) {
  const el = document.getElementById(`r_datewarn_${id}`)
  if (!el) return
  const isOld = dateVal && new Date(dateVal) < new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  el.style.display = isOld ? '' : 'none'
}

function updateReviewField(id: number, field: keyof Extracted, value: string | number) {
  const item = queue.find(i => i.id === id)
  if (!item) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(item.extracted as any)[field] = value
  setText(`r_fname_${id}`, getFilenameForItem(item) || '—')
  if (field === 'supplier') {
    item.company = null
    const coBlock = document.getElementById(`r_co_${id}`)
    if (coBlock) coBlock.innerHTML = ''
    rebuildSupplierDropdown(id, String(value))
  }
}

function updateReviewMarkup(id: number, value: string) {
  const item = queue.find(i => i.id === id)
  if (!item) return
  item.markup = value !== '' ? parseFloat(value) : 15
  updateFinalSum(id)
}

function updateReviewGstPct(id: number, value: string) {
  const item = queue.find(i => i.id === id)
  if (!item) return
  item.gstPct = value !== '' ? parseFloat(value) : 10
  calcReviewGST(id)
}

function calcReviewGST(id: number) {
  const item = queue.find(i => i.id === id)
  if (!item) return
  const ex  = parseFloat(String(item.extracted.amountExGST)) || 0
  const pct = item.gstPct != null ? item.gstPct : 10
  const gst = Math.round(ex * pct / 100 * 100) / 100
  const tot = Math.round((ex + gst) * 100) / 100
  item.extracted.gstAmount   = gst
  item.extracted.totalIncGST = tot
  const te = document.getElementById(`r_total_${id}`) as HTMLInputElement | null
  if (te) te.value = tot.toFixed(2)
  setText(`r_fname_${id}`, getFilenameForItem(item) || '—')
  updateFinalSum(id)
}

function updateFinalSum(id: number) {
  const item = queue.find(i => i.id === id)
  if (!item) return
  const total    = parseFloat(String(item.extracted.totalIncGST)) || 0
  const markup   = item.markup != null ? item.markup : 15
  const sellTotal = Math.round(total * (1 + markup / 100) * 100) / 100
  const fs = document.getElementById(`r_finalsum_${id}`)
  if (fs) {
    const lbl = fs.querySelector('.final-sum-label')
    const val = fs.querySelector('.final-sum-value')
    if (lbl) lbl.textContent = `Total inc. GST + ${markup}% Markup`
    if (val) val.textContent = `$${sellTotal.toFixed(2)}`
  }
}

// ─────────────────────────────────────────────────────────────────
// Supplier combobox
// ─────────────────────────────────────────────────────────────────

function openSupplierDd(id: number)  { document.getElementById(`r_sdd_${id}`)?.classList.add('open') }
function closeSupplierDd(id: number) { setTimeout(() => document.getElementById(`r_sdd_${id}`)?.classList.remove('open'), 150) }

function onSupplierInput(id: number, value: string) {
  updateReviewField(id, 'supplier', value)
  rebuildSupplierDropdown(id, value)
  openSupplierDd(id)
}

async function rebuildSupplierDropdown(id: number, filter: string) {
  const dd = document.getElementById(`r_sdd_${id}`)
  if (!dd) return
  const f = (filter || '').toLowerCase()
  let matches = allCompanies.filter(c => !f || c.name.toLowerCase().includes(f)).slice(0, 8)

  if (f.length >= 2 && matches.length === 0) {
    dd.innerHTML = `<div class="supplier-opt" style="color:var(--g400);font-size:12px;padding:8px 11px;font-style:italic;">Searching…</div>`
    try {
      const res = await fetch('/api/expenses-manager/companies/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: filter }),
      })
      if (res.ok) {
        const data = await res.json()
        const remote: Array<{ id: string | number; name: string }> = (data.results || []).slice(0, 8)
        remote.forEach(m => { if (!allCompanies.some(c => c.id === m.id)) allCompanies.push(m) })
        matches = remote
      }
    } catch {}
    const inputEl = document.getElementById(`r_supplier_${id}`) as HTMLInputElement | null
    if (!inputEl || inputEl.value.toLowerCase() !== f) return
  }

  const showNew = filter && !allCompanies.some(c => c.name.toLowerCase() === f)
  const opts = matches.map(c => `<div class="supplier-opt" onmousedown="selectSupplier(${id},'${esc(c.name).replace(/'/g, "\\'")}',${c.id})" data-id="${c.id}">
    <span class="supplier-opt-name">${esc(c.name)}</span>
  </div>`).join('')
  const newOpt = showNew ? `<div class="supplier-opt" onmousedown="createCompanyFromInput(${id})">
    <span class="supplier-opt-new">✚ Create "${esc(filter)}"</span>
  </div>` : ''
  dd.innerHTML = opts + newOpt
}

function selectSupplier(id: number, name: string, companyId: string | number) {
  const item = queue.find(i => i.id === id)
  if (!item) return
  const input = document.getElementById(`r_supplier_${id}`) as HTMLInputElement | null
  if (input) input.value = name
  item.extracted.supplier = name
  item.company = { status: 'matched', matchedId: companyId, matchedName: name, similar: [], chosenId: companyId, chosenName: name, errorMsg: null }
  const coBlock = document.getElementById(`r_co_${id}`)
  if (coBlock) coBlock.innerHTML = buildCompanyBlock(item)
  setText(`r_fname_${id}`, getFilenameForItem(item) || '—')
  renderQueueList()
  document.getElementById(`r_sdd_${id}`)?.classList.remove('open')
}

async function createCompanyFromInput(id: number) {
  const item = queue.find(i => i.id === id)
  if (!item) return
  const name = (document.getElementById(`r_supplier_${id}`) as HTMLInputElement | null)?.value?.trim()
  if (!name) return
  item.extracted.supplier = name
  await createCompany(id, name)
}

function supplierKeyNav(e: KeyboardEvent, id: number) {
  if (e.key === 'Escape') document.getElementById(`r_sdd_${id}`)?.classList.remove('open')
}

// ─────────────────────────────────────────────────────────────────
// Drive filename
// ─────────────────────────────────────────────────────────────────

function getFilenameForItem(item: QueueItem): string | null {
  const d = item.extracted
  if (!d.date || !d.supplier || d.totalIncGST == null || d.totalIncGST === '') return null
  const [y, m, day] = d.date.split('-')
  const fdate = `${day}.${m}.${(y || '').slice(2)}`
  const fsup  = (d.supplier || '').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '')
  const amt   = parseFloat(String(d.totalIncGST)).toFixed(2)
  const jc    = selectedJob?.num || selectedJob?.id || ''
  const ini   = cfg.initials || 'XX'
  const ext   = item.mimeType === 'application/pdf' ? '.pdf' : '.' + (item.file.name.split('.').pop() || 'jpg')
  return `${fdate}_${fsup}_${ini}_${jc}_$${amt}${ext}`
}

// ─────────────────────────────────────────────────────────────────
// Google Drive — Auth + month folders
// ─────────────────────────────────────────────────────────────────

function trySilentDriveAuth() {
  if (!cfg.gcid || !localStorage.getItem('driveAuthorised')) return
  let attempts = 0
  const tryAuth = () => {
    const g = (window as unknown as Record<string, unknown>).google as Record<string, unknown> | undefined
    if (!g?.accounts) {
      if (++attempts < 50) { setTimeout(tryAuth, 100); return }
      return
    }
    updateDriveUI('connecting', 'Reconnecting to Google Drive…')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = (g.accounts as any).oauth2.initTokenClient({
      client_id: cfg.gcid,
      scope: 'https://www.googleapis.com/auth/drive',
      callback: (r: { error?: string; access_token?: string }) => {
        if (r.error) { localStorage.removeItem('driveAuthorised'); updateDriveUI('disconnected'); return }
        driveToken = r.access_token || null
        localStorage.setItem('driveAuthorised', '1')
        updateDriveUI('connected', '✓ Google Drive connected')
        if ((document.getElementById('driveToggle') as HTMLInputElement)?.checked) {
          document.getElementById('driveAuthRow')?.classList.remove('hidden')
        }
      },
    })
    client.requestAccessToken({ prompt: '' })
  }
  setTimeout(tryAuth, 200)
}

function onDriveToggle() {
  const toggle = document.getElementById('driveToggle') as HTMLInputElement
  const on     = toggle.checked
  document.getElementById('driveAuthRow')?.classList.toggle('hidden', !on)
  if (on && !cfg.gcid) {
    toggle.checked = false
    document.getElementById('driveAuthRow')?.classList.add('hidden')
    alert('Google Client ID not configured in the Worker (GOOGLE_CLIENT_ID secret).')
    return
  }
  if (on) updateDriveUI(driveToken ? 'connected' : 'disconnected', driveToken ? '✓ Google Drive connected' : undefined)
}

function authDrive() {
  if (!cfg.gcid) { alert('Google Client ID not configured.'); return }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = (window as any).google
  if (!g) { alert('Google Identity Services not loaded yet. Please try again.'); return }
  updateDriveUI('connecting', 'Connecting…')
  const client = g.accounts.oauth2.initTokenClient({
    client_id: cfg.gcid,
    scope: 'https://www.googleapis.com/auth/drive',
    callback: (r: { error?: string; access_token?: string }) => {
      if (r.error) {
        updateDriveUI('failed', r.error === 'popup_closed_by_user' || r.error === 'access_denied'
          ? '✗ Popup blocked or closed. Allow popups for this site and try again.'
          : '✗ Failed: ' + r.error)
        return
      }
      driveToken = r.access_token || null
      localStorage.setItem('driveAuthorised', '1')
      updateDriveUI('connected', '✓ Google Drive connected')
    },
  })
  client.requestAccessToken({ prompt: '' })
}

function updateDriveUI(state: string, message?: string) {
  const bar = document.getElementById('driveStatusBar')
  const txt = document.getElementById('driveStatusText')
  const btn = document.getElementById('driveAuthBtn') as HTMLButtonElement | null
  if (!bar) return
  bar.className = 'drive-status-bar'
  if (state === 'connected') {
    bar.classList.add('connected')
    if (txt) txt.textContent = message || '✓ Connected'
    if (btn) { btn.textContent = '✓ Connected'; btn.disabled = true }
  } else if (state === 'connecting') {
    bar.classList.add('connecting')
    if (txt) txt.textContent = message || 'Connecting…'
    if (btn) { btn.textContent = 'Connecting…'; btn.disabled = true }
  } else if (state === 'failed') {
    bar.classList.add('failed')
    if (txt) txt.textContent = message || 'Failed'
    if (btn) { btn.textContent = '🔑 Try Again'; btn.disabled = false }
  } else {
    if (txt) txt.textContent = 'Not connected'
    if (btn) { btn.textContent = '🔑 Connect Google Account'; btn.disabled = false }
  }
}

function afyMonthIndex(dateStr: string): number | null {
  if (!dateStr) return null
  const m = parseInt(dateStr.split('-')[1], 10)
  return m >= 7 ? m - 6 : m + 6
}

function monthLabel(dateStr: string): string | null {
  if (!dateStr) return null
  const [y, m] = dateStr.split('-')
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return `${months[parseInt(m, 10) - 1]} ${y}`
}

function afyFolderName(dateStr: string): string | null {
  if (!dateStr) return null
  const idx   = afyMonthIndex(dateStr)
  const label = monthLabel(dateStr)
  if (!idx || !label) return null
  return `${idx}. ${label}`
}

async function getOrCreateMonthFolder(dateStr: string): Promise<string | null> {
  const folderName = afyFolderName(dateStr)
  if (!folderName) return null
  if (driveFolderCache[folderName]) return driveFolderCache[folderName]
  if (folderName in driveFolderInflight) return driveFolderInflight[folderName]

  driveFolderInflight[folderName] = (async () => {
    const parentId = cfg.folderId || null

    async function searchFolders(q: string) {
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,parents)&pageSize=50`,
        { headers: { Authorization: `Bearer ${driveToken}` } }
      )
      if (!res.ok) throw new Error(`Folder search failed ${res.status}`)
      return ((await res.json()).files || []) as Array<{ id: string; name: string }>
    }

    if (parentId) {
      const q1    = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`
      const found = await searchFolders(q1)
      if (found.length) { driveFolderCache[folderName] = found[0].id; return found[0].id }
    }

    const idxPrefix = String(afyMonthIndex(dateStr))
    if (parentId) {
      const q2     = `mimeType='application/vnd.google-apps.folder' and name contains '${idxPrefix}. ' and '${parentId}' in parents and trashed=false`
      const found2 = await searchFolders(q2).catch(() => [] as Array<{ id: string; name: string }>)
      const match  = found2.find(f => f.name.startsWith(idxPrefix + '. ') || f.name.startsWith(idxPrefix + '.'))
      if (match) { driveFolderCache[folderName] = match.id; return match.id }
    }

    const meta: Record<string, unknown> = { name: folderName, mimeType: 'application/vnd.google-apps.folder' }
    if (parentId) meta.parents = [parentId]
    const res = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${driveToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(meta),
    })
    if (!res.ok) throw new Error(`Folder creation failed ${res.status}`)
    const created = await res.json()
    driveFolderCache[folderName] = created.id
    return created.id as string
  })().finally(() => { delete driveFolderInflight[folderName] })

  return driveFolderInflight[folderName]
}

async function driveUpload(file: File, filename: string, folderId: string | null): Promise<{ id?: string }> {
  if (!driveToken) throw new Error('Not authenticated with Google Drive.')
  const meta: Record<string, unknown> = { name: filename }
  const pid = folderId || cfg.folderId || null
  if (pid) meta.parents = [pid]
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }))
  form.append('file', file, filename)
  const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST', headers: { Authorization: `Bearer ${driveToken}` }, body: form,
  })
  if (!r.ok) { const e = await r.json().catch(() => ({})) as Record<string,unknown>; throw new Error(((e.error as Record<string,unknown>)?.message as string) || `Drive error ${r.status}`) }
  return r.json()
}

// ─────────────────────────────────────────────────────────────────
// Bulk submit
// ─────────────────────────────────────────────────────────────────

async function handleBulkSubmit() {
  const uploadDrive = (document.getElementById('driveToggle') as HTMLInputElement).checked
  if (uploadDrive && !driveToken) { showErr('s3_error', 'Google Drive enabled but not connected.'); return }

  const toSubmit = queue.filter(i => i.status === 'ready')
  if (!toSubmit.length) { showErr('s3_error', 'No ready expenses to submit.'); return }

  toSubmit.forEach(item => {
    const g = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? ''
    item.extracted.date        = g(`r_date_${item.id}`)     || item.extracted.date
    item.extracted.supplier    = g(`r_supplier_${item.id}`) || item.extracted.supplier
    item.extracted.itemName    = g(`r_itemName_${item.id}`) || item.extracted.itemName
    item.extracted.reference   = g(`r_reference_${item.id}`)
    item.extracted.description = g(`r_desc_${item.id}`) || `Submitted by ${cfg.initials || 'XX'}`
    item.extracted.amountExGST = parseFloat(g(`r_exGST_${item.id}`)) || item.extracted.amountExGST
    const rm = g(`r_markup_${item.id}`)
    item.markup  = rm  !== '' ? parseFloat(rm) : 15
    const gp = g(`r_gstpct_${item.id}`)
    item.gstPct = gp !== '' ? parseFloat(gp) : 10
  })

  const unresolved = toSubmit.filter(i => !['matched', 'created'].includes(i.company?.status || ''))
  if (unresolved.length) {
    showErr('s3_error', `${unresolved.length} expense(s) have unresolved supplier companies. Resolve them above before submitting.`)
    return
  }

  const btn = document.getElementById('submitBtn') as HTMLButtonElement | null
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Submitting…' }
  document.getElementById('s3_error')?.classList.add('hidden')

  for (const item of toSubmit) {
    const ok = await revalidateCompany(item)
    if (!ok) refreshReviewCard(item)
  }
  const stillBad = toSubmit.filter(i => !['matched', 'created'].includes(i.company?.status || ''))
  if (stillBad.length) {
    showErr('s3_error', `${stillBad.length} expense(s) still have unresolved companies.`)
    if (btn) { btn.disabled = false; btn.innerHTML = '✓ Submit All Expenses' }
    return
  }

  const results: Array<{ item: QueueItem; ok: boolean; driveFileId?: string | null; error?: string }> = []

  for (const item of toSubmit) {
    item.status = 'submitting'
    try {
      const d = item.extracted
      if (!d.date || !d.supplier || !d.itemName || isNaN(parseFloat(String(d.amountExGST))))
        throw new Error('Date, Supplier, Expense Name and Cost Ex GST are all required.')
      if (!d.reference)       throw new Error('Reference is required.')
      const markupVal = item.markup != null ? item.markup : null
      if (markupVal === null || isNaN(markupVal)) throw new Error('Markup % is required.')

      const exGST    = parseFloat(String(d.amountExGST))
      const markup   = item.markup != null ? item.markup : 15
      const total    = parseFloat(String(d.totalIncGST)) || exGST
      const sellRate = Math.round(total * (1 + markup / 100) * 100) / 100
      const descText = d.description || `Submitted by ${cfg.initials || 'XX'}`

      const stRes = await fetch('/api/expenses-manager/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loggedExpense: {
            jobId:                 parseInt(selectedJob!.id),
            date:                  d.date,
            company:               d.supplier,
            itemName:              d.itemName,
            costRate:              exGST,
            sellRate,
            quantity:              1,
            itemPricingMethodId:   markup !== null ? 2 : 1,
            loggedExpenseStatusId: 2,
            currencyCode:          'AUD',
            exchangeRate:          1,
            description:           descText,
            ...(d.reference ? { reference: d.reference } : {}),
            ...(markup !== null ? { markup } : {}),
          },
        }),
      })
      if (!stRes.ok) {
        const e = await stRes.json().catch(() => ({})) as Record<string,unknown>
        throw new Error(`Streamtime ${stRes.status}: ${String((e.message as string) || JSON.stringify(e)).slice(0, 200)}`)
      }
      await stRes.json()

      let driveFileId: string | null = null
      if (uploadDrive && item.file) {
        const fn = getFilenameForItem(item) || item.file.name
        let folderId: string | null = null
        if (d.date) { try { folderId = await getOrCreateMonthFolder(d.date) } catch (e: unknown) { console.warn('Month folder:', (e as Error).message) } }
        const df = await driveUpload(item.file, fn, folderId)
        driveFileId = df?.id || null
        if (driveFileId) item.driveFileId = driveFileId
      }

      item.status = 'done'
      results.push({ item, ok: true, driveFileId })
    } catch (err: unknown) {
      item.status = 'error'; item.error = (err as Error).message
      results.push({ item, ok: false, error: (err as Error).message })
    }
    await sleep(300)
  }

  const successCount = results.filter(r => r.ok).length
  const failCount    = results.filter(r => !r.ok).length
  setText('successHeading', successCount === 1 ? 'Expense Logged!' : `${successCount} Expenses Logged!`)
  const msg = document.getElementById('successMsg')
  if (msg) msg.innerHTML =
    `Logged to <strong>${esc(selectedJob?.full || selectedJob?.name || '')}</strong>.` +
    (failCount ? ` <span style="color:var(--error);">${failCount} failed.</span>` : '')

  const bulkList = document.getElementById('bulkResultList')
  if (bulkList) bulkList.innerHTML = results.map(r => {
    if (r.ok) return `<div class="bulk-result-item ok">
      <div class="bulk-result-icon">✓</div>
      <div>
        <div class="bulk-result-name">${esc(r.item.file.name)}</div>
        <div class="bulk-result-detail">${esc(r.item.extracted.supplier)} · $${parseFloat(String(r.item.extracted.amountExGST)).toFixed(2)} ex GST${r.driveFileId ? ` · Drive: ${afyFolderName(r.item.extracted.date) || monthLabel(r.item.extracted.date)}` : ''}${r.item.company?.status === 'created' ? ' · New company created' : ''}</div>
      </div>
      ${r.driveFileId ? `<a href="https://drive.google.com/file/d/${r.driveFileId}/view" target="_blank" class="btn btn-secondary btn-sm" style="margin-left:auto;">Drive ↗</a>` : ''}
    </div>`
    return `<div class="bulk-result-item err">
      <div class="bulk-result-icon">✗</div>
      <div><div class="bulk-result-name">${esc(r.item.file.name)}</div><div class="bulk-result-detail">${esc(r.error)}</div></div>
    </div>`
  }).join('')

  const stJobUrl   = `https://hopefulmonsters.app.streamtime.net/#jobs/${selectedJob?.id}`
  const successLinks = document.getElementById('successLinks')
  if (successLinks) successLinks.innerHTML = `<a href="${stJobUrl}" target="_blank" class="btn btn-secondary">View in Streamtime →</a>`

  setStep(4)
  if (btn) { btn.disabled = false; btn.innerHTML = '✓ Submit All Expenses' }
}

// ─────────────────────────────────────────────────────────────────
// Reset
// ─────────────────────────────────────────────────────────────────

function reset() {
  selectedJob = null; queue = []; nextQueueId = 1
  ;(document.getElementById('driveToggle') as HTMLInputElement).checked = false
  document.getElementById('driveAuthRow')?.classList.add('hidden')
  document.getElementById('s1_actions')?.classList.add('hidden')
  document.querySelectorAll('.job-item').forEach(el => el.classList.remove('selected'))
  document.getElementById('s3_error')?.classList.add('hidden')
  document.getElementById('queueWrap')?.classList.add('hidden')
  const ql = document.getElementById('queueList'); if (ql) ql.innerHTML = ''
  const rl = document.getElementById('s3_reviewList'); if (rl) rl.innerHTML = ''
  const bl = document.getElementById('bulkResultList'); if (bl) bl.innerHTML = ''
  const _eab = document.getElementById('extractAllBtn') as HTMLButtonElement | null
  if (_eab) _eab.disabled = true
  const _pb = document.getElementById('proceedBtn') as HTMLButtonElement | null
  if (_pb) _pb.disabled = true
  ;(document.getElementById('fileInput') as HTMLInputElement).value = ''
  setStep(1)
}

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────

export default function ExpensesManagerPage() {
  useEffect(() => {
    // Reset module state on each mount (clean start / handles React strict mode)
    cfg = {}; allJobs = []; jobsById = {}; selectedJob = null
    allCompanies = []; driveToken = null; step = 1; queue = []; nextQueueId = 1
    Object.keys(driveFolderCache).forEach(k => delete driveFolderCache[k])
    Object.keys(driveFolderInflight).forEach(k => delete driveFolderInflight[k])

    // Load Google Identity Services
    if (!document.querySelector('script[src*="accounts.google.com/gsi"]')) {
      const s   = document.createElement('script')
      s.src     = 'https://accounts.google.com/gsi/client'
      s.async   = true
      document.head.appendChild(s)
    }

    // Expose functions on window for inline onclick handlers in innerHTML strings
    const w = window as any // eslint-disable-line @typescript-eslint/no-explicit-any
    w.loadJobs              = loadJobs
    w.pickJob               = pickJob
    w.filterJobs            = filterJobs
    w.goStep                = goStep
    w.handleFileSelect      = handleFileSelect
    w.clearQueue            = clearQueue
    w.removeQueueItem       = removeQueueItem
    w.extractAll            = extractAll
    w.authDrive             = authDrive
    w.onDriveToggle         = onDriveToggle
    w.handleBulkSubmit      = handleBulkSubmit
    w.reset                 = reset
    w.toggleReviewCard      = toggleReviewCard
    w.updateReviewField     = updateReviewField
    w.updateReviewMarkup    = updateReviewMarkup
    w.updateReviewGstPct    = updateReviewGstPct
    w.calcReviewGST         = calcReviewGST
    w.checkDateWarn         = checkDateWarn
    w.checkCompanyForItem   = checkCompanyForItem
    w.createCompany         = createCompany
    w.createCompanyFromInput = createCompanyFromInput
    w.useCompany            = useCompany
    w.onSupplierInput       = onSupplierInput
    w.openSupplierDd        = openSupplierDd
    w.closeSupplierDd       = closeSupplierDd
    w.supplierKeyNav        = supplierKeyNav
    w.selectSupplier        = selectSupplier

    // Init
    loadCfg()
    cfg.gcid     = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID          || ''
    cfg.folderId = process.env.NEXT_PUBLIC_EXPENSES_DRIVE_FOLDER_ID  || ''

    // Auto-derive initials from user metadata if not already saved
    if (!cfg.initials) {
      createClient().auth.getUser().then(({ data }) => {
        const meta = data.user?.user_metadata
        if (meta?.first_name || meta?.last_name) {
          const derived = [
            (meta.first_name as string || '').charAt(0),
            (meta.last_name  as string || '').charAt(0),
          ].join('').toUpperCase()
          if (derived) {
            cfg.initials = derived
            try { localStorage.setItem('elSettings', JSON.stringify(cfg)) } catch {}
          }
        }
      }).catch(() => {})
    }

    // Explicitly disable queue buttons via DOM (not JSX) so React's
    // synthetic event system never treats them as disabled=true
    const eab = document.getElementById('extractAllBtn') as HTMLButtonElement | null
    const pb  = document.getElementById('proceedBtn')   as HTMLButtonElement | null
    if (eab) eab.disabled = true
    if (pb)  pb.disabled  = true

    setupDrop()
    setStep(1)
    loadJobs()
    trySilentDriveAuth()

    return () => {
      const names = [
        'loadJobs','pickJob',
        'filterJobs','goStep','handleFileSelect','clearQueue','removeQueueItem','extractAll',
        'authDrive','onDriveToggle','handleBulkSubmit','reset','toggleReviewCard',
        'updateReviewField','updateReviewMarkup','updateReviewGstPct','calcReviewGST',
        'checkDateWarn','checkCompanyForItem','createCompany','createCompanyFromInput',
        'useCompany','onSupplierInput','openSupplierDd','closeSupplierDd','supplierKeyNav','selectSupplier',
      ]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      names.forEach(n => delete (window as any)[n])
    }
  }, [])

  return (
    <div data-tool="expenses-manager">

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="main">

        {/* Step indicator */}
        <div className="steps">
          <div className="step" id="si1">
            <div className="step-num">1</div>
            <div className="step-lbl">Select Job</div>
          </div>
          <div className="step-connector" />
          <div className="step" id="si2">
            <div className="step-num">2</div>
            <div className="step-lbl">Upload Receipts</div>
          </div>
          <div className="step-connector" />
          <div className="step" id="si3">
            <div className="step-num">3</div>
            <div className="step-lbl">Review &amp; Submit</div>
          </div>
        </div>

        {/* ── Step 1: Select Job ────────────────────────────────── */}
        <div id="step1" className="card">
          <div className="card-hdr">
            <div className="card-title">Select a Job</div>
            <button className="btn btn-secondary btn-sm" onClick={loadJobs}>↻ Refresh</button>
          </div>
          <div className="card-body">
            <div id="s1_noKey" className="empty hidden">
              <div className="empty-ico">⚠️</div>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Could not load jobs</div>
              <div style={{ fontSize: 12, color: 'var(--g400)' }}>Check that STREAMTIME_KEY is set in your environment</div>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={loadJobs}>
                Retry
              </button>
            </div>
            <div id="s1_loading" className="empty hidden">
              <div className="spin" style={{ width: 22, height: 22, margin: '0 auto 10px', borderWidth: 3 }} />
              <div style={{ fontSize: 13, color: 'var(--g500)' }}>Loading jobs…</div>
            </div>
            <div id="s1_error" className="alert alert-error hidden" />
            <div id="s1_jobs" className="hidden">
              <div className="job-search-wrap">
                <span className="job-search-ico">🔍</span>
                <input
                  type="text"
                  id="jobSearch"
                  className="fc"
                  placeholder="Search by job name, number or client…"
                  onInput={filterJobs}
                />
              </div>
              <div className="jobs-list" id="jobsList" />
            </div>
            <div id="s1_actions" className="step-ftr hidden">
              <button className="btn btn-primary" onClick={() => goStep(2)}>Continue →</button>
            </div>
          </div>
        </div>

        {/* ── Step 2: Upload Receipts ───────────────────────────── */}
        <div id="step2" className="card hidden">
          <div className="card-hdr">
            <div className="card-title">Upload Receipts</div>
            <button className="btn btn-secondary btn-sm" onClick={() => goStep(1)}>← Back</button>
          </div>
          <div className="card-body">
            <div className="job-banner">
              <div>
                <div className="job-banner-label">Selected Job</div>
                <div id="s2_jobName" className="job-banner-name" />
                <div id="s2_jobMeta" className="job-banner-meta" />
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => goStep(1)}>Change</button>
            </div>
            <div className="drop-zone" id="dropZone">
              <input
                type="file"
                id="fileInput"
                accept="image/*,application/pdf"
                multiple
                onChange={e => e.target.files && handleFileSelect(e.target.files)}
              />
              <div className="drop-icon">📎</div>
              <div className="drop-text"><strong>Drop files here</strong> or click to browse</div>
              <div className="drop-hint">JPG, PNG, WebP or PDF · Max 20 MB each · Multiple files supported</div>
            </div>
            <div id="s2_error" className="alert alert-error hidden" style={{ marginTop: 14 }} />
            <div id="queueWrap" className="hidden" style={{ marginTop: 16 }}>
              <div className="queue-hdr">
                <div className="queue-count"><span id="queueReadyCount">0</span> receipt(s) ready</div>
                <button className="btn btn-ghost btn-sm" onClick={clearQueue}>Clear all</button>
              </div>
              <div className="queue-list" id="queueList" />
            </div>
            <div className="step-ftr" style={{ marginTop: 16 }}>
              <button className="btn btn-secondary" id="extractAllBtn" onClick={extractAll}>
                Extract Details
              </button>
              <button className="btn btn-primary" id="proceedBtn" onClick={() => goStep(3)}>
                Review &amp; Submit →
              </button>
            </div>
          </div>
        </div>

        {/* ── Step 3: Review & Submit ───────────────────────────── */}
        <div id="step3" className="card hidden">
          <div className="card-hdr">
            <div className="card-title">Review &amp; Submit</div>
            <button className="btn btn-secondary btn-sm" onClick={() => goStep(2)}>← Back</button>
          </div>
          <div className="card-body">
            <div className="job-banner" style={{ marginBottom: 16 }}>
              <div>
                <div className="job-banner-label">Job</div>
                <div id="s3_jobName" className="job-banner-name" />
              </div>
            </div>
            <div id="s3_reviewList" />
            <div className="divider" />
            <div className="fg">
              <div className="toggle-row">
                <div>
                  <div className="toggle-lbl">Save receipts to Google Drive</div>
                  <div className="toggle-sub">Uploads files into a monthly folder (e.g. April 2026)</div>
                </div>
                <input type="checkbox" id="driveToggle" onChange={onDriveToggle} />
              </div>
              <div id="driveAuthRow" className="hidden">
                <div id="driveStatusBar" className="drive-status-bar">
                  <span id="driveStatusText">Not connected</span>
                  <button
                    className="btn btn-secondary btn-sm"
                    id="driveAuthBtn"
                    onClick={authDrive}
                    style={{ marginLeft: 'auto' }}
                  >
                    🔑 Connect Google Account
                  </button>
                </div>
                <div className="hint" style={{ marginTop: 5 }}>
                  A Google sign-in popup will appear. If it doesn&apos;t, allow popups for this site in your browser&apos;s address bar, then try again.
                </div>
              </div>
            </div>
            <div id="s3_error" className="alert alert-error hidden" style={{ marginTop: 14 }} />
            <div className="step-ftr">
              <button className="btn btn-success btn-lg" id="submitBtn" onClick={handleBulkSubmit}>
                Submit All Expenses
              </button>
            </div>
          </div>
        </div>

        {/* ── Step 4: Success ───────────────────────────────────── */}
        <div id="step4" className="card hidden">
          <div className="card-body" style={{ textAlign: 'center', padding: '44px 24px' }}>
            <div className="success-circle">✓</div>
            <h2
              id="successHeading"
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: 28,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text)',
                marginBottom: 8,
              }}
            >
              Expenses Logged!
            </h2>
            <p id="successMsg" style={{ color: 'var(--g500)', fontSize: 14, marginBottom: 16, lineHeight: 1.6 }} />
            <div id="bulkResultList" className="bulk-result-list" />
            <div id="successLinks" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }} />
            <div style={{ marginTop: 24 }}>
              <button className="btn btn-primary" onClick={reset}>Log More Expenses</button>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
