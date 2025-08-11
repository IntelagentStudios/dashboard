'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut,
  TrendingUp,
  Shield,
  RefreshCw,
  Download,
  Package,
  Activity
} from 'lucide-react'
import { useDashboardStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import RealtimeIndicator from './realtime-indicator'
import StatsCards from './stats-cards'
import ConversationsChart from './conversations-chart'
import LicensesTable from './licenses-table'
import ProductsView from './products-view'

export default function DashboardClient() {
  const [authData, setAuthData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const { isRealtime, setRealtime } = useDashboardStore()

  useEffect(() => {
    fetchAuthData()
  }, [])

  const fetchAuthData = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setAuthData(data)
      }
    } catch (error) {
      console.error('Failed to fetch auth data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to logout',
        variant: 'destructive',
      })
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: 'dashboard',
          dateRange: useDashboardStore.getState().dateRange 
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        // For now, download as JSON. In production, you'd generate a proper PDF
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        window.URL.revokeObjectURL(url)
        
        toast({
          title: 'Export successful',
          description: 'Dashboard report exported',
        })
      }
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export dashboard',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const isMaster = authData?.isMaster

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Intelagent Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  {isMaster ? 'Master Admin' : authData?.customerName || 'Customer'} - {authData?.domain}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <RealtimeIndicator />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRealtime(!isRealtime)}
              >
                {isRealtime ? (
                  <>
                    <Activity className="h-4 w-4 mr-2" />
                    Realtime On
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Realtime Off
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <StatsCards />

        {isMaster ? (
          // Master Admin View
          <Tabs defaultValue="overview" className="mt-8">
            <TabsList className="grid w-full grid-cols-4 max-w-md">
              <TabsTrigger value="overview">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="products">
                <Package className="h-4 w-4 mr-2" />
                Products
              </TabsTrigger>
              <TabsTrigger value="licenses">
                <Users className="h-4 w-4 mr-2" />
                Licenses
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <ConversationsChart />
                <Card>
                  <CardHeader>
                    <CardTitle>Product Distribution</CardTitle>
                    <CardDescription>Active licenses by product type</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-blue-500" />
                          <span>Chatbot</span>
                        </div>
                        <span className="font-mono">85%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                          <span>Setup Agent</span>
                        </div>
                        <span className="font-mono">10%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full bg-purple-500" />
                          <span>Sales Agent</span>
                        </div>
                        <span className="font-mono">5%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="products">
              <ProductsView />
            </TabsContent>

            <TabsContent value="licenses">
              <LicensesTable />
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Master Settings</CardTitle>
                  <CardDescription>Configure dashboard and system preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Real-time Updates</p>
                        <p className="text-sm text-muted-foreground">
                          Automatically refresh data as it changes
                        </p>
                      </div>
                      <Button
                        variant={isRealtime ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRealtime(!isRealtime)}
                      >
                        {isRealtime ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Data Retention</p>
                        <p className="text-sm text-muted-foreground">
                          Configure how long to keep historical data
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          // Customer View
          <Tabs defaultValue="overview" className="mt-8">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="overview">
                <BarChart3 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="conversations">
                <MessageSquare className="h-4 w-4 mr-2" />
                Conversations
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <ConversationsChart />
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Summary</CardTitle>
                    <CardDescription>Your product usage this month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span>Total Conversations</span>
                        <span className="font-mono text-lg">1,234</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Active Users</span>
                        <span className="font-mono text-lg">567</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Response Rate</span>
                        <span className="font-mono text-lg">98.5%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="conversations">
              <ConversationsChart />
            </TabsContent>

            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Configure your dashboard preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Real-time Updates</p>
                        <p className="text-sm text-muted-foreground">
                          Automatically refresh data as it changes
                        </p>
                      </div>
                      <Button
                        variant={isRealtime ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRealtime(!isRealtime)}
                      >
                        {isRealtime ? 'Enabled' : 'Disabled'}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">
                          Receive alerts for important events
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  )
}