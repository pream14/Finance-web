import OrgBadge from '@/components/org-badge'

export default function CollectionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed bottom-4 left-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <OrgBadge />
      </div>
      {children}
    </>
  )
}
