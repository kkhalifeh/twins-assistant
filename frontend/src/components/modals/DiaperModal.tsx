'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { diaperAPI } from '@/lib/api'
import { X, AlertCircle } from 'lucide-react'
import api from '@/lib/api'

interface DiaperModalProps {
  childId: string
  children: any[]
  onClose: () => void
  editingLog?: any
}

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

export default function DiaperModal({ childId: initialChildId, children, onClose, editingLog }: DiaperModalProps) {
  const queryClient = useQueryClient()
  const [childId, setChildId] = useState(editingLog?.childId || initialChildId)
  const [type, setType] = useState(editingLog?.type || 'WET')
  const [consistency, setConsistency] = useState(editingLog?.consistency || '')
  const [notes, setNotes] = useState(editingLog?.notes || '')
  const [timestamp, setTimestamp] = useState(() => {
    if (editingLog?.timestamp) {
      const date = new Date(editingLog.timestamp)
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(editingLog?.imageUrl || null)
  const [removeExistingImage, setRemoveExistingImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: diaperAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diapers'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => diaperAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diapers'] })
      queryClient.invalidateQueries({ queryKey: ['journal'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  const validateImage = (file: File): string | null => {
    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `Invalid file type. Only JPEG, PNG, and WebP images are allowed.`
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 5MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`
    }

    return null
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setImageError(null)
    setUploadError(null)

    if (file) {
      // Validate file
      const error = validateImage(file)
      if (error) {
        setImageError(error)
        e.target.value = '' // Clear the input
        return
      }

      setImage(file)
      setRemoveExistingImage(false)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.onerror = () => {
        setImageError('Failed to read image file')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError(null)

    try {
      if (editingLog) {
        // Update existing log
        const data = {
          childId,
          timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
          type,
          consistency: consistency || undefined,
          notes: notes || undefined,
          imageUrl: !removeExistingImage && editingLog?.imageUrl ? editingLog.imageUrl : undefined,
        }
        updateMutation.mutate({ id: editingLog.id, data })
      } else {
        // Create new log with image upload
        const formData = new FormData()
        formData.append('childId', childId)
        formData.append('timestamp', timestamp ? new Date(timestamp).toISOString() : new Date().toISOString())
        formData.append('type', type)
        if (consistency) formData.append('consistency', consistency)
        if (notes) formData.append('notes', notes)
        if (image) formData.append('image', image)

        // Upload using FormData
        const response = await api.post('/diapers', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })

        if (response.data) {
          queryClient.invalidateQueries({ queryKey: ['diapers'] })
          onClose()
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadError(
        error.response?.data?.error ||
        error.message ||
        'Failed to save diaper change. Please try again.'
      )
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
          {/* Error Messages */}
          {(imageError || uploadError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-700 font-medium">Error</p>
                <p className="text-sm text-red-600">{imageError || uploadError}</p>
              </div>
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
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Allowed: JPEG, PNG, WebP • Max size: 5MB
                </p>
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
