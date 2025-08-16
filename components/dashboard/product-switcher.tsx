'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronDown, Crown, Package, Sparkles } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDashboardStore } from '@/lib/store'
import { useToast } from '@/hooks/use-toast'

interface ProductSwitcherProps {
  products: string[]
  currentProduct: string | null
  isPremium?: boolean
  onProductChange?: (product: string | null) => void
}

const productInfo: Record<string, { name: string; icon: any; color: string }> = {
  chatbot: { name: 'Chatbot', icon: Package, color: 'text-blue-500' },
  // Future products - uncomment when ready
  // setup_agent: { name: 'Setup Agent', icon: Package, color: 'text-green-500' },
  // email_assistant: { name: 'Email Assistant', icon: Package, color: 'text-purple-500' },
  // voice_assistant: { name: 'Voice Assistant', icon: Package, color: 'text-orange-500' },
  combined: { name: 'All Products', icon: Sparkles, color: 'text-gradient' }
}

export default function ProductSwitcher({ 
  products, 
  currentProduct, 
  isPremium = false,
  onProductChange 
}: ProductSwitcherProps) {
  const { setSelectedProduct } = useDashboardStore()
  const { toast } = useToast()
  const [selected, setSelected] = useState(currentProduct || products[0] || null)

  useEffect(() => {
    if (currentProduct !== selected) {
      setSelected(currentProduct)
    }
  }, [currentProduct])

  const handleProductSelect = (product: string | null) => {
    if (product === 'combined' && !isPremium) {
      toast({
        title: 'Premium Feature',
        description: 'Upgrade to Premium to view combined data and AI insights',
        variant: 'default',
      })
      return
    }

    setSelected(product)
    setSelectedProduct(product)
    if (onProductChange) {
      onProductChange(product)
    }
  }

  if (!products || products.length === 0) {
    return null
  }

  // If user only has one product, don't show switcher
  if (products.length === 1 && !isPremium) {
    const product = products[0]
    const info = productInfo[product] || { name: product, icon: Package, color: 'text-gray-500' }
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-accent/50 rounded-lg">
        <info.icon className={`h-4 w-4 ${info.color}`} />
        <span className="text-sm font-medium">{info.name}</span>
      </div>
    )
  }

  const currentInfo = selected 
    ? (productInfo[selected] || { name: selected, icon: Package, color: 'text-gray-500' })
    : { name: 'Select Product', icon: Package, color: 'text-gray-500' }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-[200px] justify-between">
          <div className="flex items-center gap-2">
            <currentInfo.icon className={`h-4 w-4 ${currentInfo.color}`} />
            <span>{currentInfo.name}</span>
          </div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]">
        <DropdownMenuLabel>Select Product</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {products.map(product => {
          const info = productInfo[product] || { name: product, icon: Package, color: 'text-gray-500' }
          return (
            <DropdownMenuItem
              key={product}
              onClick={() => handleProductSelect(product)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <info.icon className={`h-4 w-4 ${info.color}`} />
                  <span>{info.name}</span>
                </div>
                {selected === product && <Check className="h-4 w-4" />}
              </div>
            </DropdownMenuItem>
          )
        })}
        
        {products.length > 1 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleProductSelect('combined')}
              className={`cursor-pointer ${!isPremium ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-gradient" />
                  <span>All Products</span>
                  {!isPremium && (
                    <Badge variant="secondary" className="ml-1">
                      <Crown className="h-3 w-3 mr-1" />
                      Premium
                    </Badge>
                  )}
                </div>
                {selected === 'combined' && <Check className="h-4 w-4" />}
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}