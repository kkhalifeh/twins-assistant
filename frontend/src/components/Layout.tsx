'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  Milk,
  Moon,
  Baby,
  Heart,
  Trophy,
  Package,
  Brain,
  Settings,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

const menuItems = [
  { icon: Home, label: 'Overview', href: '/' },
  { icon: Milk, label: 'Feeding', href: '/feeding' },
  { icon: Moon, label: 'Sleep', href: '/sleep' },
  { icon: Baby, label: 'Diapers', href: '/diapers' },
  { icon: Heart, label: 'Health', href: '/health' },
  { icon: Trophy, label: 'Milestones', href: '/milestones' },
  { icon: Package, label: 'Inventory', href: '/inventory' },
  { icon: Brain, label: 'Insights', href: '/insights' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Don't show sidebar on login page
  if (pathname === '/login') {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-gray-900">Twin Assistant</h1>
            <p className="text-sm text-gray-600 mt-1">Samar & Maryam</p>
          </div>

          <nav className="flex-1 p-4">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={() => {
                localStorage.removeItem('token')
                window.location.href = '/login'
              }}
              className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="lg:pl-0 pt-16 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  )
}
