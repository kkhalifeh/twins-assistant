'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { childrenAPI, feedingAPI, authAPI } from '@/lib/api'
import { format, isWithinInterval, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { Milk, Plus, TrendingUp, Edit2, Trash2, Download } from 'lucide-react'
import FeedingModal from '@/components/modals/FeedingModal'
import FeedingExportModal from '@/components/modals/FeedingExportModal'
import DateRangeSelector from '@/components/DateRangeSelector'
import { useTimezone } from '@/contexts/TimezoneContext'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export default function FeedingPage() {
  const { formatTime, formatDate } = useTimezone()

  // Color mapping function for dynamic children
  const getChildColorClass = (childName: string, type: 'bg' | 'text') => {
    if (!children) return type === 'bg' ? 'bg-gray-100' : 'text-gray-600'

    const childIndex = children.findIndex((child: any) => child.name === childName)
    const colorMap = [
      { bg: 'bg-pink-100', text: 'text-pink-600' },
      { bg: 'bg-purple-100', text: 'text-purple-600' },
      { bg: 'bg-green-100', text: 'text-green-600' },
      { bg: 'bg-yellow-100', text: 'text-yellow-600' },
      { bg: 'bg-indigo-100', text: 'text-indigo-600' },
      { bg: 'bg-red-100', text: 'text-red-600' }
    ]

    return childIndex >= 0
      ? colorMap[childIndex % colorMap.length][type]
      : type === 'bg' ? 'bg-gray-100' : 'text-gray-600'
  }
  const queryClient = useQueryClient()
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [modalChildId, setModalChildId] = useState<string>('')
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

  const { data: children } = useQuery({
    queryKey: ['children'],
    queryFn: childrenAPI.getAll,
  })

  const { data: feedingLogs } = useQuery({
    queryKey: ['feeding', selectedChild],
    queryFn: () => feedingAPI.getAll(
      selectedChild === 'all' ? {} : { childId: selectedChild }
    ),
  })

  const deleteMutation = useMutation({
    mutationFn: feedingAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding'] })
    },
  })

  const handleEdit = (log: any) => {
    setEditingLog(log)
    setShowModal(true)
  }

  const handleDelete = (logId: string) => {
    if (confirm('Are you sure you want to delete this feeding log?')) {
      deleteMutation.mutate(logId)
    }
  }

  const isParent = currentUser?.role === 'PARENT'

  // Filter logs based on date range
  const filteredLogs = useMemo(() => {
    if (!feedingLogs) return []
    
    return feedingLogs.filter((log: any) => {
      try {
        const logDate = typeof log.startTime === 'string' 
          ? parseISO(log.startTime) 
          : new Date(log.startTime)
        
        const isInRange = isWithinInterval(logDate, { 
          start: dateRange.start, 
          end: dateRange.end 
        })
        
        console.log('Log filtering:', {
          logDate: format(logDate, 'yyyy-MM-dd HH:mm'),
          rangeStart: format(dateRange.start, 'yyyy-MM-dd HH:mm'),
          rangeEnd: format(dateRange.end, 'yyyy-MM-dd HH:mm'),
          isInRange
        })
        
        return isInRange
      } catch (error) {
        console.error('Error filtering log:', error, log)
        return false
      }
    })
  }, [feedingLogs, dateRange])

  const getDailyIntakeData = () => {
    if (!children || children.length === 0) {
      console.log('getDailyIntakeData: No children')
      return []
    }

    const groupedByDay: Record<string, any> = {}

    console.log('getDailyIntakeData: filteredLogs=', filteredLogs.length, 'children=', children.length)

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

      const amount = log.amount || 0
      const childName = log.child?.name
      if (childName && groupedByDay[day][childName] !== undefined) {
        groupedByDay[day][childName] += amount
      }
      groupedByDay[day].Total += amount
    })

    const result = Object.values(groupedByDay).sort((a, b) =>
      a.day.localeCompare(b.day)
    )
    console.log('getDailyIntakeData result:', result)
    return result
  }

  const handleDateRangeChange = (start: Date, end: Date) => {
    console.log('Date range changed in parent:', {
      start: format(start, 'yyyy-MM-dd HH:mm'),
      end: format(end, 'yyyy-MM-dd HH:mm')
    })
    setDateRange({ start, end })
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Feeding Tracker</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor feeding patterns and intake</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto mt-3 sm:mt-0">
          <button
            onClick={() => setShowExportModal(true)}
            className="btn-secondary flex items-center space-x-2 justify-center"
          >
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
          <button
            data-log-button
            onClick={() => {
              setModalChildId(children?.[0]?.id || '')
              setEditingLog(null)
              setShowModal(true)
            }}
            className="btn-primary flex items-center space-x-2 justify-center"
          >
            <Plus className="w-5 h-5" />
            <span>Log Feeding</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="mb-4 sm:mb-6">
        <DateRangeSelector onRangeChange={handleDateRangeChange} />
      </div>

      {/* Debug Info (remove in production) */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
        <p>Total logs: {feedingLogs?.length || 0}</p>
        <p>Filtered logs: {filteredLogs.length}</p>
        <p>Date range: {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d')}</p>
      </div>

      {/* Child Filter */}
      <div className="card mb-4 sm:mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedChild('all')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base ${
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
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base ${
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="card">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Daily Intake (ml)</h2>
          {getDailyIntakeData().length > 0 ? (
            <div className="w-full" style={{ height: 300 }}>
              <BarChart width={500} height={300} data={getDailyIntakeData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
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
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">
              No data for selected period
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Total Daily Intake</h2>
          {getDailyIntakeData().length > 0 ? (
            <div className="w-full" style={{ height: 300 }}>
              <LineChart width={500} height={300} data={getDailyIntakeData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">
              No data for selected period
            </div>
          )}
        </div>
      </div>

      {/* Recent Feedings Timeline */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">
          Feeding Timeline ({filteredLogs.length} feedings)
        </h2>
        {filteredLogs.length > 0 ? (
          <div className="space-y-3">
            {filteredLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`p-2 rounded-full ${
                    getChildColorClass(log.child?.name, 'bg')
                  }`}>
                    <Milk className={`w-5 h-5 ${
                      getChildColorClass(log.child?.name, 'text')
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{log.child?.name}</p>
                    <p className="text-sm text-gray-600">
                      {log.type.toLowerCase()}
                      {log.amount ? ` - ${log.amount}ml` : ''}
                      {log.duration && !log.amount ? ` - ${log.duration} min` : ''}
                    </p>
                    {log.user && (
                      <p className="text-xs text-gray-500">Logged by {log.user.name}</p>
                    )}
                    {log.notes && <p className="text-xs text-gray-500">{log.notes}</p>}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatTime(log.startTime)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatDate(log.startTime, 'MMM d')}
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
            No feeding records for the selected period
          </div>
        )}
      </div>

      {showModal && children && (
        <FeedingModal
          childId={modalChildId}
          children={children}
          editingLog={editingLog}
          onClose={() => {
            setShowModal(false)
            setEditingLog(null)
          }}
        />
      )}

      {showExportModal && (
        <FeedingExportModal onClose={() => setShowExportModal(false)} />
      )}
    </div>
  )
}
