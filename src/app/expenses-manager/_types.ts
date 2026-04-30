export interface Job {
  id: string
  name: string
  num: string | null
  full: string | null
  client: string
  status: string
}

export interface Extracted {
  date: string
  supplier: string
  itemName: string
  reference: string
  amountExGST: number | string
  gstAmount: number | string
  totalIncGST: number | string
  description: string
}

export interface CompanyState {
  status: 'checking' | 'matched' | 'similar' | 'notfound' | 'created' | 'error'
  matchedId: string | number | null
  matchedName: string | null
  similar: Array<{ id: string | number; name: string }>
  chosenId: string | number | null
  chosenName: string | null
  errorMsg: string | null
}

export interface QueueItem {
  id: number
  file: File
  mimeType: string
  status: 'pending' | 'extracting' | 'ready' | 'submitting' | 'done' | 'error'
  extracted: Extracted
  markup: number
  gstPct: number
  company: CompanyState | null
  error: string | null
  driveFileId: string | null
  /** Field-level validation errors surfaced on submit attempt */
  fieldErrors?: Partial<Record<keyof Extracted | 'company', string>>
}

export interface SubmitResult {
  item: QueueItem
  ok: boolean
  driveFileId?: string | null
  error?: string
}
