'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
  toasts: ToastMessage[]
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
      {/* Toast container overlay */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxWidth: '400px',
        pointerEvents: 'none'
      }}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  const colors = {
    success: { bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)', text: '#6ee7b7' },
    error: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.3)', text: '#fca5a5' },
    warning: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)', text: '#fde047' },
    info: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.3)', text: '#93c5fd' }
  }

  const activeColors = colors[toast.type] || colors.info

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        border: `1px solid ${activeColors.border}`,
        borderRadius: '16px',
        padding: '16px 20px',
        color: activeColors.text,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        animation: 'toastSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        minWidth: '280px'
      }}
    >
      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{toast.message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '1.2rem',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1
        }}
      >
        &times;
      </button>
    </div>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
