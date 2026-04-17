import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'OptiChatBot — IA para Negocios Ópticos',
  description: 'Plataforma SaaS de chatbot con IA especializada para ópticas, clínicas oftalmológicas y distribuidoras.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
