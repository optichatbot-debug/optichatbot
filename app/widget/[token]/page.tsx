import { ChatWidget } from '@/components/chat/ChatWidget'
import { getTenantByToken } from '@/lib/supabase'

export default async function WidgetPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ tone?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearch = await searchParams
  const tenant = await getTenantByToken(resolvedParams.token)

  if (!tenant) {
    return (
      <html>
        <body>
          <p style={{ color: '#9ca3af', fontSize: '14px' }}>Widget no encontrado</p>
        </body>
      </html>
    )
  }

  return (
    <html>
      <body className="bg-transparent">
        <ChatWidget
          tenantToken={resolvedParams.token}
          avatarName={tenant.avatar_name || 'Ojito'}
          businessName={tenant.name}
          primaryColor={tenant.config?.primary_color || '#2563EB'}
          tone={(resolvedSearch.tone as any) || tenant.tone || 'amigable'}
          apiUrl={`${process.env.NEXT_PUBLIC_APP_URL}/api/chat`}
        />
      </body>
    </html>
  )
}