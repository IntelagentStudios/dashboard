'use client'

import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { useDashboardStore } from '@/lib/store'

export default function RealtimeIndicator() {
  const [isConnected, setIsConnected] = useState(false)
  const { isRealtime } = useDashboardStore()

  useEffect(() => {
    if (!isRealtime) {
      setIsConnected(false)
      return
    }

    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health')
        setIsConnected(response.ok)
      } catch {
        setIsConnected(false)
      }
    }

    checkConnection()
    const interval = setInterval(checkConnection, 5000)

    return () => clearInterval(interval)
  }, [isRealtime])

  if (!isRealtime) return null

  return (
    <div className="flex items-center gap-2">
      <Activity 
        className={`h-4 w-4 ${isConnected ? 'text-green-500 animate-pulse-slow' : 'text-red-500'}`} 
      />
      <span className="text-sm text-muted-foreground">
        {isConnected ? 'Live' : 'Offline'}
      </span>
    </div>
  )
}