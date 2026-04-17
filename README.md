# 🤖 OptiChatBot

**SaaS de IA Chatbot para Negocios Ópticos**

Widget de chatbot inteligente especializado en óptica. Conecta con WhatsApp, web y Shopify. Powered by Claude AI (Anthropic).

---

## 🚀 Stack

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS
- **IA:** Claude API (Anthropic) — `claude-sonnet-4-5`
- **Base de datos:** Supabase (PostgreSQL + pgvector + RLS)
- **Deploy:** Vercel
- **WhatsApp:** Meta Cloud API (WhatsApp Business)
- **Pagos:** Stripe (Fase 6)

---

## ⚙️ Setup Local

### 1. Clonar y instalar
```bash
git clone https://github.com/optichatbot-debug/optichatbot.git
cd optichatbot
npm install
```

### 2. Variables de entorno
```bash
cp .env.local.example .env.local
# Edita .env.local con tus keys reales
```

### 3. Base de datos Supabase
En el SQL Editor de Supabase, ejecuta:
```
supabase/migrations/001_schema.sql
```

### 4. Correr en desarrollo
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## 📁 Estructura

```
optichatbot/
├── app/
│   ├── api/chat/          → Motor del chatbot (Claude API)
│   ├── api/whatsapp/      → Webhook WhatsApp Business
│   ├── api/products/      → CRUD catálogo
│   ├── (dashboard)/       → Panel de negocios
│   └── widget/[token]/    → Página del widget embebible
├── components/chat/       → ChatWidget + OjitoAvatar
├── lib/                   → Supabase, Claude, WhatsApp helpers
├── public/widget.js       → Script embebible (1 línea)
└── supabase/migrations/   → SQL migrations
```

---

## 🔗 Instalar en cualquier web

```html
<script src="https://optichatbot.vercel.app/widget.js" data-token="TU_TOKEN"></script>
```

### En Shopify (theme.liquid):
Pegar antes de `</body>` en `Themes → Edit code → theme.liquid`

---

## 🤖 Avatar: Ojito

Ojito es el asistente virtual de OptiChatBot. Robot amigable con lentes oftálmicos.
- **Nombre:** Configurable por cada negocio
- **Tonos:** Amigable 😊 | Formal 👔 | Técnico 🔬
- **Colores:** Personalizables por tenant

---

## 📋 Fases de desarrollo

| Fase | Estado | Descripción |
|------|--------|-------------|
| 1    | ✅ Activa | Widget + IA Real + WhatsApp |
| 2    | 🔜 | Dashboard completo |
| 3    | 🔜 | Catálogo Shopify + PDF |
| 4    | 🔜 | Flujos tipo ManyChat |
| 5    | 🔜 | Generador Landing con IA |
| 6    | 🔜 | Planes y Pagos SaaS (Stripe) |

---

## 🔑 Variables de entorno requeridas

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
SHOPIFY_STORE_URL=
SHOPIFY_ACCESS_TOKEN=
NEXT_PUBLIC_APP_URL=
```

---

Desarrollado por **Yerico** con **Claude AI (Anthropic)** 🚀
