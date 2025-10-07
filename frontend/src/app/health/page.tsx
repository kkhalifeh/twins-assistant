'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { childrenAPI, healthAPI } from '@/lib/api'
import { format, isWithinInterval, parseISO } from 'date-fns'
import { 
  Heart, Plus, Thermometer, Pill, Activity, 
  TrendingUp, AlertCircle, Calendar 
} from 'lucide-react'
import DateRangeSelector from '@/components/DateRangeSelector'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function HealthPage() {
  const queryClient = useQueryClient()
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [healthType, setHealthType] = useState('TEMPERATURE')
  const [healthValue, setHealthValue] = useState('')
  const [healthUnit, setHealthUnit] = useState('°C')
  const [healthNotes, setHealthNotes] = useState('')
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date()
  })

  const { data: children } = useQuery({
    queryKey: ['children'],
    queryFn: childrenAPI.getAll,
  })

  const { data: healthLogs } = useQuery({
    queryKey: ['health', selectedChild],
    queryFn: () => healthAPI.getAll(
      selectedChild ? { childId: selectedChild } : {}
    ),
  })

  const { data: vitals } = useQuery({
    queryKey: ['vitals', selectedChild],
    queryFn: () => selectedChild ? healthAPI.getVitals(selectedChild) : null,
    enabled: !!selectedChild,
  })

  // Filter logs based on date range
  const filteredLogs = useMemo(() => {
    if (!healthLogs) return []
    
    return healthLogs.filter((log: any) => {
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
  }, [healthLogs, dateRange])

  const createHealthLog = useMutation({
    mutationFn: healthAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['vitals'] })
      setShowModal(false)
      setHealthValue('')
      setHealthNotes('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChild) return
    
    createHealthLog.mutate({
      childId: selectedChild,
      type: healthType,
      value: healthValue,
      unit: healthUnit,
      notes: healthNotes,
      timestamp: new Date().toISOString(),
    })
  }

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end })
  }

  const getTemperatureData = () => {
    const tempLogs = filteredLogs
      .filter((log: any) => log.type === 'TEMPERATURE' && log.childId === selectedChild)
      .slice(-7)
      .reverse()
    
    return tempLogs.map((log: any) => ({
      date: format(new Date(log.timestamp), 'MM/dd'),
      temp: parseFloat(log.value),
    }))
  }

  const getWeightData = () => {
    const weightLogs = filteredLogs
      .filter((log: any) => log.type === 'WEIGHT' && log.childId === selectedChild)
      .slice(-10)
      .reverse()
    
    return weightLogs.map((log: any) => ({
      date: format(new Date(log.timestamp), 'MM/dd'),
      weight: parseFloat(log.value),
    }))
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Records</h1>
          <p className="text-gray-600 mt-1">Track vital signs and medical information</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Log Health Data</span>
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6">
        <DateRangeSelector onRangeChange={handleDateRangeChange} />
      </div>

      {/* Child Selector */}
      <div className="card mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Child
        </label>
        <div className="flex space-x-2">
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

      {selectedChild && (
        <>
          {/* Current Vitals */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="card bg-red-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Temperature</p>
                  <p className="text-2xl font-bold">
                    {vitals?.temperature ? 
                      `${vitals.temperature.value}${vitals.temperature.unit}` : 
                      'N/A'
                    }
                  </p>
                </div>
                <Thermometer className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="card bg-blue-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Weight</p>
                  <p className="text-2xl font-bold">
                    {vitals?.weight ? 
                      `${vitals.weight.value}${vitals.weight.unit}` : 
                      'N/A'
                    }
                  </p>
                </div>
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="card bg-green-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Height</p>
                  <p className="text-2xl font-bold">
                    {vitals?.height ? 
                      `${vitals.height.value}${vitals.height.unit}` : 
                      'N/A'
                    }
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="card bg-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Records</p>
                  <p className="text-2xl font-bold">{filteredLogs.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Temperature Trend</h2>
              {getTemperatureData().length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={getTemperatureData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[36, 38]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="temp" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500">
                  No temperature data for selected period
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold mb-4">Weight Progress</h2>
              {getWeightData().length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={getWeightData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-gray-500">
                  No weight data for selected period
                </div>
              )}
            </div>
          </div>

          {/* Recent Health Logs */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">
              Health Records ({filteredLogs.filter((log: any) => log.childId === selectedChild).length} records)
            </h2>
            {filteredLogs.filter((log: any) => log.childId === selectedChild).length > 0 ? (
              <div className="space-y-3">
                {filteredLogs
                  .filter((log: any) => log.childId === selectedChild)
                  .slice(0, 20)
                  .map((log: any) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        log.type === 'TEMPERATURE' ? 'bg-red-100' :
                        log.type === 'MEDICINE' ? 'bg-purple-100' : 'bg-blue-100'
                      }`}>
                        {log.type === 'TEMPERATURE' ? (
                          <Thermometer className="w-5 h-5 text-red-600" />
                        ) : log.type === 'MEDICINE' ? (
                          <Pill className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Heart className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{log.type}</p>
                        <p className="text-sm text-gray-600">
                          {log.value}{log.unit}
                        </p>
                        {log.notes && (
                          <p className="text-xs text-gray-500 mt-1">{log.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(new Date(log.timestamp), 'h:mm a')}
                      </p>
                      <p className="text-xs text-gray-600">
                        {format(new Date(log.timestamp), 'MMM d')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No health records for the selected period
              </div>
            )}
          </div>
        </>
      )}

      {/* Health Log Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Log Health Data</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child
                </label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select child...</option>
                  {children?.map((child: any) => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={healthType}
                  onChange={(e) => {
                    setHealthType(e.target.value)
                    // Set default units
                    if (e.target.value === 'TEMPERATURE') setHealthUnit('°C')
                    else if (e.target.value === 'WEIGHT') setHealthUnit('kg')
                    else if (e.target.value === 'HEIGHT') setHealthUnit('cm')
                    else setHealthUnit('')
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="TEMPERATURE">Temperature</option>
                  <option value="MEDICINE">Medicine</option>
                  <option value="WEIGHT">Weight</option>
                  <option value="HEIGHT">Height</option>
                  <option value="SYMPTOM">Symptom</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value
                  </label>
                  <input
                    type="text"
                    value={healthValue}
                    onChange={(e) => setHealthValue(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="37.2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={healthUnit}
                    onChange={(e) => setHealthUnit(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="°C"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={healthNotes}
                  onChange={(e) => setHealthNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createHealthLog.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {createHealthLog.isPending ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
