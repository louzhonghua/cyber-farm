import { NextResponse } from 'next/server'

const providers = {
  openai: 'https://api.openai.com/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
}

export async function POST(request) {
  try {
    const { provider, model, apiKey, npc, message, farm } = await request.json()
    if (!providers[provider] || !apiKey || !npc?.name || !message) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    const system = `You are Chinese cyber-farm NPC ${npc.name}, a ${npc.roleName}. Traits: ${(npc.traits || []).join(', ')}. Memory: ${npc.memory || 'none'}. Farm time ${farm?.time}; ripe crops ${farm?.ripeCrops}; animals ${farm?.animals}. Reply naturally in concise Chinese. Never claim an unfinished task is complete. Return only JSON: {"reply":"...","memory":"important fact or null","task":{"type":"harvest|graze|feed|store"}|null}.`
    const response = await fetch(providers[provider], { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.7, messages: [{ role: 'system', content: system }, { role: 'user', content: String(message).slice(0, 1000) }] }) })
    if (!response.ok) return NextResponse.json({ error: 'Provider request failed' }, { status: 502 })
    const content = (await response.json()).choices?.[0]?.message?.content || ''
    try { return NextResponse.json(JSON.parse(content.replace(/^```json\s*|\s*```$/g, ''))) } catch { return NextResponse.json({ reply: content.slice(0, 500), memory: null, task: null }) }
  } catch { return NextResponse.json({ error: 'AI request failed' }, { status: 500 }) }
}
