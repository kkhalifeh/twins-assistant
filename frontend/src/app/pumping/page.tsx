'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { pumpingAPI, authAPI } from '@/lib/api'
import { format, isWithinInterval, parseISO, startOfWeek, endOfWeek, differenceInMinutes } from 'date-fns'
import { Droplet, Plus, TrendingUp, Edit2, Trash2, Activity, AlertCircle, Clock, FileDown } from 'lucide-react'
import PumpingModal from '@/components/modals/PumpingModal'
import PumpingExportModal from '@/components/modals/PumpingExportModal'
import DateRangeSelector from '@/components/DateRangeSelector'
import { useTimezone } from '@/contexts/TimezoneContext'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend
} from 'recharts'

const PUMP_TYPE_LABELS: Record<string, string> = {
  BABY_BUDDHA: 'Baby Buddha',
  MADELA_SYMPHONY: 'Madela Symphony',
  SPECTRA_S1: 'Spectra S1',
  MADELA_IN_STYLE: 'Madela In Style',
  OTHER: 'Other'
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function PumpingPage() {
  const { formatTime, formatDate } = useTimezone()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<any | null>(null)
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date()
    return {
      start: startOfWeek(now, { weekStartsOn: 0 }),
      end: endOfWeek(now, { weekStartsOn: 0 })
    }
  })
  const [endingSession, setEndingSession] = useState<string | null>(null)
  const [endSessionError, setEndSessionError] = useState<string | null>(null)
  const [endSessionAmount, setEndSessionAmount] = useState<string>('')
  const [endSessionUsage, setEndSessionUsage] = useState<string>('STORED')
  const [showEndModal, setShowEndModal] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
  })

  const { data: pumpingLogs, refetch: refetchPumpingLogs } = useQuery({
    queryKey: ['pumping'],
    queryFn: () => pumpingAPI.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: pumpingAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pumping'] })
    },
  })

  const endPumpingMutation = useMutation({
    mutationFn: ({ id, amount, usage }: { id: string; amount: number; usage: string }) =>
      pumpingAPI.endPumping(id, { amount, usage }),
    onSuccess: () => {
      setEndingSession(null)
      setEndSessionError(null)
      setShowEndModal(null)
      setEndSessionAmount('')
      setEndSessionUsage('STORED')
      refetchPumpingLogs()
      queryClient.invalidateQueries({ queryKey: ['pumping'] })
    },
    onError: (error: any) => {
      setEndingSession(null)
      setEndSessionError(error.response?.data?.error || 'Failed to end pumping session')
      console.error('Error ending pumping session:', error)
    }
  })

  const handleEdit = (log: any) => {
    setEditingLog(log)
    setShowModal(true)
  }

  const handleDelete = (logId: string) => {
    if (confirm('Are you sure you want to delete this pumping log?')) {
      deleteMutation.mutate(logId)
    }
  }

  const handleEndPump = async (sessionId: string) => {
    if (!endSessionAmount) {
      setEndSessionError('Please enter the milk amount')
      return
    }
    setEndingSession(sessionId)
    setEndSessionError(null)
    endPumpingMutation.mutate({
      id: sessionId,
      amount: parseFloat(endSessionAmount),
      usage: endSessionUsage
    })
  }

  const isParent = currentUser?.role === 'PARENT'

  // Get active pumping sessions
  const activePumpingSessions = useMemo(() => {
    if (!pumpingLogs) return []
    return pumpingLogs.filter((log: any) => !log.endTime)
  }, [pumpingLogs])

  // Filter logs based on date range
  const filteredLogs = useMemo(() => {
    if (!pumpingLogs) return []

    return pumpingLogs.filter((log: any) => {
      try {
        const logDate = typeof log.startTime === 'string'
          ? parseISO(log.startTime)
          : new Date(log.startTime)

        return isWithinInterval(logDate, {
          start: dateRange.start,
          end: dateRange.end
        })
      } catch (error) {
        console.error('Error filtering log:', error, log)
        return false
      }
    })
  }, [pumpingLogs, dateRange])

  // Daily volume data for line chart
  const getDailyVolumeData = () => {
    const groupedByDay: Record<string, number> = {}

    filteredLogs.forEach((log: any) => {
      const day = format(new Date(log.startTime), 'MM/dd')
      if (!groupedByDay[day]) {
        groupedByDay[day] = 0
      }
      groupedByDay[day] += log.amount || 0
    })

    return Object.entries(groupedByDay)
      .map(([day, volume]) => ({ day, volume }))
      .sort((a, b) => a.day.localeCompare(b.day))
  }

  // Pump efficiency comparison
  const getPumpEfficiencyData = () => {
    const pumpData: Record<string, { totalVolume: number; totalDuration: number; sessions: number }> = {}

    filteredLogs.forEach((log: any) => {
      const pump = log.pumpType || 'OTHER'
      if (!pumpData[pump]) {
        pumpData[pump] = { totalVolume: 0, totalDuration: 0, sessions: 0 }
      }
      pumpData[pump].totalVolume += log.amount || 0
      pumpData[pump].totalDuration += log.duration || 0
      pumpData[pump].sessions += 1
    })

    return Object.entries(pumpData).map(([pump, data]) => ({
      pump: PUMP_TYPE_LABELS[pump] || pump,
      avgVolume: data.sessions > 0 ? Math.round(data.totalVolume / data.sessions) : 0,
      avgDuration: data.sessions > 0 ? Math.round(data.totalDuration / data.sessions) : 0,
      sessions: data.sessions
    }))
  }

  // Usage distribution (stored vs used)
  const getUsageDistribution = () => {
    const stored = filteredLogs.filter((log: any) => log.usage === 'STORED').length
    const used = filteredLogs.filter((log: any) => log.usage === 'USED').length

    return [
      { name: 'Stored', value: stored },
      { name: 'Used', value: used }
    ]
  }

  // Calculate stats
  const stats = useMemo(() => {
    const totalVolume = filteredLogs.reduce((sum: number, log: any) => sum + (log.amount || 0), 0)
    const totalSessions = filteredLogs.length
    const totalDuration = filteredLogs.reduce((sum: number, log: any) => sum + (log.duration || 0), 0)
    const avgVolume = totalSessions > 0 ? Math.round(totalVolume / totalSessions) : 0
    const avgDuration = totalSessions > 0 ? Math.round(totalDuration / totalSessions) : 0

    return { totalVolume, totalSessions, avgVolume, avgDuration }
  }, [filteredLogs])

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end })
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pumping Tracker</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor pumping sessions and milk supply</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-3 sm:mt-0">
          <button
            onClick={() => setShowExportModal(true)}
            className="btn-secondary flex items-center justify-center space-x-2"
          >
            <FileDown className="w-5 h-5" />
            <span>Export Report</span>
          </button>
          <button
            data-log-button
            onClick={() => {
              setEditingLog(null)
              setShowModal(true)
            }}
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Log Pumping Session</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="mb-4 sm:mb-6">
        <DateRangeSelector onRangeChange={handleDateRangeChange} />
      </div>

      {/* Error Alert */}
      {endSessionError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-sm text-red-700">{endSessionError}</span>
        </div>
      )}

      {/* Active Pumping Sessions */}
      {activePumpingSessions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Active Pumping Sessions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activePumpingSessions.map((session: any) => (
              <div key={session.id} className="card bg-blue-50 border-blue-200">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-3 bg-blue-100 rounded-full">
                        <Droplet className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-blue-900">{PUMP_TYPE_LABELS[session.pumpType] || session.pumpType}</p>
                        <p className="text-sm text-blue-700">
                          Started at {format(new Date(session.startTime), 'h:mm a')}
                        </p>
                        <p className="text-xs text-blue-600 flex items-center mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {Math.round(differenceInMinutes(new Date(), new Date(session.startTime)))} minutes
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* End Session Form */}
                  {showEndModal === session.id ? (
                    <div className="bg-white rounded-md p-3 space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Amount (ml)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={endSessionAmount}
                          onChange={(e) => setEndSessionAmount(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          placeholder="120"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Usage</label>
                        <select
                          value={endSessionUsage}
                          onChange={(e) => setEndSessionUsage(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                        >
                          <option value="STORED">Stored</option>
                          <option value="USED">Used</option>
                        </select>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowEndModal(null)}
                          className="flex-1 px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleEndPump(session.id)}
                          disabled={endingSession === session.id}
                          className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                          {endingSession === session.id ? 'Ending...' : 'End Session'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowEndModal(session.id)}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                    >
                      End Pumping
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Droplet className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Volume</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalVolume} ml</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Sessions</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Avg Volume</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.avgVolume} ml</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Avg Duration</p>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.avgDuration} min</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Daily Volume Trend */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Daily Volume Trend</h2>
          <div className="overflow-x-auto">
            <LineChart width={500} height={300} data={getDailyVolumeData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="volume" stroke="#3b82f6" name="Volume (ml)" />
            </LineChart>
          </div>
        </div>

        {/* Pump Efficiency Comparison */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Pump Efficiency</h2>
          <div className="overflow-x-auto">
            <BarChart width={500} height={300} data={getPumpEfficiencyData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="pump" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="avgVolume" fill="#3b82f6" name="Avg Volume (ml)" />
              <Bar dataKey="avgDuration" fill="#10b981" name="Avg Duration (min)" />
            </BarChart>
          </div>
        </div>

        {/* Usage Distribution */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Milk Usage</h2>
          <div className="flex justify-center">
            <PieChart width={400} height={300}>
              <Pie
                data={getUsageDistribution()}
                cx={200}
                cy={150}
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {getUsageDistribution().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </div>
        </div>
      </div>

      {/* Recent Sessions Timeline */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pump</th>
                <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                {isParent && (
                  <th className="px-3 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={isParent ? 6 : 5} className="px-4 py-8 text-center text-gray-500">
                    No pumping sessions found for this date range
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-4 py-3 text-sm">
                      <div>{formatDate(log.startTime)}</div>
                      <div className="text-gray-500">{formatTime(log.startTime)}</div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm">
                      {PUMP_TYPE_LABELS[log.pumpType] || log.pumpType}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm">{log.duration ? `${log.duration} min` : '-'}</td>
                    <td className="px-3 sm:px-4 py-3 text-sm font-semibold text-blue-600">
                      {log.amount ? `${log.amount} ml` : '-'}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm">
                      {log.usage ? (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          log.usage === 'STORED'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {log.usage === 'STORED' ? 'Stored' : 'Used'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    {isParent && (
                      <td className="px-3 sm:px-4 py-3 text-sm">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(log)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(log.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <PumpingModal
          log={editingLog}
          onClose={() => {
            setShowModal(false)
            setEditingLog(null)
          }}
        />
      )}

      {showExportModal && (
        <PumpingExportModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  )
}
