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
  Activity,
  Globe,
  Clock
} from 'lucide-react'
import { useDashboardStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'
import RealtimeIndicator from './realtime-indicator'
import StatsCards from './stats-cards'
import ConversationsChart from './conversations-chart'
import DownloadsActivationsChart from './downloads-activations-chart'
import ProductDistributionCard from './product-distribution-card'
import CustomerUsageSummary from './customer-usage-summary'
import ChatbotConversations from './chatbot-conversations'
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
        <StatsCards isMaster={isMaster} />

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
              <DownloadsActivationsChart />
              <div className="grid gap-4 md:grid-cols-2">
                <ProductDistributionCard />
                <Card>
                  <CardHeader>
                    <CardTitle>License Activity</CardTitle>
                    <CardDescription>Recent license events</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span>New license activated</span>
                        </div>
                        <span className="text-muted-foreground">2m ago</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span>License downloaded</span>
                        </div>
                        <span className="text-muted-foreground">15m ago</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-yellow-500" />
                          <span>License renewed</span>
                        </div>
                        <span className="text-muted-foreground">1h ago</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          <span>License expired</span>
                        </div>
                        <span className="text-muted-foreground">3h ago</span>
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
                <CustomerUsageSummary />
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Common tasks and tools</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Button 
                        className="w-full justify-start" 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Download license key
                          const licenseData = {
                            licenseKey: authData?.licenseKey,
                            domain: authData?.domain,
                            customerName: authData?.customerName,
                            exportDate: new Date().toISOString()
                          }
                          const blob = new Blob([JSON.stringify(licenseData, null, 2)], { type: 'application/json' })
                          const url = window.URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `license-${authData?.licenseKey}.json`
                          a.click()
                          window.URL.revokeObjectURL(url)
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download License Key
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline" 
                        size="sm"
                        onClick={handleExport}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Dashboard Data
                      </Button>
                      <Button 
                        className="w-full justify-start" 
                        variant="outline" 
                        size="sm"
                        onClick={() => router.push('?tab=conversations')}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        View Conversations
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Placeholder widgets section */}
              <Card>
                <CardHeader>
                  <CardTitle>Custom Widgets</CardTitle>
                  <CardDescription>Configure your dashboard widgets in settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                        <div className="h-8 w-8 mx-auto mb-2 bg-gray-200 rounded animate-pulse" />
                        <p className="text-sm text-muted-foreground">Widget Slot {i}</p>
                        <p className="text-xs text-muted-foreground mt-1">Configure in settings</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conversations">
              <ChatbotConversations />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard Settings</CardTitle>
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

              <Card>
                <CardHeader>
                  <CardTitle>Widget Configuration</CardTitle>
                  <CardDescription>Choose which widgets to display on your overview page</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Select up to 3 widgets to display on your dashboard overview:
                    </p>
                    <div className="grid gap-4">
                      {[
                        { id: 'conversations', name: 'Conversations Chart', icon: MessageSquare },
                        { id: 'usage', name: 'Usage Summary', icon: Activity },
                        { id: 'performance', name: 'Performance Metrics', icon: TrendingUp },
                        { id: 'domains', name: 'Domain Activity', icon: Globe },
                        { id: 'recent', name: 'Recent Sessions', icon: Clock },
                      ].map(widget => (
                        <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <widget.icon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{widget.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Add to dashboard overview
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Add Widget
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        Note: Widget customization will be saved to your account preferences (coming soon)
                      </p>
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