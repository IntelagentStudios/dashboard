'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ProductDistribution {
  productType: string
  count: number
  percentage: number
}

export default function ProductDistributionCard() {
  const [distribution, setDistribution] = useState<ProductDistribution[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDistribution()
  }, [])

  const fetchDistribution = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/dashboard/product-distribution')
      if (response.ok) {
        const data = await response.json()
        setDistribution(data.distribution)
      }
    } catch (error) {
      console.error('Failed to fetch product distribution:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const productConfig: Record<string, { name: string; color: string }> = {
    'chatbot': { name: 'Chatbot', color: 'bg-blue-500' },
    'setup-agent': { name: 'Setup Agent', color: 'bg-green-500' },
    'sales-agent': { name: 'Sales Agent', color: 'bg-purple-500' },
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Distribution</CardTitle>
        <CardDescription>Active licences by product type</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-300 animate-pulse" />
                  <div className="h-4 w-20 bg-gray-300 rounded animate-pulse" />
                </div>
                <div className="h-4 w-10 bg-gray-300 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : distribution.length > 0 ? (
          <div className="space-y-4">
            {distribution.map((item) => {
              const config = productConfig[item.productType] || { 
                name: item.productType, 
                color: 'bg-gray-500' 
              }
              return (
                <div key={item.productType} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${config.color}`} />
                    <span>{config.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">({item.count})</span>
                    <span className="font-mono">{item.percentage}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            No active licences found
          </div>
        )}
      </CardContent>
    </Card>
  )
}