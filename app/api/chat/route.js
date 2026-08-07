import { NextResponse } from "next/server";

const compatibleProviders = {
  openai: "https://api.openai.com/v1/chat/completions",
  deepseek: "https://api.deepseek.com/chat/completions",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  kimi: "https://api.moonshot.cn/v1/chat/completions",
  zhipu: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
};

const supportedProviders = new Set([...Object.keys(compatibleProviders), "anthropic", "gemini"]);

const parseModelJson = (content) => {
  const clean = String(content || "").replace(/^```json\s*|\s*```$/g, "");
  try {
    return JSON.parse(clean);
  } catch {
    return { reply: String(content || "").slice(0, 600), memory: null, task: null };
  }
};

export async function POST(request) {
  try {
    const { provider, model, apiKey, npc, memories = [], message, farm } = await request.json();
    if (!supportedProviders.has(provider) || !model || !apiKey || !npc?.name || !message) {
      return NextResponse.json({ error: "模型配置或对话内容不完整" }, { status: 400 });
    }

    const system = [
      `你是赛博农场居民「${npc.name}」，职业是${npc.roleName}。`,
      `角色设定：${npc.rolePrompt || npc.prompt || "保持自然、可靠、符合职业身份。"}`,
      `性格：${(npc.traits || []).join("、")}。`,
      `个人长期记忆：${memories.join("；") || "暂无重要记忆"}。`,
      `当前农场实时状态：${JSON.stringify(farm || {})}。`,
      "请始终用自然、简洁的中文，以角色自己的口吻回答。",
      "不能声称尚未完成的工作已经完成。若玩家下达工作，只能确认接受并返回对应任务。",
      "果园任务使用 pickFruit；只有果树处于成熟阶段时才建议采摘。",
      '只返回 JSON：{"reply":"角色台词","memory":"值得长期记住的一条事实或null","task":{"type":"sow|water|harvest|feed|graze|collectEggs|collectMilk|playDog|pickFruit"}或null}。',
    ].join("\n");

    if (provider === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 700, system, messages: [{ role: "user", content: String(message).slice(0, 1200) }] }),
      });
      if (!response.ok) return NextResponse.json({ error: "Claude 服务请求失败" }, { status: 502 });
      const data = await response.json();
      return NextResponse.json(parseModelJson(data.content?.[0]?.text));
    }

    if (provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `${system}\n\n玩家：${String(message).slice(0, 1200)}` }] }],
            generationConfig: { temperature: 0.7 },
          }),
        },
      );
      if (!response.ok) return NextResponse.json({ error: "Gemini 服务请求失败" }, { status: 502 });
      const data = await response.json();
      return NextResponse.json(parseModelJson(data.candidates?.[0]?.content?.parts?.[0]?.text));
    }

    const response = await fetch(compatibleProviders[provider], {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [{ role: "system", content: system }, { role: "user", content: String(message).slice(0, 1200) }],
      }),
    });
    if (!response.ok) return NextResponse.json({ error: "模型服务请求失败" }, { status: 502 });
    const data = await response.json();
    return NextResponse.json(parseModelJson(data.choices?.[0]?.message?.content));
  } catch {
    return NextResponse.json({ error: "无法完成 AI 对话请求" }, { status: 500 });
  }
}
