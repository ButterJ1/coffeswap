'use client'

import { ReactNode, useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'

// App ID from World Developer Portal
const APP_ID = process.env.NEXT_PUBLIC_APP_ID || 'app_e2038c3da1dca2681b7a1eb4da7920b3'

export default function MiniKitProvider({ children }: { children: ReactNode }) {
    useEffect(() => {
        // Install MiniKit when component mounts
        MiniKit.install(APP_ID)

        // Log whether we're running in World App environment
        if (MiniKit.isInstalled()) {
            console.log('Running in World App environment - full functionality available')
        } else {
            console.log('Not running in World App - limited functionality available')
            
            // If we're in development and not in World App, we can provide some mock data
            if (process.env.NODE_ENV === 'development') {
                // This would provide a mock wallet address for development testing
                // In a real implementation, this would not be needed as we'd rely on World App
                // @ts-ignore - add mock wallet for development only
                window.MiniKit = window.MiniKit || {};
                // @ts-ignore
                window.MiniKit.walletAddress = '0xf8F02eFc9Fc39DEdC87860E0E7F2adC17475937D';
            }
        }

        // Set up event listeners for MiniKit events if needed
        const handleWalletConnected = (event: any) => {
            console.log('Wallet connected:', event.detail)
        }

        document.addEventListener('minikit:wallet_connected', handleWalletConnected)

        return () => {
            // Clean up event listeners
            document.removeEventListener('minikit:wallet_connected', handleWalletConnected)
        }
    }, [])

    return <>{children}</>
}