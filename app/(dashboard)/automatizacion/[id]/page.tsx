'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Check, Eye, Loader2,
  MessageSquare, ImageIcon, MousePointerClick, List,
  Bot, GitBranch, Shuffle, Clock, Tag, Bell,
  X, Trash2, ToggleLeft, ToggleRight, ChevronRight,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type NodeType =
  | 'whatsapp_message' | 'image' | 'buttons' | 'list'
  | 'ai_step'
  | 'condition' | 'random' | 'smart_wait'
  | 'tag_contact' | 'notify_team'

interface FlowNode {
  id: string
  type: NodeType
  x: number
  y: number
  // whatsapp_message
  message?: string
  buttons?: string[]
  // image
  image_url?: string
  // list
  list_items?: string[]
  // ai_step
  ai_instructions?: string
  // condition
  condition_text?: string
  yes_id?: string
  no_id?: string
  // tag
  tag?: string
  // wait
  wait_hours?: number
  // notify
  notification_text?: string
  // default next
  next_id?: string
}

interface Connection {
  from: string
  to: string
  port: 'default' | 'yes' | 'no'
}

// ─── Node meta ────────────────────────────────────────────────────────────────

const META: Record<NodeType, { label: string; Icon: React.ElementType; bg: string; group: string }> = {
  whatsapp_message: { label: 'Mensaje WhatsApp',   Icon: MessageSquare,     bg: '#25D366', group: 'Contenido' },
  image:            { label: 'Imagen',             Icon: ImageIcon,         bg: '#3B82F6', group: 'Contenido' },
  buttons:          { label: 'Botones',            Icon: MousePointerClick, bg: '#8B5CF6', group: 'Contenido' },
  list:             { label: 'Lista',              Icon: List,              bg: '#F59E0B', group: 'Contenido' },
  ai_step:          { label: 'Paso IA',            Icon: Bot,               bg: '#6366F1', group: 'IA'        },
  condition:        { label: 'Condición',          Icon: GitBranch,         bg: '#F97316', group: 'Lógica'    },
  random:           { label: 'Aleatorio',          Icon: Shuffle,           bg: '#EC4899', group: 'Lógica'    },
  smart_wait:       { label: 'Espera inteligente', Icon: Clock,             bg: '#14B8A6', group: 'Lógica'    },
  tag_contact:      { label: 'Etiquetar contacto', Icon: Tag,               bg: '#84CC16', group: 'Acciones'  },
  notify_team:      { label: 'Notificar equipo',   Icon: Bell,              bg: '#EF4444', group: 'Acciones'  },
}

const GROUPS = ['Contenido', 'IA', 'Lógica', 'Acciones']
const NODE_W = 220
const NODE_H = 84

function uid() { return Math.random().toString(36).slice(2, 9) }

function getPreview(n: FlowNode): string {
  switch (n.type) {
    case 'whatsapp_message': return n.message || ''
    case 'image':            return n.image_url ? '🖼 Imagen adjunta' : ''
    case 'buttons':          return n.buttons?.join(' · ') || ''
    case 'list':             return n.list_items?.join(', ') || ''
    case 'ai_step':          return n.ai_instructions || ''
    case 'condition':        return n.condition_text || ''
    case 'random':           return 'Rama aleatoria'
    case 'smart_wait':       return n.wait_hours ? `Espera ${n.wait_hours}h` : ''
    case 'tag_contact':      return n.tag ? `#${n.tag}` : ''
    case 'notify_team':      return n.notification_text || ''
    default:                 return ''
  }
}

// ─── NodeCard ─────────────────────────────────────────────────────────────────

