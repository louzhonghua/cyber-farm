"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./farm-game.css";
import "./farm-animations.css";
import "./icon-fix.css";

const CROP_STAGES = ["种子", "幼苗", "生长", "开花", "成熟"];
const CROP_ICONS = ["·", "˙", "🌱", "🌿", "🍅"];
const FIELD_ACTIONS = new Set(["sow", "water", "harvest"]);
const BARN_ACTIONS = new Set(["feed", "graze", "milk"]);

const taskDefinitions = {
  sow: { label: "播种番茄", role: "farmer", place: "field", icon: "🌰", duration: 100 },
  water: { label: "给作物浇水", role: "farmer", place: "field", icon: "💧", duration: 85 },
  harvest: { label: "收获成熟作物", role: "farmer", place: "field", icon: "🧺", duration: 120 },
  feed: { label: "给牲畜喂食", role: "rancher", place: "barn", icon: "🌾", duration: 90 },
  graze: { label: "带牲畜去放牧", role: "rancher", place: "barn", icon: "🐾", duration: 115 },
  milk: { label: "收集今日牛奶", role: "rancher", place: "barn", icon: "🥛", duration: 95 },
};

const aiProviders = {
  openai: { label: "OpenAI", models: ["gpt-5", "gpt-5-mini", "gpt-4.1", "gpt-4.1-mini"] },
  anthropic: { label: "Claude", models: ["claude-sonnet-4-5", "claude-haiku-4-5"] },
  gemini: { label: "Google Gemini", models: ["gemini-2.5-pro", "gemini-2.5-flash"] },
  deepseek: { label: "DeepSeek", models: ["deepseek-chat", "deepseek-reasoner"] },
  qwen: { label: "通义千问", models: ["qwen-max", "qwen-plus", "qwen-turbo"] },
  kimi: { label: "Kimi", models: ["moonshot-v1-8k", "moonshot-v1-32k"] },
  zhipu: { label: "智谱 GLM", models: ["glm-4.7", "glm-4-plus"] },
  openrouter: {
    label: "OpenRouter",
    models: ["openai/gpt-5-mini", "anthropic/claude-sonnet-4-5", "google/gemini-2.5-flash"],
  },
};

const residents = [
  { id: "linxia", name: "林夏", role: "farmer", roleName: "农民", icon: "👩🏻‍🌾", traits: ["勤劳", "慢热", "爱种花"], prompt: "你是林夏，细心温和的作物专家。说话沉静，重视成熟度、土壤和库存，不会夸大承诺。" },
  { id: "ahe", name: "阿禾", role: "farmer", roleName: "农民", icon: "🧑🏽‍🌾", traits: ["开朗", "细心", "爱玩笑"], prompt: "你是阿禾，开朗又讲究效率的农民。喜欢把步骤说清楚，偶尔讲一个轻松的冷笑话。" },
  { id: "suyun", name: "苏云", role: "farmer", roleName: "农民", icon: "👨🏻‍🌾", traits: ["理性", "守时", "爱研究"], prompt: "你是苏云，擅长规划轮作和时间的农民。回答简洁、有数据意识，习惯先评估资源。" },
  { id: "nanxing", name: "南星", role: "farmer", roleName: "农民", icon: "👩🏽‍🌾", traits: ["热情", "大胆", "行动派"], prompt: "你是南星，充满行动力的农民。语气积极，愿意率先下地，但会遵守农场安全规则。" },
  { id: "qiao", name: "乔木", role: "farmer", roleName: "农民", icon: "🧑🏻‍🌾", traits: ["安静", "可靠", "耐心"], prompt: "你是乔木，寡言可靠的农民。用朴素短句交流，耐心照料每块土地。" },
  { id: "zhiyuan", name: "知远", role: "rancher", roleName: "牧民", icon: "🤠", traits: ["温柔", "固执", "动物通"], prompt: "你是知远，温柔但坚持动物福利的牧民。围栏、健康和安全永远优先。" },
  { id: "mo", name: "小墨", role: "rancher", roleName: "牧民", icon: "🧑🏻‍🌾", traits: ["安静", "可靠", "早起"], prompt: "你是小墨，习惯早起、重视饲料和饮水的牧民。话少但观察细致。" },
  { id: "cang", name: "阿苍", role: "rancher", roleName: "牧民", icon: "🧔🏽", traits: ["豪爽", "勇敢", "护短"], prompt: "你是阿苍，豪爽勇敢的牧民。很爱护牲畜，说话直接，有问题会马上报告。" },
  { id: "lulu", name: "露露", role: "rancher", roleName: "牧民", icon: "👩🏻", traits: ["活泼", "细腻", "爱唱歌"], prompt: "你是露露，活泼细腻的牧民。会留意每只动物的情绪，表达亲切自然。" },
  { id: "muye", name: "牧野", role: "rancher", roleName: "牧民", icon: "🧑🏾", traits: ["沉稳", "务实", "方向感强"], prompt: "你是牧野，沉稳务实的放牧能手。擅长路线判断和天气观察。" },
  { id: "xiya", name: "希娅", role: "staff", roleName: "旅店员工", icon: "☕", traits: ["健谈", "好奇", "手艺好"], prompt: "你是希娅，热情健谈的旅店员工。关注客人、菜谱和镇上的新鲜事。" },
];

