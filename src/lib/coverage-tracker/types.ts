import { DEFAULT_COVERAGE_TAB_NAME } from '@/lib/constants/coverage-tracker'

export type CoverageRow = {
  date:        string
  campaign:    string  // set from Setup.campaign at submit time
  publication: string
  country:     string
  mediaType:   string
  mediaFormat: string
  headline:    string
  reach:       string
  ave:         string
  prValue:     string
  sentiment:   string
  keyMsg:      string
  spokes:      string
  image:       string
  cta:         string
  link:        string
}

export type DestMode = 'existing' | 'new'
export type Operator = 'AND' | 'OR'
export type Status   = { type: 'info' | 'success' | 'error'; message: string } | null
export type Result   = { ok: true; sheetUrl?: string } | { ok: false; error: string }

export type SetupState = {
  campaign:      string
  // Per-item operators: ops[i] sits BETWEEN items[i] and items[i+1]
  keyMessages:   string[]
  keyMsgOps:     Operator[]
  spokespersons: string[]
  spokesOps:     Operator[]
  ctas:          string[]
  ctaOps:        Operator[]
  destMode:      DestMode
  sheetUrl:      string
  sheetTab:      string
  newTitle:      string
  newTab:        string
}

export const MEDIA_TYPES   = ['Metro', 'Regional', 'National', 'Lifestyle', 'Sports', 'Marketing Trade']
export const MEDIA_FORMATS = ['ONLINE', 'PRINT', 'TV', 'RADIO', 'SOCIAL MEDIA', 'PODCAST']
export const YES_NO        = ['YES', 'NO']
export const SENTIMENTS    = ['POSITIVE', 'NEGATIVE']

export const EMPTY_SETUP: SetupState = {
  campaign:      '',
  keyMessages:   [''],
  keyMsgOps:     [],
  spokespersons: [''],
  spokesOps:     [],
  ctas:          [''],
  ctaOps:        [],
  destMode:      'existing',
  sheetUrl:      '',
  sheetTab:      DEFAULT_COVERAGE_TAB_NAME,
  newTitle:      '',
  newTab:        DEFAULT_COVERAGE_TAB_NAME,
}
