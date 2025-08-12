'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Settings2, 
  TrendingUp, 
  Users,
  ChevronRight,
  Package,
  BarChart3
} from 'lucide-react'
import ConversationsChart from './conversations-chart'

interface Product {
  id: string
  name: string
  description: string
  icon: any
  color: string
  stats: {
    licenses: number
    activeUsers: number
    growth: string
  }
}

export default function ProductsView() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

  const products: Product[] = [
    {
      id: 'chatbot',
      name: 'Chatbot',
      description: 'AI-powered customer support chatbot',
      icon: MessageSquare,
      color: 'bg-blue-500',
      stats: {
        licenses: 85,
        activeUsers: 3420,
        growth: '+12.5%'
      }
    },
    {
      id: 'setup-agent',
      name: 'Setup Agent',
      description: 'Automated onboarding and setup assistant',
      icon: Settings2,
      color: 'bg-green-500',
      stats: {
        licenses: 10,
        activeUsers: 450,
        growth: '+8.3%'
      }
    },
    {
      id: 'sales-agent',
      name: 'Sales Agent',
      description: 'AI sales representative and lead qualifier',
      icon: TrendingUp,
      color: 'bg-purple-500',
      stats: {
        licenses: 5,
        activeUsers: 230,
        growth: '+15.7%'
      }
    }
  ]

  if (selectedProduct) {
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return null

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedProduct(null)}
          >
            ← Back to Products
          </Button>
          <h2 className="text-xl font-semibold">{product.name} Dashboard</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Licenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{product.stats.licenses}</div>
              <p className="text-xs text-muted-foreground">Active licenses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{product.stats.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{product.stats.growth}</div>
              <p className="text-xs text-muted-foreground">Month over month</p>
            </CardContent>
          </Card>
        </div>

        <ConversationsChart />

        <Card>
          <CardHeader>
            <CardTitle>Product-Specific Data</CardTitle>
            <CardDescription>Detailed analytics for {product.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {product.id === 'chatbot' && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Total Conversations</span>
                    <span className="font-mono">12,345</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average Response Time</span>
                    <span className="font-mono">1.2s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Resolution Rate</span>
                    <span className="font-mono">87%</span>
                  </div>
                </>
              )}
              {product.id === 'setup-agent' && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Setups Completed</span>
                    <span className="font-mono">456</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average Setup Time</span>
                    <span className="font-mono">4.5 min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Success Rate</span>
                    <span className="font-mono">94%</span>
                  </div>
                </>
              )}
              {product.id === 'sales-agent' && (
                <>
                  <div className="flex items-center justify-between">
                    <span>Leads Generated</span>
                    <span className="font-mono">789</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Conversion Rate</span>
                    <span className="font-mono">23%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average Deal Size</span>
                    <span className="font-mono">$2,450</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events for {product.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>New license activated</span>
                <span className="text-muted-foreground">2 min ago</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Configuration updated</span>
                <span className="text-muted-foreground">15 min ago</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Usage spike detected</span>
                <span className="text-muted-foreground">1 hour ago</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <Card 
          key={product.id}
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setSelectedProduct(product.id)}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${product.color}`}>
                  <product.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription className="text-xs mt-1">
                    {product.description}
                  </CardDescription>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-bold">{product.stats.licenses}</div>
                <div className="text-xs text-muted-foreground">Licenses</div>
              </div>
              <div>
                <div className="text-xl font-bold">{product.stats.activeUsers}</div>
                <div className="text-xs text-muted-foreground">Users</div>
              </div>
              <div>
                <div className="text-xl font-bold text-green-500">{product.stats.growth}</div>
                <div className="text-xs text-muted-foreground">Growth</div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Badge variant="outline">Active</Badge>
              <Button size="sm" variant="ghost">
                View Details →
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add Custom Product Card */}
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <CardTitle className="text-lg">Add Custom Product</CardTitle>
              <CardDescription className="text-xs mt-2">
                Configure a new product type
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="outline">
            Configure New Product
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}