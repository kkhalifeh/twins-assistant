'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tantml:parameter>
<invoke name="pumpingAPI, authAPI } from '@/lib/api'
import { format, isWithinInterval, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { Droplet, Plus, TrendingUp, Edit2, Trash2, Activity } from 'lucide-react'
import PumpingModal from '@/components/modals/PumpingModal'
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

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
  })

  const { data: pumpingLogs } = useQuery({
    queryKey: ['pumping'],
    queryFn: () => pumpingAPI.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: pumpingAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pumping'] })
    },
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

  const isParent = currentUser?.role === 'PARENT'

  // Filter logs based on date range
  const filteredLogs = useMemo(() => {
    if (!pumpingLogs) return []

    return pumpingLogs.filter((log: any) => {
      try {
        const logDate = typeof log.timestamp === 'string'
          ? parseISO(log.timestamp)
          : new Date(log.timestamp)

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
      const day = format(new Date(log.timestamp), 'MM/dd')
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
        <button
          data-log-button
          onClick={() => {
            setEditingLog(null)
            setShowModal(true)
          }}
          className="btn-primary flex items-center space-x-2 w-full sm:w-auto mt-3 sm:mt-0 justify-center"
        >
          <Plus className="w-5 h-5" />
          <span>Log Pumping Session</span>
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="mb-4 sm:mb-6">
        <DateRangeSelector onRangeChange={handleDateRangeChange} />
      </div>

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
                      <div>{formatDate(log.timestamp)}</div>
                      <div className="text-gray-500">{formatTime(log.timestamp)}</div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm">
                      {PUMP_TYPE_LABELS[log.pumpType] || log.pumpType}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm">{log.duration} min</td>
                    <td className="px-3 sm:px-4 py-3 text-sm font-semibold text-blue-600">
                      {log.amount} ml
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        log.usage === 'STORED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {log.usage === 'STORED' ? 'Stored' : 'Used'}
                      </span>
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
    </div>
  )
}
