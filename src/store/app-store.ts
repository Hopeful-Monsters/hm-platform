import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface AppState {
  // UI State
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  loadingStates: Record<string, boolean>

  // User State
  userPreferences: {
    notifications: boolean
    autoSave: boolean
    compactView: boolean
  }

  // Actions
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setLoading: (key: string, loading: boolean) => void
  updateUserPreferences: (preferences: Partial<AppState['userPreferences']>) => void
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        sidebarOpen: false,
        theme: 'system',
        loadingStates: {},
        userPreferences: {
          notifications: true,
          autoSave: true,
          compactView: false,
        },

        // Actions
        setSidebarOpen: (open) => set({ sidebarOpen: open }),

        setTheme: (theme) => set({ theme }),

        setLoading: (key, loading) =>
          set((state) => ({
            loadingStates: {
              ...state.loadingStates,
              [key]: loading,
            },
          })),

        updateUserPreferences: (preferences) =>
          set((state) => ({
            userPreferences: {
              ...state.userPreferences,
              ...preferences,
            },
          })),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          theme: state.theme,
          userPreferences: state.userPreferences,
        }),
      }
    ),
    {
      name: 'app-store',
    }
  )
)