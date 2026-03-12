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
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is logged in
        const sessionToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('session='))
          ?.split('=')[1]

        if (!sessionToken) {
          router.push('/auth/login')
          return
        }

        // Get user session
        const response = await fetch('/api/auth/session', {
          headers: {
            'Cookie': `session=${sessionToken}`
          }
        })

        if (!response.ok) {
          router.push('/auth/login')
          return
        }

        const data = await response.json()
        
        // Check if user is admin
        if (data.user?.role !== 'admin') {
          setIsAuthorized(false)
          return
        }

        setIsAuthorized(true)
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
