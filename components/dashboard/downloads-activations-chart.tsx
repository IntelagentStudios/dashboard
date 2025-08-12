'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, Activity, TrendingUp, TrendingDown } from 'lucide-react'
import { useDashboardStore } from '@/lib/store'
import { useWebSocket } from '@/hooks/use-websocket'

interface ChartData {
  downloads: Array<{ date: string; count: number }>
  activations: Array<{ date: string; count: number }>
  totalDownloads: number
  totalActivations: number
  downloadsTrend: number
  activationsTrend: number
}

export default function DownloadsActivationsChart() {
  const [data, setData] = useState<ChartData>({
    downloads: [],
    activations: [],
    totalDownloads: 0,
    totalActivations: 0,
    downloadsTrend: 0,
    activationsTrend: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const { isRealtime, dateRange } = useDashboardStore()

  // WebSocket for real-time updates
  const { socket, lastUpdate } = useWebSocket(isRealtime ? 'downloads-activations' : undefined)

  useEffect(() => {
    fetchData()
  }, [dateRange])

  useEffect(() => {
    if (socket && isRealtime) {
      // Listen for real-time updates
      socket.on('downloads-activations-update', (update) => {
        setData(prev => ({
          ...prev,
          ...update
        }))
      })

      return () => {
        socket.off('downloads-activations-update')
      }
    }
  }, [socket, isRealtime])

  useEffect(() => {
    // Refetch data when lastUpdate changes (real-time trigger)
    if (lastUpdate && isRealtime) {
      fetchData()
    }
  }, [lastUpdate])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/dashboard/downloads-activations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateRange }),
      })
      
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch downloads/activations data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Simple bar chart visualization
  const maxValue = Math.max(
    ...data.downloads.map(d => d.count),
    ...data.activations.map(d => d.count),
    1
  )

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Downloads & Activations</CardTitle>
            <CardDescription>Track product downloads and license activations</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {data.totalDownloads} Downloads
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {data.totalActivations} Activations
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading chart data...</div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span>Downloads</span>
                  {data.downloadsTrend !== 0 && (
                    <span className={`flex items-center gap-1 ${data.downloadsTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.downloadsTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(data.downloadsTrend)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span>Activations</span>
                  {data.activationsTrend !== 0 && (
                    <span className={`flex items-center gap-1 ${data.activationsTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {data.activationsTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {Math.abs(data.activationsTrend)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-2">
              {data.downloads.slice(-7).map((item, index) => {
                const activation = data.activations.find(a => a.date === item.date)
                const downloadHeight = (item.count / maxValue) * 100
                const activationHeight = ((activation?.count || 0) / maxValue) * 100
                
                return (
                  <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-1 items-end h-48">
                      <div 
                        className="flex-1 bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                        style={{ height: `${downloadHeight}%` }}
                        title={`Downloads: ${item.count}`}
                      />
                      <div 
                        className="flex-1 bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600"
                        style={{ height: `${activationHeight}%` }}
                        title={`Activations: ${activation?.count || 0}`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.date)}
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Activation Rate</p>
                <p className="text-2xl font-bold">
                  {data.totalDownloads > 0 
                    ? `${((data.totalActivations / data.totalDownloads) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Daily Downloads</p>
                <p className="text-2xl font-bold">
                  {data.downloads.length > 0
                    ? Math.round(data.totalDownloads / data.downloads.length)
                    : 0
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}