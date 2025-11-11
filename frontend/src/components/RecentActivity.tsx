'use client'

import { format, formatDistanceToNow } from 'date-fns'
import { Milk, Moon, Baby } from 'lucide-react'
import { FeedingLog, SleepLog, DiaperLog } from '@/types'

interface RecentActivityProps {
  feedingLogs?: FeedingLog[]
  sleepLogs?: SleepLog[]
  diaperLogs?: DiaperLog[]
}

export default function RecentActivity({ 
  feedingLogs, 
  sleepLogs, 
  diaperLogs 
}: RecentActivityProps) {
  const activities: any[] = [
    ...(feedingLogs || []).map(log => ({ ...log, activityType: 'feeding' })),
    ...(sleepLogs || []).map(log => ({ ...log, activityType: 'sleep' })),
    ...(diaperLogs || []).map(log => ({ ...log, activityType: 'diaper' })),
  ].sort((a, b) => {
    const dateA = new Date((a as any).timestamp || (a as any).startTime || (a as any).createdAt)
    const dateB = new Date((b as any).timestamp || (b as any).startTime || (b as any).createdAt)
    return dateB.getTime() - dateA.getTime()
  }).slice(0, 10)

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'feeding':
        return <Milk className="w-5 h-5 text-blue-500" />
      case 'sleep':
        return <Moon className="w-5 h-5 text-purple-500" />
      case 'diaper':
        return <Baby className="w-5 h-5 text-green-500" />
      default:
        return null
    }
  }

  const getActivityDescription = (activity: any) => {
    switch (activity.activityType) {
      case 'feeding':
        return `Fed ${activity.amount}ml ${activity.type.toLowerCase()}`
      case 'sleep':
        return activity.endTime 
          ? `Slept for ${activity.duration} minutes (${activity.type.toLowerCase()})`
          : `Started ${activity.type.toLowerCase()}`
      case 'diaper':
        return `${activity.type} diaper change`
      default:
        return ''
    }
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      
      {activities.length === 0 ? (
        <p className="text-gray-500">No recent activity</p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="mt-1">
                {getActivityIcon(activity.activityType)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {getActivityDescription(activity)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(activity.timestamp || activity.startTime || activity.createdAt), { 
                    addSuffix: true 
                  })}
                </p>
                {activity.notes && (
                  <p className="text-xs text-gray-600 mt-1">{activity.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
