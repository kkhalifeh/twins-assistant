'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Activity, TrendingUp, Moon, Baby, Clock, 
  Calendar, ChevronLeft, ChevronRight, AlertCircle,
  CheckCircle, TrendingDown, Sun, Loader2
} from 'lucide-react'
import { format, startOfDay, startOfWeek, startOfMonth, endOfWeek, endOfMonth, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'
import api from '@/lib/api'
import Link from 'next/link'

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', currentDate.toISOString(), viewMode],
    queryFn: async () => {
      const response = await api.get('/dashboard', {
        params: {
          date: currentDate.toISOString(),
          viewMode
        }
      })
      return response.data
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      case 'month':
        return format(currentDate, 'MMMM yyyy')
    }
  }

  const handlePrevious = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(subDays(currentDate, 1))
        break
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1))
        break
      case 'month':
        setCurrentDate(subMonths(currentDate, 1))
        break
    }
  }

  const handleNext = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(addDays(currentDate, 1))
        break
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1))
        break
      case 'month':
        setCurrentDate(addMonths(currentDate, 1))
        break
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const getInsightIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      'clock': Clock,
      'alert': AlertCircle,
      'trending-up': TrendingUp,
      'trending-down': TrendingDown,
      'moon': Moon,
      'sun': Sun,
      'baby': Baby,
      'check-circle': CheckCircle
    }
    return icons[iconName] || Activity
  }

  const getInsightColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      'red': 'bg-red-50 text-red-700',
      'amber': 'bg-amber-50 text-amber-700',
      'green': 'bg-green-50 text-green-700',
      'blue': 'bg-blue-50 text-blue-700',
      'purple': 'bg-purple-50 text-purple-700'
    }
    return colors[color] || 'bg-gray-50 text-gray-700'
  }

  const stats = dashboardData?.stats || {
    totalFeedings: 0,
    totalSleepSessions: 0,
    totalDiaperChanges: 0,
    activeSleepSessions: 0,
    avgFeedingInterval: 0,
    totalSleepHours: 0
  }

  const insights = dashboardData?.insights || []
  const recentActivities = dashboardData?.recentActivities || []
  const activeSleepSessions = dashboardData?.activeSleepSessions || []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-gray-700">Failed to load dashboard</p>
          <button 
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Date Selector */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Your parenting overview</p>
        </div>
        
        {/* Date Navigation */}
        <div className="flex items-center space-x-4 bg-white rounded-lg shadow-sm border p-2">
          <div className="flex space-x-1">
            {(['day', 'week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2 border-l pl-4">
            <button
              onClick={handlePrevious}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-2 min-w-[200px] justify-center">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">{getDateRange()}</span>
            </div>
            
            <button
              onClick={handleNext}
              className="p-1 hover:bg-gray-100 rounded"
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
        </div>
      </div>

      {/* Currently Sleeping Alert */}
      {activeSleepSessions.length > 0 && (
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Moon className="w-5 h-5 text-purple-600" />
            <span className="font-medium text-purple-900">Currently Sleeping:</span>
            <span className="text-purple-700">
              {activeSleepSessions.map((s: any) => s.child.name).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Real-time AI Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {insights.map((insight: any, index: number) => {
              const Icon = getInsightIcon(insight.icon)
              return (
                <div key={index} className={`rounded-lg p-3 ${getInsightColorClasses(insight.color)}`}>
                  <div className="flex items-start space-x-2">
                    <Icon className="w-5 h-5 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{insight.title}</p>
                      <p className="text-xs opacity-90 mt-0.5">{insight.description}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Link href="/feeding" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Feedings</p>
              <p className="text-2xl font-bold">{stats.totalFeedings}</p>
              {stats.avgFeedingInterval > 0 && (
                <p className="text-xs text-gray-500">Every ~{stats.avgFeedingInterval}h</p>
              )}
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </Link>

        <Link href="/sleep" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sleep</p>
              <p className="text-2xl font-bold">{stats.totalSleepHours}h</p>
              <p className="text-xs text-gray-500">{stats.totalSleepSessions} sessions</p>
            </div>
            <Moon className="w-8 h-8 text-purple-500" />
          </div>
        </Link>

        <Link href="/diapers" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Diapers</p>
              <p className="text-2xl font-bold">{stats.totalDiaperChanges}</p>
              <p className="text-xs text-gray-500">Changes</p>
            </div>
            <Baby className="w-8 h-8 text-green-500" />
          </div>
        </Link>

        <Link href="/insights" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Insights</p>
              <p className="text-2xl font-bold">{insights.length}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
            <TrendingUp className="w-8 h-8 text-amber-500" />
          </div>
        </Link>
      </div>

      {/* Recent Activity Timeline */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        {recentActivities.length > 0 ? (
          <div className="space-y-3">
            {recentActivities.map((activity: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'feeding' ? 'bg-blue-100' :
                    activity.type === 'sleep' ? 'bg-purple-100' :
                    'bg-green-100'
                  }`}>
                    {activity.type === 'feeding' ? (
                      <Activity className="w-4 h-4 text-blue-600" />
                    ) : activity.type === 'sleep' ? (
                      <Moon className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Baby className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{activity.childName}</p>
                    <p className="text-xs text-gray-600">{activity.description}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {format(new Date(activity.timestamp), 'h:mm a')}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No activities recorded for this period</p>
        )}
      </div>
    </div>
  )
}
