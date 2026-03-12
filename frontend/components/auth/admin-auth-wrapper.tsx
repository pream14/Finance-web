'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Shield } from 'lucide-react'

interface AdminAuthWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AdminAuthWrapper({ children, fallback }: AdminAuthWrapperProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check if we have a session cookie
        const sessionCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('session='))
          ?.split('=')[1]

        if (!sessionCookie) {
          console.log('No session cookie found')
          router.push('/auth/login')
          return
        }

        // Try to get user info from session API
        try {
          const response = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'include', // Important for cookies
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            console.log('Session API response not ok:', response.status)
            // Try to get user info from localStorage as fallback
            const userInfo = localStorage.getItem('user')
            if (userInfo) {
              const user = JSON.parse(userInfo)
              if (user.role === 'admin') {
                setIsAuthorized(true)
                setUserRole(user.role)
                return
              }
            }
            router.push('/auth/login')
            return
          }

          const data = await response.json()
          console.log('Session API response:', data)
          
          if (data.user?.role === 'admin') {
            setIsAuthorized(true)
            setUserRole(data.user.role)
            // Store user info in localStorage as backup
            localStorage.setItem('user', JSON.stringify(data.user))
          } else {
            console.log('User is not admin, role:', data.user?.role)
            setIsAuthorized(false)
            setUserRole(data.user?.role || 'unknown')
          }
        } catch (apiError) {
          console.error('Session API error:', apiError)
          // Fallback to localStorage
          const userInfo = localStorage.getItem('user')
          if (userInfo) {
            const user = JSON.parse(userInfo)
            console.log('Fallback to localStorage, user role:', user.role)
            if (user.role === 'admin') {
              setIsAuthorized(true)
              setUserRole(user.role)
              return
            }
          }
          router.push('/auth/login')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/auth/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 animate-pulse text-primary" />
              <span className="text-lg">Verifying admin access...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-96 border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this admin area.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              This area is restricted to administrators only.
              {userRole && (
                <div className="mt-2">
                  Your role: <span className="font-medium">{userRole}</span>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => router.push('/collector/dashboard')} 
                className="w-full"
              >
                Go to Collector Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/auth/login')}
                className="w-full"
              >
                Login as Different User
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

// Higher-order component for page protection
export function withAdminAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AdminProtectedComponent(props: P) {
    return (
      <AdminAuthWrapper>
        <Component {...props} />
      </AdminAuthWrapper>
    )
  }
}
