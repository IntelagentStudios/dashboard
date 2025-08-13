'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDashboardStore } from '@/lib/store'
import { ChevronRight, User, RefreshCw } from 'lucide-react'
import LicenseProfile from './license-profile'

export default function LicensesTable() {
  const [licenses, setLicenses] = useState<any[]>([])
  const [selectedLicense, setSelectedLicense] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { isRealtime } = useDashboardStore()

  useEffect(() => {
    fetchLicenses()
  }, [])

  const fetchLicenses = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/dashboard/licenses')
      if (response.ok) {
        const data = await response.json()
        setLicenses(data)
      }
    } catch (error) {
      console.error('Failed to fetch licences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (selectedLicense) {
    return (
      <LicenseProfile 
        licenseKey={selectedLicense} 
        onBack={() => setSelectedLicense(null)} 
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Active Licences</CardTitle>
            <CardDescription>All licences across products</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={fetchLicenses} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Licence Key</th>
                <th className="text-left py-2">Customer</th>
                <th className="text-left py-2">Domain</th>
                <th className="text-left py-2">Product</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Created</th>
                <th className="text-left py-2"></th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((license) => (
                <tr 
                  key={license.licenseKey} 
                  className="border-b hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedLicense(license.licenseKey)}
                >
                  <td className="py-3 font-mono text-sm">{license.licenseKey}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {license.customerName || 'N/A'}
                    </div>
                  </td>
                  <td className="py-3">{license.domain || 'N/A'}</td>
                  <td className="py-3">
                    <Badge variant="outline">{license.productType || 'chatbot'}</Badge>
                  </td>
                  <td className="py-3">
                    <Badge 
                      variant={license.status === 'active' ? 'default' : 'secondary'}
                    >
                      {license.status || 'active'}
                    </Badge>
                  </td>
                  <td className="py-3 text-sm text-muted-foreground">
                    {license.createdAt ? new Date(license.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                  </td>
                  <td className="py-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}