'use client'

import './globals.css'
import { Inter } from 'next/font/google'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import {
  Home, Activity, Moon, Baby, Heart, Trophy,
  Package, Brain, Settings, Menu, X, LogOut,
  MessageSquare, Calendar, Sparkles
} from 'lucide-react'
import { authAPI } from '@/lib/api'

const inter = Inter({ subsets: ['latin'] })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const navigation = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Journal', href: '/journal', icon: Calendar },
  { name: 'Feeding', href: '/feeding', icon: Activity },
  { name: 'Sleep', href: '/sleep', icon: Moon },
  { name: 'Diapers', href: '/diapers', icon: Baby },
  { name: 'Health', href: '/health', icon: Heart },
  { name: 'Milestones', href: '/milestones', icon: Trophy },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Insights', href: '/insights', icon: Brain },
  { name: 'Chat Test', href: '/chat', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
]

function UserSection({ handleLogout }: { handleLogout: () => void }) {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
    retry: false,
  })

  const userInitial = currentUser?.name?.charAt(0)?.toUpperCase() || 'U'
  const userName = currentUser?.name || 'User'
  const userRole = currentUser?.role || 'Parent'

  return (
    <div className="border-t p-4 bg-gradient-to-r from-primary-50/50 to-secondary-50/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center ring-2 ring-primary-200/50">
            <span className="text-primary-700 font-semibold">{userInitial}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{userName}</p>
            <p className="text-xs text-gray-500">{userRole}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-primary-600 transition-colors rounded-lg hover:bg-white"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
    
    if (!token && pathname !== '/login' && pathname !== '/register' && pathname !== '/onboarding') {
      router.push('/login')
    }
  }, [pathname, router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    setIsAuthenticated(false)
    router.push('/login')
  }

  // Don't show sidebar on auth pages
  if (pathname === '/login' || pathname === '/register' || pathname === '/onboarding' || !isAuthenticated) {
    return (
      <html lang="en">
        <body className={inter.className}>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <div className="flex h-screen bg-gray-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <div className={`${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
              <div className="flex h-full flex-col">
                {/* Logo */}
                <div className="flex h-16 items-center justify-between px-6 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="relative w-9 h-9 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center shadow-sm">
                      <Heart className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div>
                      <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">TwinCare</span>
                      <p className="text-[10px] text-gray-500 -mt-1">Parenting Assistant</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-4">
                  <ul className="space-y-1">
                    {navigation.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                              isActive
                                ? 'bg-gradient-to-r from-primary-50 to-secondary-50 text-primary-700 shadow-sm'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : ''}`} />
                            <span className="font-medium">{item.name}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </nav>

                {/* User section */}
                <UserSection handleLogout={handleLogout} />
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Mobile header */}
              <div className="lg:hidden flex items-center justify-between bg-white border-b px-4 py-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 rounded-md hover:bg-gray-100"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center shadow-sm">
                    <Heart className="w-4 h-4 text-white fill-white" />
                  </div>
                  <span className="font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">TwinCare</span>
                </div>
                <div className="w-10" />
              </div>

              {/* Page content */}
              <main className="flex-1 overflow-y-auto bg-gray-50">
                {children}
              </main>
            </div>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  )
}
