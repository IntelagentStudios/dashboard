import { useEffect, useState } from 'react'
import io, { Socket } from 'socket.io-client'

export function useWebSocket(licenseKey?: string) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
      transports: ['websocket'],
    })

    socketInstance.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)
      
      if (licenseKey) {
        socketInstance.emit('join-room', licenseKey)
      }
    })

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected')
      setIsConnected(false)
    })

    socketInstance.on('data-update', (data) => {
      setLastUpdate(new Date(data.timestamp))
    })

    setSocket(socketInstance)

    return () => {
      if (licenseKey) {
        socketInstance.emit('leave-room', licenseKey)
      }
      socketInstance.disconnect()
    }
  }, [licenseKey])

  return { socket, isConnected, lastUpdate }
}