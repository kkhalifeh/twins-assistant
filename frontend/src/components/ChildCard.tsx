'use client'

import { Child } from '@/types'
import { format, differenceInMonths } from 'date-fns'
import { Baby, Calendar, Heart } from 'lucide-react'

interface ChildCardProps {
  child: Child
  isSelected: boolean
  onSelect: () => void
}

export default function ChildCard({ child, isSelected, onSelect }: ChildCardProps) {
  const age = differenceInMonths(new Date(), new Date(child.dateOfBirth))
  
  return (
    <div
      onClick={onSelect}
      className={`card cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-primary-500 bg-primary-50' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-center space-x-4">
        <div className={`p-3 rounded-full ${
          child.gender === 'FEMALE' ? 'bg-pink-100' : 'bg-blue-100'
        }`}>
          <Baby className={`w-8 h-8 ${
            child.gender === 'FEMALE' ? 'text-pink-600' : 'text-blue-600'
          }`} />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{child.name}</h3>
          
          <div className="flex items-center text-sm text-gray-600 mt-1">
            <Calendar className="w-4 h-4 mr-1" />
            <span>Born {format(new Date(child.dateOfBirth), 'MMM d, yyyy')}</span>
            <span className="ml-2">({age} months old)</span>
          </div>
          
          {child.medicalNotes && (
            <div className="flex items-start mt-2">
              <Heart className="w-4 h-4 mr-1 text-red-500 mt-0.5" />
              <p className="text-sm text-gray-600">{child.medicalNotes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
