'use client'

import { useState } from 'react'
import { X, Download, FileText, Loader2 } from 'lucide-react'
import { format, subDays } from 'date-fns'

interface FeedingExportModalProps {
  onClose: () => void
}

export default function FeedingExportModal({ onClose }: FeedingExportModalProps) {
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [exportingCSV, setExportingCSV] = useState(false)
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExportCSV = async () => {
    setError(null)
    setExportingCSV(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/feeding/export/csv?startDate=${startDate}T00:00:00.000Z&endDate=${endDate}T23:59:59.999Z`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to export CSV')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `feeding-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message || 'Failed to export CSV')
      console.error('Export CSV error:', err)
    } finally {
      setExportingCSV(false)
    }
  }

  const handleGenerateInsights = async () => {
    setError(null)
    setGeneratingInsights(true)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(
        `/api/feeding/export/insights?startDate=${startDate}T00:00:00.000Z&endDate=${endDate}T23:59:59.999Z`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate insights')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `feeding-insights-${format(new Date(), 'yyyy-MM-dd')}.md`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message || 'Failed to generate insights')
      console.error('Generate insights error:', err)
    } finally {
      setGeneratingInsights(false)
    }
  }

  const isDateRangeValid = startDate && endDate && new Date(startDate) <= new Date(endDate)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-4 border-b">
          <h2 className="text-xl font-semibold">Export Feeding Report</h2>
          <button onClick={onClose} type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Date Range Selection */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                max={endDate || undefined}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                min={startDate || undefined}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>

          {/* Quick Select Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setStartDate(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
                setEndDate(format(new Date(), 'yyyy-MM-dd'))
              }}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => {
                setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
                setEndDate(format(new Date(), 'yyyy-MM-dd'))
              }}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Last 30 Days
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Export Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!isDateRangeValid || exportingCSV}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exportingCSV ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Exporting CSV...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Export Raw CSV Data
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGenerateInsights}
              disabled={!isDateRangeValid || generatingInsights}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {generatingInsights ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Insights...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5" />
                  Generate AI Insights Report
                </>
              )}
            </button>
          </div>

          {/* Info Text */}
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>CSV Export:</strong> Downloads all feeding data in spreadsheet format</p>
            <p><strong>AI Insights:</strong> Generates a detailed markdown report with AI-powered analysis and recommendations (may take 10-30 seconds)</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
