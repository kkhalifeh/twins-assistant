'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { feedingAPI } from '@/lib/api'
import { X, Plus, Trash2 } from 'lucide-react'
import { useTimezone } from '@/contexts/TimezoneContext'
import ChildSelector from '@/components/ChildSelector'

interface FeedingModalProps {
  childId: string
  children: any[]
  onClose: () => void
  editingLog?: any
}

interface FeedingEntry {
  id: string
  type: string
  amount: string
  duration: string
}

export default function FeedingModal({ childId: initialChildId, children, onClose, editingLog }: FeedingModalProps) {
  const queryClient = useQueryClient()
  const { getUserTimezone } = useTimezone()

  // Multi-child selection (disabled when editing)
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(
    editingLog?.childId ? [editingLog.childId] : []
  )

  // Multi-type feeding entries
  const [feedingEntries, setFeedingEntries] = useState<FeedingEntry[]>([
    {
      id: '1',
      type: editingLog?.type || 'BOTTLE',
      amount: editingLog?.amount?.toString() || '',
      duration: editingLog?.duration?.toString() || ''
    }
  ])

  const [notes, setNotes] = useState(editingLog?.notes || '')
  const [timestamp, setTimestamp] = useState(() => {
    if (editingLog?.startTime) {
      const date = new Date(editingLog.startTime)
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })

  const createMutation = useMutation({
    mutationFn: feedingAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => feedingAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const addFeedingEntry = () => {
    setFeedingEntries([
      ...feedingEntries,
      {
        id: Date.now().toString(),
        type: 'BOTTLE',
        amount: '',
        duration: ''
      }
    ])
  }

  const removeFeedingEntry = (id: string) => {
    if (feedingEntries.length > 1) {
      setFeedingEntries(feedingEntries.filter(entry => entry.id !== id))
    }
  }

  const updateFeedingEntry = (id: string, field: keyof FeedingEntry, value: string) => {
    setFeedingEntries(feedingEntries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (selectedChildIds.length === 0) {
      alert('Please select at least one child')
      return
    }

    if (editingLog) {
      // Edit mode: single child, single entry
      const entry = feedingEntries[0]
      const data = {
        childId: selectedChildIds[0],
        type: entry.type,
        amount: entry.amount ? parseFloat(entry.amount) : undefined,
        duration: entry.duration ? parseInt(entry.duration) : undefined,
        notes,
        startTime: new Date(timestamp).toISOString(),
        timezone: getUserTimezone(),
      }
      updateMutation.mutate({ id: editingLog.id, data })
    } else {
      // Create mode: multiple children × multiple entries
      const promises = []

      for (const childId of selectedChildIds) {
        for (const entry of feedingEntries) {
          const data = {
            childId,
            type: entry.type,
            amount: entry.amount ? parseFloat(entry.amount) : undefined,
            duration: entry.duration ? parseInt(entry.duration) : undefined,
            notes,
            startTime: new Date(timestamp).toISOString(),
            timezone: getUserTimezone(),
          }
          promises.push(feedingAPI.create(data))
        }
      }

      try {
        await Promise.all(promises)
        queryClient.invalidateQueries({ queryKey: ['feeding'] })
        queryClient.invalidateQueries({ queryKey: ['journal'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        onClose()
      } catch (error) {
        console.error('Error creating feeding logs:', error)
        alert('Error creating feeding logs. Please try again.')
      }
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{editingLog ? 'Edit Feeding' : 'Log Feeding'}</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {editingLog ? 'Child' : 'Select Children'}
            </label>
            {editingLog ? (
              // Edit mode: show child name, no selection
              <div className="px-3 py-2 bg-gray-50 rounded-md text-gray-700">
                {children.find(c => c.id === selectedChildIds[0])?.name}
              </div>
            ) : (
              // Create mode: multi-select
              <ChildSelector
                children={children}
                selectedIds={selectedChildIds}
                onChange={setSelectedChildIds}
                multiSelect={true}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
            <input
              type="datetime-local"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Feeding Type(s)</label>
              {!editingLog && feedingEntries.length < 5 && (
                <button
                  type="button"
                  onClick={addFeedingEntry}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Other
                </button>
              )}
            </div>

            <div className="space-y-3">
              {feedingEntries.map((entry, index) => (
                <div key={entry.id} className="flex gap-2 items-start p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <select
                      value={entry.type}
                      onChange={(e) => updateFeedingEntry(entry.id, 'type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                      required
                    >
                      <option value="BREAST">Breast</option>
                      <option value="BOTTLE">Bottle</option>
                      <option value="FORMULA">Formula</option>
                      <option value="MIXED">Mixed</option>
                      <option value="SOLID">Solid</option>
                    </select>

                    {entry.type !== 'BREAST' ? (
                      <input
                        type="number"
                        value={entry.amount}
                        onChange={(e) => updateFeedingEntry(entry.id, 'amount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Amount (ml)"
                      />
                    ) : (
                      <input
                        type="number"
                        value={entry.duration}
                        onChange={(e) => updateFeedingEntry(entry.id, 'duration', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Duration (minutes) - Optional"
                      />
                    )}
                  </div>

                  {!editingLog && feedingEntries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFeedingEntry(entry.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md mt-1"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

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
              {isLoading ? 'Saving...' : editingLog ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
