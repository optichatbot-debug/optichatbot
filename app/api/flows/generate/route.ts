import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

function uid() { return Math.random().toString(36).slice(2, 9) }

export async function POST(req: NextRequest) {
  try {
    const { description } = await req.json()
    if (!description) return NextResponse.json({ error: 'description requerida' }, { status: 400 })

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: 'You are a chatbot flow builder. Generate WhatsApp automation flows as JSON. Return ONLY valid JSON, no markdown, no explanation.',
    })

    const result = await model.generateContent(
      `Generate a WhatsApp automation flow for: "${description}"

Return ONLY this JSON structure (no markdown, no code blocks):
{
  "nodes": [
    { "type": "trigger", "trigger_label": "...", "x": 80, "y": 200 },
    { "type": "whatsapp_message", "message": "...", "x": 380, "y": 200 },
    ...
  ]
}

Rules:
- First node must be type "trigger" with a descriptive trigger_label
- Valid types: trigger, whatsapp_message, ai_step, buttons, condition, smart_wait, tag_contact, notify_team
- Position: start x=80, increment x by 300 per step, keep y=200 for linear flows
- For whatsapp_message: add "message" field with natural Spanish text
- For ai_step: add "ai_instructions" field describing what AI should respond
- For buttons: add "buttons" array with 2-4 options in Spanish
- For condition: add "condition_text" describing the condition
- For tag_contact: add "tag" field
- Create 3-6 meaningful nodes that actually help automate the described process
- Use natural conversational Spanish in messages`
    )

    const text = result.response.text()

    // Extract JSON from response (handle both raw JSON and code blocks)
    let jsonStr = text.trim()
    const codeMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeMatch) jsonStr = codeMatch[1].trim()
    const objMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (!objMatch) return NextResponse.json({ error: 'No se pudo parsear la respuesta de IA' }, { status: 500 })

    const parsed = JSON.parse(objMatch[0])
    const rawNodes = parsed.nodes ?? []

    // Assign IDs and chain connections
    const nodes = rawNodes.map((n: Record<string, unknown>) => ({ ...n, id: uid() }))
    for (let i = 0; i < nodes.length - 1; i++) {
      if (nodes[i].type !== 'condition' && !nodes[i].next_id) {
        nodes[i].next_id = nodes[i + 1].id
      }
    }

    return NextResponse.json({ nodes })
  } catch (error) {
    console.error('[POST /api/flows/generate]', error)
    return NextResponse.json({ error: 'Error generando flujo' }, { status: 500 })
  }
}
