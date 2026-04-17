import { ChatWidget } from '@/components/chat/ChatWidget'
import { getTenantByToken } from '@/lib/supabase'

interface Props {
  params: { token: string }
  searchParams: { tone?: string }
}

export default async function WidgetPage({ params, searchParams }: Props) {
  const tenant = await getTenantByToken(params.token)

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 text-sm">Widget no encontrado</p>
        </div>
      </div>
    )
  }

  return (
    <html>
      <body className="bg-transparent">
        <ChatWidget
          tenantToken={params.token}
          avatarName={tenant.avatar_name || 'Ojito'}
          businessName={tenant.name}
          primaryColor={tenant.config?.primary_color || '#2563EB'}
          tone={(searchParams.tone as any) || tenant.tone || 'amigable'}
          apiUrl={`${process.env.NEXT_PUBLIC_APP_URL}/api/chat`}
        />
      </body>
    </html>
  )
}
