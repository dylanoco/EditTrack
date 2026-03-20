import { createContext, useCallback, useContext, useState } from 'react'

const STORAGE_KEY = 'edittrack_notifications'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.slice(-50) : []
  } catch {
    return []
  }
}

function saveToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(-50)))
  } catch {}
}

const NotificationsContext = createContext(null)

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState(loadFromStorage)

  const addNotification = useCallback(({ type = 'info', title, message }) => {
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type,
      title: title || 'Notification',
      message: message || '',
      createdAt: new Date().toISOString(),
    }
    setItems((prev) => {
      const next = [item, ...prev].slice(0, 50)
      saveToStorage(next)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }))
      saveToStorage(next)
      return next
    })
  }, [])

  const markRead = useCallback((id) => {
    setItems((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      saveToStorage(next)
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setItems([])
    saveToStorage([])
  }, [])

  const unreadCount = items.filter((n) => !n.read).length

  return (
    <NotificationsContext.Provider
      value={{ items, addNotification, markAllRead, markRead, clearAll, unreadCount }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
