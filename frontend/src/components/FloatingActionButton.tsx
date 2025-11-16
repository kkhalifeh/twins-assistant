'use client'

import { useState } from 'react'
import { Plus, X, Milk, Moon, Baby, Heart, Droplet } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const actions = [
    { icon: Milk, label: 'Feeding', color: 'bg-blue-500 hover:bg-blue-600', route: '/feeding' },
    { icon: Droplet, label: 'Pumping', color: 'bg-cyan-500 hover:bg-cyan-600', route: '/pumping' },
    { icon: Moon, label: 'Sleep', color: 'bg-purple-500 hover:bg-purple-600', route: '/sleep' },
    { icon: Baby, label: 'Diaper', color: 'bg-green-500 hover:bg-green-600', route: '/diapers' },
    { icon: Heart, label: 'Health', color: 'bg-red-500 hover:bg-red-600', route: '/health' },
  ]

  const handleActionClick = (route: string) => {
    router.push(route)
    setIsOpen(false)
    // Trigger the "Log" button click after navigation
    setTimeout(() => {
      const logButton = document.querySelector('[data-log-button]') as HTMLButtonElement
      if (logButton) {
        logButton.click()
      }
    }, 100)
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-40 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Action Menu */}
      <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-50">
        {isOpen && (
          <div className="mb-4 space-y-3 animate-in slide-in-from-bottom">
            {actions.map((action, index) => (
              <div
                key={action.label}
                className="flex items-center justify-end space-x-2 animate-in slide-in-from-right"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="bg-white px-3 py-1 rounded-full shadow-lg text-sm font-medium whitespace-nowrap">
                  {action.label}
                </span>
                <button
                  onClick={() => handleActionClick(action.route)}
                  className={`${action.color} text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110`}
                >
                  <action.icon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`${
            isOpen ? 'bg-gray-600 rotate-45' : 'bg-primary-600'
          } text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-110 hover:shadow-xl`}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </>
  )
}
