import { create } from 'zustand'

interface DashboardState {
  isRealtime: boolean
  selectedProduct: string | null
  dateRange: { from: Date; to: Date }
  isPremium: boolean
  setRealtime: (value: boolean) => void
  setSelectedProduct: (product: string | null) => void
  setDateRange: (range: { from: Date; to: Date }) => void
  setPremium: (value: boolean) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  isRealtime: true,
  selectedProduct: null,
  dateRange: {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  },
  isPremium: false,
  setRealtime: (value) => set({ isRealtime: value }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setDateRange: (range) => set({ dateRange: range }),
  setPremium: (value) => set({ isPremium: value }),
}))