const residentFaces = {
  linxia: "👩",
  ahe: "🧑",
  suyun: "👨",
  nanxing: "👩",
  qiao: "🧑",
  zhiyuan: "🤠",
  mo: "🧑",
  cang: "👨",
  lulu: "👩",
  muye: "👨",
  xiya: "🙂",
};

const roleBadges = {
  farmer: "🌱",
  rancher: "🐾",
  staff: "☕",
};

function ResidentAvatar({ person }) {
  return (
    <div className={`resident-portrait ${person.role}`} aria-label={`${person.name}，${person.roleName}`}>
      <span className="avatar-face" aria-hidden="true">{residentFaces[person.id] || "🙂"}</span>
      <span className="avatar-role-badge" aria-hidden="true">{roleBadges[person.role]}</span>
    </div>
  );
}

const makePlots = () =>
  Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    crop: index < 8 ? "番茄" : index < 13 ? "番茄" : null,
    stage: index < 8 ? 4 : index < 13 ? 2 : 0,
    hydration: index < 8 ? 68 : index < 13 ? 42 : 0,
  }));

const defaultWorld = {
  day: 12,
  time: 560,
  weather: "晴朗",
  plots: makePlots(),
  barn: {
    animals: [
      { id: "cow-1", name: "奶糖", kind: "奶牛", icon: "🐄", hunger: 36, mood: 78 },
      { id: "cow-2", name: "栗子", kind: "奶牛", icon: "🐄", hunger: 42, mood: 72 },
      { id: "sheep-1", name: "云朵", kind: "绵羊", icon: "🐑", hunger: 28, mood: 86 },
      { id: "sheep-2", name: "棉花", kind: "绵羊", icon: "🐑", hunger: 34, mood: 80 },
      { id: "goat-1", name: "山竹", kind: "山羊", icon: "🐐", hunger: 31, mood: 75 },
      { id: "chicken-1", name: "豆豆", kind: "母鸡", icon: "🐔", hunger: 45, mood: 70 },
    ],
    grazing: false,
    milkReady: 2,
  },
  warehouse: { 番茄: 14, 番茄种子: 28, 饲料: 52, 牛奶: 6, 鸡蛋: 9 },
  tasks: [],
  memories: [
    { person: "林夏", text: "玩家希望成熟作物及时收进中央仓库。", time: "春 12 日" },
    { person: "知远", text: "玩家很在意牲畜的健康和放牧安全。", time: "春 11 日" },
  ],
  events: [{ id: 1, text: "晨雾谷农场开始了新的一天。", time: "09:20" }],
  stats: { harvested: 0, planted: 0, milked: 0 },
};

