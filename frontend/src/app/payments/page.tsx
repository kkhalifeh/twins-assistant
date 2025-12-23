'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tantml:invoke>
<invoke name="childrenAPI">
<parameter name="paymentsAPI">authAPI } from '@/lib/api'
import { format, isWithinInterval, parseISO, startOfWeek, endOfWeek } from 'date-fns'
import { DollarSign, Plus, Edit2, Trash2 } from 'lucide-react'
import PaymentModal from '@/components/modals/PaymentModal'
import DateRangeSelector from '@/components/DateRangeSelector'
import { useTimezone } from '@/contexts/TimezoneContext'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'

const CATEGORY_LABELS: Record<string, string> = {
  NANNY: 'Nanny',
  DOCTOR: 'Doctor',
  CLINIC: 'Clinic',
  LAB: 'Lab',
  PHARMACY: 'Pharmacy',
  FORMULA: 'Formula',
  DIAPERS: 'Diapers',
  SUPPLIES: 'Supplies',
  DAYCARE: 'Daycare',
  THERAPY: 'Therapy',
  OTHER: 'Other'
}

const COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6', '#f97316', '#a855f7', '#64748b']

export default function PaymentsPage() {
  const { formatTime, formatDate } = useTimezone()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingLog, setEditingLog] = useState<any | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
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

  const { data: paymentLogs } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsAPI.getAll(),
  })

  const deleteMutation = useMutation({
    mutationFn: paymentsAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['paymentSummary'] })
    },
  })

  const handleEdit = (log: any) => {
    setEditingLog(log)
    setShowModal(true)
  }

  const handleDelete = (logId: string) => {
    if (confirm('Are you sure you want to delete this payment log?')) {
      deleteMutation.mutate(logId)
    }
  }

  const isParent = currentUser?.role === 'PARENT'

  // Filter logs based on date range and category
  const filteredLogs = useMemo(() => {
    if (!paymentLogs) return []

    return paymentLogs.filter((log: any) => {
      try {
        const logDate = typeof log.timestamp === 'string'
          ? parseISO(log.timestamp)
          : new Date(log.timestamp)

        const isInRange = isWithinInterval(logDate, {
          start: dateRange.start,
          end: dateRange.end
        })

        const matchesCategory = selectedCategory === 'all' || log.category === selectedCategory

        return isInRange && matchesCategory
      } catch (error) {
        console.error('Error filtering log:', error, log)
        return false
      }
    })
  }, [paymentLogs, dateRange, selectedCategory])

  // Get spending by category
  const getCategoryData = () => {
    const grouped: Record<string, number> = {}

    filteredLogs.forEach((log: any) => {
      if (!grouped[log.category]) {
        grouped[log.category] = 0
      }
      // Convert to JOD for consistent comparison (simplified - in production you'd use actual exchange rates)
      grouped[log.category] += log.amount
    })

    return Object.entries(grouped).map(([category, total]) => ({
      category: CATEGORY_LABELS[category] || category,
      total: parseFloat(total.toFixed(2))
    })).sort((a, b) => b.total - a.total)
  }

  // Get total spending
  const getTotalSpending = () => {
    return filteredLogs.reduce((sum: number, log: any) => sum + log.amount, 0)
  }

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end })
  }

  // Get unique categories from logs
  const availableCategories = useMemo(() => {
    if (!paymentLogs) return []
    const categories = new Set(paymentLogs.map((log: any) => log.category))
    return Array.from(categories)
  }, [paymentLogs])

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payment Tracker</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Track expenses and spending patterns</p>
        </div>
        <button
          onClick={() => {
            setEditingLog(null)
            setShowModal(true)
          }}
          className="btn-primary flex items-center space-x-2 w-full sm:w-auto mt-3 sm:mt-0 justify-center"
        >
          <Plus className="w-5 h-5" />
          <span>Log Payment</span>
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="mb-4 sm:mb-6">
        <DateRangeSelector onRangeChange={handleDateRangeChange} />
      </div>

      {/* Category Filter */}
      <div className="card mb-4 sm:mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base ${
              selectedCategory === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            All Categories
          </button>
          {availableCategories.map((category: string) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base ${
                selectedCategory === category
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {CATEGORY_LABELS[category] || category}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Card */}
      <div className="card mb-4 sm:mb-6 bg-gradient-to-r from-primary-50 to-secondary-50">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Total Spending</p>
          <p className="text-3xl font-bold text-primary-700">
            {getTotalSpending().toFixed(2)} <span className="text-xl">JOD</span>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {format(dateRange.start, 'MMM d')} - {format(dateRange.end, 'MMM d')}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="card">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Spending by Category</h2>
          {getCategoryData().length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getCategoryData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" fontSize={12} angle={-45} textAnchor="end" height={80} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">
              No data for selected period
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Category Distribution</h2>
          {getCategoryData().length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getCategoryData()}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.category}: ${entry.total.toFixed(0)}`}
                >
                  {getCategoryData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-gray-500 text-sm">
              No data for selected period
            </div>
          )}
        </div>
      </div>

      {/* Recent Payments Timeline */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">
          Payment History ({filteredLogs.length} payments)
        </h2>
        {filteredLogs.length > 0 ? (
          <div className="space-y-3">
            {filteredLogs.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  <div className="p-2 rounded-full bg-primary-100">
                    <DollarSign className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{log.description}</p>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                        {CATEGORY_LABELS[log.category] || log.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {log.amount.toFixed(2)} {log.currency}
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
                      {formatTime(log.timestamp)}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatDate(log.timestamp, 'MMM d')}
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
            No payment records for the selected period
          </div>
        )}
      </div>

      {showModal && children && (
        <PaymentModal
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
