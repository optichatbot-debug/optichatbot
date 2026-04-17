'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Zap,
  Bot,
  MessageSquare,
  Settings,
  HelpCircle,
  UserCircle,
  ChevronDown,
  Wand2,
  ShoppingBag,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',      label: 'Inicio',             Icon: LayoutDashboard },
  { href: '/contactos',      label: 'Contactos',          Icon: Users           },
  { href: '/automatizacion', label: 'Automatización',     Icon: Zap             },
  { href: '/productos',      label: 'Productos',          Icon: ShoppingBag     },
  { href: '/ia',             label: 'Asistente IA',       Icon: Bot             },
  { href: '/bandeja',        label: 'Bandeja de entrada', Icon: MessageSquare   },
  { href: '/landing',        label: 'Landing IA',         Icon: Wand2           },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f5]">
      {/* ── Sidebar oscuro estilo ManyChat ── */}
      <aside className="w-56 bg-[#1a1f36] flex flex-col flex-shrink-0">

        {/* Logo / negocio */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-white/10">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Bot size={15} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-[13px] leading-tight truncate">
              OptiChatBot
            </p>
            <p className="text-white/40 text-[11px]">Plan Pro</p>
          </div>
          <ChevronDown size={13} className="text-white/30 flex-shrink-0" />
        </div>

        {/* Nav principal */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                active(href)
                  ? 'bg-blue-500/20 text-white'
                  : 'text-white/55 hover:bg-white/5 hover:text-white/85'
              }`}
            >
              <Icon
                size={16}
                className={active(href) ? 'text-blue-400' : 'text-white/40'}
              />
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="px-2 pb-3 pt-2 border-t border-white/10 space-y-0.5">
          <Link
            href="/configuracion"
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
              active('/configuracion')
                ? 'bg-blue-500/20 text-white'
                : 'text-white/55 hover:bg-white/5 hover:text-white/85'
            }`}
          >
            <Settings
              size={16}
              className={active('/configuracion') ? 'text-blue-400' : 'text-white/40'}
            />
            Configuración
          </Link>

          <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/55 hover:bg-white/5 hover:text-white/85 transition-all">
            <HelpCircle size={16} className="text-white/40" />
            Ayuda
          </button>

          <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/55 hover:bg-white/5 hover:text-white/85 transition-all">
            <UserCircle size={16} className="text-white/40" />
            Mi perfil
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
