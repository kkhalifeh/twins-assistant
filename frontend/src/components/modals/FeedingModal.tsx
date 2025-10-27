'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { feedingAPI } from '@/lib/api'
import { X } from 'lucide-react'

interface FeedingModalProps {
  childId: string
  children: any[]
  onClose: () => void
  editingLog?: any
}

export default function FeedingModal({ childId: initialChildId, children, onClose, editingLog }: FeedingModalProps) {
  const queryClient = useQueryClient()
  const [childId, setChildId] = useState(editingLog?.childId || initialChildId)
  const [type, setType] = useState(editingLog?.type || 'BOTTLE')
  const [amount, setAmount] = useState(editingLog?.amount?.toString() || '')
  const [duration, setDuration] = useState(editingLog?.breastDuration?.toString() || '')
  const [notes, setNotes] = useState(editingLog?.notes || '')

  const createMutation = useMutation({
    mutationFn: feedingAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => feedingAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feeding'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      childId,
      type,
      amount: amount ? parseFloat(amount) : undefined,
      breastDuration: duration ? parseInt(duration) : undefined,
      notes,
    }

    if (editingLog) {
      updateMutation.mutate({ id: editingLog.id, data })
    } else {
      createMutation.mutate({
        ...data,
        startTime: new Date().toISOString(),
      })
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
              <option value="BREAST">Breast</option>
              <option value="BOTTLE">Bottle</option>
              <option value="FORMULA">Formula</option>
              <option value="MIXED">Mixed</option>
              <option value="SOLID">Solid</option>
            </select>
          </div>

          {type !== 'BREAST' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (ml)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="120"
              />
            </div>
          )}

          {type === 'BREAST' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) - Optional</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="15"
              />
            </div>
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
              {isLoading ? 'Saving...' : editingLog ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
