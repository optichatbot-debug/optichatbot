'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Check, Eye, Loader2,
  MessageSquare, ImageIcon, MousePointerClick, List,
  Bot, GitBranch, Shuffle, Clock, Tag, Bell,
  X, Trash2, ToggleLeft, ToggleRight, ChevronRight, Zap, Sparkles, Send,
} from 'lucide-react'

// ─── Trigger picker data ──────────────────────────────────────────────────────

type TriggerTab = 'whatsapp' | 'instagram' | 'eventos'

const WA_TRIGGERS = [
  { label: 'El usuario envía un mensaje',                    desc: 'Cuando alguien escribe al chat de WhatsApp',          icon: '💬' },
  { label: 'Clic en anuncio CTWA',                           desc: 'El usuario hace clic en un anuncio de WhatsApp',      icon: '📣' },
  { label: 'URL de WhatsApp - El usuario hace clic en un enlace', desc: 'Llega por un enlace de WhatsApp directo',       icon: '🔗' },
]
const IG_TRIGGERS = [
  { label: 'Comentarios de publicaciones o reels', desc: 'El usuario comenta en tu publicación', icon: '💬' },
  { label: 'Respuesta a las historias',             desc: 'El usuario responde a tu historia',   icon: '📖' },
  { label: 'Mensaje de Instagram',                  desc: 'El usuario envía un DM de Instagram', icon: '✉️' },
  { label: 'Anuncios de Instagram',                 desc: 'Interacción con un anuncio',           icon: '📣' },
  { label: 'Comentarios en vivo',                   desc: 'El usuario comenta en un live',        icon: '🔴' },
  { label: 'URL de referencia',                     desc: 'El usuario llega por un enlace de IG', icon: '🔗' },
]
const EVENT_TRIGGERS = [
  { label: 'Contacto suscrito',  desc: 'El contacto se suscribe al bot',         icon: '🔔' },
  { label: 'Etiqueta añadida',   desc: 'Se añade una etiqueta al contacto',      icon: '🏷️' },
  { label: 'Campo actualizado',  desc: 'Se actualiza un campo del contacto',     icon: '✏️' },
]

// ─── Trigger picker side panel ───────────────────────────────────────────────

