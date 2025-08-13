'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, MessageSquare, TrendingUp, DollarSign, TrendingDown } from 'lucide-react'
import { useDashboardStore } from '@/lib/store'

export default function StatsCards() {
  const [stats, setStats] = useState({
    totalLicenses: 0,
    activeConversations: 0,
    monthlyGrowth: 0,
    revenue: 0,
  })
  const [previousStats, setPreviousStats] = useState({
    totalLicenses: 0,
    activeConversations: 0,
    revenue: 0,
  })
  const { isRealtime } = useDashboardStore()

  useEffect(() => {
    fetchStats()
    fetchPreviousStats()
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

  const fetchPreviousStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats?period=previous')
      if (response.ok) {
        const data = await response.json()
        setPreviousStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch previous stats:', error)
    }
  }

  // Calculate real change percentages
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const cards = [
    {
      title: 'Total Licenses',
      value: stats.totalLicenses.toLocaleString(),
      icon: Users,
      change: calculateChange(stats.totalLicenses, previousStats.totalLicenses),
      color: 'text-blue-500',
    },
    {
      title: 'Active Conversations',
      value: stats.activeConversations.toLocaleString(),
      icon: MessageSquare,
      change: calculateChange(stats.activeConversations, previousStats.activeConversations),
      color: 'text-green-500',
    },
    {
      title: 'Monthly Growth',
      value: `${stats.monthlyGrowth}%`,
      icon: TrendingUp,
      change: stats.monthlyGrowth,
      showAsValue: true,
      color: 'text-purple-500',
    },
    {
      title: 'Revenue',
      value: stats.revenue > 1000 ? `$${(stats.revenue / 1000).toFixed(1)}k` : `$${stats.revenue}`,
      icon: DollarSign,
      change: calculateChange(stats.revenue, previousStats.revenue),
      color: 'text-orange-500',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const isPositive = card.change > 0
        const isNeutral = card.change === 0
        const changeColor = isNeutral ? 'text-gray-500' : isPositive ? 'text-green-500' : 'text-red-500'
        const ChangeIcon = isPositive ? TrendingUp : TrendingDown
        
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {!isNeutral && <ChangeIcon className={`h-3 w-3 ${changeColor}`} />}
                <span className={changeColor}>
                  {isPositive ? '+' : ''}{card.change}%
                </span>
                {!card.showAsValue && ' from last month'}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}