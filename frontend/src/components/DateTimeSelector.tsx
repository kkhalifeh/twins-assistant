'use client'

import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'

interface DateTimeSelectorProps {
  value: string // ISO datetime string in format: YYYY-MM-DDTHH:mm
  onChange: (value: string) => void
  required?: boolean
}

export default function DateTimeSelector({ value, onChange, required }: DateTimeSelectorProps) {
  const [mode, setMode] = useState<'today' | 'yesterday' | 'other'>('today')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customDateTime, setCustomDateTime] = useState(() => {
    // Initialize with current time if no value provided
    if (!value || value.trim() === '') {
      const now = new Date()
      return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    return value
  })

  // Initialize mode based on the value
  useEffect(() => {
    if (value) {
      const valueDate = new Date(value)
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Check if value is today
      if (valueDate.toDateString() === today.toDateString()) {
        setMode('today')
      }
      // Check if value is yesterday
      else if (valueDate.toDateString() === yesterday.toDateString()) {
        setMode('yesterday')
      }
      // Otherwise it's other
      else {
        setMode('other')
        setShowDatePicker(true)
      }
      setCustomDateTime(value)
    }
  }, [])

  const handleModeChange = (newMode: 'today' | 'yesterday' | 'other') => {
    setMode(newMode)

    if (newMode === 'today') {
      // Set to current time
      const now = new Date()
      const dateTimeString = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      onChange(dateTimeString)
      setCustomDateTime(dateTimeString)
      setShowDatePicker(false)
    } else if (newMode === 'yesterday') {
      // Set to yesterday, same time as current
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const dateTimeString = new Date(yesterday.getTime() - yesterday.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      onChange(dateTimeString)
      setCustomDateTime(dateTimeString)
      setShowDatePicker(false)
    } else {
      // Show date picker for other dates
      setShowDatePicker(true)
    }
  }

  const handleCustomDateTimeChange = (newValue: string) => {
    setCustomDateTime(newValue)
    onChange(newValue)
  }

  return (
    <div className="space-y-2">
      {/* Mode Selection Buttons - Compact Size */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleModeChange('today')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            mode === 'today'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('yesterday')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            mode === 'yesterday'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Yesterday
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('other')}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1 ${
            mode === 'other'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Calendar className="w-3 h-3" />
          Other
        </button>
      </div>

      {/* Date/Time Picker - Only show for 'other' mode */}
      {showDatePicker && mode === 'other' && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date & Time
          </label>
          <input
            type="datetime-local"
            value={customDateTime}
            onChange={(e) => handleCustomDateTimeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required={required}
          />
        </div>
      )}

      {/* Time picker for today/yesterday modes */}
      {!showDatePicker && (mode === 'today' || mode === 'yesterday') && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time
          </label>
          <input
            type="time"
            value={customDateTime.split('T')[1] || ''}
            onChange={(e) => {
              const date = customDateTime.split('T')[0] || new Date().toISOString().split('T')[0]
              handleCustomDateTimeChange(`${date}T${e.target.value}`)
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required={required}
          />
        </div>
      )}
    </div>
  )
}
