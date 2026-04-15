import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Job, CompanyState, QueueItem, SubmitResult } from '../_types'
import { todayStr, sleep, buildFilename } from '../_utils'
import {
  getAllCompanies,
  searchCompanies,
  createCompanyAction,
  submitExpense,
  getDriveStatus,
} from '../_actions'
import { useAppStore, companiesCacheIsValid } from '@/store/app-store'

// ── Hook ──────────────────────────────────────────────────────────

export function useExpenses(selectedJob: Job) {

  // ── Store ─────────────────────────────────────────────────────
  const cachedCompanies   = useAppStore(s => s.companies)
  const companiesLoadedAt = useAppStore(s => s.companiesLoadedAt)
  const storeSetCompanies = useAppStore(s => s.setCompanies)

  // ── State ────────────────────────────────────────────────────
  const [step, setStep]                 = useState(2)
  const [companies, setCompanies]       = useState<Array<{ id: string | number; name: string }>>(
    companiesCacheIsValid(companiesLoadedAt) ? cachedCompanies : []
  )
  const [queue, setQueue]               = useState<QueueItem[]>([])
  const [driveEnabled, setDriveEnabled] = useState(false)
  const [driveStatus, setDriveStatus]   = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected')
  const [driveMsg, setDriveMsg]         = useState('Not connected')
  const [submitError, setSubmitError]   = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [results, setResults]           = useState<SubmitResult[]>([])
  const [initials, setInitials]         = useState('XX')

  // ── Refs ─────────────────────────────────────────────────────
  const nextId = useRef(1)
  const b64Map = useRef<Map<number, string>>(new Map())

  // ── Init ─────────────────────────────────────────────────────
  useEffect(() => {
    // Initials — prefer localStorage cache, fall back to Supabase user_metadata
    let cfg: Record<string, string> = {}
    try { cfg = JSON.parse(localStorage.getItem('elSettings') || '{}') } catch { cfg = {} }

    if (cfg.initials) {
      setInitials(cfg.initials)
    } else {
      createClient().auth.getUser().then(({ data }) => {
        const meta = data.user?.user_metadata
        if (meta?.first_name || meta?.last_name) {
          const derived = [
            (meta.first_name as string || '').charAt(0),
            (meta.last_name  as string || '').charAt(0),
          ].join('').toUpperCase()
          if (derived) {
            setInitials(derived)
            try {
              const stored = JSON.parse(localStorage.getItem('elSettings') || '{}')
              localStorage.setItem('elSettings', JSON.stringify({ ...stored, initials: derived }))
            } catch { /* ignore */ }
          }
        }
      }).catch(() => { /* silent */ })
    }

    // Drive connection status — checked server-side via stored refresh token
    getDriveStatus().then(status => {
      if (status === 'connected') {
        setDriveStatus('connected')
        setDriveMsg('✓ Google Drive connected')
      }
    }).catch(() => { /* silent */ })

    // Companies — skip fetch if store cache is still valid
    if (!companiesCacheIsValid(companiesLoadedAt)) {
      void loadCompanies()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Companies ─────────────────────────────────────────────────

  async function loadCompanies() {
    try {
      const data = await getAllCompanies()
      if (data.companies?.length) {
        const list = data.companies as Array<{ id: string | number; name: string }>
        setCompanies(list)
        storeSetCompanies(list)  // populate store cache
      }
    } catch { /* silent */ }
  }

  // ── Queue helpers ─────────────────────────────────────────────

  function updateItem(
    id: number,
    patch: Partial<QueueItem> | ((i: QueueItem) => Partial<QueueItem>),
  ) {
    setQueue(prev => prev.map(item => {
      if (item.id !== id) return item
      const p = typeof patch === 'function' ? patch(item) : patch
      return { ...item, ...p }
    }))
  }

  function addFiles(files: FileList) {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    Array.from(files).forEach(file => {
      if (file.size > 20 * 1024 * 1024) { alert(`${file.name}: too large (max 20 MB).`); return }
      if (!ALLOWED.includes(file.type))  { alert(`${file.name}: unsupported type.`); return }
      const id = nextId.current++
      const item: QueueItem = {
        id, file, mimeType: file.type, status: 'pending',
        extracted: {
          date: todayStr(), supplier: '', itemName: '',
          reference: '', amountExGST: '', gstAmount: '', totalIncGST: '', description: '',
        },
        markup: 15, gstPct: 10, company: null, error: null, driveFileId: null,
      }
      setQueue(prev => [...prev, item])
      const reader = new FileReader()
      reader.onload = e => { b64Map.current.set(id, (e.target?.result as string).split(',')[1]) }
      reader.readAsDataURL(file)
    })
  }

  function removeFile(id: number) {
    setQueue(prev => prev.filter(i => i.id !== id))
    b64Map.current.delete(id)
  }

  function clearQueue() {
    setQueue([])
    b64Map.current.clear()
  }

  // ── Extraction ────────────────────────────────────────────────

  async function extractAll() {
    const pending = queue.filter(i => i.status === 'pending')
    for (const item of pending) await extractItem(item)
  }

  async function extractItem(snap: QueueItem) {
    updateItem(snap.id, { status: 'extracting', error: null })

    // Wait for FileReader to finish (b64Map is populated asynchronously)
    let waited = 0
    let b64 = b64Map.current.get(snap.id) ?? null
    while (!b64 && waited < 5000) {
      await sleep(100); waited += 100
      b64 = b64Map.current.get(snap.id) ?? null
    }
    if (!b64) { updateItem(snap.id, { status: 'error', error: 'Could not read file.' }); return }

    try {
      const res = await fetch('/api/expenses-manager/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mimeType: snap.mimeType, data: b64 }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || `Worker error ${res.status}`)

      updateItem(snap.id, {
        status: 'ready',
        extracted: {
          date:        data.date        || todayStr(),
          supplier:    data.supplier    || '',
          itemName:    data.itemName    || '',
          reference:   data.reference   || '',
          amountExGST: data.amountExGST ?? '',
          gstAmount:   data.gstAmount   ?? '',
          totalIncGST: data.totalIncGST ?? '',
          description: `Submitted by ${initials || 'XX'}`,
        },
      })
    } catch (err: unknown) {
      updateItem(snap.id, { status: 'error', error: (err as Error).message })
      await sleep(300); return
    }

    await checkCompany(snap.id)
    await sleep(300)
  }

  // ── Company validation ────────────────────────────────────────

  async function checkCompany(itemId: number) {
    // Read the current supplier name directly from state
    let supplier = ''
    setQueue(prev => {
      supplier = prev.find(i => i.id === itemId)?.extracted.supplier?.trim() ?? ''
      return prev
    })
    if (!supplier) return

    const checking: CompanyState = {
      status: 'checking', matchedId: null, matchedName: null,
      similar: [], chosenId: null, chosenName: null, errorMsg: null,
    }
    updateItem(itemId, { company: checking })

    try {
      const data    = await searchCompanies(supplier)
      const results: Array<{ id: string | number; name: string }> = (data.results || []) as Array<{ id: string | number; name: string }>

      if (!results.length) {
        updateItem(itemId, { company: { status: 'notfound', matchedId: null, matchedName: null, similar: [], chosenId: null, chosenName: null, errorMsg: null } })
        return
      }

      const exact = results.find(r => r.name?.toLowerCase() === supplier.toLowerCase())
      if (exact) {
        updateItem(itemId, { company: { status: 'matched', matchedId: exact.id, matchedName: exact.name, similar: [], chosenId: exact.id, chosenName: exact.name, errorMsg: null } })
        return
      }

      updateItem(itemId, { company: { status: 'similar', matchedId: null, matchedName: null, similar: results.slice(0, 5), chosenId: null, chosenName: null, errorMsg: null } })
    } catch (err: unknown) {
      updateItem(itemId, { company: { status: 'error', matchedId: null, matchedName: null, similar: [], chosenId: null, chosenName: null, errorMsg: (err as Error).message } })
    }
  }

  function chooseCompany(itemId: number, cid: string | number, name: string) {
    updateItem(itemId, {
      company: { status: 'matched', matchedId: cid, matchedName: name, similar: [], chosenId: cid, chosenName: name, errorMsg: null },
    })
  }

  async function createCompany(itemId: number, name: string) {
    updateItem(itemId, {
      company: { status: 'checking', matchedId: null, matchedName: null, similar: [], chosenId: null, chosenName: null, errorMsg: null },
    })
    try {
      const data = await createCompanyAction(name)
      const coId = data.id as string | number | null

      const co: CompanyState = {
        status: 'created', matchedId: coId, matchedName: data.name || name,
        similar: [], chosenId: coId, chosenName: data.name || name, errorMsg: null,
      }
      updateItem(itemId, { company: co })
      setCompanies(prev =>
        prev.some(c => c.id === data.id) ? prev : [...prev, { id: data.id as string | number, name: data.name || name }]
      )
    } catch (err: unknown) {
      alert(`Failed to create company: ${(err as Error).message}`)
      updateItem(itemId, {
        company: { status: 'notfound', matchedId: null, matchedName: null, similar: [], chosenId: null, chosenName: null, errorMsg: null },
      })
    }
  }

  // ── Google Drive ──────────────────────────────────────────────
  // Server-side OAuth: refresh token stored in Supabase user_metadata.
  // The auth flow opens a popup → /api/expenses-manager/drive/auth → Google →
  // /api/expenses-manager/drive/callback → postMessage → this handler.
  // Uploads go to /api/expenses-manager/drive/upload (route handler, handles 20 MB files).

  function authDrive() {
    const popup = window.open(
      '/api/expenses-manager/drive/auth',
      'drive-auth',
      'width=520,height=660,left=200,top=100',
    )
    if (!popup) {
      alert('Popup blocked. Allow popups for this site in your browser and try again.')
      return
    }

    setDriveStatus('connecting')
    setDriveMsg('Waiting for Google sign-in…')

    let completed = false

    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.driveConnected) {
        completed = true
        window.removeEventListener('message', onMessage)
        setDriveStatus('connected')
        setDriveMsg('✓ Google Drive connected')
      } else if (e.data?.driveError) {
        completed = true
        window.removeEventListener('message', onMessage)
        const msg = String(e.data.driveError)
        setDriveStatus('failed')
        setDriveMsg(
          msg === 'access_denied'
            ? '✗ Access denied. Grant Drive access and try again.'
            : `✗ ${msg}`,
        )
      }
    }
    window.addEventListener('message', onMessage)

    // Detect popup closed without completing (e.g. user dismissed it)
    const poll = setInterval(() => {
      if (!popup.closed) return
      clearInterval(poll)
      window.removeEventListener('message', onMessage)
      if (!completed) {
        setDriveStatus('disconnected')
        setDriveMsg('Not connected')
      }
    }, 500)
  }

  // ── Submit helpers ────────────────────────────────────────────

  /** Upload a single receipt file to Google Drive. Returns the Drive file ID. */
  async function uploadToDrive(snap: QueueItem): Promise<string | null> {
    if (!snap.file) return null
    const d  = snap.extracted
    const fn = buildFilename(snap, selectedJob.num, selectedJob.id, initials) || snap.file.name

    const form = new FormData()
    form.append('file',     snap.file, fn)
    form.append('filename', fn)
    if (d.date) form.append('date', d.date)

    const res = await fetch('/api/expenses-manager/drive/upload', { method: 'POST', body: form })
    if (!res.ok) {
      const e = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(e.error || `Drive upload failed (${res.status})`)
    }
    const df = await res.json() as { id?: string }
    return df?.id || null
  }

  /** Validate fields, submit to Streamtime, and optionally upload to Drive. */
  async function submitSingleExpense(snap: QueueItem): Promise<{ driveFileId: string | null }> {
    const d = snap.extracted
    if (!d.date || !d.supplier || !d.itemName || isNaN(parseFloat(String(d.amountExGST))))
      throw new Error('Date, Supplier, Expense Name and Cost Ex GST are all required.')
    if (!d.reference) throw new Error('Reference is required.')

    const exGST    = parseFloat(String(d.amountExGST))
    const total    = parseFloat(String(d.totalIncGST)) || exGST
    const sellRate = Math.round(total * (1 + snap.markup / 100) * 100) / 100

    await submitExpense({
      jobId:                 parseInt(selectedJob.id),
      date:                  d.date,
      supplierCompanyId:     Number(snap.company!.chosenId),
      itemName:              d.itemName,
      costRate:              exGST,
      sellRate,
      quantity:              1,
      itemPricingMethodId:   2,
      loggedExpenseStatusId: 2,
      currencyCode:          'AUD',
      exchangeRate:          1,
      markup:                snap.markup,
      ...(d.reference ? { reference: d.reference } : {}),
    })

    const driveFileId = driveEnabled ? await uploadToDrive(snap) : null
    return { driveFileId }
  }

  // ── Submit ────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitError('')

    const snapshot = queue.filter(i => i.status === 'ready')
    if (!snapshot.length) { setSubmitError('No ready expenses to submit.'); return }
    if (driveEnabled && driveStatus !== 'connected') { setSubmitError('Google Drive enabled but not connected.'); return }

    const unresolved = snapshot.filter(i => !['matched', 'created'].includes(i.company?.status || ''))
    if (unresolved.length) {
      setSubmitError(`${unresolved.length} expense(s) have unresolved supplier companies.`)
      return
    }

    setSubmitting(true)
    const submitResults: SubmitResult[] = []

    for (const snap of snapshot) {
      updateItem(snap.id, { status: 'submitting' })
      try {
        const { driveFileId } = await submitSingleExpense(snap)
        updateItem(snap.id, { status: 'done', driveFileId })
        submitResults.push({ item: snap, ok: true, driveFileId })
      } catch (err: unknown) {
        updateItem(snap.id, { status: 'error', error: (err as Error).message })
        submitResults.push({ item: snap, ok: false, error: (err as Error).message })
      }
      await sleep(300)
    }

    setResults(submitResults)
    setSubmitting(false)
    setStep(4)
  }

  // ── Reset ─────────────────────────────────────────────────────

  function reset() {
    setQueue([])
    setStep(2)
    setSubmitError('')
    setResults([])
    setDriveEnabled(false)
    nextId.current = 1
    b64Map.current.clear()
  }

  // ── Derived ───────────────────────────────────────────────────

  const readyCount   = queue.filter(i => i.status === 'ready' || i.status === 'done').length
  const pendingCount = queue.filter(i => i.status === 'pending').length
  const reviewable   = queue.filter(i => ['ready', 'done', 'error'].includes(i.status))

  // ── Public interface ──────────────────────────────────────────

  return {
    // State
    step, setStep,
    companies, setCompanies,
    queue,
    driveEnabled, setDriveEnabled,
    driveStatus, driveMsg,
    submitError, submitting,
    results, initials,

    // Derived
    readyCount, pendingCount, reviewable,

    // Actions
    addFiles, removeFile, clearQueue, updateItem,
    extractAll,
    checkCompany, chooseCompany, createCompany,
    authDrive,
    handleSubmit,
    reset,
  }
}
