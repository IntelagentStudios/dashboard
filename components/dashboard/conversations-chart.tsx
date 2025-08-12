'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useDashboardStore } from '@/lib/store'

export default function ConversationsChart() {
  const [data, setData] = useState<any[]>([])
  const { isRealtime, dateRange } = useDashboardStore()

  useEffect(() => {
    fetchChartData()
  }, [dateRange])

  const fetchChartData = async () => {
    try {
      const response = await fetch('/api/dashboard/conversations-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRange }),
      })
      
      if (response.ok) {
        const chartData = await response.json()
        setData(chartData)
      }
    } catch (error) {
      console.error('Failed to fetch chart data:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversation Trends</CardTitle>
        <CardDescription>Daily conversation volume over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis 
              dataKey="date" 
              stroke="#888"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#888"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1a1a1a', 
                border: '1px solid #333',
                borderRadius: '8px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="conversations" 
              stroke="#f5f5f0" 
              strokeWidth={2}
              dot={{ fill: '#f5f5f0', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}