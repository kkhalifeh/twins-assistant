'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sleepAPI } from '@/lib/api'
import { X, Moon, AlarmClock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface WakeUpPromptModalProps {
  activeSessions: any[]
  onClose: () => void
  onContinue: () => void
}

export default function WakeUpPromptModal({ activeSessions, onClose, onContinue }: WakeUpPromptModalProps) {
  const queryClient = useQueryClient()

  const endSleepMutation = useMutation({
    mutationFn: (id: string) => sleepAPI.endSleep(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep'] })
      queryClient.invalidateQueries({ queryKey: ['activeSleep'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onContinue()
    },
  })

  const handleWakeUp = (sleepLogId: string) => {
    endSleepMutation.mutate(sleepLogId)
  }

  const handleWakeUpAll = () => {
    activeSessions.forEach(session => {
      endSleepMutation.mutate(session.id)
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-2">
            <Moon className="w-6 h-6 text-primary-600" />
            <h2 className="text-xl font-semibold">Children Currently Sleeping</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-4">
            The following {activeSessions.length === 1 ? 'child is' : 'children are'} currently sleeping. Would you like to wake them up?
          </p>

          <div className="space-y-3 mb-6">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{session.child.name}</p>
                  <p className="text-sm text-gray-600">
                    {session.type === 'NAP' ? '😴 Napping' : '🌙 Night sleep'} • Started {formatDistanceToNow(new Date(session.startTime), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={() => handleWakeUp(session.id)}
                  disabled={endSleepMutation.isPending}
                  className="ml-3 px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                >
                  <AlarmClock className="w-4 h-4" />
                  <span>Wake Up</span>
                </button>
              </div>
            ))}
          </div>

          <div className="flex space-x-3">
            {activeSessions.length > 1 && (
              <button
                onClick={handleWakeUpAll}
                disabled={endSleepMutation.isPending}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {endSleepMutation.isPending ? 'Waking up...' : 'Wake Up All'}
              </button>
            )}
            <button
              onClick={onContinue}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
