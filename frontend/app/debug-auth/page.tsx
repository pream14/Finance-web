'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, User, AlertCircle } from 'lucide-react'

export default function DebugAuthPage() {
  const [authInfo, setAuthInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check session cookie
        const sessionCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('session='))
          ?.split('=')[1]

        // Check localStorage
        const localStorageUser = localStorage.getItem('user')

        // Try session API
        let apiResponse = null
        try {
          const response = await fetch('/api/auth/session', {
            credentials: 'include',
          })
          if (response.ok) {
            apiResponse = await response.json()
          }
        } catch (error) {
          console.error('API error:', error)
        }

        setAuthInfo({
          sessionCookie: sessionCookie ? 'Present' : 'Missing',
          localStorageUser: localStorageUser ? JSON.parse(localStorageUser) : null,
          apiResponse,
        })
      } catch (error) {
        console.error('Debug error:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 animate-pulse text-primary" />
              <span className="text-lg">Checking auth status...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Authentication Debug
            </CardTitle>
            <CardDescription>
              Check your current authentication status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="font-medium">Session Cookie:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  authInfo?.sessionCookie === 'Present' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {authInfo?.sessionCookie || 'Missing'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="font-medium">Local Storage User:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  authInfo?.localStorageUser 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {authInfo?.localStorageUser ? 'Present' : 'Missing'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="font-medium">API Session:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  authInfo?.apiResponse 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {authInfo?.apiResponse ? 'Valid' : 'Invalid/Missing'}
                </span>
              </div>
            </div>

            {authInfo?.localStorageUser && (
              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">User Info (from localStorage):</h4>
                <pre className="text-xs text-blue-700 whitespace-pre-wrap">
                  {JSON.stringify(authInfo.localStorageUser, null, 2)}
                </pre>
              </div>
            )}

            {authInfo?.apiResponse && (
              <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
                <h4 className="font-medium text-green-800 mb-2">User Info (from API):</h4>
                <pre className="text-xs text-green-700 whitespace-pre-wrap">
                  {JSON.stringify(authInfo.apiResponse, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={() => window.location.href = '/auth/login'}>
                Go to Login
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/admin/dashboard'}
              >
                Try Admin Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/collector/dashboard'}
              >
                Try Collector Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
