'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { childrenAPI, diaperAPI, authAPI, getImageUrl } from '@/lib/api'
import { format, isWithinInterval, parseISO, startOfDay, startOfWeek, endOfWeek } from 'date-fns'
import { Baby, Plus, Droplets, AlertTriangle, Edit2, Trash2, Image as ImageIcon, X } from 'lucide-react'
import DiaperModal from '@/components/modals/DiaperModal'
import DateRangeSelector from '@/components/DateRangeSelector'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

export default function DiapersPage() {
  const queryClient = useQueryClient()
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [modalChildId, setModalChildId] = useState<string>('')
  const [editingLog, setEditingLog] = useState<any | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
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

  const { data: diaperLogs } = useQuery({
    queryKey: ['diapers', selectedChild],
    queryFn: () => diaperAPI.getAll(
      selectedChild === 'all' ? {} : { childId: selectedChild }
    ),
  })

  const deleteMutation = useMutation({
    mutationFn: diaperAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diapers'] })
    },
  })

  const handleEdit = (log: any) => {
    setEditingLog(log)
    setShowModal(true)
  }

  const handleDelete = (logId: string) => {
    if (confirm('Are you sure you want to delete this diaper log?')) {
      deleteMutation.mutate(logId)
    }
  }

  const isParent = currentUser?.role === 'PARENT'

  // Filter logs based on date range
  const filteredLogs = useMemo(() => {
    if (!diaperLogs) return []
    
    return diaperLogs.filter((log: any) => {
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
  }, [diaperLogs, dateRange])

  const getDiaperStats = () => {
    const wet = filteredLogs.filter((l: any) => l.type === 'WET').length
    const dirty = filteredLogs.filter((l: any) => l.type === 'DIRTY').length
    const mixed = filteredLogs.filter((l: any) => l.type === 'MIXED').length
    
    return [
      { name: 'Wet', value: wet, color: '#3b82f6' },
      { name: 'Dirty', value: dirty, color: '#f59e0b' },
      { name: 'Mixed', value: mixed, color: '#10b981' }
    ]
  }

  const getHealthAlerts = () => {
    const alerts = []
    // Use UTC midnight for consistent day boundaries across timezones
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const todayLogs = filteredLogs.filter((l: any) => {
      const logDate = new Date(l.timestamp)
      return logDate >= today
    })
    
    if (todayLogs.length < 4 && todayLogs.length > 0) {
      alerts.push({
        type: 'warning',
        message: 'Fewer diaper changes than usual today'
      })
    }
    
    const wetCount = todayLogs.filter((l: any) => 
      l.type === 'WET' || l.type === 'MIXED'
    ).length
    
    if (wetCount < 3 && todayLogs.length > 0) {
      alerts.push({
        type: 'alert',
        message: 'Low wet diaper count - check hydration'
      })
    }
    
    return alerts
  }

  const getDailyStats = () => {
    const dailyStats: Record<string, number> = {}
    
    filteredLogs.forEach((log: any) => {
      const day = format(new Date(log.timestamp), 'MM/dd')
      dailyStats[day] = (dailyStats[day] || 0) + 1
    })
    
    return Object.entries(dailyStats)
      .map(([day, count]) => ({ day, count }))
      .sort((a, b) => a.day.localeCompare(b.day))
  }

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end })
  }

  const stats = getDiaperStats()
  const totalChanges = stats.reduce((sum, stat) => sum + stat.value, 0)

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Diaper Tracker</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Monitor diaper changes and patterns</p>
        </div>
        <button
          onClick={() => {
            setModalChildId(children?.[0]?.id || '')
            setEditingLog(null)
            setShowModal(true)
          }}
          className="btn-primary flex items-center space-x-2 w-full sm:w-auto mt-3 sm:mt-0 justify-center"
        >
          <Plus className="w-5 h-5" />
          <span>Log Diaper</span>
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="mb-4 sm:mb-6">
        <DateRangeSelector onRangeChange={handleDateRangeChange} />
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

      {/* Health Alerts */}
      {getHealthAlerts().length > 0 && (
        <div className="mb-4 sm:mb-6 space-y-2">
          {getHealthAlerts().map((alert, index) => (
            <div
              key={index}
              className={`flex items-center space-x-2 p-3 rounded-lg ${
                alert.type === 'alert'
                  ? 'bg-red-50 text-red-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              <AlertTriangle className="w-4 sm:w-5 h-4 sm:h-5" />
              <span className="text-xs sm:text-sm font-medium">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Statistics */}
        <div className="card">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Diaper Types Distribution</h2>
          {totalChanges > 0 ? (
            <div style={{ width: '100%', height: 250 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={stats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }: any) => value > 0 ? `${name}: ${value}` : ''}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">
              No data for selected period
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="card">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Period Summary</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
              <Droplets className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600 mb-2" />
              <p className="text-xl sm:text-2xl font-bold">
                {stats[0].value}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">Wet Diapers</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 sm:p-4">
              <Baby className="w-5 sm:w-6 h-5 sm:h-6 text-amber-600 mb-2" />
              <p className="text-xl sm:text-2xl font-bold">
                {stats[1].value}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">Dirty Diapers</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 sm:p-4">
              <Baby className="w-5 sm:w-6 h-5 sm:h-6 text-green-600 mb-2" />
              <p className="text-xl sm:text-2xl font-bold">
                {stats[2].value}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">Mixed</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
              <Baby className="w-5 sm:w-6 h-5 sm:h-6 text-purple-600 mb-2" />
              <p className="text-xl sm:text-2xl font-bold">{totalChanges}</p>
              <p className="text-xs sm:text-sm text-gray-600">Total Changes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Daily Breakdown</h2>
        {getDailyStats().length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {getDailyStats().map(({ day, count }) => (
              <div key={day} className="text-center p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">{day}</p>
                <p className="text-lg font-bold">{count}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No data for selected period
          </div>
        )}
      </div>

      {/* Recent Changes */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">
          Recent Diaper Changes ({filteredLogs.length} changes)
        </h2>
        {filteredLogs.length > 0 ? (
          <div className="space-y-3">
            {filteredLogs.slice(0, 20).map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <div className={`p-2 rounded-full ${
                    log.type === 'WET' ? 'bg-blue-100' :
                    log.type === 'DIRTY' ? 'bg-amber-100' : 'bg-green-100'
                  }`}>
                    <Baby className={`w-5 h-5 ${
                      log.type === 'WET' ? 'text-blue-600' :
                      log.type === 'DIRTY' ? 'text-amber-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{log.child?.name}</p>
                    <p className="text-sm text-gray-600">
                      {log.type} {log.consistency && `(${log.consistency.toLowerCase()})`}
                    </p>
                    {log.user && (
                      <p className="text-xs text-gray-500">Logged by {log.user.name}</p>
                    )}
                    {log.notes && (
                      <p className="text-xs text-gray-500 mt-1">{log.notes}</p>
                    )}
                  </div>
                  {log.imageUrl && (
                    <div
                      onClick={() => setSelectedImage(getImageUrl(log.imageUrl))}
                      className="cursor-pointer group relative"
                    >
                      <img
                        src={getImageUrl(log.imageUrl) || ''}
                        alt="Diaper change"
                        className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200 group-hover:border-primary-400 transition-all"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  )}
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
            No diaper changes for the selected period
          </div>
        )}
      </div>

      {/* Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedImage}
              alt="Diaper change full size"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {showModal && children && (
        <DiaperModal
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
