'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Save, Plus, ArrowLeft, MessageSquare,
  HelpCircle, GitBranch, ExternalLink, Trash2, X
} from 'lucide-react'

interface FlowNode {
  id: string
  type: 'message' | 'question' | 'condition' | 'redirect'
  content: string
  options?: string[]
  next_step_id?: string
  x: number
  y: number
}

interface Connection {
  from: string
  to: string
  label?: string
}

const NODE_W = 220
const NODE_H = 90

const TYPE_META = {
  message:   { label: 'Mensaje',    color: 'bg-blue-500',   light: 'bg-blue-50 border-blue-200',   icon: MessageSquare },
  question:  { label: 'Pregunta',   color: 'bg-purple-500', light: 'bg-purple-50 border-purple-200', icon: HelpCircle   },
  condition: { label: 'Condición',  color: 'bg-orange-500', light: 'bg-orange-50 border-orange-200', icon: GitBranch    },
  redirect:  { label: 'Redirigir',  color: 'bg-green-500',  light: 'bg-green-50 border-green-200',   icon: ExternalLink },
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

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
  onStartConnect: () => void
  onConnectTo: () => void
  onDragStart: (e: React.MouseEvent) => void
}) {
  const meta = TYPE_META[node.type]
  const Icon = meta.icon

  return (
    <div
      style={{ left: node.x, top: node.y, width: NODE_W }}
      className={`absolute select-none cursor-grab active:cursor-grabbing rounded-xl border-2 overflow-visible shadow-sm transition-shadow ${
        selected ? 'border-blue-500 shadow-blue-200 shadow-md' : meta.light
      }`}
      onMouseDown={e => { e.stopPropagation(); onDragStart(e); onSelect() }}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 ${meta.color} rounded-t-[10px]`}>
        <Icon size={13} className="text-white flex-shrink-0" />
        <span className="text-white text-xs font-semibold">{meta.label}</span>
      </div>

      {/* Body */}
      <div className="bg-white rounded-b-[10px] px-3 py-2.5 min-h-[48px]">
        <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
          {node.content || <span className="text-gray-300 italic">Sin contenido…</span>}
        </p>
      </div>

      {/* Output port */}
      <button
        onMouseDown={e => { e.stopPropagation(); onStartConnect() }}
        onClick={e => e.stopPropagation()}
        title="Conectar a siguiente nodo"
        className={`absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-colors z-10 ${
          connecting === node.id
            ? 'border-blue-500 bg-blue-500'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
        }`}
      >
        <span className={`text-[10px] font-bold ${connecting === node.id ? 'text-white' : 'text-gray-400'}`}>
          +
        </span>
      </button>

      {/* Input port */}
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); onConnectTo() }}
        title="Conectar aquí"
        className={`absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-colors z-10 ${
          connecting && connecting !== node.id
            ? 'border-blue-500 bg-blue-100 cursor-pointer'
            : 'border-gray-300'
        }`}
      />
    </div>
  )
}

function Arrow({ from, to, nodes }: { from: string; to: string; nodes: FlowNode[] }) {
  const fromNode = nodes.find(n => n.id === from)
  const toNode = nodes.find(n => n.id === to)
  if (!fromNode || !toNode) return null

  const x1 = fromNode.x + NODE_W
  const y1 = fromNode.y + NODE_H / 2
  const x2 = toNode.x
  const y2 = toNode.y + NODE_H / 2
  const cx = (x1 + x2) / 2

  return (
    <g>
      <path
        d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke="#93C5FD"
        strokeWidth="2"
        markerEnd="url(#arrow)"
      />
    </g>
  )
}

export default function FlowEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [flowName, setFlowName] = useState('Nuevo flujo')
  const [keywords, setKeywords] = useState('')
  const [nodes, setNodes] = useState<FlowNode[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null)
  const [editNode, setEditNode] = useState<FlowNode | null>(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })

  // Load flow
  useEffect(() => {
    async function load() {
      if (!id) return
      const res = await fetch(`/api/flows/${id}`)
      if (res.ok) {
        const { flow } = await res.json()
        setFlowName(flow.name ?? 'Nuevo flujo')
        setKeywords((flow.trigger_keywords ?? []).join(', '))
        const steps: FlowNode[] = (flow.steps ?? []).map((s: FlowNode, i: number) => ({
          ...s,
          x: s.x ?? 80 + i * 280,
          y: s.y ?? 80,
        }))
        setNodes(steps)
        // Reconstruct connections from next_step_id
        const conns: Connection[] = []
        for (const step of steps) {
          if (step.next_step_id) {
            conns.push({ from: step.id, to: step.next_step_id })
          }
        }
        setConnections(conns)
      }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect()
      setCanvasOffset({ x: rect.left, y: rect.top })
    }
  }, [])

  // Mouse move / up for dragging
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return
    setNodes(prev =>
      prev.map(n =>
        n.id === dragging.id
          ? { ...n, x: e.clientX - canvasOffset.x - dragging.ox, y: e.clientY - canvasOffset.y - dragging.oy }
          : n
      )
    )
  }, [dragging, canvasOffset])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  function addNode(type: FlowNode['type']) {
    const newNode: FlowNode = {
      id: uid(),
      type,
      content: '',
      x: 80 + nodes.length * 280,
      y: 80 + Math.floor(nodes.length / 3) * 160,
    }
    setNodes(prev => [...prev, newNode])
    setEditNode(newNode)
  }

  function startConnect(nodeId: string) {
    if (connecting === nodeId) {
      setConnecting(null)
    } else {
      setConnecting(nodeId)
    }
  }

  function connectTo(targetId: string) {
    if (!connecting || connecting === targetId) return
    // Remove existing connection from source
    setConnections(prev => [
      ...prev.filter(c => c.from !== connecting),
      { from: connecting, to: targetId },
    ])
    // Update next_step_id in nodes
    setNodes(prev =>
      prev.map(n => (n.id === connecting ? { ...n, next_step_id: targetId } : n))
    )
    setConnecting(null)
  }

  function deleteNode(nodeId: string) {
    setNodes(prev => prev.filter(n => n.id !== nodeId))
    setConnections(prev => prev.filter(c => c.from !== nodeId && c.to !== nodeId))
    if (selected === nodeId) setSelected(null)
    if (editNode?.id === nodeId) setEditNode(null)
  }

  function saveEditNode() {
    if (!editNode) return
    setNodes(prev => prev.map(n => (n.id === editNode.id ? editNode : n)))
    setEditNode(null)
  }

  async function saveFlow() {
    if (saving) return
    setSaving(true)

    const kws = keywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean)

    await fetch(`/api/flows/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: flowName,
        trigger_keywords: kws,
        steps: nodes,
      }),
    })
    setSaving(false)
  }

  const selectedNode = nodes.find(n => n.id === selected)

  const canvasW = Math.max(800, ...nodes.map(n => n.x + NODE_W + 80))
  const canvasH = Math.max(500, ...nodes.map(n => n.y + NODE_H + 80))

  return (
    <div className="flex flex-col h-screen bg-[#f0f2f5]">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => router.push('/automatizacion')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <input
          value={flowName}
          onChange={e => setFlowName(e.target.value)}
          className="font-semibold text-gray-900 text-sm border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 py-0.5 transition-colors"
        />

        <div className="flex-1" />

        {/* Keywords */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Keywords:</span>
          <input
            value={keywords}
            onChange={e => setKeywords(e.target.value)}
            placeholder="precio, horario, lentes…"
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs w-44 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* Add node buttons */}
        {(['message', 'question', 'condition', 'redirect'] as FlowNode['type'][]).map(t => {
          const { label, color } = TYPE_META[t]
          return (
            <button
              key={t}
              onClick={() => addNode(t)}
              className={`inline-flex items-center gap-1.5 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-opacity hover:opacity-90 ${color}`}
            >
              <Plus size={12} />
              {label}
            </button>
          )
        })}

        <button
          onClick={saveFlow}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <Save size={14} />
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 overflow-auto relative"
          onClick={() => { setSelected(null); setConnecting(null) }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Cargando flujo…
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Plus size={28} className="text-gray-300" />
              </div>
              <p className="text-sm font-medium">Canvas vacío</p>
              <p className="text-xs mt-1">Agrega un nodo con los botones de arriba</p>
            </div>
          ) : (
            <div style={{ width: canvasW, height: canvasH, position: 'relative' }}>
              {/* SVG connections */}
              <svg
                style={{ position: 'absolute', inset: 0, width: canvasW, height: canvasH, pointerEvents: 'none' }}
              >
                <defs>
                  <marker
                    id="arrow"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L0,6 L8,3 z" fill="#93C5FD" />
                  </marker>
                </defs>
                {connections.map(c => (
                  <Arrow key={`${c.from}-${c.to}`} from={c.from} to={c.to} nodes={nodes} />
                ))}
              </svg>

              {/* Nodes */}
              {nodes.map(node => (
                <div key={node.id} onDoubleClick={e => { e.stopPropagation(); setEditNode({ ...node }) }}>
                  <NodeCard
                    node={node}
                    selected={selected === node.id}
                    connecting={connecting}
                    onSelect={() => setSelected(node.id)}
                    onStartConnect={() => startConnect(node.id)}
                    onConnectTo={() => connectTo(node.id)}
                    onDragStart={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setDragging({ id: node.id, ox: e.clientX - node.x - canvasOffset.x, oy: e.clientY - node.y - canvasOffset.y })
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Properties panel */}
        {selectedNode && !editNode && (
          <div className="w-64 bg-white border-l border-gray-100 p-5 flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">Propiedades</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-1">Tipo</p>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full text-white ${TYPE_META[selectedNode.type].color}`}>
                  {TYPE_META[selectedNode.type].label}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Contenido</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {selectedNode.content || <span className="text-gray-300 italic">Vacío</span>}
                </p>
              </div>
              {selectedNode.next_step_id && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Siguiente</p>
                  <p className="text-xs font-mono text-gray-600">{selectedNode.next_step_id}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setEditNode({ ...selectedNode })}
                className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium py-2 rounded-lg transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => deleteNode(selectedNode.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editNode && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${TYPE_META[editNode.type].color}`} />
                <h3 className="font-semibold text-gray-900">
                  Editar {TYPE_META[editNode.type].label}
                </h3>
              </div>
              <button onClick={() => setEditNode(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Tipo de nodo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(TYPE_META) as FlowNode['type'][]).map(t => (
                    <button
                      key={t}
                      onClick={() => setEditNode(prev => prev ? { ...prev, type: t } : null)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-xs font-medium transition-all ${
                        editNode.type === t
                          ? `border-current text-white ${TYPE_META[t].color}`
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {TYPE_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Contenido del mensaje
                </label>
                <textarea
                  value={editNode.content}
                  onChange={e => setEditNode(prev => prev ? { ...prev, content: e.target.value } : null)}
                  placeholder={
                    editNode.type === 'message'   ? 'Escribe el mensaje que enviará el bot…'
                    : editNode.type === 'question' ? 'Escribe la pregunta al usuario…'
                    : editNode.type === 'condition' ? 'Condición (ej: contiene "precio")…'
                    : 'URL o destino al que redirigir…'
                  }
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>

              {/* Options for question type */}
              {editNode.type === 'question' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Opciones (separadas por coma)
                  </label>
                  <input
                    value={(editNode.options ?? []).join(', ')}
                    onChange={e =>
                      setEditNode(prev =>
                        prev
                          ? { ...prev, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                          : null
                      )
                    }
                    placeholder="Sí, No, Más info…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditNode(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEditNode}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Guardar nodo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
