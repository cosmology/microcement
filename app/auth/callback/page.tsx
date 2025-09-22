'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Completing Authentication...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check for email confirmation token in URL
        const token = searchParams?.get('token')
        const type = searchParams?.get('type')
        
        if (token && type === 'signup') {
          setMessage('Confirming your email...')
          
          // Handle email confirmation
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'signup'
          })
          
          if (error) {
            console.error('Email confirmation error:', error)
            setStatus('error')
            setMessage('Email confirmation failed. Please try again.')
            return
          }
          
          if (data.user) {
            console.log('Email confirmed successfully:', data.user.email)
            setStatus('success')
            setMessage('Email confirmed! Redirecting...')
            
            // Redirect to home page after successful confirmation
            setTimeout(() => {
              router.push('/')
            }, 2000)
            return
          }
        }
        
        // Handle regular auth callback
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setStatus('error')
          setMessage('Authentication failed. Please try again.')
          return
        }

        if (data.session) {
          console.log('Auth callback successful:', data.session.user.email)
          setStatus('success')
          setMessage('Authentication successful! Redirecting...')
          
          // Redirect to home page after successful authentication
          setTimeout(() => {
            router.push('/')
          }, 2000)
        } else {
          console.log('No session found in callback')
          setStatus('error')
          setMessage('No active session found.')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage('An unexpected error occurred.')
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'border-green-600'
      case 'error': return 'border-red-600'
      default: return 'border-purple-600'
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success': return '✅'
      case 'error': return '❌'
      default: return '⏳'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center max-w-md mx-auto px-4">
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${getStatusColor()} mx-auto mb-4 ${status !== 'loading' ? 'hidden' : ''}`}></div>
        
        <div className={`text-4xl mb-4 ${status === 'loading' ? 'hidden' : ''}`}>
          {getStatusIcon()}
        </div>
        
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {message}
        </h2>
        
        {status === 'error' && (
          <div className="mt-4">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Go Home
            </button>
          </div>
        )}
        
        {status === 'success' && (
          <p className="text-gray-600 dark:text-gray-400">
            You will be redirected automatically...
          </p>
        )}
      </div>
    </div>
  )
}
