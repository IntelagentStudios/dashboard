'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageSquare, TrendingUp, DollarSign } from 'lucide-react'
import { useDashboardStore } from '@/lib/store'

export default function StatsCards() {
  const [stats, setStats] = useState({
    totalLicenses: 0,
    activeConversations: 0,
    monthlyGrowth: 0,
    revenue: 0,
  })
  const { isRealtime } = useDashboardStore()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const cards = [
    {
      title: 'Total Licenses',
      value: stats.totalLicenses.toLocaleString(),
      icon: Users,
      change: '+12.5%',
      color: 'text-blue-500',
    },
    {
      title: 'Active Conversations',
      value: stats.activeConversations.toLocaleString(),
      icon: MessageSquare,
      change: '+23.1%',
      color: 'text-green-500',
    },
    {
      title: 'Monthly Growth',
      value: `${stats.monthlyGrowth}%`,
      icon: TrendingUp,
      change: '+4.2%',
      color: 'text-purple-500',
    },
    {
      title: 'Revenue',
      value: `$${(stats.revenue / 1000).toFixed(1)}k`,
      icon: DollarSign,
      change: '+15.3%',
      color: 'text-orange-500',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500">{card.change}</span> from last month
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}