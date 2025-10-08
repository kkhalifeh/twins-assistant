'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Baby, Camera } from 'lucide-react'
import { childrenAPI } from '@/lib/api'

interface Child {
  name: string
  dateOfBirth: string
  gender: 'MALE' | 'FEMALE'
  medicalNotes: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>([
    { name: '', dateOfBirth: '', gender: 'FEMALE', medicalNotes: '' }
  ])
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addChild = () => {
    setChildren([...children, { name: '', dateOfBirth: '', gender: 'FEMALE', medicalNotes: '' }])
    setCurrentStep(children.length)
  }

  const removeChild = (index: number) => {
    if (children.length > 1) {
      const newChildren = children.filter((_, i) => i !== index)
      setChildren(newChildren)
      if (currentStep >= newChildren.length) {
        setCurrentStep(newChildren.length - 1)
      }
    }
  }

  const updateChild = (index: number, field: keyof Child, value: string) => {
    const newChildren = [...children]
    newChildren[index] = { ...newChildren[index], [field]: value }
    setChildren(newChildren)
  }

  const handleNext = () => {
    if (currentStep < children.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const validateCurrentChild = () => {
    const child = children[currentStep]
    return child.name.trim() && child.dateOfBirth && child.gender
  }

  const handleComplete = async () => {
    setError('')
    setLoading(true)

    try {
      // Create all children
      for (const child of children) {
        if (child.name.trim()) {
          await childrenAPI.create({
            name: child.name.trim(),
            dateOfBirth: child.dateOfBirth,
            gender: child.gender,
            medicalNotes: child.medicalNotes || null
          })
        }
      }

      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save children')
    } finally {
      setLoading(false)
    }
  }

  const currentChild = children[currentStep]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl w-full p-6">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Baby className="w-8 h-8 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Welcome to TwinCare!</h1>
            <p className="text-gray-600 mt-2">Let's add your children to get started</p>
          </div>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Child {currentStep + 1} of {children.length}</span>
              <span className="text-sm text-gray-600">{Math.round(((currentStep + 1) / children.length) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / children.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Child form */}
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-300">
                <Camera className="w-8 h-8 text-gray-400" />
              </div>
              <button className="text-sm text-primary-600 hover:text-primary-700">
                Add Photo (Optional)
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Child's Name *
              </label>
              <input
                type="text"
                value={currentChild.name}
                onChange={(e) => updateChild(currentStep, 'name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Enter child's name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth *
              </label>
              <input
                type="date"
                value={currentChild.dateOfBirth}
                onChange={(e) => updateChild(currentStep, 'dateOfBirth', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => updateChild(currentStep, 'gender', 'FEMALE')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    currentChild.gender === 'FEMALE'
                      ? 'border-pink-300 bg-pink-50 text-pink-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-center">
                    <span className="text-2xl mb-1 block">👧</span>
                    <span className="text-sm font-medium">Girl</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => updateChild(currentStep, 'gender', 'MALE')}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    currentChild.gender === 'MALE'
                      ? 'border-blue-300 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="text-center">
                    <span className="text-2xl mb-1 block">👦</span>
                    <span className="text-sm font-medium">Boy</span>
                  </div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medical Notes (Optional)
              </label>
              <textarea
                value={currentChild.medicalNotes}
                onChange={(e) => updateChild(currentStep, 'medicalNotes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Any medical conditions, allergies, or notes..."
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 text-red-600 text-sm text-center">{error}</div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between items-center mt-8">
            <div className="flex space-x-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Previous
                </button>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {children.length > 1 && (
                <button
                  onClick={() => removeChild(currentStep)}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  Remove Child
                </button>
              )}

              <button
                onClick={addChild}
                className="flex items-center space-x-2 px-4 py-2 text-primary-600 hover:text-primary-700 border border-primary-200 rounded-md"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Child</span>
              </button>
            </div>

            <div className="flex space-x-2">
              {currentStep < children.length - 1 ? (
                <button
                  onClick={handleNext}
                  disabled={!validateCurrentChild()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleComplete}
                  disabled={!validateCurrentChild() || loading}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              )}
            </div>
          </div>

          {/* Skip option */}
          <div className="text-center mt-6">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now (you can add children later in settings)
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}