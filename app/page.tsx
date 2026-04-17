import Link from 'next/link'
import { OjitoAvatar } from '@/components/chat/OjitoAvatar'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-sky-50">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-blue-100 bg-white/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <OjitoAvatar size={36} />
          <span className="font-bold text-xl text-blue-700">OptiChatBot</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors">
            Iniciar sesión
          </Link>
          <Link
            href="/login"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-16">
        <div className="flex justify-center mb-6">
          <OjitoAvatar size={100} animated />
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
          El chatbot con IA para<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-sky-400">
            tu óptica o clínica
          </span>
        </h1>
        <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto">
          Vende lentes 24/7, recoge prescripciones, recomienda productos y cierra ventas.
          Conecta con WhatsApp, web y Shopify en minutos.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-lg shadow-blue-200"
          >
            Crear cuenta gratis
          </Link>
          <a
            href="/widget/demo-token-tyler-max-2026"
            className="bg-white text-blue-600 border-2 border-blue-200 px-8 py-3.5 rounded-xl font-semibold text-lg hover:border-blue-400 transition-all"
          >
            Ver demo en vivo
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-20 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { icon: '💬', title: 'WhatsApp + Web', desc: 'Conecta con tus clientes donde están. Widget web y WhatsApp Business API incluidos.' },
          { icon: '👓', title: 'Experto en óptica', desc: 'Ojito conoce prescripciones, tipos de armazón, tratamientos y recomendaciones por tipo de cara.' },
          { icon: '🛍️', title: 'Cierra ventas', desc: 'Conecta tu catálogo Shopify o carga productos manualmente. El bot vende por ti.' },
          { icon: '📋', title: 'Recoge recetas', desc: 'Solicita y valida Rx: OD, OI, esfera, cilindro, eje y adición de forma conversacional.' },
          { icon: '🔀', title: 'Flujos ManyChat', desc: 'Crea flujos de respuesta encadenados por palabras clave. Sin código.' },
          { icon: '📊', title: 'Dashboard completo', desc: 'Ve conversaciones, métricas, productos más recomendados y ventas en tiempo real.' },
        ].map((f, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-gray-900 mb-1">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 text-center text-gray-400 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <OjitoAvatar size={20} />
          <span className="font-semibold text-blue-600">OptiChatBot</span>
        </div>
        © 2026 OptiChatBot · Powered by Claude AI (Anthropic)
      </footer>
    </main>
  )
}
