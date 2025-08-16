'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Brain,
  Send,
  Sparkles,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Loader2,
  ChevronRight,
  History,
  Star,
  Search,
  FileText,
  BarChart3
} from 'lucide-react'
import { useDashboardStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'

interface SmartInsight {
  id: number
  insightType: string
  title: string
  content: string
  severity?: string
  createdAt: string
  metadata?: any
}

interface SmartResponse {
  response: string
  insights?: SmartInsight[]
  suggestions?: string[]
  chartData?: any
}

export default function SmartDashboard() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [responses, setResponses] = useState<SmartResponse[]>([])
  const [insights, setInsights] = useState<SmartInsight[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('chat')
  const { selectedProduct } = useDashboardStore()
  const { toast } = useToast()

  // Predefined smart queries
  const smartQueries = [
    { icon: TrendingUp, text: "What are my top performing metrics this week?" },
    { icon: AlertTriangle, text: "Show me any anomalies or issues" },
    { icon: Lightbulb, text: "What optimizations do you recommend?" },
    { icon: BarChart3, text: "Generate a performance report" },
    { icon: MessageSquare, text: "Summarize customer feedback" },
    { icon: Search, text: "What patterns do you see in the data?" }
  ]

  useEffect(() => {
    fetchInsights()
    fetchHistory()
  }, [selectedProduct])

  const fetchInsights = async () => {
    try {
      const response = await fetch('/api/dashboard/smart-insights')
      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights || [])
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error)
    }
  }

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/dashboard/smart-history')
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
      }
    } catch (error) {
      console.error('Failed to fetch history:', error)
    }
  }

  const handleQuery = async (queryText?: string) => {
    const finalQuery = queryText || query
    if (!finalQuery.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/dashboard/smart-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: finalQuery,
          product: selectedProduct,
          context: {
            previousResponses: responses.slice(-3), // Send last 3 responses for context
            currentInsights: insights.slice(0, 5)
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setResponses(prev => [...prev, data])
        
        // Update insights if new ones were generated
        if (data.insights && data.insights.length > 0) {
          setInsights(prev => [...data.insights, ...prev])
        }
        
        // Add to history
        setHistory(prev => [finalQuery, ...prev.filter(h => h !== finalQuery)].slice(0, 10))
        
        // Clear query
        setQuery('')
      } else {
        throw new Error('Failed to process query')
      }
    } catch (error) {
      toast({
        title: 'Query Failed',
        description: 'Unable to process your request. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'text-red-500 bg-red-100'
      case 'medium': return 'text-yellow-500 bg-yellow-100'
      case 'low': return 'text-green-500 bg-green-100'
      default: return 'text-blue-500 bg-blue-100'
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return TrendingUp
      case 'alert': return AlertTriangle
      case 'recommendation': return Lightbulb
      case 'report': return FileText
      default: return Star
    }
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Smart Dashboard
              <Badge variant="secondary">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
            </CardTitle>
            <CardDescription>
              Ask questions about your data and get intelligent insights
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setResponses([])
              setQuery('')
              toast({ title: 'Chat cleared' })
            }}
          >
            Clear Chat
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat">
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="insights">
              <Lightbulb className="h-4 w-4 mr-2" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              {smartQueries.map((sq, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => handleQuery(sq.text)}
                  disabled={isLoading}
                >
                  <sq.icon className="h-4 w-4 mr-2" />
                  <span className="text-xs">{sq.text}</span>
                </Button>
              ))}
            </div>

            {/* Chat Messages */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {responses.map((response, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="bg-accent p-3 rounded-lg">
                    <p className="text-sm">{response.response}</p>
                    
                    {response.suggestions && response.suggestions.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Suggestions:</p>
                        {response.suggestions.map((suggestion, sidx) => (
                          <Button
                            key={sidx}
                            variant="ghost"
                            size="sm"
                            className="h-auto p-1 justify-start text-xs"
                            onClick={() => handleQuery(suggestion)}
                          >
                            <ChevronRight className="h-3 w-3 mr-1" />
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {responses.length === 0 && (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Ask me anything about your dashboard data
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Try clicking one of the quick actions above
                  </p>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Ask about your data..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleQuery()}
                disabled={isLoading}
              />
              <Button 
                onClick={() => handleQuery()} 
                disabled={isLoading || !query.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {insights.length > 0 ? (
              insights.map(insight => {
                const Icon = getInsightIcon(insight.insightType)
                return (
                  <div key={insight.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3">
                        <div className={`p-2 rounded-lg ${getSeverityColor(insight.severity)}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{insight.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {insight.content}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(insight.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {insight.severity && (
                        <Badge variant="outline">{insight.severity}</Badge>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No insights generated yet
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Start asking questions to generate insights
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-2">
            {history.length > 0 ? (
              history.map((item, idx) => (
                <Button
                  key={idx}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    setQuery(item)
                    setActiveTab('chat')
                  }}
                >
                  <History className="h-4 w-4 mr-2" />
                  <span className="text-sm truncate">{item}</span>
                </Button>
              ))
            ) : (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No query history yet
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}