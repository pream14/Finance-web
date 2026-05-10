'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Building2 } from 'lucide-react'
import { authApi, getSelectedOrg, setSelectedOrg } from '@/lib/api'

interface Organization {
  id: number
  name: string
  code: string
}

/**
 * OrgSelector — appears in the header when a user belongs to 2+ organizations.
 * Automatically sets the selected org in localStorage and triggers page refresh
 * so all API calls use the new org filter.
 *
 * Single-org users don't see this component at all.
 */
export default function OrgSelector() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [selectedValue, setSelectedValue] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const user = await authApi.getCurrentUser()
        if (!user || !user.organizations) {
          setLoading(false)
          return
        }

        const userOrgs: Organization[] = user.organizations
        setOrgs(userOrgs)

        // Determine initial selection
        const stored = getSelectedOrg()
        if (stored && (stored === 'all' || userOrgs.some(o => o.id.toString() === stored))) {
          setSelectedValue(stored)
        } else if (userOrgs.length === 1) {
          // Single org — auto-select and hide
          setSelectedOrg(userOrgs[0].id.toString())
          setSelectedValue(userOrgs[0].id.toString())
        } else if (userOrgs.length > 1) {
          // Multi-org — default to 'all'
          setSelectedOrg('all')
          setSelectedValue('all')
        }
      } catch (err) {
        console.error('Failed to fetch organizations:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrgs()
  }, [])

  const handleChange = (value: string) => {
    setSelectedValue(value)
    setSelectedOrg(value)
    // Reload the page so all data re-fetches with the new org
    window.location.reload()
  }

  // Don't render if loading, no orgs, or single org
  if (loading || orgs.length <= 1) return null

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <Select value={selectedValue} onValueChange={handleChange}>
        <SelectTrigger className="min-w-[120px] max-w-[160px] sm:max-w-[220px] h-8 text-xs sm:text-sm border-primary/30 bg-primary/5 overflow-hidden">
          <span className="truncate block text-left"><SelectValue placeholder="Select org..." /></span>
        </SelectTrigger>
        <SelectContent className="max-w-[280px] sm:max-w-[350px]">
          <SelectItem value="all">
            <span className="font-semibold">All Organizations</span>
          </SelectItem>
          {orgs.map(org => (
            <SelectItem key={org.id} value={org.id.toString()}>
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                <span className="truncate">{org.name}</span>
                <span className="text-muted-foreground text-xs flex-shrink-0">({org.code})</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
