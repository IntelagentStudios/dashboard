import { create } from 'zustand'

interface DashboardState {
  isRealtime: boolean
  selectedProduct: string
  dateRange: { from: Date; to: Date }
  setRealtime: (value: boolean) => void
  setSelectedProduct: (product: string) => void
  setDateRange: (range: { from: Date; to: Date }) => void
}

export const useDashboardStore = create<DashboardState>((set) => ({
  isRealtime: true,
  selectedProduct: 'all',
  dateRange: {
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    to: new Date(),
  },
  setRealtime: (value) => set({ isRealtime: value }),
  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setDateRange: (range) => set({ dateRange: range }),
}))