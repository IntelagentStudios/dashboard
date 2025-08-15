'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageSquare, 
  User,
  Bot,
  Clock,
  Globe,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react'
import { format } from 'date-fns'
import { useDashboardStore } from '@/lib/store'

interface Message {
  id: number
  role: string
  content: string
  timestamp: Date | string
  intentDetected?: string
}

interface Conversation {
  sessionId: string
  domain: string
  conversationId?: string
  messages: Message[]
  startTime: Date | string
  lastActivity: Date | string
  userId?: string
}

export default function ChatbotConversations({ licenseKey }: { licenseKey?: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDomain, setFilterDomain] = useState<string>('')
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set())
  const { selectedProduct } = useDashboardStore()

  useEffect(() => {
    fetchConversations()
  }, [licenseKey, selectedProduct])

  const fetchConversations = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        view: 'recent',
        limit: '50'
      })
      
      if (selectedProduct) {
        params.set('product', selectedProduct)
      }
      
      const response = await fetch(`/api/dashboard/chatbot/sessions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setConversations(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleConversation = (sessionId: string) => {
    const newExpanded = new Set(expandedConversations)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedConversations(newExpanded)
  }

  const filteredConversations = conversations.filter(conv => {
    if (filterDomain && conv.domain !== filterDomain) return false
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return conv.messages.some(msg => 
        msg.content?.toLowerCase().includes(searchLower)
      ) || conv.domain?.toLowerCase().includes(searchLower)
    }
    return true
  })

  const uniqueDomains = Array.from(new Set(conversations.map(c => c.domain).filter(Boolean)))

  const exportConversation = (conversation: Conversation) => {
    const content = conversation.messages.map(msg => 
      `[${format(new Date(msg.timestamp), 'yyyy-MM-dd HH:mm:ss')}] ${msg.role}: ${msg.content}`
    ).join('\n')
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation-${conversation.sessionId}-${Date.now()}.txt`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <MessageSquare className="h-8 w-8 animate-pulse text-primary" />
        </CardContent>
      </Card>
    )
  }

  // Group conversations by date
  const groupedByDate = filteredConversations.reduce((groups, conv) => {
    const date = format(new Date(conv.startTime), 'yyyy-MM-dd')
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(conv)
    return groups
  }, {} as Record<string, Conversation[]>)

  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Conversations</CardTitle>
              <CardDescription>
                {filteredConversations.length} conversation sessions
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  // Export all conversations
                  const exportData = {
                    exportDate: new Date().toISOString(),
                    totalConversations: filteredConversations.length,
                    conversations: filteredConversations.map(conv => ({
                      sessionId: conv.sessionId,
                      domain: conv.domain,
                      startTime: conv.startTime,
                      messageCount: conv.messages.length,
                      messages: conv.messages.map(msg => ({
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp,
                        intent: msg.intentDetected
                      }))
                    }))
                  }
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
                  const url = window.URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `conversations-export-${Date.now()}.json`
                  a.click()
                  window.URL.revokeObjectURL(url)
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
              <Button size="sm" variant="outline" onClick={fetchConversations}>
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {uniqueDomains.length > 1 && (
              <select
                className="px-4 py-2 border rounded-lg"
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
              >
                <option value="">All Domains</option>
                {uniqueDomains.map(domain => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
            )}
          </div>

          <Tabs defaultValue="sessions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sessions">Sessions by Date</TabsTrigger>
              <TabsTrigger value="domains">Grouped by Domain</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="space-y-4">
              {sortedDates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No conversations found
                </div>
              ) : (
                sortedDates.map(date => {
                  const dateConversations = groupedByDate[date]
                  const formattedDate = format(new Date(date), 'EEEE, MMMM d, yyyy')
                  const isToday = date === format(new Date(), 'yyyy-MM-dd')
                  const isYesterday = date === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
                  
                  return (
                    <div key={date} className="space-y-2">
                      <div className="flex items-center gap-2 py-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {isToday ? 'Today' : isYesterday ? 'Yesterday' : formattedDate}
                        </h3>
                        <Badge variant="secondary" className="ml-auto">
                          {dateConversations.length} sessions
                        </Badge>
                      </div>
                      
                      {dateConversations
                        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                        .map((conversation) => (
                  <Card key={conversation.sessionId} className="overflow-hidden">
                    <CardHeader 
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => toggleConversation(conversation.sessionId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4" />
                              <span className="font-medium">{conversation.domain}</span>
                              {conversation.userId && (
                                <Badge variant="outline">
                                  <User className="h-3 w-3 mr-1" />
                                  {conversation.userId}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>{conversation.messages.length} messages</span>
                              <span>•</span>
                              <span>{format(new Date(conversation.startTime), 'MMM d, h:mm a')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              exportConversation(conversation)
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {expandedConversations.has(conversation.sessionId) ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    {expandedConversations.has(conversation.sessionId) && (
                      <CardContent className="border-t">
                        <div className="space-y-3 mt-4">
                          {conversation.messages.map((message, idx) => (
                            <div 
                              key={idx}
                              className={`flex gap-3 ${
                                message.role === 'user' ? 'justify-start' : 'justify-end'
                              }`}
                            >
                              <div className={`flex gap-3 max-w-[70%] ${
                                message.role === 'user' ? 'flex-row' : 'flex-row-reverse'
                              }`}>
                                <div className={`p-2 rounded-full ${
                                  message.role === 'user' 
                                    ? 'bg-blue-100 text-blue-600' 
                                    : 'bg-green-100 text-green-600'
                                }`}>
                                  {message.role === 'user' ? (
                                    <User className="h-4 w-4" />
                                  ) : (
                                    <Bot className="h-4 w-4" />
                                  )}
                                </div>
                                <div>
                                  <div className={`p-3 rounded-lg ${
                                    message.role === 'user'
                                      ? 'bg-blue-50 text-blue-900'
                                      : 'bg-green-50 text-green-900'
                                  }`}>
                                    <p className="text-sm">{message.content}</p>
                                    {message.intentDetected && (
                                      <Badge variant="outline" className="mt-2">
                                        <Tag className="h-3 w-3 mr-1" />
                                        {message.intentDetected}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {format(new Date(message.timestamp), 'h:mm:ss a')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
                    </div>
                  )
                })
              )}
            </TabsContent>

            <TabsContent value="domains" className="space-y-4">
              {uniqueDomains.map(domain => {
                const domainConversations = filteredConversations.filter(c => c.domain === domain)
                
                return (
                  <Card key={domain}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          <Globe className="h-4 w-4 inline mr-2" />
                          {domain}
                        </CardTitle>
                        <Badge>{domainConversations.length} conversations</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {domainConversations.slice(0, 5).map(conv => (
                          <div 
                            key={conv.sessionId}
                            className="flex items-center justify-between p-2 hover:bg-accent/50 rounded cursor-pointer"
                            onClick={() => toggleConversation(conv.sessionId)}
                          >
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {conv.messages.length} messages
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(conv.startTime), 'MMM d, h:mm a')}
                              </span>
                            </div>
                            <ChevronDown className="h-4 w-4" />
                          </div>
                        ))}
                        {domainConversations.length > 5 && (
                          <Button variant="ghost" size="sm" className="w-full">
                            Show {domainConversations.length - 5} more...
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}