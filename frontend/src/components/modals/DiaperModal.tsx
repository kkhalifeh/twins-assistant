'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { diaperAPI } from '@/lib/api'
import { X } from 'lucide-react'

interface DiaperModalProps {
  childId: string
  onClose: () => void
}

export default function DiaperModal({ childId, onClose }: DiaperModalProps) {
  const queryClient = useQueryClient()
  const [type, setType] = useState('WET')
  const [consistency, setConsistency] = useState('')
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: diaperAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diapers'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({
      childId,
      timestamp: new Date().toISOString(),
      type,
      consistency: consistency || undefined,
      notes,
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Log Diaper Change</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="WET">Wet</option>
              <option value="DIRTY">Dirty</option>
              <option value="MIXED">Mixed</option>
            </select>
          </div>

          {(type === 'DIRTY' || type === 'MIXED') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consistency</label>
              <select
                value={consistency}
                onChange={(e) => setConsistency(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select...</option>
                <option value="NORMAL">Normal</option>
                <option value="WATERY">Watery</option>
                <option value="HARD">Hard</option>
              </select>
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
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
