'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Target,
  Users,
  Clock,
  BarChart3
} from 'lucide-react'
import { useDashboardStore } from '@/lib/store'

interface Insight {
  id: string
  type: 'trend' | 'anomaly' | 'recommendation' | 'prediction'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  metric?: string
  value?: string
  change?: number
  actionable?: boolean
  action?: string
}

export default function AIInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const { selectedProduct } = useDashboardStore()

  useEffect(() => {
    fetchInsights()
  }, [selectedProduct])

  const fetchInsights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/dashboard/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product: selectedProduct === 'combined' ? null : selectedProduct 
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights || generateMockInsights())
      } else {
        // Use mock insights for now
        setInsights(generateMockInsights())
      }
    } catch (error) {
      console.error('Failed to fetch AI insights:', error)
      setInsights(generateMockInsights())
    } finally {
      setIsLoading(false)
    }
  }

  const generateMockInsights = (): Insight[] => {
    return [
      {
        id: '1',
        type: 'trend',
        title: 'Conversation Volume Increasing',
        description: 'Your chatbot conversations have increased by 45% over the last week, indicating growing user engagement.',
        impact: 'high',
        metric: 'Conversations',
        value: '+45%',
        change: 45,
        actionable: true,
        action: 'Consider scaling your infrastructure'
      },
      {
        id: '2',
        type: 'anomaly',
        title: 'Unusual Peak in Night Hours',
        description: 'Detected 3x normal activity between 2-4 AM GMT, which may indicate international users or automated traffic.',
        impact: 'medium',
        metric: 'Night Activity',
        value: '3x normal',
        actionable: true,
        action: 'Review traffic sources'
      },
      {
        id: '3',
        type: 'recommendation',
        title: 'Optimize Response Time',
        description: 'Average response time is 2.3s. Reducing this to under 1s could improve user satisfaction by 30%.',
        impact: 'high',
        metric: 'Response Time',
        value: '2.3s',
        actionable: true,
        action: 'Optimize chatbot performance'
      },
      {
        id: '4',
        type: 'prediction',
        title: 'Traffic Forecast',
        description: 'Based on current trends, expect 25% increase in conversations next month. Peak days likely Tuesday-Thursday.',
        impact: 'medium',
        metric: 'Forecasted Growth',
        value: '+25%',
        change: 25,
        actionable: false
      },
      {
        id: '5',
        type: 'recommendation',
        title: 'Cross-Product Opportunity',
        description: '68% of chatbot users could benefit from Email Assistant based on their query patterns.',
        impact: 'high',
        metric: 'Cross-sell Potential',
        value: '68%',
        actionable: true,
        action: 'Launch targeted campaign'
      }
    ]
  }

  const regenerateInsights = async () => {
    setIsGenerating(true)
    // Simulate AI processing
    setTimeout(() => {
      setInsights(generateMockInsights())
      setIsGenerating(false)
    }, 2000)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'trend': return TrendingUp
      case 'anomaly': return AlertTriangle
      case 'recommendation': return Lightbulb
      case 'prediction': return Target
      default: return Brain
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-500 bg-red-100'
      case 'medium': return 'text-yellow-500 bg-yellow-100'
      case 'low': return 'text-green-500 bg-green-100'
      default: return 'text-gray-500 bg-gray-100'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Insights
              <Badge variant="secondary" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            </CardTitle>
            <CardDescription>
              AI-generated insights based on your {selectedProduct === 'combined' ? 'combined product' : selectedProduct} data
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={regenerateInsights}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map(insight => {
            const Icon = getIcon(insight.type)
            return (
              <div
                key={insight.id}
                className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className={`p-2 rounded-lg ${getImpactColor(insight.impact)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{insight.title}</h4>
                        {insight.change !== undefined && (
                          <div className="flex items-center gap-1">
                            {insight.change > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`text-sm font-medium ${
                              insight.change > 0 ? 'text-green-500' : 'text-red-500'
                            }`}>
                              {insight.value}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {insight.description}
                      </p>
                      {insight.metric && (
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Metric: <span className="font-medium text-foreground">{insight.metric}</span>
                          </span>
                          {insight.value && insight.change === undefined && (
                            <span className="text-muted-foreground">
                              Current: <span className="font-medium text-foreground">{insight.value}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {insight.actionable && (
                    <Button size="sm" variant="ghost">
                      {insight.action}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{insights.length}</p>
            <p className="text-xs text-muted-foreground">Total Insights</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold">
              {insights.filter(i => i.impact === 'high').length}
            </p>
            <p className="text-xs text-muted-foreground">High Impact</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Target className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">
              {insights.filter(i => i.actionable).length}
            </p>
            <p className="text-xs text-muted-foreground">Actionable</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">
              {insights.filter(i => i.type === 'trend').length}
            </p>
            <p className="text-xs text-muted-foreground">Trends</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}