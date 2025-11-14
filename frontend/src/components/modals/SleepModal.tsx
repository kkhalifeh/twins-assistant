'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sleepAPI } from '@/lib/api'
import { X } from 'lucide-react'

interface SleepModalProps {
  childId: string
  children: any[]
  onClose: () => void
  editingLog?: any
}

export default function SleepModal({ childId: initialChildId, children, onClose, editingLog }: SleepModalProps) {
  const queryClient = useQueryClient()
  const [childId, setChildId] = useState(editingLog?.childId || initialChildId)
  const [type, setType] = useState(editingLog?.type || 'NAP')
  const [notes, setNotes] = useState(editingLog?.notes || '')
  const [logMode, setLogMode] = useState<'new' | 'past'>(editingLog ? 'past' : 'new')
  const [startTime, setStartTime] = useState(() => {
    if (editingLog?.startTime) {
      const date = new Date(editingLog.startTime)
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    return ''
  })
  const [endTime, setEndTime] = useState(() => {
    if (editingLog?.endTime) {
      const date = new Date(editingLog.endTime)
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    return ''
  })

  const createMutation = useMutation({
    mutationFn: sleepAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => sleepAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingLog) {
      const data = {
        childId,
        type,
        notes,
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
      }
      updateMutation.mutate({ id: editingLog.id, data })
    } else if (logMode === 'new') {
      // Start new sleep session (current time, no end time)
      createMutation.mutate({
        childId,
        type,
        notes,
        startTime: new Date().toISOString(),
      })
    } else {
      // Log past sleep (with start and end time)
      createMutation.mutate({
        childId,
        type,
        notes,
        startTime: new Date(startTime).toISOString(),
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
      })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{editingLog ? 'Edit Sleep' : 'Start Sleep'}</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingLog && (
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
                Start New Sleep
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
                Log Past Sleep
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Child</label>
            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="NAP">Nap</option>
              <option value="NIGHT">Night Sleep</option>
            </select>
          </div>

          {(editingLog || logMode === 'past') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time {logMode === 'past' && !editingLog ? '(Optional)' : '(Optional)'}
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={3}
            />
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : editingLog ? 'Update' : logMode === 'new' ? 'Start Sleep' : 'Save Sleep'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
