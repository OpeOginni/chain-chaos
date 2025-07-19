'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useEffect, useState } from 'react'

export function useWalletConnection() {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const [isHydrated, setIsHydrated] = useState(false)

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // Auto-reconnect if there was a previous connection
  useEffect(() => {
    if (isHydrated && !isConnected && !isConnecting && !isReconnecting) {
      // Check if user was previously connected
      try {
        const lastConnector = localStorage.getItem('wagmi.wallet')
        if (lastConnector) {
          const connector = connectors.find(c => c.id === lastConnector)
          if (connector) {
            try {
              connect({ connector })
            } catch (error) {
              console.warn('Failed to auto-reconnect:', error)
              // Clear invalid connector from storage
              localStorage.removeItem('wagmi.wallet')
            }
          }
        }
      } catch (error) {
        console.warn('Error accessing localStorage:', error)
      }
    }
  }, [isHydrated, isConnected, isConnecting, isReconnecting, connect, connectors])

  return {
    address,
    isConnected: isHydrated && isConnected,
    isConnecting: isConnecting || isReconnecting,
    isHydrated,
    connect,
    disconnect,
    connectors
  }
} 