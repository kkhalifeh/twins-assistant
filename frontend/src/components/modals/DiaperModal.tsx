'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { diaperAPI } from '@/lib/api'
import { X } from 'lucide-react'

interface DiaperModalProps {
  childId: string
  children: any[]
  onClose: () => void
  editingLog?: any
}

export default function DiaperModal({ childId: initialChildId, children, onClose, editingLog }: DiaperModalProps) {
  const queryClient = useQueryClient()
  const [childId, setChildId] = useState(editingLog?.childId || initialChildId)
  const [type, setType] = useState(editingLog?.type || 'WET')
  const [consistency, setConsistency] = useState(editingLog?.consistency || '')
  const [notes, setNotes] = useState(editingLog?.notes || '')
  const [timestamp, setTimestamp] = useState(
    editingLog?.changedAt ? new Date(editingLog.changedAt).toISOString().slice(0, 16) : ''
  )
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(editingLog?.imageUrl || null)
  const [removeExistingImage, setRemoveExistingImage] = useState(false)

  const createMutation = useMutation({
    mutationFn: diaperAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diapers'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => diaperAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diapers'] })
      onClose()
    },
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      setRemoveExistingImage(false)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImage(null)
    setImagePreview(null)
    if (editingLog?.imageUrl) {
      setRemoveExistingImage(true)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data = {
      childId,
      changedAt: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
      type,
      consistency: consistency || undefined,
      notes: notes || undefined,
      imageUrl: !removeExistingImage && editingLog?.imageUrl ? editingLog.imageUrl : undefined,
    }

    if (editingLog) {
      updateMutation.mutate({ id: editingLog.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{editingLog ? 'Edit Diaper Change' : 'Log Diaper Change'}</h2>
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

          {editingLog && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Changed</label>
              <input
                type="datetime-local"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
          )}

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
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo (Optional)</label>
            {!imagePreview ? (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Upload a photo of the diaper</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Diaper preview"
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
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
