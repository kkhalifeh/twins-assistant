'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { childrenAPI, logImportAPI } from '@/lib/api'
import { Upload, X, AlertCircle, Loader2, Camera } from 'lucide-react'
import { useTimezone } from '@/contexts/TimezoneContext'

export default function LogImportPage() {
  const router = useRouter()
  const { timezone: userTimezone } = useTimezone()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [selectedChildren, setSelectedChildren] = useState<string[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [error, setError] = useState<string>('')

  const { data: children } = useQuery({
    queryKey: ['children'],
    queryFn: childrenAPI.getAll,
  })

  const analyzeMutation = useMutation({
    mutationFn: logImportAPI.analyzeImages,
    onSuccess: (response) => {
      // Store the analysis results and navigate to review page
      localStorage.setItem('logImportData', JSON.stringify({
        analysisResult: response.data,
        selectedChildren,
        timezone: userTimezone,
      }))
      router.push('/logs/review')
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || 'Failed to analyze images')
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    if (files.length > 5) {
      setError('Maximum 5 images allowed')
      return
    }

    setError('')
    setSelectedFiles(files)

    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file))
    setPreviews(newPreviews)
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index)
      URL.revokeObjectURL(prev[index])
      return newPreviews
    })
  }

  const toggleChild = (childId: string) => {
    setSelectedChildren(prev =>
      prev.includes(childId)
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    )
  }

  const handleAnalyze = () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one image')
      return
    }

    if (selectedChildren.length === 0) {
      setError('Please select at least one child')
      return
    }

    const formData = new FormData()
    selectedFiles.forEach(file => {
      formData.append('images', file)
    })

    analyzeMutation.mutate(formData)
  }

  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Import Handwritten Logs</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Upload photos of nanny logs and let AI extract the data
        </p>
      </div>

      {/* Instructions */}
      <div className="card mb-6 bg-blue-50 border-blue-200">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Upload 1-5 photos of handwritten logs</li>
              <li>Select which child(ren) the logs are for</li>
              <li>AI will analyze and extract the data</li>
              <li>Review and edit each log before saving</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Child Selection */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-3">Select Child(ren)</h2>
        {children && children.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {children.map((child: any) => (
              <button
                key={child.id}
                onClick={() => toggleChild(child.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedChildren.includes(child.id)
                    ? 'bg-primary-100 text-primary-700 border-2 border-primary-500'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent'
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No children found</p>
        )}
      </div>

      {/* File Upload */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-3">Upload Images</h2>

        {selectedFiles.length === 0 ? (
          <label className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-700 font-medium mb-1">Click to upload images</p>
            <p className="text-sm text-gray-500">
              or drag and drop (max 5 images, 5MB each)
            </p>
          </label>
        ) : (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                    {selectedFiles[index].name}
                  </div>
                </div>
              ))}
            </div>

            {selectedFiles.length < 5 && (
              <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                <p className="text-sm text-gray-600">Add more images</p>
              </label>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="card mb-6 bg-red-50 border-red-200">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>

        <button
          onClick={handleAnalyze}
          disabled={analyzeMutation.isPending || selectedFiles.length === 0 || selectedChildren.length === 0}
          className="btn-primary flex items-center space-x-2"
        >
          {analyzeMutation.isPending ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Analyze Images</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
