'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { logImportAPI, childrenAPI } from '@/lib/api'
import {
  AlertCircle, Check, X, Edit2, Save, Loader2,
  Clock, Calendar, Baby, Activity, Moon, Info
} from 'lucide-react'
import { format } from 'date-fns'

interface ParsedLog {
  type: 'feeding' | 'diaper' | 'sleep'
  time: string
  date: string
  confidence: 'high' | 'medium' | 'low'
  data: any
  rawText?: string
}

interface LogImportData {
  analysisResult: {
    logs: ParsedLog[]
    warnings: string[]
    imageQuality: string
  }
  selectedChildren: string[]
  timezone: string
}

export default function LogReviewPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [importData, setImportData] = useState<LogImportData | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editedLogs, setEditedLogs] = useState<ParsedLog[]>([])
  const [childAssignments, setChildAssignments] = useState<{ [key: number]: string }>({})

  const { data: children } = useQuery({
    queryKey: ['children'],
    queryFn: childrenAPI.getAll,
  })

  useEffect(() => {
    // Load import data from localStorage
    const data = localStorage.getItem('logImportData')
    if (!data) {
      router.push('/logs/import')
      return
    }

    const parsed: LogImportData = JSON.parse(data)
    setImportData(parsed)
    setEditedLogs(parsed.analysisResult.logs)

    // Initialize child assignments to first selected child
    const assignments: { [key: number]: string } = {}
    parsed.analysisResult.logs.forEach((_, index) => {
      assignments[index] = parsed.selectedChildren[0]
    })
    setChildAssignments(assignments)
  }, [router])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!importData) return

      // Save each log individually with its child assignment
      const promises = editedLogs.map((log, index) => {
        return logImportAPI.createLog({
          log,
          childId: childAssignments[index],
          timezone: importData.timezone,
        })
      })

      await Promise.all(promises)
    },
    onSuccess: () => {
      // Clear localStorage
      localStorage.removeItem('logImportData')

      // Invalidate all log queries
      queryClient.invalidateQueries({ queryKey: ['feeding'] })
      queryClient.invalidateQueries({ queryKey: ['diapers'] })
      queryClient.invalidateQueries({ queryKey: ['sleep'] })

      // Navigate to dashboard
      router.push('/')
    },
  })

  const handleEdit = (index: number) => {
    setEditingIndex(index)
  }

  const handleSaveEdit = () => {
    setEditingIndex(null)
  }

  const handleFieldChange = (index: number, field: string, value: any) => {
    setEditedLogs(prev => {
      const newLogs = [...prev]
      if (field.startsWith('data.')) {
        const dataField = field.replace('data.', '')
        newLogs[index] = {
          ...newLogs[index],
          data: {
            ...newLogs[index].data,
            [dataField]: value,
          },
        }
      } else {
        newLogs[index] = {
          ...newLogs[index],
          [field]: value,
        }
      }
      return newLogs
    })
  }

  const handleChildChange = (index: number, childId: string) => {
    setChildAssignments(prev => ({
      ...prev,
      [index]: childId,
    }))
  }

  const handleDeleteLog = (index: number) => {
    setEditedLogs(prev => prev.filter((_, i) => i !== index))
    setChildAssignments(prev => {
      const newAssignments = { ...prev }
      delete newAssignments[index]
      // Reindex remaining assignments
      const reindexed: { [key: number]: string } = {}
      Object.entries(newAssignments).forEach(([key, value]) => {
        const numKey = parseInt(key)
        if (numKey > index) {
          reindexed[numKey - 1] = value
        } else {
          reindexed[numKey] = value
        }
      })
      return reindexed
    })
  }

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'feeding':
        return <Activity className="w-5 h-5" />
      case 'diaper':
        return <Baby className="w-5 h-5" />
      case 'sleep':
        return <Moon className="w-5 h-5" />
      default:
        return null
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-700 bg-green-100'
      case 'medium':
        return 'text-yellow-700 bg-yellow-100'
      case 'low':
        return 'text-red-700 bg-red-100'
      default:
        return 'text-gray-700 bg-gray-100'
    }
  }

  if (!importData || !children) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Review Imported Logs</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Review and edit each log before saving to the system
        </p>
      </div>

      {/* Warnings */}
      {importData.analysisResult.warnings.length > 0 && (
        <div className="card mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-2">Warnings</h3>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                {importData.analysisResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="card mb-6 bg-gradient-to-r from-primary-50 to-secondary-50">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary-700">{editedLogs.length}</p>
            <p className="text-sm text-gray-600">Total Logs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary-700">
              {editedLogs.filter(l => l.type === 'feeding').length}
            </p>
            <p className="text-sm text-gray-600">Feeding</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary-700">
              {editedLogs.filter(l => l.type === 'diaper').length}
            </p>
            <p className="text-sm text-gray-600">Diapers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary-700">
              {editedLogs.filter(l => l.type === 'sleep').length}
            </p>
            <p className="text-sm text-gray-600">Sleep</p>
          </div>
        </div>
      </div>

      {/* Log Cards */}
      <div className="space-y-4 mb-6">
        {editedLogs.map((log, index) => (
          <div key={index} className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${
                  log.type === 'feeding' ? 'bg-blue-100 text-blue-600' :
                  log.type === 'diaper' ? 'bg-green-100 text-green-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {getLogIcon(log.type)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 capitalize">{log.type} Log #{index + 1}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${getConfidenceColor(log.confidence)}`}>
                    {log.confidence} confidence
                  </span>
                </div>
              </div>

              <div className="flex space-x-2">
                {editingIndex === index ? (
                  <button
                    onClick={handleSaveEdit}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleEdit(index)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteLog(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Child Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Child
              </label>
              <div className="flex flex-wrap gap-2">
                {children.map((child: any) => (
                  <button
                    key={child.id}
                    onClick={() => handleChildChange(index, child.id)}
                    disabled={editingIndex !== index && editingIndex !== null}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      childAssignments[index] === child.id
                        ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                        : 'bg-gray-100 text-gray-700 border-2 border-transparent'
                    } ${editingIndex !== index && editingIndex !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {child.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Log Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                {editingIndex === index ? (
                  <input
                    type="date"
                    value={log.date}
                    onChange={(e) => handleFieldChange(index, 'date', e.target.value)}
                    className="input-field text-sm"
                  />
                ) : (
                  <span className="text-sm text-gray-600">
                    {format(new Date(log.date), 'MMM d, yyyy')}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-gray-400" />
                {editingIndex === index ? (
                  <input
                    type="time"
                    value={log.time}
                    onChange={(e) => handleFieldChange(index, 'time', e.target.value)}
                    className="input-field text-sm"
                  />
                ) : (
                  <span className="text-sm text-gray-600">{log.time}</span>
                )}
              </div>
            </div>

            {/* Type-Specific Data */}
            {log.type === 'feeding' && (
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700">Type</label>
                    {editingIndex === index ? (
                      <select
                        value={log.data.type}
                        onChange={(e) => handleFieldChange(index, 'data.type', e.target.value)}
                        className="input-field text-sm mt-1"
                      >
                        <option value="BREAST">Breast</option>
                        <option value="BOTTLE">Bottle (EBM)</option>
                        <option value="FORMULA">Formula</option>
                        <option value="SOLIDS">Solids</option>
                      </select>
                    ) : (
                      <p className="text-sm font-medium">{log.data.type}</p>
                    )}
                  </div>

                  {log.data.amount && (
                    <div>
                      <label className="text-xs font-medium text-gray-700">Amount</label>
                      {editingIndex === index ? (
                        <input
                          type="number"
                          value={log.data.amount}
                          onChange={(e) => handleFieldChange(index, 'data.amount', parseFloat(e.target.value))}
                          className="input-field text-sm mt-1"
                        />
                      ) : (
                        <p className="text-sm font-medium">{log.data.amount} {log.data.unit || 'ml'}</p>
                      )}
                    </div>
                  )}

                  {log.data.duration && (
                    <div>
                      <label className="text-xs font-medium text-gray-700">Duration</label>
                      <p className="text-sm font-medium">{log.data.duration} min</p>
                    </div>
                  )}
                </div>

                {log.data.notes && (
                  <div className="mt-2">
                    <label className="text-xs font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-600">{log.data.notes}</p>
                  </div>
                )}
              </div>
            )}

            {log.type === 'diaper' && (
              <div className="bg-green-50 rounded-lg p-3">
                <div>
                  <label className="text-xs font-medium text-gray-700">Type</label>
                  {editingIndex === index ? (
                    <select
                      value={log.data.type}
                      onChange={(e) => handleFieldChange(index, 'data.type', e.target.value)}
                      className="input-field text-sm mt-1"
                    >
                      <option value="WET">Wet (Urine)</option>
                      <option value="DIRTY">Dirty (Poop)</option>
                      <option value="BOTH">Both</option>
                      <option value="DRY">Dry</option>
                    </select>
                  ) : (
                    <p className="text-sm font-medium">{log.data.type}</p>
                  )}
                </div>

                {log.data.notes && (
                  <div className="mt-2">
                    <label className="text-xs font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-600">{log.data.notes}</p>
                  </div>
                )}
              </div>
            )}

            {log.type === 'sleep' && (
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700">Start Time</label>
                    <p className="text-sm font-medium">{log.data.startTime}</p>
                  </div>

                  {log.data.endTime && (
                    <div>
                      <label className="text-xs font-medium text-gray-700">End Time</label>
                      <p className="text-sm font-medium">{log.data.endTime}</p>
                    </div>
                  )}

                  {log.data.duration && (
                    <div>
                      <label className="text-xs font-medium text-gray-700">Duration</label>
                      <p className="text-sm font-medium">{log.data.duration} min</p>
                    </div>
                  )}
                </div>

                {log.data.notes && (
                  <div className="mt-2">
                    <label className="text-xs font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-600">{log.data.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* Raw Text */}
            {log.rawText && (
              <div className="mt-3 flex items-start space-x-2 text-xs text-gray-500">
                <Info className="w-3 h-3 mt-0.5" />
                <span>Original: "{log.rawText}"</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center sticky bottom-0 bg-white p-4 border-t shadow-lg">
        <button
          onClick={() => router.push('/logs/import')}
          className="btn-secondary"
        >
          Back to Upload
        </button>

        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || editedLogs.length === 0}
          className="btn-primary flex items-center space-x-2"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              <span>Save All Logs ({editedLogs.length})</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
