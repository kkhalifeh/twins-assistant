'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { childrenAPI, hygieneAPI, authAPI } from '@/lib/api'
import { format, isWithinInterval, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import {
  Sparkles, Plus, Scissors, Smile, Calendar, Edit2, Trash2
} from 'lucide-react'
import DateRangeSelector from '@/components/DateRangeSelector'
import { useTimezone } from '@/contexts/TimezoneContext'

export default function HygienePage() {
  const queryClient = useQueryClient()
  const { getUserTimezone } = useTimezone()
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<any | null>(null)
  const [hygieneType, setHygieneType] = useState('BATH')
  const [hygieneNotes, setHygieneNotes] = useState('')
  const [timestamp, setTimestamp] = useState(() => {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date()
    return {
      start: startOfWeek(now, { weekStartsOn: 0 }),
      end: endOfWeek(now, { weekStartsOn: 0 })
    }
  })
  const [filterType, setFilterType] = useState<string>('ALL')

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
  })

  const { data: children } = useQuery({
    queryKey: ['children'],
    queryFn: childrenAPI.getAll,
  })

  const { data: hygieneLogs } = useQuery({
    queryKey: ['hygiene', selectedChild],
    queryFn: () => hygieneAPI.getAll(
      selectedChild ? { childId: selectedChild } : {}
    ),
  })

  // Filter logs based on date range and type
  const filteredLogs = useMemo(() => {
    if (!hygieneLogs) return []

    return hygieneLogs.filter((log: any) => {
      try {
        const logDate = typeof log.timestamp === 'string'
          ? parseISO(log.timestamp)
          : new Date(log.timestamp)

        const withinDateRange = isWithinInterval(logDate, {
          start: dateRange.start,
          end: dateRange.end
        })

        const matchesType = filterType === 'ALL' || log.type === filterType

        return withinDateRange && matchesType
      } catch (error) {
        console.error('Error filtering log:', error, log)
        return false
      }
    })
  }, [hygieneLogs, dateRange, filterType])

  const createHygieneLog = useMutation({
    mutationFn: hygieneAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hygiene'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowModal(false)
      setHygieneNotes('')
      setEditingLog(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => hygieneAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hygiene'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowModal(false)
      setEditingLog(null)
      setHygieneNotes('')
      const now = new Date()
      setTimestamp(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: hygieneAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hygiene'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChild) return

    const data = {
      childId: selectedChild,
      type: hygieneType,
      notes: hygieneNotes,
      timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      timezone: getUserTimezone(),
    }

    if (editingLog) {
      updateMutation.mutate({ id: editingLog.id, data })
    } else {
      createHygieneLog.mutate(data)
    }
  }

  const handleEdit = (log: any) => {
    setEditingLog(log)
    setSelectedChild(log.childId)
    setHygieneType(log.type)
    setHygieneNotes(log.notes || '')
    const logDate = new Date(log.timestamp)
    setTimestamp(new Date(logDate.getTime() - logDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
    setShowModal(true)
  }

  const handleDelete = (logId: string) => {
    if (confirm('Are you sure you want to delete this hygiene record?')) {
      deleteMutation.mutate(logId)
    }
  }

  const isParent = currentUser?.role === 'PARENT'

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end })
  }

  const getHygieneIcon = (type: string) => {
    switch (type) {
      case 'BATH':
        return <Sparkles className="w-5 h-5 text-cyan-600" />
      case 'NAIL_TRIMMING':
        return <Scissors className="w-5 h-5 text-teal-600" />
      case 'ORAL_CARE':
        return <Smile className="w-5 h-5 text-blue-600" />
      default:
        return <Sparkles className="w-5 h-5 text-cyan-600" />
    }
  }

  const getHygieneLabel = (type: string) => {
    switch (type) {
      case 'BATH':
        return 'Bath'
      case 'NAIL_TRIMMING':
        return 'Nail Trimming'
      case 'ORAL_CARE':
        return 'Oral Care'
      default:
        return type
    }
  }

  const getLastHygieneTime = (type: string) => {
    const logs = filteredLogs
      .filter((log: any) => log.type === type && log.childId === selectedChild)
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return logs.length > 0 ? logs[0].timestamp : null
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hygiene Records</h1>
          <p className="text-gray-600 mt-1">Track bathing, nail trimming, and oral care</p>
        </div>
        <button
          data-log-button
          onClick={() => {
            setEditingLog(null)
            setHygieneNotes('')
            const now = new Date()
            setTimestamp(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
            setShowModal(true)
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Log Hygiene</span>
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6">
        <DateRangeSelector onRangeChange={handleDateRangeChange} />
      </div>

      {/* Child Selector */}
      <div className="card mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Child
        </label>
        <div className="flex space-x-2">
          {children?.map((child: any) => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child.id)}
              className={`px-4 py-2 rounded-lg ${
                selectedChild === child.id
                  ? 'bg-cyan-100 text-cyan-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      </div>

      {selectedChild && (
        <>
          {/* Last Hygiene Times */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="card bg-cyan-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Last Bath</p>
                  <p className="text-lg font-bold">
                    {getLastHygieneTime('BATH') ?
                      format(new Date(getLastHygieneTime('BATH')!), 'MMM d, h:mm a') :
                      'No record'
                    }
                  </p>
                </div>
                <Sparkles className="w-8 h-8 text-cyan-500" />
              </div>
            </div>

            <div className="card bg-teal-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Last Nail Trim</p>
                  <p className="text-lg font-bold">
                    {getLastHygieneTime('NAIL_TRIMMING') ?
                      format(new Date(getLastHygieneTime('NAIL_TRIMMING')!), 'MMM d, h:mm a') :
                      'No record'
                    }
                  </p>
                </div>
                <Scissors className="w-8 h-8 text-teal-500" />
              </div>
            </div>

            <div className="card bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Last Oral Care</p>
                  <p className="text-lg font-bold">
                    {getLastHygieneTime('ORAL_CARE') ?
                      format(new Date(getLastHygieneTime('ORAL_CARE')!), 'MMM d, h:mm a') :
                      'No record'
                    }
                  </p>
                </div>
                <Smile className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Filter by Type */}
          <div className="card mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Type
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilterType('ALL')}
                className={`px-4 py-2 rounded-lg ${
                  filterType === 'ALL'
                    ? 'bg-cyan-100 text-cyan-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('BATH')}
                className={`px-4 py-2 rounded-lg ${
                  filterType === 'BATH'
                    ? 'bg-cyan-100 text-cyan-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Bath
              </button>
              <button
                onClick={() => setFilterType('NAIL_TRIMMING')}
                className={`px-4 py-2 rounded-lg ${
                  filterType === 'NAIL_TRIMMING'
                    ? 'bg-cyan-100 text-cyan-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Nail Trimming
              </button>
              <button
                onClick={() => setFilterType('ORAL_CARE')}
                className={`px-4 py-2 rounded-lg ${
                  filterType === 'ORAL_CARE'
                    ? 'bg-cyan-100 text-cyan-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Oral Care
              </button>
            </div>
          </div>

          {/* Recent Hygiene Logs */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">
              Hygiene Records ({filteredLogs.filter((log: any) => log.childId === selectedChild).length} records)
            </h2>
            {filteredLogs.filter((log: any) => log.childId === selectedChild).length > 0 ? (
              <div className="space-y-3">
                {filteredLogs
                  .filter((log: any) => log.childId === selectedChild)
                  .slice(0, 20)
                  .map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className={`p-2 rounded-full ${
                        log.type === 'BATH' ? 'bg-cyan-100' :
                        log.type === 'NAIL_TRIMMING' ? 'bg-teal-100' : 'bg-blue-100'
                      }`}>
                        {getHygieneIcon(log.type)}
                      </div>
                      <div>
                        <p className="font-medium">{getHygieneLabel(log.type)}</p>
                        {log.user && (
                          <p className="text-xs text-gray-500">Logged by {log.user.name}</p>
                        )}
                        {log.notes && (
                          <p className="text-xs text-gray-500 mt-1">{log.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {format(new Date(log.timestamp), 'h:mm a')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {format(new Date(log.timestamp), 'MMM d')}
                        </p>
                      </div>
                      {isParent && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(log)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hygiene records for the selected period
              </div>
            )}
          </div>
        </>
      )}

      {/* Hygiene Log Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">{editingLog ? 'Edit Hygiene Record' : 'Log Hygiene'}</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child
                </label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select child...</option>
                  {children?.map((child: any) => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={hygieneType}
                  onChange={(e) => setHygieneType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="BATH">Bath / Shower</option>
                  <option value="NAIL_TRIMMING">Nail Trimming</option>
                  <option value="ORAL_CARE">Oral Care (Gum Cleaning)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={timestamp}
                  onChange={(e) => setTimestamp(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={hygieneNotes}
                  onChange={(e) => setHygieneNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Optional notes..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createHygieneLog.isPending || updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50"
                >
                  {createHygieneLog.isPending || updateMutation.isPending ? 'Saving...' : editingLog ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
