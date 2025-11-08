'use client'

import * as React from 'react'

export type BookmarkIdentifier = string

export interface BookmarksSnapshot {
  readonly items: ReadonlyArray<BookmarkIdentifier>
}

export interface BookmarksStore {
  getSnapshot(): BookmarksSnapshot
  subscribe(listener: () => void): () => void
  addBookmark(id: BookmarkIdentifier): void
  removeBookmark(id: BookmarkIdentifier): void
  isBookmarked(id: BookmarkIdentifier): boolean
}

function createInitialSnapshot(initialBookmarks: BookmarkIdentifier[]): BookmarksSnapshot {
  const unique = Array.from(new Set(initialBookmarks))
  return { items: unique }
}

export function createBookmarksStore(initialBookmarks: BookmarkIdentifier[] = []): BookmarksStore {
  let snapshot = createInitialSnapshot(initialBookmarks)
  const listeners = new Set<() => void>()

  const notify = () => {
    for (const listener of listeners) {
      listener()
    }
  }

  const setSnapshot = (updater: (items: BookmarkIdentifier[]) => BookmarkIdentifier[]) => {
    const nextItems = updater([...snapshot.items])
    snapshot = { items: Array.from(new Set(nextItems)) }
    notify()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    addBookmark(id: BookmarkIdentifier) {
      if (snapshot.items.includes(id)) {
        return
      }
      setSnapshot((items) => [...items, id])
    },
    removeBookmark(id: BookmarkIdentifier) {
      if (!snapshot.items.includes(id)) {
        return
      }
      setSnapshot((items) => items.filter((item) => item !== id))
    },
    isBookmarked(id: BookmarkIdentifier) {
      return snapshot.items.includes(id)
    },
  }
}

export interface BookmarksContextValue {
  bookmarks: ReadonlyArray<BookmarkIdentifier>
  addBookmark: (id: BookmarkIdentifier) => void
  removeBookmark: (id: BookmarkIdentifier) => void
  isBookmarked: (id: BookmarkIdentifier) => boolean
}

const BookmarksContext = React.createContext<BookmarksContextValue | null>(null)

export interface BookmarksProviderProps {
  children: React.ReactNode
  initialBookmarks?: BookmarkIdentifier[]
}

export function BookmarksProvider({ children, initialBookmarks = [] }: BookmarksProviderProps) {
  const storeRef = React.useRef<BookmarksStore>()
  if (!storeRef.current) {
    storeRef.current = createBookmarksStore(initialBookmarks)
  }

  const store = storeRef.current

  const bookmarks = React.useSyncExternalStore(
    store.subscribe,
    () => store.getSnapshot().items,
    () => store.getSnapshot().items,
  )

  const addBookmark = React.useCallback((id: BookmarkIdentifier) => {
    store.addBookmark(id)
  }, [store])

  const removeBookmark = React.useCallback((id: BookmarkIdentifier) => {
    store.removeBookmark(id)
  }, [store])

  const isBookmarked = React.useCallback((id: BookmarkIdentifier) => {
    return store.isBookmarked(id)
  }, [store])

  const value = React.useMemo<BookmarksContextValue>(
    () => ({ bookmarks, addBookmark, removeBookmark, isBookmarked }),
    [bookmarks, addBookmark, removeBookmark, isBookmarked],
  )

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>
}

export function useBookmarks(): BookmarksContextValue {
  const context = React.useContext(BookmarksContext)
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarksProvider')
  }
  return context
}
