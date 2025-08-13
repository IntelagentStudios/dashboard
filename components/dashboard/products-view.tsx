'use client'

import { useState, useEffect } from 'react'
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
  BarChart3,
  RefreshCw,
  Construction
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ConversationsChart from './conversations-chart'
import ChatbotSessionsTable from './chatbot-sessions-table'
import ChatbotConversations from './chatbot-conversations'

interface Product {
  id: string
  name: string
  description: string
  licenses: number
  activeUsers: number
  growth: number
  stats: any
}

export default function ProductsView() {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/dashboard/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Failed to fetch products:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Map product IDs to icons and colors
  const productConfig: Record<string, { icon: any; color: string }> = {
    'chatbot': {
      icon: MessageSquare,
      color: 'bg-blue-500'
    },
    'setup-agent': {
      icon: Settings2,
      color: 'bg-green-500'
    },
    'sales-agent': {
      icon: TrendingUp,
      color: 'bg-purple-500'
    }
  }

  if (selectedProduct) {
    const product = products.find(p => p.id === selectedProduct)
    if (!product) return null

    const config = productConfig[product.id] || { icon: Package, color: 'bg-gray-500' }

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
              <CardTitle className="text-sm font-medium">Total Licences</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{product.licenses || 0}</div>
              <p className="text-xs text-muted-foreground">Active licences</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(product.activeUsers || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(product.growth || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(product.growth || 0) > 0 ? '+' : ''}{product.growth || 0}%
              </div>
              <p className="text-xs text-muted-foreground">Month over month</p>
            </CardContent>
          </Card>
        </div>

        {/* Chatbot-specific content */}
        {product.id === 'chatbot' ? (
          <>
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="conversations">Conversations</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <ConversationsChart />
                <Card>
                  <CardHeader>
                    <CardTitle>Chatbot Statistics</CardTitle>
                    <CardDescription>Key performance metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Total Conversations</span>
                        <span className="font-mono">{product.stats?.totalConversations?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Average Response Time</span>
                        <span className="font-mono">{product.stats?.averageResponseTime || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Resolution Rate</span>
                        <span className="font-mono">{product.stats?.resolutionRate || 0}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions">
                <ChatbotSessionsTable view="by-domain" />
              </TabsContent>

              <TabsContent value="conversations">
                <ChatbotConversations />
              </TabsContent>

              <TabsContent value="analytics">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Domains</CardTitle>
                      <CardDescription>Most active domains by conversation count</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Analytics coming soon...</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Intent Analysis</CardTitle>
                      <CardDescription>Most common user intents</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Analytics coming soon...</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          /* Other products - show coming soon message */
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Construction className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{product.name} - Coming Soon</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                {product.id === 'setup-agent' 
                  ? 'The Setup Agent is currently in development. This automated onboarding assistant will help users configure and deploy your products seamlessly.'
                  : 'The Sales Agent is currently in development. This AI-powered sales representative will qualify leads and drive conversions automatically.'
                }
              </p>
              <Badge variant="outline" className="mt-4">Under Development</Badge>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-64">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No products found</p>
          <p className="text-sm text-muted-foreground mt-2">No active product licences in the system</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => {
        const config = productConfig[product.id] || { icon: Package, color: 'bg-gray-500' }
        const Icon = config.icon
        
        return (
          <Card 
            key={product.id}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSelectedProduct(product.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-5 w-5 text-white" />
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
                  <div className="text-xl font-bold">{product.licenses || 0}</div>
                  <div className="text-xs text-muted-foreground">Licences</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{product.activeUsers || 0}</div>
                  <div className="text-xs text-muted-foreground">Users</div>
                </div>
                <div>
                  <div className={`text-xl font-bold ${(product.growth || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {(product.growth || 0) > 0 ? '+' : ''}{product.growth || 0}%
                  </div>
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
        )
      })}

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