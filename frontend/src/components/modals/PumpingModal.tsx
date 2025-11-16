'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pumpingAPI } from '@/lib/api'
import { X } from 'lucide-react'
import { useTimezone } from '@/contexts/TimezoneContext'

interface PumpingModalProps {
  log?: any
  onClose: () => void
}

export default function PumpingModal({ log, onClose }: PumpingModalProps) {
  const queryClient = useQueryClient()
  const { getUserTimezone } = useTimezone()
  const [pumpType, setPumpType] = useState(log?.pumpType || 'BABY_BUDDHA')
  const [duration, setDuration] = useState(log?.duration?.toString() || '')
  const [amount, setAmount] = useState(log?.amount?.toString() || '')
  const [usage, setUsage] = useState(log?.usage || 'STORED')
  const [notes, setNotes] = useState(log?.notes || '')
  const [timestamp, setTimestamp] = useState(() => {
    if (log?.timestamp) {
      const date = new Date(log.timestamp)
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
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
    const data = {
      pumpType,
      duration: parseInt(duration),
      amount: parseFloat(amount),
      usage,
      notes,
      timestamp: new Date(timestamp).toISOString(),
      timezone: getUserTimezone(),
    }

    if (log) {
      updateMutation.mutate({ id: log.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">{log ? 'Edit Pumping Session' : 'Log Pumping Session'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

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
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="15"
              min="1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Milk Amount (ml)</label>
            <input
              type="number"
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="120"
              min="0"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usage</label>
            <select
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="STORED">Stored</option>
              <option value="USED">Used</option>
            </select>
          </div>

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

          <div className="flex space-x-3 pt-2">
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
              className="flex-1 btn-primary"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : (log ? 'Update' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
