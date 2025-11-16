'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Calendar, Filter,
  Activity, Moon, Baby, Heart, Clock, Droplet
} from 'lucide-react'
import { format, addDays, subDays, startOfDay, endOfDay } from 'date-fns'
import { childrenAPI } from '@/lib/api'
import api from '@/lib/api'
import { useTimezone } from '@/contexts/TimezoneContext'

export default function JournalPage() {
  const { formatTime: formatTimeInTimezone } = useTimezone()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedChild, setSelectedChild] = useState<string>('all')

  // Fetch children for filter
  const { data: children = [] } = useQuery({
    queryKey: ['children'],
    queryFn: childrenAPI.getAll,
  })

  // Fetch journal data for selected date
  const { data: journalData, isLoading } = useQuery({
    queryKey: ['journal', format(selectedDate, 'yyyy-MM-dd'), selectedChild],
    queryFn: async () => {
      // Send date in YYYY-MM-DD format and timezone offset to backend
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const timezoneOffset = selectedDate.getTimezoneOffset() // in minutes
      const params = {
        date: dateStr,
        timezoneOffset: timezoneOffset,
        childId: selectedChild === 'all' ? undefined : selectedChild
      }
      const response = await api.get('/journal/daily', { params })
      return response.data
    },
    staleTime: 0, // Consider data stale immediately
    gcTime: 0 // Don't cache old data
  })

  const activities = journalData?.activities || []
  const stats = journalData?.stats || {
    totalFeedings: 0,
    totalSleepHours: 0,
    totalDiaperChanges: 0,
    healthChecks: 0,
    totalPumpingSessions: 0,
    totalPumpedVolume: 0
  }

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1))
  }

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1))
  }

  const handleToday = () => {
    setSelectedDate(new Date())
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'feeding':
        return <Activity className="w-4 h-4 text-blue-600" />
      case 'sleep':
        return <Moon className="w-4 h-4 text-purple-600" />
      case 'diaper':
        return <Baby className="w-4 h-4 text-green-600" />
      case 'health':
        return <Heart className="w-4 h-4 text-red-600" />
      case 'pumping':
        return <Droplet className="w-4 h-4 text-cyan-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'feeding':
        return 'bg-blue-50 border-blue-200'
      case 'sleep':
        return 'bg-purple-50 border-purple-200'
      case 'diaper':
        return 'bg-green-50 border-green-200'
      case 'health':
        return 'bg-red-50 border-red-200'
      case 'pumping':
        return 'bg-cyan-50 border-cyan-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      {/* Header - Mobile optimized */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Daily Journal</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Chronological view of all activities</p>
        </div>
      </div>

      {/* Date Navigation - Mobile optimized */}
      <div className="bg-white rounded-lg shadow-sm border mb-4 sm:mb-6">
        {/* Mobile Layout */}
        <div className="sm:hidden p-3 space-y-3">
          {/* Date Navigation Row */}
          <div className="flex items-center justify-between">
            <button
              onClick={handlePreviousDay}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-2 flex-1 justify-center px-2">
              <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm font-medium text-center">
                {format(selectedDate, 'MMM d, yyyy')}
              </span>
              {isToday && (
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                  Today
                </span>
              )}
            </div>

            <button
              onClick={handleNextDay}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Today Button & Filter Row */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToday}
              className="flex-1 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-md font-medium"
            >
              Today
            </button>
            <div className="flex-1 flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="flex-1 px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Children</option>
                {children.map((child: any) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:block p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePreviousDay}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <span className="text-lg font-medium whitespace-nowrap">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </span>
                {isToday && (
                  <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded-full">
                    Today
                  </span>
                )}
              </div>

              <button
                onClick={handleNextDay}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                onClick={handleToday}
                className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-md"
              >
                Today
              </button>
            </div>

            {/* Child Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Children</option>
                {children.map((child: any) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Stats - Mobile optimized */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Feedings</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.totalFeedings}</p>
            </div>
            <Activity className="w-6 sm:w-8 h-6 sm:h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Sleep</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">{stats.totalSleepHours}h</p>
            </div>
            <Moon className="w-6 sm:w-8 h-6 sm:h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Diapers</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.totalDiaperChanges}</p>
            </div>
            <Baby className="w-6 sm:w-8 h-6 sm:h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Pumping</p>
              <p className="text-xl sm:text-2xl font-bold text-cyan-600">{stats.totalPumpedVolume}ml</p>
              <p className="text-xs text-gray-500">{stats.totalPumpingSessions} sessions</p>
            </div>
            <Droplet className="w-6 sm:w-8 h-6 sm:h-8 text-cyan-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Health</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.healthChecks}</p>
            </div>
            <Heart className="w-6 sm:w-8 h-6 sm:h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Daily Timeline</h2>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity: any, index: number) => (
                <div key={index} className={`p-4 rounded-lg border ${getActivityColor(activity.type)}`}>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.childName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatTimeInTimezone(activity.timestamp)}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">
                        {activity.description}
                      </p>
                      {(activity.userName || activity.user?.name) && (
                        <p className="text-xs text-gray-500">
                          Logged by {activity.userName || activity.user?.name}
                        </p>
                      )}
                      {activity.notes && (
                        <p className="text-xs text-gray-600">
                          Notes: {activity.notes}
                        </p>
                      )}
                      {activity.duration && (
                        <p className="text-xs text-gray-600">
                          Duration: {activity.duration}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Activities</h3>
              <p className="text-gray-600">
                No activities recorded for {format(selectedDate, 'MMMM d, yyyy')}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}