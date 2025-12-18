'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
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
import { childrenAPI, authAPI } from '@/lib/api'

const allMenuItems = [
  { icon: Home, label: 'Overview', href: '/', roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { icon: Milk, label: 'Feeding', href: '/feeding', roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { icon: Moon, label: 'Sleep', href: '/sleep', roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { icon: Baby, label: 'Diapers', href: '/diapers', roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { icon: Heart, label: 'Health', href: '/health', roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { icon: Trophy, label: 'Milestones', href: '/milestones', roles: ['PARENT', 'VIEWER'] },
  { icon: Package, label: 'Inventory', href: '/inventory', roles: ['PARENT', 'VIEWER'] },
  { icon: Brain, label: 'Insights', href: '/insights', roles: ['PARENT', 'VIEWER'] },
  { icon: Settings, label: 'Settings', href: '/settings', roles: ['PARENT'] },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Fetch current user data
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
    retry: false,
  })

  // Fetch children data
  const { data: childrenData = [] } = useQuery({
    queryKey: ['children'],
    queryFn: childrenAPI.getAll,
    retry: false,
  })

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter((item) =>
    item.roles.includes(currentUser?.role || 'VIEWER')
  )

  // Generate children names for display
  const childrenNames = childrenData.length > 0
    ? childrenData.map((child: any) => child.name).join(' & ')
    : 'Your Children'

  // Don't show sidebar on login/register pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/onboarding') {
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
            <p className="text-sm text-gray-600 mt-1">{childrenNames}</p>
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
