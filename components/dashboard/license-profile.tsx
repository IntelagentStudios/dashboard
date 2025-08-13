'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Mail, 
  Globe, 
  Calendar,
  Activity,
  MessageSquare,
  TrendingUp,
  Clock,
  ChevronLeft,
  Download,
  Key,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react'
import { format } from 'date-fns'
import ConversationsChart from './conversations-chart'
import ChatbotConversations from './chatbot-conversations'

interface LicenseProfileProps {
  licenseKey: string
  onBack: () => void
}

interface ProfileData {
  license: {
    licenseKey: string
    email?: string
    customerName?: string
    domain?: string
    status?: string
    createdAt?: string
    usedAt?: string
    lastIndexed?: string
    plan?: string
    productType?: string
    subscriptionStatus?: string
  }
  stats: {
    totalConversations: number
    totalSessions: number
    avgSessionDuration: string
    lastActivity?: string
    peakUsageHour: number
    avgMessagesPerSession: number
  }
  recentSessions: any[]
}

export default function LicenseProfile({ licenseKey, onBack }: LicenseProfileProps) {
  const [profileData, setProfileData] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchProfileData()
  }, [licenseKey])

  const fetchProfileData = async () => {
    setIsLoading(true)
    try {
      // Fetch license details
      const licenseResponse = await fetch(`/api/dashboard/licenses/${licenseKey}`)
      const licenseData = await licenseResponse.json()

      // Fetch usage stats
      const statsResponse = await fetch(`/api/dashboard/licenses/${licenseKey}/stats`)
      const statsData = await statsResponse.json()

      // Fetch recent sessions
      const sessionsResponse = await fetch(`/api/dashboard/chatbot/sessions?licenseKey=${licenseKey}&limit=10`)
      const sessionsData = await sessionsResponse.json()

      setProfileData({
        license: licenseData,
        stats: statsData,
        recentSessions: sessionsData.sessions || []
      })
    } catch (error) {
      console.error('Failed to fetch profile data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading profile...</div>
        </CardContent>
      </Card>
    )
  }

  if (!profileData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground">Failed to load licence profile</p>
          <Button className="mt-4" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Licences
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { license, stats } = profileData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Licences
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Licence Profile</h2>
            <p className="text-sm text-muted-foreground">{license.licenseKey}</p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Profile
        </Button>
      </div>

      {/* Profile Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Licence Information</CardTitle>
          <CardDescription>Details about this licence and customer</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Customer Name</p>
                <p className="text-sm text-muted-foreground">{license.customerName || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{license.email || 'Not provided'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Domain</p>
                <p className="text-sm text-muted-foreground">{license.domain || 'Not set'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Product Type</p>
                <p className="text-sm text-muted-foreground capitalize">{license.productType || 'Chatbot'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Created</p>
                <p className="text-sm text-muted-foreground">
                  {license.createdAt ? format(new Date(license.createdAt), 'dd MMM yyyy') : 'Unknown'}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              {license.status === 'active' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge variant={license.status === 'active' ? 'default' : 'secondary'}>
                  {license.status || 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">Unique sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgSessionDuration || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Per session</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Messages/Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgMessagesPerSession || 0}</div>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="conversations">
            <MessageSquare className="h-4 w-4 mr-2" />
            Conversations
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity className="h-4 w-4 mr-2" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ConversationsChart />
          <Card>
            <CardHeader>
              <CardTitle>Usage Patterns</CardTitle>
              <CardDescription>Activity insights for this licence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Peak Usage Hour</span>
                  <span className="font-mono text-sm">{stats.peakUsageHour || 0}:00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Activity</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.lastActivity ? format(new Date(stats.lastActivity), 'dd MMM yyyy HH:mm') : 'No activity'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Plan Type</span>
                  <Badge variant="outline">{license.plan || 'Basic'}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <ChatbotConversations licenseKey={licenseKey} />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest sessions and events for this licence</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {profileData.recentSessions.length > 0 ? (
                  profileData.recentSessions.map((session: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Session {session.sessionId?.slice(-8) || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.messageCount || 0} messages • {session.domain || 'Unknown domain'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {session.lastActivity ? format(new Date(session.lastActivity), 'dd MMM HH:mm') : 'Unknown'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}