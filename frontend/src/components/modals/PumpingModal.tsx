'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pumpingAPI } from '@/lib/api'
import { X } from 'lucide-react'
import { useTimezone } from '@/contexts/TimezoneContext'
import DateTimeSelector from '@/components/DateTimeSelector'

interface PumpingModalProps {
  log?: any
  onClose: () => void
}

export default function PumpingModal({ log, onClose }: PumpingModalProps) {
  const queryClient = useQueryClient()
  const { getUserTimezone } = useTimezone()

  const [logMode, setLogMode] = useState<'new' | 'past'>(log ? 'past' : 'new')
  const [pumpType, setPumpType] = useState(log?.pumpType || 'BABY_BUDDHA')
  const [duration, setDuration] = useState(log?.duration?.toString() || '')
  const [amount, setAmount] = useState(log?.amount?.toString() || '')
  const [usage, setUsage] = useState(log?.usage || 'STORED')
  const [notes, setNotes] = useState(log?.notes || '')

  const [startTime, setStartTime] = useState(() => {
    if (log?.startTime) {
      const date = new Date(log.startTime)
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    return ''
  })

  const [endTime, setEndTime] = useState(() => {
    if (log?.endTime) {
      const date = new Date(log.endTime)
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    return ''
  })

  const createMutation = useMutation({
    mutationFn: pumpingAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pumping'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => pumpingAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pumping'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (log) {
      // Edit mode
      const data = {
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: endTime && endTime.trim() !== '' ? new Date(endTime).toISOString() : undefined,
        pumpType,
        duration: duration ? parseInt(duration) : undefined,
        amount: amount ? parseFloat(amount) : undefined,
        usage,
        notes,
        timezone: getUserTimezone(),
      }
      updateMutation.mutate({ id: log.id, data })
    } else {
      // Create mode
      if (logMode === 'new') {
        // Start new pumping session (current time, no end time, no amount/duration yet)
        const data = {
          startTime: new Date().toISOString(),
          pumpType,
          notes,
          timezone: getUserTimezone(),
        }
        createMutation.mutate(data)
      } else {
        // Log past pumping (with start time, duration, amount, usage - no endTime)
        const data = {
          startTime: new Date(startTime).toISOString(),
          pumpType,
          duration: parseInt(duration),
          amount: parseFloat(amount),
          usage,
          notes,
          timezone: getUserTimezone(),
        }
        createMutation.mutate(data)
      }
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Fixed Header */}
        <div className="flex justify-between items-center p-6 pb-4 border-b">
          <h2 className="text-xl font-semibold">
            {log ? 'Edit Pumping Session' : 'Log Pumping'}
          </h2>
          <button onClick={onClose} type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-6 py-4 space-y-4">
            {/* Mode Selector (only for new logs) */}
            {!log && (
              <div className="flex space-x-2 mb-4">
                <button
                  type="button"
                  onClick={() => setLogMode('new')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    logMode === 'new'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Start New Pump
                </button>
                <button
                  type="button"
                  onClick={() => setLogMode('past')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    logMode === 'past'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Log Past Pump
                </button>
              </div>
            )}

            {/* Pump Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pump Type</label>
              <select
                value={pumpType}
                onChange={(e) => setPumpType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="BABY_BUDDHA">Baby Buddha</option>
                <option value="MADELA_SYMPHONY">Madela Symphony</option>
                <option value="SPECTRA_S1">Spectra S1</option>
                <option value="MADELA_IN_STYLE">Madela In Style</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Time Fields (for past logs or editing) */}
            {(log || logMode === 'past') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <DateTimeSelector
                    value={startTime}
                    onChange={setStartTime}
                    required
                  />
                </div>

                {/* Only show endTime field when editing existing logs */}
                {log && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time (Optional)
                    </label>
                    <DateTimeSelector
                      value={endTime}
                      onChange={setEndTime}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="15"
                    min="1"
                    required={!log}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Milk Amount (ml)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="120"
                    min="0"
                    required={!log}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Usage
                  </label>
                  <select
                    value={usage}
                    onChange={(e) => setUsage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required={!log}
                  >
                    <option value="STORED">Stored</option>
                    <option value="USED">Used</option>
                  </select>
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                placeholder="Any observations or notes..."
              />
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="p-6 pt-4 border-t bg-white">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : log ? 'Update' : logMode === 'new' ? 'Start Pump' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
