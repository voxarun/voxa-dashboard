import Sidebar from '@/components/ui/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Ambient background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background: `
            radial-gradient(ellipse 800px 500px at 20% 20%, rgba(45,124,246,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 600px 400px at 80% 80%, rgba(124,58,237,0.05) 0%, transparent 60%),
            radial-gradient(ellipse 400px 300px at 60% 10%, rgba(0,212,255,0.04) 0%, transparent 50%)
          `,
        }}
      />

      <Sidebar />

      <main className="flex-1 relative z-10" style={{ marginLeft: 240 }}>
        {children}
      </main>
    </div>
  )
}