function TriggerPickerPanel({ onSelect, onClose }: {
  onSelect: (label: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<TriggerTab>('whatsapp')
  const triggers = tab === 'whatsapp' ? WA_TRIGGERS : tab === 'instagram' ? IG_TRIGGERS : EVENT_TRIGGERS

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-gray-100 flex flex-col z-50">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-bold text-gray-900">Elegir disparador</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="flex border-b border-gray-100 flex-shrink-0 px-1">
          {([
            { id: 'whatsapp'  as TriggerTab, label: 'WhatsApp'  },
            { id: 'instagram' as TriggerTab, label: 'Instagram' },
            { id: 'eventos'   as TriggerTab, label: 'Eventos'   },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-3 text-xs font-semibold border-b-2 transition-all ${tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {triggers.map(t => (
            <button
              key={t.label}
              onClick={() => { onSelect(t.label); onClose() }}
              className="w-full flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 leading-snug">{t.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeType =
  | 'trigger'
  | 'whatsapp_message' | 'image' | 'buttons' | 'list'
  | 'ai_step'
  | 'condition' | 'random' | 'smart_wait'
  | 'tag_contact' | 'notify_team'

interface FlowNode {
  id: string
  type: NodeType
  x: number
  y: number
  // trigger
  trigger_label?: string
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

interface StepPickerState {
  fromId: string
  port: 'default' | 'yes' | 'no'
  x: number
  y: number
}

// ─── Node meta ────────────────────────────────────────────────────────────────

const META: Record<NodeType, { label: string; Icon: React.ElementType; bg: string; group: string }> = {
  trigger:          { label: 'Cuando…',            Icon: Zap,               bg: '#2563EB', group: 'Trigger'   },
  whatsapp_message: { label: 'Mensaje WhatsApp',   Icon: MessageSquare,     bg: '#25D366', group: 'Contenido' },
  image:            { label: 'Imagen',             Icon: ImageIcon,         bg: '#3B82F6', group: 'Contenido' },
  buttons:          { label: 'Botones de respuesta', Icon: MousePointerClick, bg: '#8B5CF6', group: 'Contenido' },
  list:             { label: 'Lista',              Icon: List,              bg: '#F59E0B', group: 'Contenido' },
  ai_step:          { label: 'Paso IA',            Icon: Bot,               bg: '#6366F1', group: 'IA'        },
  condition:        { label: 'Condición',          Icon: GitBranch,         bg: '#F97316', group: 'Lógica'    },
  random:           { label: 'Aleatorio',          Icon: Shuffle,           bg: '#EC4899', group: 'Lógica'    },
  smart_wait:       { label: 'Espera',             Icon: Clock,             bg: '#14B8A6', group: 'Lógica'    },
  tag_contact:      { label: 'Etiquetar contacto', Icon: Tag,               bg: '#84CC16', group: 'Acciones'  },
  notify_team:      { label: 'Notificar equipo',   Icon: Bell,              bg: '#EF4444', group: 'Acciones'  },
}

const PICKER_GROUPS: Array<{ label: string; types: NodeType[] }> = [
  { label: 'Contenido', types: ['whatsapp_message', 'image', 'buttons'] },
  { label: 'IA',        types: ['ai_step']                               },
  { label: 'Lógica',    types: ['condition', 'smart_wait', 'random']     },
  { label: 'Acciones',  types: ['tag_contact', 'notify_team']            },
]

const NODE_W = 220
const NODE_H = 84

function uid() { return Math.random().toString(36).slice(2, 9) }

function getPreview(n: FlowNode): string {
  switch (n.type) {
    case 'trigger':           return n.trigger_label || '+ Nuevo Disparador'
    case 'whatsapp_message':  return n.message || ''
    case 'image':             return n.image_url ? '🖼 Imagen adjunta' : ''
    case 'buttons':           return n.buttons?.join(' · ') || ''
    case 'list':              return n.list_items?.join(', ') || ''
    case 'ai_step':           return n.ai_instructions || ''
    case 'condition':         return n.condition_text || ''
    case 'random':            return 'Rama aleatoria'
    case 'smart_wait':        return n.wait_hours ? `Espera ${n.wait_hours}h` : ''
    case 'tag_contact':       return n.tag ? `#${n.tag}` : ''
    case 'notify_team':       return n.notification_text || ''
    default:                  return ''
  }
}

// ─── Step Picker Panel ────────────────────────────────────────────────────────

function StepPicker({
  picker,
  onPick,
  onClose,
}: {
  picker: StepPickerState
  onPick: (type: NodeType) => void
  onClose: () => void
}) {
  return (
    <div
      style={{ left: picker.x, top: Math.max(0, picker.y - 40), position: 'absolute', zIndex: 40 }}
      className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-52 overflow-hidden"
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-50">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Agregar paso</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={13} /></button>
      </div>
      {PICKER_GROUPS.map(group => (
        <div key={group.label}>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-3 pt-2 pb-1">{group.label}</p>
          {group.types.map(type => {
            const m = META[type]
            const Icon = m.Icon
            return (
              <button
                key={type}
                onClick={() => onPick(type)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: m.bg }}>
                  <Icon size={11} className="text-white" />
                </div>
                <span className="text-xs text-gray-700 font-medium">{m.label}</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── NodeCard ─────────────────────────────────────────────────────────────────

function NodeCard({
  node,
  selected,
  onSelect,
  onOutputClick,
  onDragStart,
  onTriggerClick,
}: {
  node: FlowNode
  selected: boolean
  onSelect: () => void
  onOutputClick: (port: 'default' | 'yes' | 'no') => void
  onDragStart: (e: React.MouseEvent) => void
  onTriggerClick?: () => void
}) {
  const meta = META[node.type]
  const Icon = meta.Icon
  const prev = getPreview(node)
  const isCondition = node.type === 'condition'
  const isTrigger = node.type === 'trigger'

  return (
    <div
      style={{ left: node.x, top: node.y, width: NODE_W, position: 'absolute' }}
      className={`select-none cursor-grab active:cursor-grabbing rounded-xl overflow-visible shadow-md transition-all ${
        selected ? 'ring-2 ring-blue-500 ring-offset-1 shadow-blue-200' : 'hover:shadow-lg'
      }`}
      onMouseDown={e => { e.stopPropagation(); onDragStart(e); onSelect() }}
    >
      {/* Input port — hide for trigger */}
      {!isTrigger && (
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 bg-white border-gray-300 z-10" />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl" style={{ backgroundColor: meta.bg }}>
        <Icon size={13} className="text-white flex-shrink-0" />
        <span className="text-white text-xs font-semibold truncate">{meta.label}</span>
      </div>

      {/* Body */}
      <div className="bg-white rounded-b-xl px-3 py-2.5 min-h-[44px]">
        {isTrigger ? (
          <button
            type="button"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onTriggerClick?.() }}
            className="text-xs text-blue-500 font-medium hover:text-blue-700 transition-colors text-left w-full"
          >
            {node.trigger_label || '+ Nuevo Disparador'}
          </button>
        ) : prev ? (
          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{prev}</p>
        ) : (
          <p className="text-xs text-gray-300 italic">Sin contenido…</p>
        )}
      </div>

      {/* Output ports */}
      {isCondition ? (
        <>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onOutputClick('yes') }}
            title="Sí — agregar paso"
            className="absolute -right-3 top-[30%] -translate-y-1/2 w-5 h-5 rounded-full border-2 bg-white border-green-400 hover:bg-green-50 z-10 flex items-center justify-center"
          >
            <span className="text-[8px] font-bold text-green-500">Y</span>
          </button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onOutputClick('no') }}
            title="No — agregar paso"
            className="absolute -right-3 top-[65%] -translate-y-1/2 w-5 h-5 rounded-full border-2 bg-white border-red-400 hover:bg-red-50 z-10 flex items-center justify-center"
          >
            <span className="text-[8px] font-bold text-red-500">N</span>
          </button>
        </>
      ) : (
        <button
          onMouseDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onOutputClick('default') }}
          title="Agregar siguiente paso"
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 bg-white border-blue-400 hover:bg-blue-100 z-10 transition-colors flex items-center justify-center"
        >
          <Plus size={9} className="text-blue-500" />
        </button>
      )}
    </div>
  )
}

// ─── Arrow ────────────────────────────────────────────────────────────────────

function Arrow({ conn, nodes }: { conn: Connection; nodes: FlowNode[] }) {
  const from = nodes.find(n => n.id === conn.from)
  const to   = nodes.find(n => n.id === conn.to)
  if (!from || !to) return null

  let y1: number
  if (conn.port === 'yes')     y1 = from.y + NODE_H * 0.30
  else if (conn.port === 'no') y1 = from.y + NODE_H * 0.65
  else                         y1 = from.y + NODE_H / 2

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
        fill="none" stroke={color} strokeWidth="2"
        markerEnd={`url(#arr-${conn.port})`}
      />
    </g>
  )
}

// ─── Node Editor ──────────────────────────────────────────────────────────────

function NodeEditor({
  node, onChange, onDelete, onClose,
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

  const isTrigger = node.type === 'trigger'

  return (
    <div className="w-72 bg-white border-r border-gray-100 flex flex-col flex-shrink-0 h-full overflow-y-auto">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: meta.bg }}>
          <Icon size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{meta.label}</p>
          <p className="text-xs text-gray-400">Editor de paso</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0"><X size={16} /></button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {isTrigger && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Tipo de disparador</label>
            <select value={local.trigger_label ?? ''} onChange={e => commit({ trigger_label: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
              <option value="">Seleccionar disparador…</option>
              <option>Palabra clave recibida</option>
              <option>Primer mensaje del contacto</option>
              <option>Botón presionado</option>
              <option>Suscripción nueva</option>
              <option>Evento personalizado</option>
            </select>
          </div>
        )}

        {local.type === 'whatsapp_message' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mensaje</label>
              <textarea value={local.message ?? ''} onChange={e => commit({ message: e.target.value })} placeholder="Escribe el mensaje…" rows={5} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              <p className="text-xs text-gray-400 mt-1">Usa {'{{nombre}}'} para el nombre del contacto.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Botones rápidos (opcional)</label>
              {(local.buttons ?? []).map((b, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input value={b} onChange={e => { const arr = [...(local.buttons ?? [])]; arr[i] = e.target.value; commit({ buttons: arr }) }} className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder={`Botón ${i + 1}`} />
                  <button onClick={() => commit({ buttons: (local.buttons ?? []).filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
              {(local.buttons ?? []).length < 3 && (
                <button onClick={() => commit({ buttons: [...(local.buttons ?? []), ''] })} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"><Plus size={12} /> Agregar botón</button>
              )}
            </div>
          </>
        )}

        {local.type === 'image' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">URL de imagen</label>
            <input value={local.image_url ?? ''} onChange={e => commit({ image_url: e.target.value })} placeholder="https://…" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            {local.image_url && <img src={local.image_url} alt="" className="mt-2 w-full rounded-lg object-cover max-h-28" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />}
          </div>
        )}

        {local.type === 'buttons' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Opciones</label>
            {(local.buttons ?? ['']).map((b, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={b} onChange={e => { const arr = [...(local.buttons ?? [''])]; arr[i] = e.target.value; commit({ buttons: arr }) }} className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder={`Opción ${i + 1}`} />
                <button onClick={() => commit({ buttons: (local.buttons ?? []).filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
            <button onClick={() => commit({ buttons: [...(local.buttons ?? []), ''] })} className="flex items-center gap-1.5 text-xs text-blue-600 font-medium"><Plus size={12} /> Agregar opción</button>
          </div>
        )}

        {local.type === 'list' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Ítems</label>
            {(local.list_items ?? ['']).map((item, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={item} onChange={e => { const arr = [...(local.list_items ?? [''])]; arr[i] = e.target.value; commit({ list_items: arr }) }} className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder={`Ítem ${i + 1}`} />
                <button onClick={() => commit({ list_items: (local.list_items ?? []).filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
            <button onClick={() => commit({ list_items: [...(local.list_items ?? []), ''] })} className="flex items-center gap-1.5 text-xs text-blue-600 font-medium"><Plus size={12} /> Agregar ítem</button>
          </div>
        )}

        {local.type === 'ai_step' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Instrucciones para la IA</label>
            <textarea value={local.ai_instructions ?? ''} onChange={e => commit({ ai_instructions: e.target.value })} placeholder="Ej: Responde sobre precios de forma amigable…" rows={6} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" />
            <p className="text-xs text-gray-400 mt-1">Claude procesará el mensaje con estas instrucciones.</p>
          </div>
        )}

        {local.type === 'condition' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Condición</label>
            <textarea value={local.condition_text ?? ''} onChange={e => commit({ condition_text: e.target.value })} placeholder="Ej: El mensaje contiene 'precio'" rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" /><span className="text-gray-600">Sí → rama verde</span></div>
              <div className="flex items-center gap-2 text-xs"><span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" /><span className="text-gray-600">No → rama roja</span></div>
            </div>
          </div>
        )}

        {local.type === 'random' && (
          <div className="bg-pink-50 rounded-xl p-3 text-sm text-pink-700">Elige aleatoriamente uno de los nodos conectados.</div>
        )}

        {local.type === 'smart_wait' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Esperar (horas)</label>
            <input type="number" min={1} max={168} value={local.wait_hours ?? 1} onChange={e => commit({ wait_hours: Number(e.target.value) })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
          </div>
        )}

        {local.type === 'tag_contact' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Etiqueta</label>
            <input value={local.tag ?? ''} onChange={e => commit({ tag: e.target.value })} placeholder="ej: cliente-potencial" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
          </div>
        )}

        {local.type === 'notify_team' && (
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mensaje de notificación</label>
            <textarea value={local.notification_text ?? ''} onChange={e => commit({ notification_text: e.target.value })} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-gray-100 flex-shrink-0">
        {isTrigger ? (
          <p className="text-xs text-center text-gray-400">El disparador es el inicio del flujo</p>
        ) : (
          <button onClick={onDelete} className="w-full flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 border border-red-200 py-2 rounded-xl text-sm font-medium transition-colors">
            <Trash2 size={14} />Eliminar paso
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FlowEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [flowName, setFlowName]         = useState('Nuevo flujo')
  const [keywords, setKeywords]         = useState('')
  const [isLive, setIsLive]             = useState(false)
  const [nodes, setNodes]               = useState<FlowNode[]>([])
  const [conns, setConns]               = useState<Connection[]>([])
  const [selected, setSelected]         = useState<string | null>(null)
  const [stepPicker, setStepPicker]         = useState<StepPickerState | null>(null)
  const [triggerPickerOpen, setTriggerPickerOpen] = useState(false)
  const [dragging, setDragging]             = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [saveStatus, setSaveStatus]         = useState<'idle' | 'saving' | 'saved'>('idle')
  const [loading, setLoading]               = useState(true)
  const [aiPrompt, setAiPrompt]             = useState('')
  const [aiGenerating, setAiGenerating]     = useState(false)
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
            y: s.y ?? 200,
          }))
          // Ensure trigger node exists
          if (!steps.find(s => s.type === 'trigger')) {
            steps.unshift({ id: uid(), type: 'trigger', x: 80, y: 200 })
          }
          setNodes(steps)
          const rebuilt: Connection[] = []
          for (const s of steps) {
            if (s.next_id) rebuilt.push({ from: s.id, to: s.next_id, port: 'default' })
            if (s.yes_id)  rebuilt.push({ from: s.id, to: s.yes_id,  port: 'yes' })
            if (s.no_id)   rebuilt.push({ from: s.id, to: s.no_id,   port: 'no' })
          }
          setConns(rebuilt)
        } else {
          // New empty flow — create trigger node
          setNodes([{ id: uid(), type: 'trigger', x: 80, y: 200 }])
        }
        setLoading(false)
      })
  }, [id])

  // ── Auto-save (2s debounce) ──
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
    }, 2000)
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

  // ── Output dot click → show step picker ──
  function handleOutputClick(nodeId: string, port: 'default' | 'yes' | 'no') {
    const node = nodes.find(n => n.id === nodeId)
    if (!node) return
    const pickerX = node.x + NODE_W + 28
    const pickerY = port === 'yes' ? node.y - 40 :
                    port === 'no'  ? node.y + NODE_H * 0.65 :
                    node.y + NODE_H / 2 - 80
    setStepPicker({ fromId: nodeId, port, x: pickerX, y: pickerY })
    setSelected(null)
  }

  // ── Pick step from picker → create + connect ──
  function pickStep(type: NodeType) {
    if (!stepPicker) return
    const fromNode = nodes.find(n => n.id === stepPicker.fromId)
    if (!fromNode) return

    const newNode: FlowNode = {
      id: uid(), type,
      x: fromNode.x + NODE_W + 100,
      y: stepPicker.port === 'yes' ? fromNode.y - 60 :
         stepPicker.port === 'no'  ? fromNode.y + NODE_H + 40 :
         fromNode.y,
    }

    const ptrKey = stepPicker.port === 'default' ? 'next_id' :
                   stepPicker.port === 'yes'      ? 'yes_id' : 'no_id'

    const newConns = [...conns, { from: stepPicker.fromId, to: newNode.id, port: stepPicker.port }]

    mutateNodes(
      prev => [...prev.map(n => n.id === stepPicker.fromId ? { ...n, [ptrKey]: newNode.id } : n), newNode],
      newConns
    )
    setSelected(newNode.id)
    setStepPicker(null)
  }

  // ── Delete node ──
  function deleteNode(nodeId: string) {
    const newConns = conns.filter(c => c.from !== nodeId && c.to !== nodeId)
    mutateNodes(prev => prev.filter(n => n.id !== nodeId), newConns)
    if (selected === nodeId) setSelected(null)
  }

  function updateNode(updated: FlowNode) {
    mutateNodes(prev => prev.map(n => n.id === updated.id ? updated : n))
  }

  async function publish() {
    if (!isLive) {
      const next = true
      setIsLive(next)
      schedSave(nodes, conns, flowName, keywords, next)
    }
  }

  async function generateWithAI() {
    if (!aiPrompt.trim() || aiGenerating) return
    setAiGenerating(true)
    try {
      const res = await fetch('/api/flows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiPrompt }),
      })
      if (res.ok) {
        const { nodes: generated } = await res.json()
        const newConns: Connection[] = []
        for (const n of generated) {
          if (n.next_id) newConns.push({ from: n.id, to: n.next_id, port: 'default' })
          if (n.yes_id)  newConns.push({ from: n.id, to: n.yes_id,  port: 'yes'     })
          if (n.no_id)   newConns.push({ from: n.id, to: n.no_id,   port: 'no'      })
        }
        mutateNodes(() => generated, newConns)
      }
    } catch {}
    setAiGenerating(false)
    setAiPrompt('')
  }

  const selectedNode = nodes.find(n => n.id === selected) ?? null
  const canvasW = Math.max(900, ...nodes.map(n => n.x + NODE_W + 180))
  const canvasH = Math.max(600, ...nodes.map(n => n.y + NODE_H + 180))

  return (
    <div className="flex flex-col h-screen bg-[#f4f5f7]">

      {/* Trigger picker side panel */}
      {triggerPickerOpen && (
        <TriggerPickerPanel
          onSelect={label => {
            const triggerNode = nodes.find(n => n.type === 'trigger')
            if (triggerNode) updateNode({ ...triggerNode, trigger_label: label })
            setTriggerPickerOpen(false)
          }}
          onClose={() => setTriggerPickerOpen(false)}
        />
      )}

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-3 flex-shrink-0 z-20">
        <button onClick={() => router.push('/automatizacion')} className="text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft size={18} />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm">
          <button onClick={() => router.push('/automatizacion')} className="text-gray-400 hover:text-gray-600 transition-colors">Automatizaciones</button>
          <span className="text-gray-300">/</span>
          <input
            value={flowName}
            onChange={e => { setFlowName(e.target.value); schedSave(nodes, conns, e.target.value, keywords, isLive) }}
            className="font-semibold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-200 focus:border-blue-400 focus:outline-none px-1 py-0.5 transition-colors min-w-[100px]"
          />
        </div>

        {/* Keywords */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Keywords:</span>
          <input
            value={keywords}
            onChange={e => { setKeywords(e.target.value); schedSave(nodes, conns, flowName, e.target.value, isLive) }}
            placeholder="precio, citas…"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-36 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex-1" />

        {/* Save status */}
        <span className={`text-xs font-medium transition-all ${
          saveStatus === 'saving' ? 'text-gray-400' :
          saveStatus === 'saved'  ? 'text-green-500' :
          'text-transparent'
        }`}>
          {saveStatus === 'saving' ? 'Guardando…' : saveStatus === 'saved' ? '✓ Guardado' : '·'}
        </span>

        {/* Preview */}
        <button className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-50">
          <Eye size={13} />Vista previa
        </button>

        {/* Disabled/Enabled toggle */}
        <button
          onClick={() => { const next = !isLive; setIsLive(next); schedSave(nodes, conns, flowName, keywords, next) }}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            isLive ? 'bg-white border-green-300 text-green-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          {isLive ? <ToggleRight size={15} className="text-green-500" /> : <ToggleLeft size={15} />}
          {isLive ? 'Habilitado' : 'Deshabilitado'}
        </button>

        {/* Publicar */}
        <button
          onClick={publish}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors"
        >
          <Check size={13} />
          Publicar
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
          onClick={() => { setSelected(null); setStepPicker(null) }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={28} className="animate-spin text-blue-400" />
            </div>
          ) : (
            <div style={{ width: canvasW, height: canvasH, position: 'relative' }}>
              {/* SVG arrows */}
              <svg style={{ position: 'absolute', inset: 0, width: canvasW, height: canvasH, pointerEvents: 'none' }}>
                <defs>
                  {(['default', 'yes', 'no'] as const).map(port => (
                    <marker key={port} id={`arr-${port}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                      <path d="M0,0 L0,6 L8,3 z" fill={port === 'yes' ? '#22C55E' : port === 'no' ? '#EF4444' : '#93C5FD'} />
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
                  onSelect={() => { setSelected(node.id); setStepPicker(null) }}
                  onOutputClick={port => handleOutputClick(node.id, port)}
                  onTriggerClick={node.type === 'trigger' ? () => setTriggerPickerOpen(true) : undefined}
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

              {/* Step picker panel */}
              {stepPicker && (
                <StepPicker
                  picker={stepPicker}
                  onPick={pickStep}
                  onClose={() => setStepPicker(null)}
                />
              )}
            </div>
          )}

          {/* ── Bottom AI bar ── */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-2.5 w-[500px] max-w-[calc(100vw-80px)]">
            <Sparkles size={16} className="text-indigo-500 flex-shrink-0" />
            <input
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && generateWithAI()}
              placeholder="✨ Crear con IA — describe el flujo que quieres construir…"
              className="flex-1 text-sm bg-transparent focus:outline-none text-gray-700 placeholder-gray-400"
            />
            <button
              onClick={generateWithAI}
              disabled={!aiPrompt.trim() || aiGenerating}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              {aiGenerating ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {aiGenerating ? 'Creando…' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
