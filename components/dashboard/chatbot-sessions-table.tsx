'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Globe, 
  MessageSquare, 
  Clock, 
  User,
  Activity,
  ChevronRight,
  RefreshCw,
  Filter
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Session {
  sessionId: string
  domain: string
  licenseKey?: string
  messageCount: number
  startTime: Date | string
  lastActivity: Date | string
  duration: number
}

interface DomainSummary {
  domain: string
  sessionCount: number
  messageCount: number
}

interface SessionsData {
  summary?: {
    totalSessions: number
    activeDomains: number
    totalMessages: number
  }
  sessions: Session[]
  domains?: DomainSummary[]
}

export default function ChatbotSessionsTable({ 
  view = 'all',
  showDomainFilter = true 
}: { 
  view?: 'all' | 'by-domain' | 'recent'
  showDomainFilter?: boolean
}) {
  const [data, setData] = useState<SessionsData>({ sessions: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [expandedSession, setExpandedSession] = useState<string | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [view, selectedDomain])

  const fetchSessions = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        view,
        ...(selectedDomain && { domain: selectedDomain })
      })
      
      const response = await fetch(`/api/dashboard/chatbot/sessions?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return 'N/A'
    if (seconds < 60) return `${Math.round(seconds)}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  const formatTime = (time: Date | string) => {
    if (!time) return 'N/A'
    const date = typeof time === 'string' ? new Date(time) : time
    return formatDistanceToNow(date, { addSuffix: true })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {data.summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary?.totalSessions || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Domains</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary?.activeDomains || 0}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.summary?.totalMessages || 0}</div>
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Domain Filter */}
      {showDomainFilter && data.domains && data.domains.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Domains</CardTitle>
            <CardDescription>Filter sessions by domain</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedDomain === null ? 'default' : 'outline'}
                onClick={() => setSelectedDomain(null)}
              >
                All Domains
              </Button>
              {data.domains.map(domain => (
                <Button
                  key={domain.domain}
                  size="sm"
                  variant={selectedDomain === domain.domain ? 'default' : 'outline'}
                  onClick={() => setSelectedDomain(domain.domain)}
                >
                  <Globe className="h-3 w-3 mr-1" />
                  {domain.domain}
                  <Badge variant="secondary" className="ml-2">
                    {domain.sessionCount}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Chatbot Sessions</CardTitle>
              <CardDescription>
                {selectedDomain 
                  ? `Sessions on ${selectedDomain}`
                  : 'All chatbot conversations across domains'
                }
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={fetchSessions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sessions found
            </div>
          ) : (
            <div className="space-y-2">
              {data.sessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setExpandedSession(
                    expandedSession === session.sessionId ? null : session.sessionId
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{session.domain}</span>
                          {session.licenseKey && (
                            <Badge variant="outline" className="text-xs">
                              {session.licenseKey}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {session.messageCount} messages
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(session.duration)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {formatTime(session.lastActivity)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight 
                      className={`h-5 w-5 text-muted-foreground transition-transform ${
                        expandedSession === session.sessionId ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                  
                  {expandedSession === session.sessionId && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Session ID:</span>
                          <span className="ml-2 font-mono">{session.sessionId}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Started:</span>
                          <span className="ml-2">{formatTime(session.startTime)}</span>
                        </div>
                      </div>
                      <Button className="mt-4" size="sm" variant="outline">
                        View Full Conversation →
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}