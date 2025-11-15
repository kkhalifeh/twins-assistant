'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { childrenAPI, sleepAPI, authAPI } from '@/lib/api'
import { format, isWithinInterval, parseISO, differenceInMinutes, startOfWeek, endOfWeek } from 'date-fns'
import { Moon, Plus, Sun, Clock, AlertCircle, Edit2, Trash2 } from 'lucide-react'
import SleepModal from '@/components/modals/SleepModal'
import DateRangeSelector from '@/components/DateRangeSelector'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function SleepPage() {
  const queryClient = useQueryClient()
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [modalChildId, setModalChildId] = useState<string>('')
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

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
  })

  const { data: children } = useQuery({
    queryKey: ['children'],
    queryFn: childrenAPI.getAll,
  })

  const { data: sleepLogs, refetch: refetchSleepLogs } = useQuery({
    queryKey: ['sleep', selectedChild],
    queryFn: () => sleepAPI.getAll(
      selectedChild === 'all' ? {} : { childId: selectedChild }
    ),
  })

  // Filter logs based on date range
  const filteredLogs = useMemo(() => {
    if (!sleepLogs) return []
    
    return sleepLogs.filter((log: any) => {
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
  }, [sleepLogs, dateRange])

  // Get active sleep sessions
  const activeSleepSessions = useMemo(() => {
    if (!sleepLogs) return []
    return sleepLogs.filter((log: any) => !log.endTime)
  }, [sleepLogs])

  const endSleepMutation = useMutation({
    mutationFn: (id: string) => sleepAPI.endSleep(id),
    onSuccess: () => {
      setEndingSession(null)
      setEndSessionError(null)
      // Refetch sleep logs to update the UI
      refetchSleepLogs()
      queryClient.invalidateQueries({ queryKey: ['sleep'] })
    },
    onError: (error: any) => {
      setEndingSession(null)
      setEndSessionError(error.response?.data?.error || 'Failed to end sleep session')
      console.error('Error ending sleep session:', error)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: sleepAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep'] })
    },
  })

  const handleEndSleep = async (sessionId: string) => {
    setEndingSession(sessionId)
    setEndSessionError(null)
    endSleepMutation.mutate(sessionId)
  }

  const handleEdit = (log: any) => {
    setEditingLog(log)
    setShowModal(true)
  }

  const handleDelete = (logId: string) => {
    if (confirm('Are you sure you want to delete this sleep log?')) {
      deleteMutation.mutate(logId)
    }
  }

  const isParent = currentUser?.role === 'PARENT'

  const getDailySleepData = () => {
    if (!children || children.length === 0) return []

    const groupedByDay: Record<string, any> = {}

    filteredLogs.forEach((log: any) => {
      const day = format(new Date(log.startTime), 'MM/dd')
      if (!groupedByDay[day]) {
        // Initialize with day and Total, plus each child's name
        const dayData: any = { day, Total: 0 }
        children.forEach((child: any) => {
          dayData[child.name] = 0
        })
        groupedByDay[day] = dayData
      }

      const duration = log.duration || 0
      const hours = duration / 60
      const childName = log.child?.name

      if (childName && groupedByDay[day][childName] !== undefined) {
        groupedByDay[day][childName] += hours
      }
      groupedByDay[day].Total += hours
    })

    return Object.values(groupedByDay)
      .map(day => {
        const result: any = { day: day.day, Total: Math.round(day.Total * 10) / 10 }
        children.forEach((child: any) => {
          result[child.name] = Math.round(day[child.name] * 10) / 10
        })
        return result
      })
      .sort((a, b) => a.day.localeCompare(b.day))
  }

  const getSleepStats = () => {
    const napLogs = filteredLogs.filter((log: any) => log.type === 'NAP')
    const nightLogs = filteredLogs.filter((log: any) => log.type === 'NIGHT')
    
    const totalNapMinutes = napLogs.reduce((sum: number, log: any) => sum + (log.duration || 0), 0)
    const totalNightMinutes = nightLogs.reduce((sum: number, log: any) => sum + (log.duration || 0), 0)
    
    return {
      totalNaps: napLogs.length,
      totalNights: nightLogs.length,
      avgNapDuration: napLogs.length > 0 ? Math.round(totalNapMinutes / napLogs.length) : 0,
      avgNightDuration: nightLogs.length > 0 ? Math.round(totalNightMinutes / nightLogs.length) : 0,
      totalSleepHours: Math.round((totalNapMinutes + totalNightMinutes) / 60 * 10) / 10,
    }
  }

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end })
  }

  const stats = getSleepStats()

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Sleep Tracker</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor sleep patterns and quality</p>
        </div>
        <button
          onClick={() => {
            setModalChildId(children?.[0]?.id || '')
            setEditingLog(null)
            setShowModal(true)
          }}
          className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
        >
          <Plus className="w-5 h-5" />
          <span>Log Sleep</span>
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6">
        <DateRangeSelector onRangeChange={handleDateRangeChange} />
      </div>

      {/* Error Alert */}
      {endSessionError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-sm text-red-700">{endSessionError}</span>
        </div>
      )}

      {/* Active Sleep Sessions */}
      {activeSleepSessions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Currently Sleeping</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSleepSessions.map((session: any) => (
              <div key={session.id} className="card bg-purple-50 border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Moon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-purple-900">{session.child?.name}</p>
                      <p className="text-sm text-purple-700">
                        Started at {format(new Date(session.startTime), 'h:mm a')}
                      </p>
                      <p className="text-xs text-purple-600">
                        {Math.round(differenceInMinutes(new Date(), new Date(session.startTime)))} minutes ago
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEndSleep(session.id)}
                    disabled={endingSession === session.id}
                    className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {endingSession === session.id ? 'Ending...' : 'Wake Up'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Child Filter - Mobile optimized */}
      <div className="card mb-4 sm:mb-6 p-3 sm:p-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedChild('all')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base flex-1 sm:flex-none ${
              selectedChild === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            All Children
          </button>
          {children?.map((child: any) => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child.id)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base flex-1 sm:flex-none ${
                selectedChild === child.id
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {child.name}
            </button>
          ))}
        </div>
      </div>

      {/* Statistics - Mobile optimized */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="card bg-blue-50 p-3 sm:p-6">
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-blue-700">{stats.totalSleepHours}h</p>
            <p className="text-xs sm:text-sm text-gray-600">Total Sleep</p>
          </div>
        </div>
        <div className="card bg-purple-50 p-3 sm:p-6">
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-purple-700">{stats.totalNaps}</p>
            <p className="text-xs sm:text-sm text-gray-600">Naps</p>
          </div>
        </div>
        <div className="card bg-indigo-50 p-3 sm:p-6">
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-indigo-700">{stats.totalNights}</p>
            <p className="text-xs sm:text-sm text-gray-600">Night Sleeps</p>
          </div>
        </div>
        <div className="card bg-green-50 p-3 sm:p-6">
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-green-700">{stats.avgNapDuration}m</p>
            <p className="text-xs sm:text-sm text-gray-600">Avg Nap</p>
          </div>
        </div>
        <div className="card bg-amber-50 p-3 sm:p-6">
          <div className="text-center">
            <p className="text-xl sm:text-2xl font-bold text-amber-700">{Math.round(stats.avgNightDuration / 60)}h</p>
            <p className="text-xs sm:text-sm text-gray-600">Avg Night</p>
          </div>
        </div>
      </div>

      {/* Charts - Mobile optimized */}
      <div className="card mb-4 sm:mb-6 p-3 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Daily Sleep Hours</h2>
        {getDailySleepData().length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={getDailySleepData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {children?.map((child: any, index: number) => {
                const colors = ['#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#6366f1', '#ef4444']
                return (
                  <Bar
                    key={child.id}
                    dataKey={child.name}
                    fill={colors[index % colors.length]}
                  />
                )
              })}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">
            No data for selected period
          </div>
        )}
      </div>

      {/* Recent Sleep Logs - Mobile optimized */}
      <div className="card p-3 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">
          Sleep Timeline ({filteredLogs.length} sessions)
        </h2>
        {filteredLogs.length > 0 ? (
          <div className="space-y-3">
            {filteredLogs.slice(0, 20).map((log: any) => {
              const duration = log.duration || 0
              const hours = Math.floor(duration / 60)
              const minutes = duration % 60
              
              return (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg gap-3">
                  <div className="flex items-start sm:items-center space-x-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-full flex-shrink-0 ${
                      log.type === 'NAP' ? 'bg-amber-100' : 'bg-indigo-100'
                    }`}>
                      {log.type === 'NAP' ? (
                        <Sun className="w-4 sm:w-5 h-4 sm:h-5 text-amber-600" />
                      ) : (
                        <Moon className="w-4 sm:w-5 h-4 sm:h-5 text-indigo-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{log.child?.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {log.type} - {hours > 0 ? `${hours}h ` : ''}{minutes}m
                      </p>
                      {log.user && (
                        <p className="text-xs text-gray-500 truncate">Logged by {log.user.name}</p>
                      )}
                      <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                        {log.quality && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            log.quality === 'DEEP' ? 'bg-green-100 text-green-700' :
                            log.quality === 'RESTLESS' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {log.quality.toLowerCase()}
                          </span>
                        )}
                        {log.headTilt && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                            Head: {log.headTilt.toLowerCase()}
                          </span>
                        )}
                      </div>
                      {log.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{log.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:space-x-3">
                    <div className="text-left sm:text-right">
                      <p className="text-xs sm:text-sm font-medium">
                        {format(new Date(log.startTime), 'h:mm a')}
                        {log.endTime && (
                          <span className="text-gray-500">
                            {' - '}
                            {format(new Date(log.endTime), 'h:mm a')}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(log.startTime), 'MMM d')}
                      </p>
                    </div>
                    {isParent && (
                      <div className="flex space-x-1 sm:space-x-2 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(log)}
                          className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No sleep records for the selected period
          </div>
        )}
      </div>

      {showModal && children && (
        <SleepModal
          childId={modalChildId}
          children={children}
          editingLog={editingLog}
          onClose={() => {
            setShowModal(false)
            setEditingLog(null)
          }}
        />
      )}
    </div>
  )
}
