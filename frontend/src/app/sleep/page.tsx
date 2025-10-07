'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { childrenAPI, sleepAPI } from '@/lib/api'
import { format, isWithinInterval, parseISO, differenceInMinutes } from 'date-fns'
import { Moon, Plus, Sun, Clock, AlertCircle } from 'lucide-react'
import SleepModal from '@/components/modals/SleepModal'
import DateRangeSelector from '@/components/DateRangeSelector'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function SleepPage() {
  const queryClient = useQueryClient()
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [modalChildId, setModalChildId] = useState<string>('')
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date()
  })
  const [endingSession, setEndingSession] = useState<string | null>(null)
  const [endSessionError, setEndSessionError] = useState<string | null>(null)

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

  const handleEndSleep = async (sessionId: string) => {
    setEndingSession(sessionId)
    setEndSessionError(null)
    endSleepMutation.mutate(sessionId)
  }

  const getDailySleepData = () => {
    const groupedByDay: Record<string, any> = {}
    
    filteredLogs.forEach((log: any) => {
      const day = format(new Date(log.startTime), 'MM/dd')
      if (!groupedByDay[day]) {
        groupedByDay[day] = { day, Samar: 0, Maryam: 0, Total: 0 }
      }
      
      const duration = log.duration || 0
      const hours = duration / 60
      
      if (log.child?.name === 'Samar') {
        groupedByDay[day].Samar += hours
      } else if (log.child?.name === 'Maryam') {
        groupedByDay[day].Maryam += hours
      }
      groupedByDay[day].Total += hours
    })
    
    return Object.values(groupedByDay)
      .map(day => ({
        ...day,
        Samar: Math.round(day.Samar * 10) / 10,
        Maryam: Math.round(day.Maryam * 10) / 10,
        Total: Math.round(day.Total * 10) / 10,
      }))
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sleep Tracker</h1>
          <p className="text-gray-600 mt-1">Monitor sleep patterns and quality</p>
        </div>
        <button
          onClick={() => {
            setModalChildId(children?.[0]?.id || '')
            setShowModal(true)
          }}
          className="btn-primary flex items-center space-x-2"
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

      {/* Child Filter */}
      <div className="card mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedChild('all')}
            className={`px-4 py-2 rounded-lg ${
              selectedChild === 'all' 
                ? 'bg-primary-100 text-primary-700' 
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Both Twins
          </button>
          {children?.map((child: any) => (
            <button
              key={child.id}
              onClick={() => setSelectedChild(child.id)}
              className={`px-4 py-2 rounded-lg ${
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

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card bg-blue-50">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.totalSleepHours}h</p>
            <p className="text-sm text-gray-600">Total Sleep</p>
          </div>
        </div>
        <div className="card bg-purple-50">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-700">{stats.totalNaps}</p>
            <p className="text-sm text-gray-600">Naps</p>
          </div>
        </div>
        <div className="card bg-indigo-50">
          <div className="text-center">
            <p className="text-2xl font-bold text-indigo-700">{stats.totalNights}</p>
            <p className="text-sm text-gray-600">Night Sleeps</p>
          </div>
        </div>
        <div className="card bg-green-50">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-700">{stats.avgNapDuration}m</p>
            <p className="text-sm text-gray-600">Avg Nap</p>
          </div>
        </div>
        <div className="card bg-amber-50">
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-700">{Math.round(stats.avgNightDuration / 60)}h</p>
            <p className="text-sm text-gray-600">Avg Night</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Daily Sleep Hours</h2>
        {getDailySleepData().length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getDailySleepData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Samar" fill="#ec4899" />
              <Bar dataKey="Maryam" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-gray-500">
            No data for selected period
          </div>
        )}
      </div>

      {/* Recent Sleep Logs */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">
          Sleep Timeline ({filteredLogs.length} sessions)
        </h2>
        {filteredLogs.length > 0 ? (
          <div className="space-y-3">
            {filteredLogs.slice(0, 20).map((log: any) => {
              const duration = log.duration || 0
              const hours = Math.floor(duration / 60)
              const minutes = duration % 60
              
              return (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      log.type === 'NAP' ? 'bg-amber-100' : 'bg-indigo-100'
                    }`}>
                      {log.type === 'NAP' ? (
                        <Sun className="w-5 h-5 text-amber-600" />
                      ) : (
                        <Moon className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{log.child?.name}</p>
                      <p className="text-sm text-gray-600">
                        {log.type} - {hours > 0 ? `${hours}h ` : ''}{minutes}m
                      </p>
                      {log.quality && (
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          log.quality === 'DEEP' ? 'bg-green-100 text-green-700' :
                          log.quality === 'RESTLESS' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {log.quality.toLowerCase()}
                        </span>
                      )}
                      {log.notes && <p className="text-xs text-gray-500 mt-1">{log.notes}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
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

      {showModal && (
        <SleepModal
          childId={modalChildId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
