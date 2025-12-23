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
  MessageSquare, Calendar, Sparkles, Droplet, DollarSign
} from 'lucide-react'
import { authAPI } from '@/lib/api'
import { TimezoneProvider } from '@/contexts/TimezoneContext'
import FloatingActionButton from '@/components/FloatingActionButton'
import NavigationMenu from '@/components/NavigationMenu'

const inter = Inter({ subsets: ['latin'] })

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

const allNavigation = [
  { name: 'Dashboard', href: '/', icon: Home, roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { name: 'Journal', href: '/journal', icon: Calendar, roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { name: 'Feeding', href: '/feeding', icon: Activity, roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { name: 'Pumping', href: '/pumping', icon: Droplet, roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { name: 'Sleep', href: '/sleep', icon: Moon, roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { name: 'Diapers', href: '/diapers', icon: Baby, roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { name: 'Health', href: '/health', icon: Heart, roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { name: 'Hygiene', href: '/hygiene', icon: Sparkles, roles: ['PARENT', 'NANNY', 'VIEWER'] },
  { name: 'Milestones', href: '/milestones', icon: Trophy, roles: ['PARENT', 'VIEWER'] },
  { name: 'Inventory', href: '/inventory', icon: Package, roles: ['PARENT', 'VIEWER'] },
  { name: 'Payments', href: '/payments', icon: DollarSign, roles: ['PARENT', 'VIEWER'] },
  { name: 'Insights', href: '/insights', icon: Brain, roles: ['PARENT', 'VIEWER'] },
  { name: 'Chat Test', href: '/chat', icon: MessageSquare, roles: ['PARENT', 'VIEWER'] },
  { name: 'Settings', href: '/settings', icon: Settings, roles: ['PARENT'] },
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
            <TimezoneProvider>
              {children}
            </TimezoneProvider>
          </QueryClientProvider>
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <TimezoneProvider>
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
                  <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                    <div className="relative w-11 h-11 bg-gradient-to-br from-rose-200 to-pink-300 rounded-xl flex items-center justify-center shadow-md">
                      <span className="text-2xl font-bold text-rose-800" style={{ fontFamily: 'cursive' }}>SM</span>
                    </div>
                    <div>
                      <span className="text-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">TwinCare</span>
                      <p className="text-[10px] text-gray-500 -mt-1">Parenting Assistant</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-4 py-4">
                  <NavigationMenu
                    navigation={allNavigation}
                    pathname={pathname}
                    onItemClick={() => setSidebarOpen(false)}
                  />
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
                <Link href="/" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-rose-200 to-pink-300 rounded-lg flex items-center justify-center shadow-md">
                    <span className="text-lg font-bold text-rose-800" style={{ fontFamily: 'cursive' }}>SM</span>
                  </div>
                  <span className="font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">TwinCare</span>
                </Link>
                <div className="w-10" />
              </div>

              {/* Page content */}
              <main className="flex-1 overflow-y-auto bg-gray-50">
                <div className="pb-32 sm:pb-8">
                  {children}
                </div>
              </main>
            </div>

            {/* Floating Action Button */}
            <FloatingActionButton />
          </div>
          </TimezoneProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
