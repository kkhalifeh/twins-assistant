'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsAPI } from '@/lib/api'
import { X } from 'lucide-react'
import { useTimezone } from '@/contexts/TimezoneContext'
import ChildSelector from '@/components/ChildSelector'
import DateTimeSelector from '@/components/DateTimeSelector'

interface PaymentModalProps {
  children: any[]
  onClose: () => void
  editingLog?: any
}

const PAYMENT_CATEGORIES = [
  { value: 'NANNY', label: 'Nanny' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'CLINIC', label: 'Clinic' },
  { value: 'LAB', label: 'Lab' },
  { value: 'PHARMACY', label: 'Pharmacy' },
  { value: 'FORMULA', label: 'Formula' },
  { value: 'DIAPERS', label: 'Diapers' },
  { value: 'SUPPLIES', label: 'Supplies' },
  { value: 'DAYCARE', label: 'Daycare' },
  { value: 'THERAPY', label: 'Therapy' },
  { value: 'OTHER', label: 'Other' },
]

const CURRENCIES = [
  { value: 'JOD', label: 'JOD' },
  { value: 'AED', label: 'AED' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
]

export default function PaymentModal({ children, onClose, editingLog }: PaymentModalProps) {
  const queryClient = useQueryClient()
  const { getUserTimezone } = useTimezone()

  // Optional child selection (can be empty for general payments)
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(
    editingLog?.childIds || []
  )
  const [category, setCategory] = useState(editingLog?.category || 'NANNY')
  const [description, setDescription] = useState(editingLog?.description || '')
  const [amount, setAmount] = useState(editingLog?.amount?.toString() || '')
  const [currency, setCurrency] = useState(editingLog?.currency || 'JOD')
  const [notes, setNotes] = useState(editingLog?.notes || '')
  const [timestamp, setTimestamp] = useState(() => {
    if (editingLog?.timestamp) {
      const date = new Date(editingLog.timestamp)
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    }
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  })

  const createMutation = useMutation({
    mutationFn: paymentsAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['paymentSummary'] })
      onClose()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => paymentsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['paymentSummary'] })
      onClose()
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description || !amount) {
      alert('Description and amount are required')
      return
    }

    const data = {
      childIds: selectedChildIds,
      timestamp: new Date(timestamp).toISOString(),
      category,
      description,
      amount: parseFloat(amount),
      currency,
      notes,
      timezone: getUserTimezone(),
    }

    if (editingLog) {
      updateMutation.mutate({ id: editingLog.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Fixed Header */}
        <div className="flex justify-between items-center p-6 pb-4 border-b">
          <h2 className="text-xl font-semibold">{editingLog ? 'Edit Payment' : 'Log Payment'}</h2>
          <button onClick={onClose} type="button">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Related Children (Optional)
              </label>
              <ChildSelector
                children={children}
                selectedIds={selectedChildIds}
                onChange={setSelectedChildIds}
                multiSelect={true}
              />
              <p className="text-xs text-gray-500 mt-1">Leave unselected for general payments</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time</label>
              <DateTimeSelector
                value={timestamp}
                onChange={setTimestamp}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                {PAYMENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., Monthly nanny salary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.value} value={curr.value}>
                      {curr.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="Additional details..."
              />
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="p-6 pt-4 border-t bg-white">
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
          </div>
        </form>
      </div>
    </div>
  )
}
