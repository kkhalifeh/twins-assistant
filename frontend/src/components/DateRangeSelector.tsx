'use client'

import { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth,
  startOfDay,
  endOfDay,
  subWeeks,
  addWeeks,
  subMonths,
  addMonths,
  subDays,
  addDays
} from 'date-fns'

interface DateRangeSelectorProps {
  onRangeChange: (start: Date, end: Date) => void
}

export default function DateRangeSelector({ onRangeChange }: DateRangeSelectorProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Calculate date range based on view mode and current date
  const getDateRange = (mode: typeof viewMode, date: Date) => {
    switch (mode) {
      case 'day':
        return {
          start: startOfDay(date),
          end: endOfDay(date)
        }
      case 'week':
        return {
          start: startOfWeek(date, { weekStartsOn: 0 }), // Sunday as start
          end: endOfWeek(date, { weekStartsOn: 0 })
        }
      case 'month':
        return {
          start: startOfMonth(date),
          end: endOfMonth(date)
        }
    }
  }

  // Update range whenever viewMode or currentDate changes
  useEffect(() => {
    const range = getDateRange(viewMode, currentDate)
    console.log('Date range changed:', {
      mode: viewMode,
      date: currentDate,
      range: {
        start: format(range.start, 'yyyy-MM-dd HH:mm'),
        end: format(range.end, 'yyyy-MM-dd HH:mm')
      }
    })
    onRangeChange(range.start, range.end)
  }, [viewMode, currentDate])

  const handlePrevious = () => {
    let newDate: Date
    switch (viewMode) {
      case 'day':
        newDate = subDays(currentDate, 1)
        break
      case 'week':
        newDate = subWeeks(currentDate, 1)
        break
      case 'month':
        newDate = subMonths(currentDate, 1)
        break
    }
    setCurrentDate(newDate)
  }

  const handleNext = () => {
    let newDate: Date
    switch (viewMode) {
      case 'day':
        newDate = addDays(currentDate, 1)
        break
      case 'week':
        newDate = addWeeks(currentDate, 1)
        break
      case 'month':
        newDate = addMonths(currentDate, 1)
        break
    }
    setCurrentDate(newDate)
  }

  const handleViewModeChange = (mode: 'day' | 'week' | 'month') => {
    setViewMode(mode)
    // Keep the current date when changing view modes
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const getDisplayText = () => {
    const range = getDateRange(viewMode, currentDate)
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'week':
        return `${format(range.start, 'MMM d')} - ${format(range.end, 'MMM d, yyyy')}`
      case 'month':
        return format(currentDate, 'MMMM yyyy')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Mobile Layout - Stack vertically */}
      <div className="flex flex-col sm:hidden gap-3 p-3">
        {/* View mode buttons */}
        <div className="flex justify-center space-x-1">
          {(['day', 'week', 'month'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors flex-1 ${
                viewMode === mode
                  ? 'bg-primary-100 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevious}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 flex-1 justify-center px-2">
            <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium text-center truncate">{getDisplayText()}</span>
          </div>

          <button
            onClick={handleNext}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Today button */}
        <button
          onClick={handleToday}
          className="w-full px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors font-medium"
        >
          Today
        </button>
      </div>

      {/* Desktop/Tablet Layout - Original horizontal */}
      <div className="hidden sm:flex items-center justify-between p-3">
        <div className="flex space-x-1">
          {(['day', 'week', 'month'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
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

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevious}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2 min-w-[180px] justify-center">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium whitespace-nowrap">{getDisplayText()}</span>
          </div>

          <button
            onClick={handleNext}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded-md transition-colors ml-2"
          >
            Today
          </button>
        </div>
      </div>
    </div>
  )
}