function NodeCard({
  node,
  selected,
  connecting,
  onSelect,
  onStartConnect,
  onConnectTo,
  onDragStart,
}: {
  node: FlowNode
  selected: boolean
  connecting: string | null
  onSelect: () => void
  onStartConnect: (port: 'default' | 'yes' | 'no') => void
  onConnectTo: () => void
  onDragStart: (e: React.MouseEvent) => void
}) {
  const meta = META[node.type]
  const Icon = meta.Icon
  const prev = getPreview(node)
  const isCondition = node.type === 'condition'

  return (
    <div
      style={{ left: node.x, top: node.y, width: NODE_W, position: 'absolute' }}
      className={`select-none cursor-grab active:cursor-grabbing rounded-xl overflow-visible shadow-md transition-all ${
        selected
          ? 'ring-2 ring-blue-500 ring-offset-1 shadow-blue-200'
          : 'hover:shadow-lg'
      }`}
      onMouseDown={e => { e.stopPropagation(); onDragStart(e); onSelect() }}
    >
      {/* Input port */}
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onConnectTo() }}
        className={`absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 bg-white z-10 transition-colors ${
          connecting && connecting !== node.id
            ? 'border-blue-500 bg-blue-100 cursor-pointer'
            : 'border-gray-300'
        }`}
      />

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl"
        style={{ backgroundColor: meta.bg }}
      >
        <Icon size={13} className="text-white flex-shrink-0" />
        <span className="text-white text-xs font-semibold truncate">{meta.label}</span>
      </div>

      {/* Body */}
      <div className="bg-white rounded-b-xl px-3 py-2.5 min-h-[44px]">
        {prev ? (
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{prev}</p>
        ) : (
          <p className="text-xs text-gray-300 italic">Sin contenido…</p>
        )}
      </div>

      {/* Output ports */}
      {isCondition ? (
        <>
          <button
            onMouseDown={e => { e.stopPropagation(); onStartConnect('yes') }}
            onClick={e => e.stopPropagation()}
            title="Sí"
            className="absolute -right-3 top-[30%] -translate-y-1/2 w-5 h-5 rounded-full border-2 bg-white border-green-400 hover:bg-green-50 z-10 flex items-center justify-center"
          >
            <span className="text-[8px] font-bold text-green-500">Y</span>
          </button>
          <button
            onMouseDown={e => { e.stopPropagation(); onStartConnect('no') }}
            onClick={e => e.stopPropagation()}
            title="No"
            className="absolute -right-3 top-[65%] -translate-y-1/2 w-5 h-5 rounded-full border-2 bg-white border-red-400 hover:bg-red-50 z-10 flex items-center justify-center"
          >
            <span className="text-[8px] font-bold text-red-500">N</span>
          </button>
        </>
      ) : (
        <button
          onMouseDown={e => { e.stopPropagation(); onStartConnect('default') }}
          onClick={e => e.stopPropagation()}
          title="Conectar"
          className={`absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 bg-white z-10 transition-colors ${
            connecting === node.id
              ? 'border-blue-500 bg-blue-500'
              : 'border-gray-300 hover:border-blue-400'
          }`}
        />
      )}
    </div>
  )
}

// ─── Arrow ────────────────────────────────────────────────────────────────────

function Arrow({
  conn,
  nodes,
}: {
  conn: Connection
  nodes: FlowNode[]
}) {
  const from = nodes.find(n => n.id === conn.from)
  const to   = nodes.find(n => n.id === conn.to)
  if (!from || !to) return null

  let y1: number
  if (conn.port === 'yes')      y1 = from.y + NODE_H * 0.30
  else if (conn.port === 'no')  y1 = from.y + NODE_H * 0.65
  else                          y1 = from.y + NODE_H / 2

  const x1 = from.x + NODE_W
  const x2 = to.x
  const y2 = to.y + NODE_H / 2
  const cx = x1 + Math.max(40, (x2 - x1) * 0.5)

  const color =
    conn.port === 'yes' ? '#22C55E' :
    conn.port === 'no'  ? '#EF4444' :
    '#93C5FD'

  return (
    <g>
      <path
        d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth="2"
        markerEnd={`url(#arr-${conn.port})`}
      />
    </g>
  )
}

// ─── Left Sidebar (node editor) ───────────────────────────────────────────────

