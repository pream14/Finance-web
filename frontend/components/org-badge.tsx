'use client'

import { useState, useEffect } from 'react'
import { Building2, Globe } from 'lucide-react'
import { authApi, getSelectedOrg } from '@/lib/api'

interface Organization {
  id: number
  name: string
  code: string
}

/**
 * OrgBadge — A persistent, beautiful indicator that shows which organization
 * is currently selected. Visible on ALL admin pages. Responds to org-changed
 * events from OrgSelector.
 */
export default function OrgBadge() {
  const [orgName, setOrgName] = useState<string>('')
  const [isAll, setIsAll] = useState(false)
  const [loading, setLoading] = useState(true)

  const resolveOrgName = async () => {
    try {
      const user = await authApi.getCurrentUser()
      if (!user?.organizations) {
        setLoading(false)
        return
      }

      const userOrgs: Organization[] = user.organizations
      const selected = getSelectedOrg()

      if (!selected || selected === 'all') {
        if (userOrgs.length === 1) {
          setOrgName(userOrgs[0].name)
          setIsAll(false)
        } else {
          setOrgName('All Organizations')
          setIsAll(true)
        }
      } else {
        const org = userOrgs.find(o => o.id.toString() === selected)
        if (org) {
          setOrgName(org.name)
          setIsAll(false)
        } else {
          setOrgName('Unknown')
          setIsAll(false)
        }
      }
    } catch {
      setOrgName('')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    resolveOrgName()

    // Listen for org changes from OrgSelector
    const handleOrgChange = () => resolveOrgName()
    window.addEventListener('org-changed', handleOrgChange)
    return () => window.removeEventListener('org-changed', handleOrgChange)
  }, [])

  if (loading || !orgName) return null

  return (
    <div className="org-badge flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/8 border border-primary/15 text-xs sm:text-sm font-medium text-primary transition-all hover:bg-primary/12">
      {isAll ? (
        <Globe className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 opacity-70" />
      ) : (
        <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 opacity-70" />
      )}
      <span className="truncate max-w-[120px] sm:max-w-[200px]">{orgName}</span>
    </div>
  )
}
