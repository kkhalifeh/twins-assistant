'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { authAPI } from '@/lib/api'
import { LucideIcon } from 'lucide-react'

interface NavigationItem {
  name: string
  href: string
  icon: LucideIcon
  roles: string[]
}

interface NavigationMenuProps {
  navigation: NavigationItem[]
  pathname: string
  onItemClick: () => void
}

export default function NavigationMenu({ navigation, pathname, onItemClick }: NavigationMenuProps) {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
    retry: false,
  })

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(currentUser?.role || 'VIEWER')
  )

  return (
    <ul className="space-y-1">
      {filteredNavigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <li key={item.name}>
            <Link
              href={item.href}
              onClick={onItemClick}
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
  )
}
