import { redirect } from 'next/navigation'
import { getAuthFromCookies } from '@/lib/auth'
import DashboardClient from '@/components/dashboard/dashboard-client'

export default async function HomePage() {
  const auth = await getAuthFromCookies()
  
  if (!auth) {
    redirect('/login')
  }

  return <DashboardClient />
}