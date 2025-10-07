'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { childrenAPI, feedingAPI } from '@/lib/api'
import { format, isWithinInterval, parseISO } from 'date-fns'
import { Milk, Plus, TrendingUp } from 'lucide-react'
import FeedingModal from '@/components/modals/FeedingModal'
import DateRangeSelector from '@/components/DateRangeSelector'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

export default function FeedingPage() {
  const [selectedChild, setSelectedChild] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [modalChildId, setModalChildId] = useState<string>('')
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date()
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
    const groupedByDay: Record<string, any> = {}
    
    filteredLogs.forEach((log: any) => {
      const day = format(new Date(log.startTime), 'MM/dd')
      if (!groupedByDay[day]) {
        groupedByDay[day] = { day, Samar: 0, Maryam: 0, Total: 0 }
      }
      
      const amount = log.amount || 0
      if (log.child?.name === 'Samar') {
        groupedByDay[day].Samar += amount
      } else if (log.child?.name === 'Maryam') {
        groupedByDay[day].Maryam += amount
      }
      groupedByDay[day].Total += amount
    })
    
    return Object.values(groupedByDay).sort((a, b) => 
      a.day.localeCompare(b.day)
    )
  }

  const handleDateRangeChange = (start: Date, end: Date) => {
    console.log('Date range changed in parent:', {
      start: format(start, 'yyyy-MM-dd HH:mm'),
      end: format(end, 'yyyy-MM-dd HH:mm')
    })
    setDateRange({ start, end })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feeding Tracker</h1>
          <p className="text-gray-600 mt-1">Monitor feeding patterns and intake</p>
        </div>
        <button
          onClick={() => {
            setModalChildId(children?.[0]?.id || '')
            setShowModal(true)
          }}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Log Feeding</span>
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6">
        <DateRangeSelector onRangeChange={handleDateRangeChange} />
      </div>

      {/* Debug Info (remove in production) */}
      <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
        <p>Total logs: {feedingLogs?.length || 0}</p>
        <p>Filtered logs: {filteredLogs.length}</p>
        <p>Date range: {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d')}</p>
      </div>

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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Daily Intake (ml)</h2>
          {getDailyIntakeData().length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getDailyIntakeData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
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

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Total Daily Intake</h2>
          {getDailyIntakeData().length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getDailyIntakeData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Total" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
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
            {filteredLogs.slice(0, 20).map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    log.child?.name === 'Samar' ? 'bg-pink-100' : 'bg-purple-100'
                  }`}>
                    <Milk className={`w-5 h-5 ${
                      log.child?.name === 'Samar' ? 'text-pink-600' : 'text-purple-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">{log.child?.name}</p>
                    <p className="text-sm text-gray-600">
                      {log.amount}ml {log.type.toLowerCase()}
                    </p>
                    {log.notes && <p className="text-xs text-gray-500">{log.notes}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {format(new Date(log.startTime), 'h:mm a')}
                  </p>
                  <p className="text-xs text-gray-600">
                    {format(new Date(log.startTime), 'MMM d')}
                  </p>
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

      {showModal && (
        <FeedingModal
          childId={modalChildId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
