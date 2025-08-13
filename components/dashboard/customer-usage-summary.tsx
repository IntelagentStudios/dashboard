'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface UsageSummary {
  totalConversations: number
  activeUsers: number
  responseRate: number
  averageResponseTime: string
}

export default function CustomerUsageSummary() {
  const [summary, setSummary] = useState<UsageSummary>({
    totalConversations: 0,
    activeUsers: 0,
    responseRate: 0,
    averageResponseTime: 'N/A'
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
  }, [])

  const fetchSummary = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/dashboard/customer-summary')
      if (response.ok) {
        const data = await response.json()
        setSummary(data)
      }
    } catch (error) {
      console.error('Failed to fetch usage summary:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Summary</CardTitle>
        <CardDescription>Your product usage this month</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-24 bg-gray-300 rounded animate-pulse" />
                <div className="h-6 w-16 bg-gray-300 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Total Conversations</span>
              <span className="font-mono text-lg">{(summary.totalConversations || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Active Users</span>
              <span className="font-mono text-lg">{(summary.activeUsers || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Response Rate</span>
              <span className="font-mono text-lg">{summary.responseRate || 0}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Avg Response Time</span>
              <span className="font-mono text-lg">{summary.averageResponseTime || 'N/A'}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}