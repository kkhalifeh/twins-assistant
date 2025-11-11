'use client'

import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { feedingAPI, sleepAPI, diaperAPI, childrenAPI } from '@/lib/api'
import { Milk, Moon, Baby, Plus } from 'lucide-react'
import FeedingModal from './modals/FeedingModal'
import SleepModal from './modals/SleepModal'
import DiaperModal from './modals/DiaperModal'

interface QuickActionsProps {
  childId: string
}

export default function QuickActions({ childId }: QuickActionsProps) {
  const queryClient = useQueryClient()
  const [showFeedingModal, setShowFeedingModal] = useState(false)
  const [showSleepModal, setShowSleepModal] = useState(false)
  const [showDiaperModal, setShowDiaperModal] = useState(false)

  const { data: children } = useQuery({
    queryKey: ['children'],
    queryFn: childrenAPI.getAll,
  })

  const actions = [
    {
      icon: Milk,
      label: 'Log Feeding',
      color: 'bg-blue-500',
      onClick: () => setShowFeedingModal(true),
    },
    {
      icon: Moon,
      label: 'Log Sleep',
      color: 'bg-purple-500',
      onClick: () => setShowSleepModal(true),
    },
    {
      icon: Baby,
      label: 'Log Diaper',
      color: 'bg-green-500',
      onClick: () => setShowDiaperModal(true),
    },
  ]

  return (
    <>
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-4">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`p-3 rounded-full ${action.color} text-white mb-2`}>
                <action.icon className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium text-gray-900">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showFeedingModal && children && (
        <FeedingModal
          childId={childId}
          children={children}
          onClose={() => setShowFeedingModal(false)}
        />
      )}

      {showSleepModal && children && (
        <SleepModal
          childId={childId}
          children={children}
          onClose={() => setShowSleepModal(false)}
        />
      )}
      
      {showDiaperModal && children && (
        <DiaperModal
          childId={childId}
          children={children}
          onClose={() => setShowDiaperModal(false)}
        />
      )}
    </>
  )
}