function NodeEditor({
  node,
  onChange,
  onDelete,
  onClose,
}: {
  node: FlowNode
  onChange: (updated: FlowNode) => void
  onDelete: () => void
  onClose: () => void
}) {
  const meta = META[node.type]
  const Icon = meta.Icon
  const [local, setLocal] = useState<FlowNode>(node)

  useEffect(() => { setLocal(node) }, [node.id])

  function commit(patch: Partial<FlowNode>) {
    const updated = { ...local, ...patch }
    setLocal(updated)
    onChange(updated)
  }

  return (
    <div className="w-72 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: meta.bg }}
        >
          <Icon size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{meta.label}</p>
          <p className="text-xs text-gray-400">Editor de paso</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">

        {/* Mensaje WhatsApp */}
        {local.type === 'whatsapp_message' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Mensaje
              </label>
              <textarea
                value={local.message ?? ''}
                onChange={e => commit({ message: e.target.value })}
                placeholder="Escribe el mensaje que enviará el bot…"
                rows={5}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                Usa {'{{nombre}}'} para insertar el nombre del contacto.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Botones rápidos (opcional)
              </label>
              {(local.buttons ?? []).map((b, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input
                    value={b}
                    onChange={e => {
                      const arr = [...(local.buttons ?? [])]
                      arr[i] = e.target.value
                      commit({ buttons: arr })
                    }}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder={`Botón ${i + 1}`}
                  />
                  <button
                    onClick={() => {
                      const arr = (local.buttons ?? []).filter((_, j) => j !== i)
                      commit({ buttons: arr })
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {(local.buttons ?? []).length < 3 && (
                <button
                  onClick={() => commit({ buttons: [...(local.buttons ?? []), ''] })}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Plus size={12} /> Agregar botón
                </button>
              )}
            </div>
          </>
        )}

        {/* Imagen */}
        {local.type === 'image' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              URL de la imagen
            </label>
            <input
              value={local.image_url ?? ''}
              onChange={e => commit({ image_url: e.target.value })}
              placeholder="https://ejemplo.com/imagen.jpg"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            {local.image_url && (
              <img
                src={local.image_url}
                alt="preview"
                className="mt-3 w-full rounded-lg object-cover max-h-32"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
          </div>
        )}

        {/* Botones */}
        {local.type === 'buttons' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Opciones de botón
            </label>
            {(local.buttons ?? ['']).map((b, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={b}
                  onChange={e => {
                    const arr = [...(local.buttons ?? [''])]
                    arr[i] = e.target.value
                    commit({ buttons: arr })
                  }}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder={`Opción ${i + 1}`}
                />
                <button
                  onClick={() => {
                    const arr = (local.buttons ?? []).filter((_, j) => j !== i)
                    commit({ buttons: arr })
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => commit({ buttons: [...(local.buttons ?? []), ''] })}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={12} /> Agregar opción
            </button>
          </div>
        )}

        {/* Lista */}
        {local.type === 'list' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Ítems de la lista
            </label>
            {(local.list_items ?? ['']).map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  value={item}
                  onChange={e => {
                    const arr = [...(local.list_items ?? [''])]
                    arr[i] = e.target.value
                    commit({ list_items: arr })
                  }}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  placeholder={`Ítem ${i + 1}`}
                />
                <button
                  onClick={() => {
                    const arr = (local.list_items ?? []).filter((_, j) => j !== i)
                    commit({ list_items: arr })
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button
              onClick={() => commit({ list_items: [...(local.list_items ?? []), ''] })}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={12} /> Agregar ítem
            </button>
          </div>
        )}

        {/* Paso IA */}
        {local.type === 'ai_step' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Instrucciones para la IA
            </label>
            <textarea
              value={local.ai_instructions ?? ''}
              onChange={e => commit({ ai_instructions: e.target.value })}
              placeholder="Ej: Responde al usuario sobre precios de lentes de contacto de forma amigable. Si pregunta por descuentos menciona el 10% para primera compra."
              rows={6}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">
              Claude procesará el mensaje del usuario con estas instrucciones.
            </p>
          </div>
        )}

        {/* Condición */}
        {local.type === 'condition' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Condición
            </label>
            <textarea
              value={local.condition_text ?? ''}
              onChange={e => commit({ condition_text: e.target.value })}
              placeholder="Ej: El mensaje contiene 'precio' o 'costo'"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-gray-600">Sí — conecta la rama verde</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-gray-600">No — conecta la rama roja</span>
              </div>
            </div>
          </div>
        )}

        {/* Aleatorio */}
        {local.type === 'random' && (
          <div className="bg-pink-50 rounded-xl p-4 text-sm text-pink-700">
            Este paso elige aleatoriamente uno de los nodos conectados a su salida.
          </div>
        )}

        {/* Espera inteligente */}
        {local.type === 'smart_wait' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Esperar (horas)
            </label>
            <input
              type="number"
              min={1}
              max={168}
              value={local.wait_hours ?? 1}
              onChange={e => commit({ wait_hours: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
            <p className="text-xs text-gray-400 mt-1">El flujo esperará este tiempo antes de continuar.</p>
          </div>
        )}

        {/* Etiquetar contacto */}
        {local.type === 'tag_contact' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Etiqueta
            </label>
            <input
              value={local.tag ?? ''}
              onChange={e => commit({ tag: e.target.value })}
              placeholder="ej: cliente-potencial"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            />
          </div>
        )}

        {/* Notificar equipo */}
        {local.type === 'notify_team' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Mensaje de notificación
            </label>
            <textarea
              value={local.notification_text ?? ''}
              onChange={e => commit({ notification_text: e.target.value })}
              placeholder="Nuevo lead interesado en lentes progresivos"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
          </div>
        )}
      </div>

      {/* Delete */}
      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 border border-red-200 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Trash2 size={14} />
          Eliminar paso
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FlowEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [flowName, setFlowName]     = useState('Nuevo flujo')
  const [keywords, setKeywords]     = useState('')
  const [isLive, setIsLive]         = useState(false)
  const [nodes, setNodes]           = useState<FlowNode[]>([])
  const [conns, setConns]           = useState<Connection[]>([])
  const [selected, setSelected]     = useState<string | null>(null)
  const [connecting, setConnecting] = useState<{ from: string; port: 'default' | 'yes' | 'no' } | null>(null)
  const [dragging, setDragging]     = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [loading, setLoading]       = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load ──
  useEffect(() => {
    if (!id) return
    fetch(`/api/flows/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.flow) {
          const flow = data.flow
          setFlowName(flow.name ?? 'Nuevo flujo')
          setKeywords((flow.trigger_keywords ?? []).join(', '))
          setIsLive(flow.active ?? false)
          const steps: FlowNode[] = (flow.steps ?? []).map((s: FlowNode, i: number) => ({
            ...s,
            x: s.x ?? 100 + i * 280,
            y: s.y ?? 120,
          }))
          setNodes(steps)
          // rebuild connections
          const rebuilt: Connection[] = []
          for (const s of steps) {
            if (s.next_id) rebuilt.push({ from: s.id, to: s.next_id, port: 'default' })
            if (s.yes_id)  rebuilt.push({ from: s.id, to: s.yes_id,  port: 'yes'     })
            if (s.no_id)   rebuilt.push({ from: s.id, to: s.no_id,   port: 'no'      })
          }
          setConns(rebuilt)
        }
        setLoading(false)
      })
  }, [id])

  // ── Auto-save (debounced 1.2s) ──
  const schedSave = useCallback((
    n: FlowNode[], c: Connection[], name: string, kw: string, live: boolean
  ) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('saving')
    saveTimer.current = setTimeout(async () => {
      const kws = kw.split(',').map(k => k.trim()).filter(Boolean)
      await fetch(`/api/flows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, trigger_keywords: kws, steps: n, active: live }),
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 1200)
  }, [id])

  function mutateNodes(fn: (prev: FlowNode[]) => FlowNode[], newConns?: Connection[]) {
    setNodes(prev => {
      const next = fn(prev)
      schedSave(next, newConns ?? conns, flowName, keywords, isLive)
      return next
    })
    if (newConns !== undefined) setConns(newConns)
  }

  // ── Dragging ──
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left + canvasRef.current.scrollLeft - dragging.ox
    const y = e.clientY - rect.top  + canvasRef.current.scrollTop  - dragging.oy
    setNodes(prev => prev.map(n => n.id === dragging.id ? { ...n, x: Math.max(0, x), y: Math.max(0, y) } : n))
  }, [dragging])

  const handleMouseUp = useCallback(() => {
    if (dragging) {
      setNodes(prev => {
        schedSave(prev, conns, flowName, keywords, isLive)
        return prev
      })
    }
    setDragging(null)
  }, [dragging, conns, flowName, keywords, isLive, schedSave])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // ── Add node ──
  function addNode(type: NodeType) {
    const newNode: FlowNode = {
      id: uid(), type,
      x: 80 + (nodes.length % 4) * 260,
      y: 80 + Math.floor(nodes.length / 4) * 160,
    }
    mutateNodes(prev => [...prev, newNode])
    setSelected(newNode.id)
    setShowAddMenu(false)
  }

  // ── Connect ──
  function startConnect(fromId: string, port: 'default' | 'yes' | 'no') {
    setConnecting({ from: fromId, port })
  }

  function connectTo(toId: string) {
    if (!connecting || connecting.from === toId) { setConnecting(null); return }
    // Remove old connection from same source+port
    const filtered = conns.filter(
      c => !(c.from === connecting.from && c.port === connecting.port)
    )
    const newConns = [...filtered, { from: connecting.from, to: toId, port: connecting.port }]
    setConns(newConns)
    // Update node's pointer field
    const ptrKey = connecting.port === 'default' ? 'next_id' :
                   connecting.port === 'yes' ? 'yes_id' : 'no_id'
    mutateNodes(
      prev => prev.map(n => n.id === connecting.from ? { ...n, [ptrKey]: toId } : n),
      newConns
    )
    setConnecting(null)
  }

  // ── Delete node ──
  function deleteNode(nodeId: string) {
    const newConns = conns.filter(c => c.from !== nodeId && c.to !== nodeId)
    mutateNodes(prev => prev.filter(n => n.id !== nodeId), newConns)
    if (selected === nodeId) setSelected(null)
  }

  // ── Update node from editor ──
  function updateNode(updated: FlowNode) {
    mutateNodes(prev => prev.map(n => n.id === updated.id ? updated : n))
  }

  const selectedNode = nodes.find(n => n.id === selected) ?? null

  const canvasW = Math.max(900, ...nodes.map(n => n.x + NODE_W + 120))
  const canvasH = Math.max(600, ...nodes.map(n => n.y + NODE_H + 120))

  return (
    <div className="flex flex-col h-screen bg-[#f4f5f7]">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-4 flex-shrink-0 z-20">
        <button
          onClick={() => router.push('/automatizacion')}
          className="text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <input
          value={flowName}
          onChange={e => { setFlowName(e.target.value); schedSave(nodes, conns, e.target.value, keywords, isLive) }}
          className="font-bold text-gray-900 text-sm bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 transition-colors min-w-[120px]"
        />

        {/* Keywords */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Keywords:</span>
          <input
            value={keywords}
            onChange={e => { setKeywords(e.target.value); schedSave(nodes, conns, flowName, e.target.value, isLive) }}
            placeholder="precio, citas, lentes…"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-40 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex-1" />

        {/* Save status */}
        <span className={`text-xs font-medium transition-all ${
          saveStatus === 'saving' ? 'text-gray-400' :
          saveStatus === 'saved'  ? 'text-green-500' :
          'text-transparent'
        }`}>
          {saveStatus === 'saving' ? 'Guardando…' :
           saveStatus === 'saved'  ? '✓ Guardado' : '·'}
        </span>

        {/* Preview */}
        <button className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50">
          <Eye size={13} />
          Vista previa
        </button>

        {/* Set Live toggle */}
        <button
          onClick={() => {
            const next = !isLive
            setIsLive(next)
            schedSave(nodes, conns, flowName, keywords, next)
          }}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            isLive
              ? 'bg-green-500 border-green-600 text-white'
              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {isLive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
          {isLive ? 'Activo' : 'Set Live'}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left sidebar — node editor */}
        {selectedNode && (
          <NodeEditor
            key={selectedNode.id}
            node={selectedNode}
            onChange={updateNode}
            onDelete={() => deleteNode(selectedNode.id)}
            onClose={() => setSelected(null)}
          />
        )}

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-auto relative"
          style={{
            backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
          onClick={() => { setSelected(null); setConnecting(null); setShowAddMenu(false) }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={28} className="animate-spin text-blue-400" />
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none">
              <div className="w-16 h-16 rounded-2xl bg-white/80 shadow flex items-center justify-center mb-3">
                <Plus size={28} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Canvas vacío</p>
              <p className="text-xs mt-1 text-gray-400">Haz clic en + para agregar el primer paso</p>
            </div>
          ) : (
            <div style={{ width: canvasW, height: canvasH, position: 'relative' }}>
              {/* SVG layer */}
              <svg
                style={{ position: 'absolute', inset: 0, width: canvasW, height: canvasH, pointerEvents: 'none' }}
              >
                <defs>
                  {(['default', 'yes', 'no'] as const).map(port => (
                    <marker
                      key={port}
                      id={`arr-${port}`}
                      markerWidth="8" markerHeight="8"
                      refX="6" refY="3"
                      orient="auto"
                    >
                      <path
                        d="M0,0 L0,6 L8,3 z"
                        fill={port === 'yes' ? '#22C55E' : port === 'no' ? '#EF4444' : '#93C5FD'}
                      />
                    </marker>
                  ))}
                </defs>
                {conns.map(c => (
                  <Arrow key={`${c.from}-${c.to}-${c.port}`} conn={c} nodes={nodes} />
                ))}
              </svg>

              {/* Nodes */}
              {nodes.map(node => (
                <NodeCard
                  key={node.id}
                  node={node}
                  selected={selected === node.id}
                  connecting={connecting?.from ?? null}
                  onSelect={() => setSelected(node.id)}
                  onStartConnect={port => startConnect(node.id, port)}
                  onConnectTo={() => connectTo(node.id)}
                  onDragStart={e => {
                    if (!canvasRef.current) return
                    const rect = canvasRef.current.getBoundingClientRect()
                    setDragging({
                      id: node.id,
                      ox: e.clientX - rect.left + canvasRef.current.scrollLeft - node.x,
                      oy: e.clientY - rect.top  + canvasRef.current.scrollTop  - node.y,
                    })
                  }}
                />
              ))}
            </div>
          )}

          {/* Floating + button */}
          <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 z-30">
            {showAddMenu && (
              <div
                className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden w-56"
                onClick={e => e.stopPropagation()}
              >
                {GROUPS.map(group => {
                  const types = (Object.entries(META) as [NodeType, typeof META[NodeType]][])
                    .filter(([, m]) => m.group === group)
                  return (
                    <div key={group}>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 pt-3 pb-1">
                        {group}
                      </p>
                      {types.map(([type, m]) => {
                        const Icon = m.Icon
                        return (
                          <button
                            key={type}
                            onClick={() => addNode(type)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: m.bg }}
                            >
                              <Icon size={13} className="text-white" />
                            </div>
                            <span className="text-sm text-gray-700 font-medium">{m.label}</span>
                            <ChevronRight size={12} className="text-gray-300 ml-auto" />
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}

            <button
              onClick={e => { e.stopPropagation(); setShowAddMenu(v => !v) }}
              className={`w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all ${
                showAddMenu
                  ? 'bg-gray-700 rotate-45'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Plus size={22} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
