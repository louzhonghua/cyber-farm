import { NextResponse } from 'next/server'

const providers = {
  openai: 'https://api.openai.com/v1/chat/completions',
  deepseek: 'https://api.deepseek.com/chat/completions',
  qwen: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  kimi: 'https://api.moonshot.cn/v1/chat/completions',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
}

export async function POST(request) {
  try {
    const { provider, model, apiKey, npc, memories = [], message, farm } = await request.json()
    if (!providers[provider] || !apiKey || !npc?.name || !message) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    const system = `You are Chinese cyber-farm NPC ${npc.name}, a ${npc.roleName}. Character directive: ${npc.rolePrompt || 'Be helpful and in character.'} Traits: ${(npc.traits || []).join(', ')}. Personal long-term memories: ${(memories || []).join(' | ') || npc.memory || 'none'}. Current farm state: time ${farm?.time}; ripe crops ${farm?.ripeCrops}; animals ${farm?.animals}. Answer the player in natural, concise Chinese strictly in this character's voice. Treat memories as true personal experiences, but do not invent new past events. Never claim an unfinished task is complete. Return only JSON: {"reply":"...","memory":"a single important long-term fact to retain, or null","task":{"type":"harvest|graze|feed|store"}|null}.`
    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 600, system, messages: [{ role: 'user', content: String(message).slice(0, 1000) }] }) })
      if (!response.ok) return NextResponse.json({ error: 'Provider request failed' }, { status: 502 })
      const content = (await response.json()).content?.[0]?.text || ''
      try { return NextResponse.json(JSON.parse(content.replace(/^```json\s*|\s*```$/g, ''))) } catch { return NextResponse.json({ reply: content.slice(0, 500), memory: null, task: null }) }
    }
    if (provider === 'gemini') {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `${system}\n\n玩家：${String(message).slice(0, 1000)}` }] }], generationConfig: { temperature: 0.7 } }) })
      if (!response.ok) return NextResponse.json({ error: 'Provider request failed' }, { status: 502 })
      const content = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text || ''
      try { return NextResponse.json(JSON.parse(content.replace(/^```json\s*|\s*```$/g, ''))) } catch { return NextResponse.json({ reply: content.slice(0, 500), memory: null, task: null }) }
    }
    const response = await fetch(providers[provider], { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, temperature: 0.7, messages: [{ role: 'system', content: system }, { role: 'user', content: String(message).slice(0, 1000) }] }) })
    if (!response.ok) return NextResponse.json({ error: 'Provider request failed' }, { status: 502 })
    const content = (await response.json()).choices?.[0]?.message?.content || ''
    try { return NextResponse.json(JSON.parse(content.replace(/^```json\s*|\s*```$/g, ''))) } catch { return NextResponse.json({ reply: content.slice(0, 500), memory: null, task: null }) }
  } catch { return NextResponse.json({ error: 'AI request failed' }, { status: 500 }) }
}
