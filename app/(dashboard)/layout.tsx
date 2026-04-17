import Link from 'next/link'
import { OjitoAvatar } from '@/components/chat/OjitoAvatar'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Dashboard',     icon: '📊' },
  { href: '/chatbot',      label: 'Chatbot',        icon: '🤖' },
  { href: '/products',     label: 'Productos',      icon: '👓' },
  { href: '/flows',        label: 'Flujos',         icon: '🔀' },
  { href: '/channels',     label: 'Canales',        icon: '📱' },
  { href: '/settings',     label: 'Configuración',  icon: '⚙️' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
          <OjitoAvatar size={32} />
          <span className="font-bold text-blue-700 text-base">OptiChatBot</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-all text-sm font-medium group"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Plan badge */}
        <div className="p-4 border-t border-gray-100">
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-xs text-blue-700 font-semibold mb-1">Plan Pro</p>
            <p className="text-xs text-blue-500">Widget + WhatsApp + Shopify</p>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
