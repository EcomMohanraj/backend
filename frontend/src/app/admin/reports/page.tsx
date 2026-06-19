'use client'

import { useState } from 'react'
import { FileSpreadsheet, Download, FileText, Info, Sparkles, TrendingUp, Archive, BarChart3 } from 'lucide-react'
import { useToast } from '@/context/ToastContext'

export default function AdminReports() {
  const { showToast } = useToast()
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (reportType: 'sales' | 'inventory' | 'revenue') => {
    setDownloading(reportType)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      
      // We will perform a direct fetch to support HTTP-only session cookies
      const response = await fetch(`${apiUrl}/reports/${reportType}/csv`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Report export failed')
      }

      // Convert response to blob and trigger download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      showToast(`Exported ${reportType} report successfully!`, 'success')
    } catch (err) {
      console.error(err)
      showToast('Export failed. Verify admin authorization credentials.', 'error')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, background: 'linear-gradient(135deg, #FFF 0%, #94A3B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Analytical Reports
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Export core database logs in CSV spreadsheets format for external accounting audits.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2.5rem' }}>
        
        {/* Sales Report Card */}
        <div className="dashboard-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', width: '50px', height: '50px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Sales Orders Audit</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.5' }}>
              Contains breakdown logs of all transactions. Includes order IDs, client names, payment status, grand totals, and item details.
            </p>
          </div>
          <button
            onClick={() => handleDownload('sales')}
            disabled={downloading !== null}
            className="btn-primary"
            style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {downloading === 'sales' ? <div className="spinner" /> : <Download size={16} />}
            Export CSV Spreadsheet
          </button>
        </div>

        {/* Inventory Report Card */}
        <div className="dashboard-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', width: '50px', height: '50px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FBBF24' }}>
            <Archive size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Inventory Stock Log</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.5' }}>
              Contains current listing snapshots. Includes product SKU names, prices, categories, current spawn units in stock, and nutrition parameters.
            </p>
          </div>
          <button
            onClick={() => handleDownload('inventory')}
            disabled={downloading !== null}
            className="btn-primary"
            style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {downloading === 'inventory' ? <div className="spinner" /> : <Download size={16} />}
            Export CSV Spreadsheet
          </button>
        </div>

        {/* Revenue Report Card */}
        <div className="dashboard-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', width: '50px', height: '50px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A78BFA' }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Daily Revenue Analysis</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.5' }}>
              Contains daily timeline analytics for successful payments, showing gross revenue counts for chart generation and spreadsheet tracking.
            </p>
          </div>
          <button
            onClick={() => handleDownload('revenue')}
            disabled={downloading !== null}
            className="btn-primary"
            style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {downloading === 'revenue' ? <div className="spinner" /> : <Download size={16} />}
            Export CSV Spreadsheet
          </button>
        </div>

      </div>

      {/* Info footer */}
      <div className="dashboard-card" style={{ marginTop: '3rem', padding: '1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <Info size={20} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
          CSV files can be imported directly into Excel, Google Sheets, or Numbers. Ensure text encoding is set to UTF-8 to preserve rupee currency formatting (₹).
        </span>
      </div>

    </div>
  )
}
