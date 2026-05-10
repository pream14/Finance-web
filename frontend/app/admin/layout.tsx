import OrgBadge from '@/components/org-badge'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Persistent org indicator — shown on every admin page */}
      <div className="fixed bottom-4 left-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <OrgBadge />
      </div>
      {children}
    </>
  )
}
