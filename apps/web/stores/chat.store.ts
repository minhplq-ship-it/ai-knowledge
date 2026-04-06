// stores/chat.store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SearchMode = 'document' | 'web' | 'hybrid'

interface ChatStore {
  activeChatId: string | null
  setActiveChatId: (id: string | null) => void
  searchMode: SearchMode
  setSearchMode: (mode: SearchMode) => void
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      activeChatId: null,
      setActiveChatId: (id) => set({ activeChatId: id }),
      searchMode: 'hybrid',
      setSearchMode: (mode) => set({ searchMode: mode }),
    }),
    {
      name: 'chat-preferences',
      // Chỉ persist searchMode, không persist activeChatId
      partialize: (state) => ({ searchMode: state.searchMode }),
    },
  ),
)
