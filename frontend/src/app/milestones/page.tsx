'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { childrenAPI, milestonesAPI } from '@/lib/api'
import { Milestone } from '@/types'
import { Trophy, Camera, Star, Calendar, Plus, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

const milestoneCategories = {
  MOTOR: [
    'Lifts head during tummy time',
    'Rolls from tummy to back',
    'Rolls from back to tummy',
    'Sits without support',
    'Crawls',
    'Stands with support',
    'Walks independently',
    'Runs',
  ],
  LANGUAGE: [
    'First smile',
    'Coos and gurgles',
    'Babbles',
    'Says first word',
    'Two-word phrases',
    'Short sentences',
  ],
  SOCIAL: [
    'Makes eye contact',
    'Recognizes parents',
    'Responds to name',
    'Waves bye-bye',
    'Plays peek-a-boo',
    'Shows affection',
  ],
  COGNITIVE: [
    'Tracks objects with eyes',
    'Reaches for toys',
    'Transfers objects between hands',
    'Object permanence',
    'Points at objects',
    'Sorts shapes',
  ],
}

export default function MilestonesPage() {
  const [selectedChild, setSelectedChild] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof milestoneCategories>('MOTOR')
  const queryClient = useQueryClient()

  const { data: children } = useQuery({
    queryKey: ['children'],
    queryFn: childrenAPI.getAll,
  })

  // Fetch all milestones
  const { data: milestones, isLoading: isLoadingMilestones } = useQuery<Milestone[]>({
    queryKey: ['milestones'],
    queryFn: milestonesAPI.getAll,
  })

  // Initialize selectedChild with first child when children are loaded
  React.useEffect(() => {
    if (children && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id)
    }
  }, [children, selectedChild])

  // Create milestone mutation
  const createMilestone = useMutation({
    mutationFn: (data: any) => milestonesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] })
    },
  })

  // Delete milestone mutation
  const deleteMilestone = useMutation({
    mutationFn: (id: string) => milestonesAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] })
    },
  })

  const handleMilestoneToggle = async (milestoneName: string) => {
    if (!selectedChild) return

    // Check if milestone already exists
    const existing = milestones?.find(
      m => m.childId === selectedChild &&
           m.name === milestoneName &&
           m.type === selectedCategory
    )

    if (existing) {
      // Delete existing milestone
      await deleteMilestone.mutateAsync(existing.id)
    } else {
      // Create new milestone
      await createMilestone.mutateAsync({
        childId: selectedChild,
        type: selectedCategory,
        name: milestoneName,
        dateAchieved: new Date().toISOString(),
      })
    }
  }

  // Get milestone for a specific child and name
  const getMilestone = (childId: string, milestoneName: string) => {
    return milestones?.find(
      m => m.childId === childId &&
           m.name === milestoneName &&
           m.type === selectedCategory
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Developmental Milestones</h1>
          <p className="text-gray-600 mt-1">Track and celebrate your children's achievements</p>
        </div>
        <button className="btn-primary flex items-center space-x-2" disabled>
          <Camera className="w-5 h-5" />
          <span>Add Photo</span>
        </button>
      </div>

      {/* Child Selector */}
      <div className="card mb-6">
        <div className="flex space-x-4">
          {children?.map((child: any, index: number) => {
            const colorClasses = [
              { bg: 'bg-pink-100', text: 'text-pink-700' },
              { bg: 'bg-purple-100', text: 'text-purple-700' },
              { bg: 'bg-green-100', text: 'text-green-700' },
              { bg: 'bg-blue-100', text: 'text-blue-700' },
              { bg: 'bg-yellow-100', text: 'text-yellow-700' },
              { bg: 'bg-indigo-100', text: 'text-indigo-700' }
            ]
            const colors = colorClasses[index % colorClasses.length]

            return (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  selectedChild === child.id
                    ? `${colors.bg} ${colors.text}`
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <span>👧 {child.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b mb-6">
        <nav className="flex space-x-6">
          {Object.keys(milestoneCategories).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category as keyof typeof milestoneCategories)}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                selectedCategory === category
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {category.charAt(0) + category.slice(1).toLowerCase()}
            </button>
          ))}
        </nav>
      </div>

      {/* Loading State */}
      {isLoadingMilestones && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      )}

      {/* Milestones Grid */}
      {!isLoadingMilestones && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {milestoneCategories[selectedCategory].map((milestoneName) => {
            const achieved = getMilestone(selectedChild, milestoneName)
            const isUpdating = createMilestone.isPending || deleteMilestone.isPending

            return (
              <div
                key={milestoneName}
                onClick={() => !isUpdating && handleMilestoneToggle(milestoneName)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  achieved
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {achieved ? (
                        <Star className="w-5 h-5 text-yellow-500 fill-current" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded" />
                      )}
                      <p className={`font-medium ${achieved ? 'text-green-700' : 'text-gray-700'}`}>
                        {milestoneName}
                      </p>
                    </div>
                    {achieved && (
                      <p className="text-sm text-gray-600 mt-2 ml-7">
                        Achieved on {format(new Date(achieved.dateAchieved), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Children Comparison */}
      {children && children.length > 1 && !isLoadingMilestones && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Children Comparison</h2>
          <p className="text-sm text-gray-600 mb-4">
            Every child develops at their own pace. This is just for tracking, not competition! 💕
          </p>
          <div className="space-y-3">
            {milestoneCategories[selectedCategory].slice(0, 5).map((milestoneName) => {
              return (
                <div key={milestoneName} className="flex items-center space-x-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{milestoneName}</p>
                  </div>
                  <div className="flex space-x-4">
                    {children.map((child: any, index: number) => {
                      const childAchieved = getMilestone(child.id, milestoneName)
                      const colorClasses = [
                        { bg: 'bg-pink-100', text: 'text-pink-700' },
                        { bg: 'bg-purple-100', text: 'text-purple-700' },
                        { bg: 'bg-green-100', text: 'text-green-700' },
                        { bg: 'bg-blue-100', text: 'text-blue-700' },
                        { bg: 'bg-yellow-100', text: 'text-yellow-700' },
                        { bg: 'bg-indigo-100', text: 'text-indigo-700' }
                      ]
                      const colors = colorClasses[index % colorClasses.length]

                      return (
                        <div key={child.id} className={`px-3 py-1 rounded-full text-xs ${
                          childAchieved ? `${colors.bg} ${colors.text}` : 'bg-gray-100 text-gray-500'
                        }`}>
                          {child.name} {childAchieved ? '✓' : '-'}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
