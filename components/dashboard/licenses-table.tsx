'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDashboardStore } from '@/lib/store'

export default function LicensesTable() {
  const [licenses, setLicenses] = useState<any[]>([])
  const { isRealtime } = useDashboardStore()

  useEffect(() => {
    fetchLicenses()
    
    if (isRealtime) {
      const interval = setInterval(fetchLicenses, 10000)
      return () => clearInterval(interval)
    }
  }, [isRealtime])

  const fetchLicenses = async () => {
    try {
      const response = await fetch('/api/dashboard/licenses')
      if (response.ok) {
        const data = await response.json()
        setLicenses(data)
      }
    } catch (error) {
      console.error('Failed to fetch licenses:', error)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Licenses</CardTitle>
        <CardDescription>All licenses across products</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">License Key</th>
                <th className="text-left py-2">Customer</th>
                <th className="text-left py-2">Domain</th>
                <th className="text-left py-2">Product</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {licenses.map((license) => (
                <tr key={license.licenseKey} className="border-b">
                  <td className="py-2 font-mono text-sm">{license.licenseKey}</td>
                  <td className="py-2">{license.customerName || 'N/A'}</td>
                  <td className="py-2">{license.domain || 'N/A'}</td>
                  <td className="py-2">
                    <Badge variant="outline">{license.productType || 'chatbot'}</Badge>
                  </td>
                  <td className="py-2">
                    <Badge 
                      variant={license.status === 'active' ? 'default' : 'secondary'}
                    >
                      {license.status || 'active'}
                    </Badge>
                  </td>
                  <td className="py-2 text-sm text-muted-foreground">
                    {license.createdAt ? new Date(license.createdAt).toLocaleDateString() : 'N/A'}
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