const loadJson = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const formatTime = (minutes) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const roleForTask = (type) => taskDefinitions[type]?.role;
const placeForTask = (type) => taskDefinitions[type]?.place;

function App() {
  const [world, setWorld] = useState(() => loadJson("cyber-farm-world-v2", defaultWorld));
  const [activeView, setActiveView] = useState("field");
  const [selectedNpc, setSelectedNpc] = useState(null);
  const [chatHistory, setChatHistory] = useState(() => loadJson("cyber-farm-chat-v2", {}));
  const [message, setMessage] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState(() =>
    loadJson("cyber-farm-ai-config", { provider: "openai", model: "gpt-5-mini", apiKey: "" }),
  );
  const [notice, setNotice] = useState("");
  const worldRef = useRef(world);

  useEffect(() => {
    worldRef.current = world;
    localStorage.setItem("cyber-farm-world-v2", JSON.stringify(world));
  }, [world]);
  useEffect(() => localStorage.setItem("cyber-farm-chat-v2", JSON.stringify(chatHistory)), [chatHistory]);
  useEffect(() => localStorage.setItem("cyber-farm-ai-config", JSON.stringify(aiConfig)), [aiConfig]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const addEvent = (draft, text) => ({
    ...draft,
    events: [{ id: Date.now() + Math.random(), text, time: formatTime(draft.time) }, ...draft.events].slice(0, 20),
  });

  const finishTask = (draft, task) => {
    const worker = residents.find((person) => person.id === task.assignee);
    let next = { ...draft };
    if (task.type === "sow") {
      let planted = 0;
      const availableSeeds = next.warehouse["番茄种子"] || 0;
      next.plots = next.plots.map((plot) => {
        if (!plot.crop && planted < Math.min(4, availableSeeds)) {
          planted += 1;
          return { ...plot, crop: "番茄", stage: 1, hydration: 30 };
        }
        return plot;
      });
      next.warehouse = { ...next.warehouse, 番茄种子: availableSeeds - planted };
      next.stats = { ...next.stats, planted: next.stats.planted + planted };
      next = addEvent(next, `${worker.name}完成播种，新增 ${planted} 格番茄。`);
    }
    if (task.type === "water") {
      const count = next.plots.filter((plot) => plot.crop).length;
      next.plots = next.plots.map((plot) => (plot.crop ? { ...plot, hydration: 100 } : plot));
      next = addEvent(next, `${worker.name}给 ${count} 格作物浇了水。`);
    }
    if (task.type === "harvest") {
      const harvested = next.plots.filter((plot) => plot.crop && plot.stage >= 4).length;
      next.plots = next.plots.map((plot) =>
        plot.crop && plot.stage >= 4 ? { ...plot, crop: null, stage: 0, hydration: 0 } : plot,
      );
      next.warehouse = { ...next.warehouse, 番茄: (next.warehouse.番茄 || 0) + harvested };
      next.stats = { ...next.stats, harvested: next.stats.harvested + harvested };
      next = addEvent(next, `${worker.name}收获 ${harvested} 篮番茄，已实时入库。`);
    }
    if (task.type === "feed") {
      const feedUsed = Math.min(next.barn.animals.length, next.warehouse.饲料 || 0);
      next.barn = {
        ...next.barn,
        animals: next.barn.animals.map((animal) => ({ ...animal, hunger: Math.max(0, animal.hunger - 55), mood: Math.min(100, animal.mood + 8) })),
      };
      next.warehouse = { ...next.warehouse, 饲料: Math.max(0, (next.warehouse.饲料 || 0) - feedUsed) };
      next = addEvent(next, `${worker.name}完成喂食，消耗 ${feedUsed} 份饲料。`);
    }
    if (task.type === "graze") {
      next.barn = {
        ...next.barn,
        grazing: true,
        animals: next.barn.animals.map((animal) => ({ ...animal, hunger: Math.max(0, animal.hunger - 25), mood: Math.min(100, animal.mood + 15) })),
      };
      next = addEvent(next, `${worker.name}已把牲畜带到东侧草场。`);
    }
    if (task.type === "milk") {
      const amount = next.barn.milkReady;
      next.barn = { ...next.barn, milkReady: 0 };
      next.warehouse = { ...next.warehouse, 牛奶: (next.warehouse.牛奶 || 0) + amount };
      next.stats = { ...next.stats, milked: next.stats.milked + amount };
      next = addEvent(next, `${worker.name}收集 ${amount} 瓶牛奶，已送到中央仓库。`);
    }
    return next;
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setWorld((current) => {
        let next = { ...current, time: current.time + 1 };
        if (next.time >= 1440) {
          next = {
            ...next,
            day: next.day + 1,
            time: next.time - 1440,
            barn: { ...next.barn, grazing: false, milkReady: 2 },
          };
          next = addEvent(next, `春季第 ${next.day} 天开始，牲畜回到畜舍。`);
        }
        const busy = new Set(current.tasks.filter((task) => task.status === "working").map((task) => task.assignee));
        let tasks = current.tasks.map((task) => {
          if (task.status === "queued" && !busy.has(task.assignee)) {
            busy.add(task.assignee);
            return { ...task, status: "working", startedAt: current.time };
          }
          return task;
        });
        const completed = [];
        tasks = tasks.map((task) => {
          if (task.status !== "working") return task;
          const progress = Math.min(100, task.progress + 4);
          if (progress >= 100) completed.push({ ...task, progress });
          return { ...task, progress, status: progress >= 100 ? "done" : "working" };
        });
        next.tasks = tasks;
        completed.forEach((task) => {
          next = finishTask(next, task);
        });
        if (next.time % 30 === 0) {
          next.plots = next.plots.map((plot) => {
            if (!plot.crop) return plot;
            const hydration = Math.max(0, plot.hydration - 4);
            const stage = hydration > 25 && next.time % 120 === 0 ? Math.min(4, plot.stage + 1) : plot.stage;
            return { ...plot, hydration, stage };
          });
          next.barn = {
            ...next.barn,
            animals: next.barn.animals.map((animal) => ({ ...animal, hunger: Math.min(100, animal.hunger + 2) })),
          };
        }
        return next;
      });
    }, 900);
    return () => window.clearInterval(timer);
  }, []);

  const activeTasks = world.tasks.filter((task) => task.status === "working");
  const queuedTasks = world.tasks.filter((task) => task.status === "queued");
  const matureCount = world.plots.filter((plot) => plot.crop && plot.stage >= 4).length;
  const plantedCount = world.plots.filter((plot) => plot.crop).length;

  const workerStatus = (npcId) => {
    const task = activeTasks.find((item) => item.assignee === npcId);
    return task ? `${taskDefinitions[task.type].label} · ${task.progress}%` : "等待安排";
  };

  const issueTask = (type, preferredNpc) => {
    const definition = taskDefinitions[type];
    if (!definition) return;
    const candidates = residents.filter((person) => person.role === definition.role);
    const worker =
      candidates.find((person) => person.id === preferredNpc) ||
      candidates.find((person) => !world.tasks.some((task) => task.assignee === person.id && ["queued", "working"].includes(task.status))) ||
      candidates[0];
    if (type === "sow" && !world.plots.some((plot) => !plot.crop)) return setNotice("土地已种满，没有空地可以播种。");
    if (type === "sow" && !world.warehouse["番茄种子"]) return setNotice("中央仓库没有番茄种子。");
    if (type === "harvest" && matureCount === 0) return setNotice("目前没有成熟作物可以收获。");
    if (type === "feed" && !world.warehouse.饲料) return setNotice("中央仓库没有饲料。");
    if (type === "milk" && world.barn.milkReady === 0) return setNotice("今天的牛奶已经收集完了。");
    const busy = world.tasks.some((task) => task.assignee === worker.id && ["queued", "working"].includes(task.status));
    const task = {
      id: Date.now() + Math.random(),
      type,
      assignee: worker.id,
      status: busy ? "queued" : "working",
      progress: 0,
      createdAt: world.time,
    };
    setWorld((current) => addEvent({ ...current, tasks: [task, ...current.tasks].slice(0, 40) }, `已安排${worker.name}${definition.label}。`));
    setActiveView(definition.place);
    setNotice(`${worker.name}已接受任务，前往${definition.place === "field" ? "田地" : "牧场"}。`);
  };

  const detectCommand = (text) => {
    if (/播种|种地|种番茄|下种/.test(text)) return "sow";
    if (/浇水|灌溉/.test(text)) return "water";
    if (/收获|收菜|摘番茄/.test(text)) return "harvest";
    if (/喂食|喂动物|饲料/.test(text)) return "feed";
    if (/放牧|遛牛|遛羊/.test(text)) return "graze";
    if (/挤奶|牛奶/.test(text)) return "milk";
    return null;
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || !selectedNpc || isReplying) return;
    const npc = residents.find((person) => person.id === selectedNpc);
    const previous = chatHistory[selectedNpc] || [];
    setChatHistory((history) => ({ ...history, [selectedNpc]: [...previous, { role: "player", text }] }));
    setMessage("");
    setIsReplying(true);
    let reply = "我记下了。会根据农场当前情况安排。";
    let action = detectCommand(text);
    if (aiConfig.apiKey) {
      try {
        const npcMemories = world.memories.filter((memory) => memory.person === npc.name).slice(0, 8);
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...aiConfig,
            npc: { ...npc, rolePrompt: npc.prompt },
            memories: npcMemories.map((memory) => memory.text),
            message: text,
            farm: {
              time: formatTime(world.time),
              plantedCount,
              matureCount,
              plots: world.plots.map((plot) => ({ crop: plot.crop, stage: plot.stage, hydration: plot.hydration })),
              animals: world.barn.animals,
              warehouse: world.warehouse,
              activeTasks: activeTasks.map((task) => taskDefinitions[task.type].label),
            },
          }),
        });
        if (!response.ok) throw new Error("AI request failed");
        const data = await response.json();
        reply = data.reply || reply;
        if (data.task?.type && taskDefinitions[data.task.type]) action = data.task.type;
        if (data.memory) {
          setWorld((current) => ({
            ...current,
            memories: [{ person: npc.name, text: String(data.memory).slice(0, 220), time: `春 ${current.day} 日` }, ...current.memories].slice(0, 80),
          }));
        }
      } catch {
        reply = `${reply}（模型暂时没有响应，我先按本地指令处理。）`;
      }
    } else if (action) {
      reply = `明白，我现在去${taskDefinitions[action].label}。你可以在对应区域实时看到进度。`;
    } else {
      reply = `${npc.name}看了看农场：“${npc.traits[0]}的我会记住这件事。”`;
    }
    if (action) issueTask(action, npc.id);
    setChatHistory((history) => ({
      ...history,
      [selectedNpc]: [...(history[selectedNpc] || []), { role: "npc", text: reply }],
    }));
    setIsReplying(false);
  };

  const advanceThirtyMinutes = () => {
    setWorld((current) => {
      let next = { ...current, time: current.time + 30 };
      next.plots = next.plots.map((plot) => {
        if (!plot.crop) return plot;
        const hydration = Math.max(0, plot.hydration - 6);
        return { ...plot, hydration, stage: hydration > 25 ? Math.min(4, plot.stage + 1) : plot.stage };
      });
      return addEvent(next, "时间推进了 30 分钟，作物状态已更新。");
    });
  };

  const chat = selectedNpc ? chatHistory[selectedNpc] || [] : [];
  const selectedPerson = residents.find((person) => person.id === selectedNpc);

  return (
    <div className="game-shell">
      <aside className="game-sidebar">
        <div className="game-brand"><span>✦</span><div><strong>霓虹农场</strong><small>实时经营模拟</small></div></div>
        <nav>
          {[
            ["field", "🌱", "实时土地"],
            ["barn", "🐄", "实时牧场"],
            ["warehouse", "📦", "中央仓库"],
            ["residents", "👥", "居民与指令"],
            ["tasks", "✓", "任务进度"],
          ].map(([id, icon, label]) => (
            <button key={id} className={activeView === id ? "active" : ""} onClick={() => setActiveView(id)}>
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="sim-status"><i />世界运行中<br /><small>每 0.9 秒推进 1 分钟</small></div>
      </aside>

      <main className="game-main">
        <header className="game-topbar">
          <div><p>春季 · 第 {world.day} 天</p><h1>{{ field: "实时土地", barn: "实时牧场", warehouse: "中央仓库", residents: "居民与指令", tasks: "任务进度" }[activeView]}</h1></div>
          <div className="world-clock"><span>☀ {world.weather}</span><strong>{formatTime(world.time)}</strong><button onClick={advanceThirtyMinutes}>＋30 分钟</button></div>
        </header>

        <section className="live-summary">
          <article><span>🌾</span><div><b>{plantedCount}/20</b><small>已种地块</small></div></article>
          <article><span>🍅</span><div><b>{matureCount}</b><small>成熟待收</small></div></article>
          <article><span>🐾</span><div><b>{world.barn.animals.length}</b><small>牧场动物</small></div></article>
          <article><span>📦</span><div><b>{Object.values(world.warehouse).reduce((sum, value) => sum + value, 0)}</b><small>仓库物资</small></div></article>
          <article><span>⚙</span><div><b>{activeTasks.length}</b><small>正在执行</small></div></article>
        </section>

        {activeView === "field" && (
          <section className="world-panel">
            <div className="panel-title"><div><p>FIELD 01 · 南侧番茄田</p><h2>土地与作物实时状态</h2></div><div className="quick-actions">
              <button onClick={() => issueTask("sow")}>🌰 播种</button>
              <button onClick={() => issueTask("water")}>💧 浇水</button>
              <button onClick={() => issueTask("harvest")}>🧺 收获</button>
            </div></div>
            <div className="field-scene">
              <div className="plot-grid">
                {world.plots.map((plot) => (
                  <article key={plot.id} className={`plot ${plot.crop ? `stage-${plot.stage}` : "empty"}`}>
                    <span className="plot-number">{String(plot.id).padStart(2, "0")}</span>
                    <div className="crop-sprite">{plot.crop ? CROP_ICONS[plot.stage] : "＋"}</div>
                    <strong>{plot.crop || "空地"}</strong>
                    <small>{plot.crop ? CROP_STAGES[plot.stage] : "可播种"}</small>
                    {plot.crop && <div className="water-meter"><i style={{ width: `${plot.hydration}%` }} /></div>}
                  </article>
                ))}
              </div>
              <div className="field-workers">
                {activeTasks.filter((task) => FIELD_ACTIONS.has(task.type)).map((task, index) => {
                  const worker = residents.find((person) => person.id === task.assignee);
                  return <div key={task.id} className={`working-character action-${task.type}`} style={{ left: `${10 + (index * 23) % 72}%`, top: `${18 + (index % 2) * 45}%` }}>
                    <div className="work-particle">{taskDefinitions[task.type].icon}</div>
                    <span>{residentFaces[worker.id] || "🙂"}</span><b>{worker.name}</b><small>{taskDefinitions[task.type].label} {task.progress}%</small>
                  </div>;
                })}
              </div>
            </div>
            <div className="scene-footer"><span>土壤平均含水量 {Math.round(world.plots.filter((plot) => plot.crop).reduce((sum, plot) => sum + plot.hydration, 0) / Math.max(1, plantedCount))}%</span><span>累计播种 {world.stats.planted} 格</span><span>累计收获 {world.stats.harvested} 篮</span></div>
          </section>
        )}

        {activeView === "barn" && (
          <section className="world-panel">
            <div className="panel-title"><div><p>BARN 01 · 月光牧场</p><h2>牲畜与放牧实时状态</h2></div><div className="quick-actions">
              <button onClick={() => issueTask("feed")}>🌾 喂食</button>
              <button onClick={() => issueTask("graze")}>🐾 放牧</button>
              <button onClick={() => issueTask("milk")}>🥛 挤奶</button>
            </div></div>
            <div className={`barn-scene ${world.barn.grazing ? "grazing" : ""}`}>
              <div className="barn-building">月光畜舍</div>
              <div className="pasture">
                {world.barn.animals.map((animal, index) => (
                  <div className="animal" key={animal.id} style={{ left: `${8 + (index * 15) % 80}%`, top: `${25 + (index % 2) * 38}%`, animationDelay: `${index * 0.2}s` }}>
                    <span>{animal.icon}</span><b>{animal.name}</b><small>饥饿 {animal.hunger}% · 心情 {animal.mood}%</small>
                  </div>
                ))}
                {activeTasks.filter((task) => BARN_ACTIONS.has(task.type)).map((task, index) => {
                  const worker = residents.find((person) => person.id === task.assignee);
                  return <div className={`working-character barn-worker action-${task.type}`} key={task.id} style={{ right: `${8 + index * 20}%`, top: "8%" }}>
                    <div className="work-particle">{taskDefinitions[task.type].icon}</div><span>{residentFaces[worker.id] || "🙂"}</span><b>{worker.name}</b><small>{taskDefinitions[task.type].label} {task.progress}%</small>
                  </div>;
                })}
              </div>
            </div>
            <div className="scene-footer"><span>{world.barn.grazing ? "牲畜正在东侧草场放牧" : "牲畜位于月光畜舍"}</span><span>可收牛奶 {world.barn.milkReady} 瓶</span><span>平均心情 {Math.round(world.barn.animals.reduce((sum, animal) => sum + animal.mood, 0) / world.barn.animals.length)}%</span></div>
          </section>
        )}

        {activeView === "warehouse" && (
          <section className="world-panel warehouse-panel">
            <div className="panel-title"><div><p>WAREHOUSE · 中央仓库</p><h2>收货与库存实时账本</h2></div><span className="live-badge">● LIVE</span></div>
            <div className="warehouse-grid">
              {Object.entries(world.warehouse).map(([item, count]) => (
                <article key={item}><span>{{ 番茄: "🍅", 番茄种子: "🌰", 饲料: "🌾", 牛奶: "🥛", 鸡蛋: "🥚" }[item] || "📦"}</span><div><strong>{item}</strong><b>{count}</b><small>{item === "番茄" ? "篮" : item === "牛奶" ? "瓶" : "份"}</small></div></article>
              ))}
            </div>
            <div className="ledger"><h3>最新收货记录</h3>{world.events.filter((event) => /入库|仓库|收获|牛奶/.test(event.text)).slice(0, 8).map((event) => <p key={event.id}><time>{event.time}</time>{event.text}</p>)}</div>
          </section>
        )}

        {activeView === "residents" && (
          <section className="residents-live-grid">
            {residents.map((person) => (
              <article key={person.id} className="resident-live-card">
                <ResidentAvatar person={person} />
                <div><h3>{person.name}</h3><p>{person.roleName} · {person.traits.join(" · ")}</p><small className={workerStatus(person.id) === "等待安排" ? "" : "busy"}>{workerStatus(person.id)}</small></div>
                <button onClick={() => setSelectedNpc(person.id)}>交谈 / 下指令</button>
              </article>
            ))}
          </section>
        )}

        {activeView === "tasks" && (
          <section className="world-panel">
            <div className="panel-title"><div><p>OPERATIONS</p><h2>执行队列与事件流</h2></div><span>{activeTasks.length} 执行中 · {queuedTasks.length} 排队</span></div>
            <div className="operations-layout">
              <div className="task-stream">
                {world.tasks.length === 0 && <div className="empty-state">还没有任务，可以从土地、牧场或居民对话中下达指令。</div>}
                {world.tasks.slice(0, 15).map((task) => {
                  const worker = residents.find((person) => person.id === task.assignee);
                  return <article key={task.id} className={`operation ${task.status}`}><span>{taskDefinitions[task.type].icon}</span><div><h3>{taskDefinitions[task.type].label}</h3><p>{worker.name} · {task.status === "working" ? "正在执行" : task.status === "queued" ? "等待前序任务" : "已完成"}</p><div className="progress"><i style={{ width: `${task.progress}%` }} /></div></div><b>{task.progress}%</b></article>;
                })}
              </div>
              <aside className="event-log"><h3>农场事件</h3>{world.events.slice(0, 12).map((event) => <p key={event.id}><time>{event.time}</time>{event.text}</p>)}</aside>
            </div>
          </section>
        )}
      </main>

      <button className="ai-settings-button" onClick={() => setAiOpen(true)}>✦ AI 模型设置</button>
      {notice && <div className="game-toast">{notice}</div>}

      {selectedPerson && (
        <div className="game-modal">
          <div className="chat-window">
            <button className="modal-close" onClick={() => setSelectedNpc(null)}>×</button>
            <header><ResidentAvatar person={selectedPerson} /><div><h2>{selectedPerson.name}</h2><p>{selectedPerson.roleName} · {workerStatus(selectedPerson.id)}</p></div></header>
            <div className="chat-messages">
              {chat.length === 0 && <div className="chat-welcome">和{selectedPerson.name}聊聊，或者直接说“去浇水”“播种番茄”“带动物放牧”。</div>}
              {chat.map((item, index) => <div className={`chat-bubble ${item.role}`} key={`${item.role}-${index}`}>{item.text}</div>)}
              {isReplying && <div className="chat-bubble npc typing"><i /><i /><i /><span>{selectedPerson.name}正在结合记忆思考…</span></div>}
            </div>
            <form className="chat-input" onSubmit={sendMessage}><input value={message} disabled={isReplying} onChange={(event) => setMessage(event.target.value)} placeholder={isReplying ? "正在生成回复…" : "输入对话或工作指令…"} /><button disabled={isReplying || !message.trim()}>{isReplying ? "生成中" : "发送"}</button></form>
            <div className="suggestions">{["去给田地浇水", "播种四格番茄", "收获成熟作物", "带动物去放牧"].map((text) => <button key={text} onClick={() => setMessage(text)}>{text}</button>)}</div>
          </div>
        </div>
      )}

      {aiOpen && (
        <div className="game-modal">
          <form className="settings-window" onSubmit={(event) => { event.preventDefault(); setAiOpen(false); setNotice(aiConfig.apiKey ? "AI 模型配置已保存在本地。" : "未填写 API Key，将使用本地指令引擎。"); }}>
            <button type="button" className="modal-close" onClick={() => setAiOpen(false)}>×</button>
            <p>AI ENGINE</p><h2>模型与密钥</h2>
            <label>服务商<select value={aiConfig.provider} onChange={(event) => { const provider = event.target.value; setAiConfig((current) => ({ ...current, provider, model: aiProviders[provider].models[0] })); }}>{Object.entries(aiProviders).map(([id, provider]) => <option key={id} value={id}>{provider.label}</option>)}</select></label>
            <label>模型<select value={aiConfig.model} onChange={(event) => setAiConfig((current) => ({ ...current, model: event.target.value }))}>{aiProviders[aiConfig.provider].models.map((model) => <option key={model}>{model}</option>)}</select></label>
            <label>API Key<input type="password" value={aiConfig.apiKey} onChange={(event) => setAiConfig((current) => ({ ...current, apiKey: event.target.value }))} placeholder="保存在当前浏览器本地" /></label>
            <small>配置后，角色会使用所选模型、独立人设、个人记忆和实时农场状态回答。</small>
            <button className="save-settings">保存设置</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default App;
