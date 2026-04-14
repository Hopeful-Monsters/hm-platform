import { create } from 'zustand'

// ── Companies cache ───────────────────────────────────────────────
// Shared across the expenses-manager wizard. Populated on JobPicker
// load so the wizard starts instantly. Re-fetched if older than TTL.

const COMPANIES_TTL_MS = 10 * 60 * 1000 // 10 minutes

interface Company {
  id: string | number
  name: string
}

interface CompaniesSlice {
  companies: Company[]
  companiesLoadedAt: number | null
  setCompanies: (companies: Company[]) => void
}

// ── Store ─────────────────────────────────────────────────────────

interface AppStore extends CompaniesSlice {}

export const useAppStore = create<AppStore>()(set => ({
  // Companies
  companies: [],
  companiesLoadedAt: null,
  setCompanies: (companies) => set({ companies, companiesLoadedAt: Date.now() }),
}))

// ── Helpers ───────────────────────────────────────────────────────

export function companiesCacheIsValid(loadedAt: number | null): boolean {
  if (!loadedAt) return false
  return Date.now() - loadedAt < COMPANIES_TTL_MS
}
