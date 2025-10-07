'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsAPI } from '@/lib/api'
import { 
  Brain, TrendingUp, AlertCircle, Lightbulb, 
  Calendar, Download, ChevronRight, RefreshCw,
  Clock, Activity, Target, Loader2
} from 'lucide-react'
import { format } from 'date-fns'

export default function InsightsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week')
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  // Fetch real insights from backend
  const { data: insights, isLoading: loadingInsights, error: insightsError, refetch: refetchInsights } = useQuery({
    queryKey: ['analytics-insights'],
    queryFn: analyticsAPI.getInsights,
    refetchInterval: 60000 // Refresh every minute
  })

  // Fetch predictions
  const { data: predictions, isLoading: loadingPredictions, error: predictionsError, refetch: refetchPredictions } = useQuery({
    queryKey: ['analytics-predictions'],
    queryFn: analyticsAPI.getPredictions,
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Fetch comparison data
  const { data: comparison, isLoading: loadingComparison, error: comparisonError } = useQuery({
    queryKey: ['analytics-comparison', selectedPeriod],
    queryFn: () => {
      const days = selectedPeriod === 'week' ? 7 : 30
      return analyticsAPI.getComparison(days)
    }
  })

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchInsights(), refetchPredictions()])
    setIsRefreshing(false)
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'feeding': return TrendingUp
      case 'sleep': return Brain
      case 'correlation': return Lightbulb
      case 'comparison': return Activity
      default: return AlertCircle
    }
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'feeding': return 'text-blue-600'
      case 'sleep': return 'text-purple-600'
      case 'correlation': return 'text-green-600'
      case 'comparison': return 'text-amber-600'
      default: return 'text-gray-600'
    }
  }

  const getPredictionIcon = (type: string) => {
    switch (type) {
      case 'feeding': return 'bg-blue-50'
      case 'sleep': return 'bg-purple-50'
      case 'diaper': return 'bg-green-50'
      default: return 'bg-gray-50'
    }
  }

  // Debug logging
  useEffect(() => {
    console.log('Insights data:', insights)
    console.log('Predictions data:', predictions)
    console.log('Comparison data:', comparison)
    console.log('Errors:', { insightsError, predictionsError, comparisonError })
  }, [insights, predictions, comparison, insightsError, predictionsError, comparisonError])

  const isLoading = loadingInsights || loadingPredictions || loadingComparison

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Insights & Reports</h1>
          <p className="text-gray-600 mt-1">AI-powered analysis and predictions</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button className="btn-primary flex items-center space-x-2">
            <Download className="w-5 h-5" />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="card mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`px-4 py-2 rounded-lg ${
              selectedPeriod === 'week'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`px-4 py-2 rounded-lg ${
              selectedPeriod === 'month'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <span className="ml-2 text-gray-600">Loading analytics...</span>
        </div>
      )}

      {/* Error State */}
      {(insightsError || predictionsError || comparisonError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">Error loading analytics. Please try refreshing.</p>
          <p className="text-sm text-red-600 mt-1">
            {insightsError?.toString() || predictionsError?.toString() || comparisonError?.toString()}
          </p>
        </div>
      )}

      {/* Real-time Predictions */}
      {predictions && predictions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">Real-time Predictions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {predictions.map((prediction: any, index: number) => (
              <div key={index} className={`card ${getPredictionIcon(prediction.type)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{prediction.childName}</p>
                    <p className="font-semibold">{prediction.prediction}</p>
                    <p className="text-sm text-gray-700 mt-1">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {prediction.time}
                    </p>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    prediction.confidence === 'High' ? 'bg-green-100 text-green-700' :
                    prediction.confidence === 'Medium' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {prediction.confidence} confidence
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Predictions Message */}
      {predictions && predictions.length === 0 && (
        <div className="mb-6 bg-gray-50 rounded-lg p-6 text-center">
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No predictions available at this time.</p>
          <p className="text-sm text-gray-500 mt-1">Predictions will appear as more data is collected.</p>
        </div>
      )}

      {/* AI Insights */}
      {insights && insights.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">AI-Generated Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.map((insight: any, index: number) => {
              const Icon = getInsightIcon(insight.type)
              return (
                <div key={index} className="card hover:shadow-lg transition-shadow">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-lg bg-gray-50">
                      <Icon className={`w-6 h-6 ${getInsightColor(insight.type)}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{insight.title}</h3>
                      {insight.childName && (
                        <p className="text-xs text-gray-500 mb-1">{insight.childName}</p>
                      )}
                      <p className="text-sm text-gray-600 mb-2">{insight.description}</p>
                      {insight.trend && (
                        <p className="text-xs text-gray-600 mb-1">
                          Trend: <span className="font-medium">{insight.trend}</span>
                        </p>
                      )}
                      <p className="text-xs text-green-600 font-medium">
                        💡 {insight.recommendation}
                      </p>
                      {insight.nextAction && (
                        <p className="text-xs text-blue-600 mt-1">
                          <Target className="w-3 h-3 inline mr-1" />
                          {insight.nextAction}
                        </p>
                      )}
                      <div className="mt-2 text-xs text-gray-500">
                        Confidence: {Math.round((insight.confidence || 0.8) * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* No Insights Message */}
      {insights && insights.length === 0 && (
        <div className="mb-6 bg-gray-50 rounded-lg p-6 text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No insights available yet.</p>
          <p className="text-sm text-gray-500 mt-1">Insights will be generated as more data is collected.</p>
        </div>
      )}

      {/* Twin Comparison */}
      {comparison && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Twin Synchronization Analysis</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Feeding Synchronization</h3>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Synchronization Rate</span>
                  <span className="font-semibold">
                    {comparison.feeding?.synchronization || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${comparison.feeding?.synchronization || 0}%` }}
                  />
                </div>
              </div>
              {comparison.feeding?.Samar && (
                <div className="text-sm text-gray-600">
                  <p>Samar: Every {comparison.feeding.Samar.averageInterval}h</p>
                  <p>Maryam: Every {comparison.feeding.Maryam?.averageInterval}h</p>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Sleep Synchronization</h3>
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Synchronization Rate</span>
                  <span className="font-semibold">
                    {comparison.sleep?.synchronization || 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full"
                    style={{ width: `${comparison.sleep?.synchronization || 0}%` }}
                  />
                </div>
              </div>
              {comparison.sleep?.Samar && (
                <div className="text-sm text-gray-600">
                  <p>Samar: {comparison.sleep.Samar.totalSleepHours}h/day</p>
                  <p>Maryam: {comparison.sleep.Maryam?.totalSleepHours}h/day</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Update Indicator */}
      {!isLoading && (
        <div className="text-center text-sm text-gray-500">
          <Activity className="w-4 h-4 inline mr-1 text-green-500" />
          Real-time analytics • Updates every minute
        </div>
      )}
    </div>
  )
}
