import { createBookmarksStore } from './BookmarksContext'

describe('createBookmarksStore', () => {
  it('initializes with unique bookmarks', () => {
    const store = createBookmarksStore(['a', 'b', 'a'])
    expect(store.getSnapshot().items).toEqual(['a', 'b'])
  })

  it('adds and removes bookmarks without duplicates', () => {
    const store = createBookmarksStore()
    store.addBookmark('first')
    store.addBookmark('first')
    store.addBookmark('second')

    expect(store.getSnapshot().items).toEqual(['first', 'second'])
    expect(store.isBookmarked('first')).toBe(true)

    store.removeBookmark('first')
    expect(store.isBookmarked('first')).toBe(false)
    expect(store.getSnapshot().items).toEqual(['second'])
  })

  it('notifies subscribers when the collection changes', () => {
    const store = createBookmarksStore()
    const notifications: ReadonlyArray<string>[] = []
    const unsubscribe = store.subscribe(() => {
      notifications.push(store.getSnapshot().items)
    })

    store.addBookmark('one')
    store.addBookmark('two')
    store.removeBookmark('one')
    unsubscribe()

    expect(notifications).toEqual([
      ['one'],
      ['one', 'two'],
      ['two'],
    ])
  })
})
