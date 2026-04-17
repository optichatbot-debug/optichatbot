'use client'

import { useState, useRef, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { OjitoAvatar } from './OjitoAvatar'
import { Send, X, Minimize2, MessageCircle, ChevronDown } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatWidgetProps {
  tenantToken: string
  avatarName?: string
  businessName?: string
  primaryColor?: string
  tone?: 'amigable' | 'formal' | 'tecnico'
  apiUrl?: string
}

type ToneOption = 'amigable' | 'formal' | 'tecnico'

const TONE_LABELS: Record<ToneOption, string> = {
  amigable: '😊 Amigable',
  formal: '👔 Formal',
  tecnico: '🔬 Técnico',
}

export function ChatWidget({
  tenantToken,
  avatarName = 'Ojito',
  businessName = 'OptiChatBot',
  primaryColor = '#2563EB',
  tone: initialTone = 'amigable',
  apiUrl = '/api/chat',
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => uuidv4())
  const [tone, setTone] = useState<ToneOption>(initialTone)
  const [showToneSelector, setShowToneSelector] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Mensaje de bienvenida inicial
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomes: Record<ToneOption, string> = {
        amigable: `¡Hola! 😊 Soy ${avatarName}, tu asistente óptico de ${businessName}. ¿En qué puedo ayudarte hoy? Puedo recomendarte lentes, ayudarte con tu medida óptica o mostrarte nuestros productos.`,
        formal: `Buenos días. Soy ${avatarName}, el asistente virtual de ${businessName}. ¿En qué puedo orientarle?`,
        tecnico: `Hola. Soy ${avatarName} de ${businessName}. Indique su consulta: productos, Rx, cotización de tratamientos o información técnica.`,
      }
      setMessages([{
        id: uuidv4(),
        role: 'assistant',
        content: welcomes[tone],
        timestamp: new Date(),
      }])
    }
  }, [isOpen])

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus en input al abrir
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMinimized])

  async function sendMessage() {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setShowWelcome(false)

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          session_id: sessionId,
          tenant_token: tenantToken,
          tone_override: tone,
        }),
      })

      const data = await res.json()

      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: data.reply || 'Lo siento, no pude procesar tu mensaje.',
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: uuidv4(),
        role: 'assistant',
        content: 'Lo siento, hubo un problema de conexión. ¿Puedes intentarlo de nuevo?',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function changeTone(newTone: ToneOption) {
    setTone(newTone)
    setShowToneSelector(false)
    // Mensaje del bot informando el cambio
    setMessages(prev => [...prev, {
      id: uuidv4(),
      role: 'assistant',
      content: {
        amigable: '¡Genial! 😊 Ahora te atiendo en modo amigable. ¿En qué te puedo ayudar?',
        formal: 'Con gusto. Continuamos en modo formal. ¿En qué puedo asistirle?',
        tecnico: 'Entendido. Modo técnico activado. Proceda con su consulta.',
      }[newTone],
      timestamp: new Date(),
    }])
  }

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Bubble de apertura */}
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{ background: primaryColor }}
        >
          <div className="flex items-center gap-2 px-4 py-3">
            <OjitoAvatar size={32} animated />
            <span className="text-white font-semibold text-sm pr-1">
              {avatarName}
            </span>
          </div>
          {/* Indicador online */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col" style={{ width: '380px' }}>
      {/* Ventana del chat */}
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-100"
        style={{ height: isMinimized ? 'auto' : '560px' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 text-white"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, #38BDF8)` }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <OjitoAvatar size={38} />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400 border-2 border-white"></span>
              </span>
            </div>
            <div>
              <div className="font-bold text-sm">{avatarName}</div>
              <div className="text-xs text-blue-100">{businessName} · En línea</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Selector de tono */}
            <div className="relative">
              <button
                onClick={() => setShowToneSelector(!showToneSelector)}
                className="text-xs bg-white/20 hover:bg-white/30 rounded-full px-2 py-1 transition-colors flex items-center gap-1"
              >
                {TONE_LABELS[tone].split(' ')[0]}
                <ChevronDown size={10} />
              </button>
              {showToneSelector && (
                <div className="absolute top-8 right-0 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10 min-w-32">
                  {(Object.entries(TONE_LABELS) as [ToneOption, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => changeTone(key)}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                        tone === key ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Minimize2 size={14} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 animate-slide-up ${
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 mt-1">
                      <OjitoAvatar size={28} />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100'
                    }`}
                    style={msg.role === 'user' ? { background: primaryColor } : {}}
                  >
                    {msg.content}
                    <div className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {/* Indicador de escritura */}
              {isLoading && (
                <div className="flex gap-2 animate-fade-in">
                  <OjitoAvatar size={28} />
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Sugerencias rápidas (primera vez) */}
            {showWelcome && messages.length <= 1 && (
              <div className="px-4 py-2 bg-white border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Preguntas frecuentes:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '👓 Ver lentes ópticos',
                    '🕶️ Lentes de sol',
                    '📋 Tengo mi receta',
                    '💰 Ver precios',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion.split(' ').slice(1).join(' '))
                        setShowWelcome(false)
                        inputRef.current?.focus()
                      }}
                      className="text-xs bg-blue-50 text-blue-700 rounded-full px-2.5 py-1 hover:bg-blue-100 transition-colors border border-blue-200"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 bg-white border-t border-gray-100">
              <div className="flex items-end gap-2 bg-gray-50 rounded-xl border border-gray-200 px-3 py-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-200 transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    tone === 'amigable' ? '¿En qué te puedo ayudar? 😊' :
                    tone === 'formal' ? '¿En qué puedo asistirle?' :
                    'Ingrese su consulta técnica...'
                  }
                  rows={1}
                  className="flex-1 bg-transparent resize-none outline-none text-sm text-gray-800 placeholder-gray-400 max-h-24"
                  style={{ lineHeight: '1.5' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="flex-shrink-0 p-1.5 rounded-lg text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ background: primaryColor }}
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-center text-xs text-gray-400 mt-1.5">
                Powered by <span className="font-semibold text-blue-500">OptiChatBot</span>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
