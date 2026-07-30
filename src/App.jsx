"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./farm-game.css";
import "./farm-animations.css";
import "./icon-fix.css";
import "./anime-world.css";
import "./plot-actions.css";
import { advancePlotGrowth, canHarvestPlot, canWaterPlot, clampCropStage } from "./farm-rules.js";

const CROP_STAGES = ["破土", "幼苗", "生长期", "半成熟", "成熟"];
const CROP_DEFINITIONS = {
  番茄: { id: "tomato", icon: "🍅", seed: "番茄种子", unit: "篮" },
  胡萝卜: { id: "carrot", icon: "🥕", seed: "胡萝卜种子", unit: "篮" },
  玉米: { id: "corn", icon: "🌽", seed: "玉米种子", unit: "篮" },
  卷心菜: { id: "cabbage", icon: "🥬", seed: "卷心菜种子", unit: "篮" },
  小麦: { id: "wheat", icon: "🌾", seed: "小麦种子", unit: "捆" },
};
const cropStageImage = (crop, stage) =>
  `/assets/farm/${CROP_DEFINITIONS[crop]?.id || "tomato"}-stage-${Math.min(4, Math.max(0, stage))}-v1.webp`;
const FIELD_ACTIONS = new Set(["sow", "water", "harvest"]);
const BARN_ACTIONS = new Set(["feed", "graze", "milk"]);

const PLOT_LAYOUT = [
  { x: 26.3, y: 30.91, w: 11.6, h: 9.35 },
  { x: 38.42, y: 30.91, w: 10.71, h: 9.46 },
  { x: 50.38, y: 30.95, w: 10.53, h: 9.35 },
  { x: 62.45, y: 30.92, w: 10.77, h: 9.46 },
  { x: 74.64, y: 31.0, w: 11.6, h: 9.46 },
  { x: 24.09, y: 42.03, w: 12.14, h: 10.73 },
  { x: 37.12, y: 42.03, w: 12.08, h: 10.63 },
  { x: 50.17, y: 42.05, w: 11.42, h: 10.73 },
  { x: 63.34, y: 42.03, w: 12.02, h: 10.95 },
  { x: 76.6, y: 42.02, w: 12.38, h: 10.84 },
  { x: 21.56, y: 54.8, w: 13.34, h: 12.65 },
  { x: 35.78, y: 54.9, w: 12.92, h: 12.86 },
  { x: 49.84, y: 54.89, w: 12.62, h: 12.75 },
  { x: 64.14, y: 54.94, w: 13.04, h: 12.75 },
  { x: 78.85, y: 54.9, w: 13.34, h: 12.75 },
  { x: 18.52, y: 70.31, w: 14.89, h: 15.3 },
  { x: 34.0, y: 70.41, w: 14.41, h: 15.52 },
  { x: 49.52, y: 70.56, w: 13.94, h: 15.62 },
  { x: 65.22, y: 70.62, w: 14.83, h: 15.73 },
  { x: 81.49, y: 70.46, w: 15.49, h: 15.62 },
];

const FIELD_ACTION_ANCHORS = {
  sow: { x: -68, y: -82 },
  water: { x: -68, y: -84 },
  harvest: { x: -74, y: -88 },
};

const fieldWorkerPosition = (plotId, action) => {
  const plotIndex = Math.max(0, Math.min(PLOT_LAYOUT.length - 1, Number(plotId || 1) - 1));
  const plot = PLOT_LAYOUT[plotIndex];
  const row = Math.floor(plotIndex / 5);
  const anchor = FIELD_ACTION_ANCHORS[action] || FIELD_ACTION_ANCHORS.sow;
  return {
    "--worker-x": `${plot.x}%`,
    "--worker-y": `${plot.y + plot.h * 0.36}%`,
    "--worker-width": `${8 + row * 0.6}%`,
    "--worker-anchor-x": `${anchor.x}%`,
    "--worker-anchor-y": `${anchor.y}%`,
    zIndex: 12 + row,
  };
};

const ANIMAL_IMAGES = {
  奶牛: "/assets/farm/animal-cow-v1.webp",
  绵羊: "/assets/farm/animal-sheep-v1.webp",
  山羊: "/assets/farm/animal-goat-v1.webp",
  母鸡: "/assets/farm/animal-chicken-v1.webp",
};

const BARN_POSITIONS = {
  idle: [[31, 34], [47, 43], [59, 28], [70, 48], [43, 66], [74, 69]],
  feed: [[58, 24], [66, 25], [73, 31], [78, 37], [62, 37], [82, 27]],
  graze: [[27, 43], [48, 28], [68, 43], [36, 67], [60, 65], [79, 58]],
  milk: [[20, 68], [28, 65], [57, 36], [69, 48], [48, 67], [76, 66]],
};

const animalVisualState = (animal, index, barnMode) => {
  const mode = barnMode === "milk" && animal.kind !== "奶牛" ? "idle" : barnMode;
  const [left, top] = BARN_POSITIONS[mode][index];
  const labels = {
    idle: animal.hunger > 65 ? "寻找饲料" : "悠闲休息",
    feed: "正在进食",
    graze: "边走边吃草",
    milk: "正在挤奶",
  };
  return { mode, left, top, label: labels[mode] };
};

const taskDefinitions = {
  sow: { label: "播种作物", role: "farmer", place: "field", icon: "🌰", duration: 100 },
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

const roleBadges = {
  farmer: "🌱",
  rancher: "🐾",
  staff: "☕",
};

function ResidentAvatar({ person }) {
  return (
    <div className={`resident-portrait ${person.role}`} aria-label={`${person.name}，${person.roleName}`}>
      <img
        className="avatar-pixel"
        src={`/assets/farm/resident-${person.id}-pixel-v2.webp`}
        alt=""
        aria-hidden="true"
      />
      <span className="avatar-role-badge" aria-hidden="true">{roleBadges[person.role]}</span>
    </div>
  );
}

const makePlots = () =>
  Array.from({ length: 20 }, (_, index) => ({
    id: index + 1,
    crop: index < 13 ? ["番茄", "胡萝卜", "玉米", "卷心菜", "小麦"][index % 5] : null,
    stage: index < 8 ? 4 : index < 13 ? 2 : 0,
    hydration: index < 8 ? 68 : index < 13 ? 42 : 0,
  }));

const DEFAULT_WAREHOUSE = {
  番茄: 14,
  胡萝卜: 0,
  玉米: 0,
  卷心菜: 0,
  小麦: 0,
  番茄种子: 28,
  胡萝卜种子: 20,
  玉米种子: 18,
  卷心菜种子: 16,
  小麦种子: 24,
  饲料: 52,
  牛奶: 6,
  鸡蛋: 9,
};

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
  warehouse: DEFAULT_WAREHOUSE,
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

const normalizeWorldState = (stored) => ({
  ...defaultWorld,
  ...stored,
  plots: makePlots().map((fallbackPlot, index) => {
    const saved = stored?.plots?.[index];
    if (!saved) return fallbackPlot;
    const crop = saved.crop && CROP_DEFINITIONS[saved.crop] ? saved.crop : saved.crop ? "番茄" : null;
    return {
      ...fallbackPlot,
      ...saved,
      crop,
      stage: crop ? clampCropStage(saved.stage) : 0,
      hydration: crop ? Math.min(100, Math.max(0, Number(saved.hydration) || 0)) : 0,
    };
  }),
  warehouse: { ...DEFAULT_WAREHOUSE, ...(stored?.warehouse || {}) },
  tasks: (stored?.tasks || []).map((task) =>
    task.type === "sow" && !task.targetPlotId && ["queued", "working"].includes(task.status)
      ? { ...task, status: "cancelled", progress: 0 }
      : task,
  ),
  barn: { ...defaultWorld.barn, ...(stored?.barn || {}) },
  stats: { ...defaultWorld.stats, ...(stored?.stats || {}) },
});

const formatTime = (minutes) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const roleForTask = (type) => taskDefinitions[type]?.role;
const placeForTask = (type) => taskDefinitions[type]?.place;
const taskDisplayLabel = (task) => {
  if (task.type === "sow") return `在 ${task.targetPlotId || "?"} 号地播种${task.crop || "番茄"}`;
  if (task.type === "water") return `给 ${task.targetPlotId || "目标"} 号地浇水`;
  if (task.type === "harvest") return `收割 ${task.targetPlotId || "目标"} 号地`;
  return taskDefinitions[task.type]?.label || "农场任务";
};

function App() {
  const [world, setWorld] = useState(() => normalizeWorldState(loadJson("cyber-farm-world-v2", defaultWorld)));
  const [activeView, setActiveView] = useState("field");
  const [selectedNpc, setSelectedNpc] = useState(null);
  const [selectedPlotId, setSelectedPlotId] = useState(null);
  const [catalogCrop, setCatalogCrop] = useState("番茄");
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
      const crop = CROP_DEFINITIONS[task.crop] ? task.crop : "番茄";
      const seedKey = CROP_DEFINITIONS[crop].seed;
      const availableSeeds = next.warehouse[seedKey] || 0;
      let planted = 0;
      next.plots = next.plots.map((plot) => {
        if (plot.id === task.targetPlotId && !plot.crop && availableSeeds > 0) {
          planted += 1;
          return { ...plot, crop, stage: 0, hydration: 30 };
        }
        return plot;
      });
      next.warehouse = { ...next.warehouse, [seedKey]: availableSeeds - planted };
      next.stats = { ...next.stats, planted: next.stats.planted + planted };
      next = addEvent(
        next,
        planted
          ? `${worker.name}在 ${task.targetPlotId} 号地播种了${crop}。`
          : `${worker.name}到达 ${task.targetPlotId} 号地时发现无法播种，任务未改变地块。`,
      );
    }
    if (task.type === "water") {
      let watered = null;
      next.plots = next.plots.map((plot) => {
        if (plot.id !== task.targetPlotId || !canWaterPlot(plot)) return plot;
        watered = plot;
        return { ...plot, hydration: 100 };
      });
      next = addEvent(
        next,
        watered
          ? `${worker.name}给 ${task.targetPlotId} 号地的${watered.crop}浇了水。`
          : `${task.targetPlotId} 号地无需浇水，成熟作物会保持不变直到收割。`,
      );
    }
    if (task.type === "harvest") {
      let harvestedCrop = null;
      next.plots = next.plots.map((plot) => {
        if (plot.id !== task.targetPlotId || !canHarvestPlot(plot)) return plot;
        harvestedCrop = plot.crop;
        return { ...plot, crop: null, stage: 0, hydration: 0 };
      });
      if (harvestedCrop) {
        next.warehouse = {
          ...next.warehouse,
          [harvestedCrop]: (next.warehouse[harvestedCrop] || 0) + 1,
        };
        next.stats = { ...next.stats, harvested: next.stats.harvested + 1 };
      }
      next = addEvent(
        next,
        harvestedCrop
          ? `${worker.name}收割了 ${task.targetPlotId} 号地的${harvestedCrop}，已实时入库。`
          : `${task.targetPlotId} 号地尚未成熟，本次没有收割。`,
      );
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
          next.plots = next.plots.map((plot) =>
            advancePlotGrowth(plot, {
              hydrationLoss: 4,
              shouldAdvance: next.time % 120 === 0,
            }),
          );
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
  const activeBarnTask = activeTasks.find((task) => BARN_ACTIONS.has(task.type));
  const barnMode = activeBarnTask?.type || (world.barn.grazing ? "graze" : "idle");
  const matureCount = world.plots.filter((plot) => canHarvestPlot(plot)).length;
  const plantedCount = world.plots.filter((plot) => plot.crop).length;
  const cropCycleProgress = (world.time % 120) / 120;
  const selectedPlot = world.plots.find((plot) => plot.id === selectedPlotId) || null;

  const workerStatus = (npcId) => {
    const task = activeTasks.find((item) => item.assignee === npcId);
    return task ? `${taskDisplayLabel(task)} · ${task.progress}%` : "等待安排";
  };

  const issueTask = (type, preferredNpc, options = {}) => {
    const definition = taskDefinitions[type];
    if (!definition) return;
    let targetPlotId = options.targetPlotId || null;
    if (FIELD_ACTIONS.has(type) && !targetPlotId) {
      if (type === "sow") targetPlotId = world.plots.find((plot) => !plot.crop)?.id || null;
      if (type === "water") {
        targetPlotId = [...world.plots]
          .filter((plot) => canWaterPlot(plot))
          .sort((a, b) => a.hydration - b.hydration)[0]?.id || null;
      }
      if (type === "harvest") targetPlotId = world.plots.find((plot) => canHarvestPlot(plot))?.id || null;
    }
    const targetPlot = targetPlotId ? world.plots.find((plot) => plot.id === targetPlotId) : null;
    const crop = CROP_DEFINITIONS[options.crop] ? options.crop : catalogCrop;
    const candidates = residents.filter((person) => person.role === definition.role);
    const worker =
      candidates.find((person) => person.id === preferredNpc) ||
      candidates.find((person) => !world.tasks.some((task) => task.assignee === person.id && ["queued", "working"].includes(task.status))) ||
      candidates[0];
    if (type === "sow" && !targetPlot) return setNotice("土地已种满，没有空地可以播种。");
    if (type === "sow" && targetPlot.crop) return setNotice(`${targetPlot.id} 号地已经种有${targetPlot.crop}。`);
    if (type === "sow" && !world.warehouse[CROP_DEFINITIONS[crop].seed]) {
      return setNotice(`中央仓库没有${CROP_DEFINITIONS[crop].seed}。`);
    }
    if (type === "water" && !targetPlot) return setNotice("目前没有需要浇水的作物。");
    if (type === "water" && !canWaterPlot(targetPlot)) return setNotice("成熟作物会保持不变，后续操作只有收割。");
    if (type === "harvest" && !targetPlot) return setNotice("目前没有成熟作物可以收割。");
    if (type === "harvest" && !canHarvestPlot(targetPlot)) return setNotice(`${targetPlot.id} 号地尚未成熟。`);
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
      targetPlotId: FIELD_ACTIONS.has(type) ? targetPlotId : null,
      crop: type === "sow" ? crop : targetPlot?.crop || null,
    };
    setWorld((current) => addEvent({ ...current, tasks: [task, ...current.tasks].slice(0, 40) }, `已安排${worker.name}${taskDisplayLabel(task)}。`));
    setActiveView(definition.place);
    setSelectedPlotId(null);
    setNotice(`${worker.name}已接受任务，前往${definition.place === "field" ? `${targetPlotId} 号地` : "牧场"}。`);
  };

  const detectCommand = (text) => {
    if (/播种|种地|下种|种(?:番茄|胡萝卜|玉米|卷心菜|小麦)/.test(text)) return "sow";
    if (/浇水|灌溉/.test(text)) return "water";
    if (/收获|收割|收菜|摘番茄/.test(text)) return "harvest";
    if (/喂食|喂动物|饲料/.test(text)) return "feed";
    if (/放牧|遛牛|遛羊/.test(text)) return "graze";
    if (/挤奶|牛奶/.test(text)) return "milk";
    return null;
  };

  const detectCrop = (text) =>
    Object.keys(CROP_DEFINITIONS).find((crop) => text.includes(crop)) || null;

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
              activeTasks: activeTasks.map((task) => taskDisplayLabel(task)),
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
      reply = `明白，我现在去${action === "sow" ? `播种${detectCrop(text) || catalogCrop}` : taskDefinitions[action].label}。你可以在对应区域实时看到进度。`;
    } else {
      reply = `${npc.name}看了看农场：“${npc.traits[0]}的我会记住这件事。”`;
    }
    if (action) issueTask(action, npc.id, { crop: detectCrop(text) || undefined });
    setChatHistory((history) => ({
      ...history,
      [selectedNpc]: [...(history[selectedNpc] || []), { role: "npc", text: reply }],
    }));
    setIsReplying(false);
  };

  const advanceThirtyMinutes = () => {
    setWorld((current) => {
      let next = { ...current, time: current.time + 30 };
      next.plots = next.plots.map((plot) =>
        advancePlotGrowth(plot, { hydrationLoss: 6, shouldAdvance: true }),
      );
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
          <article><span>🧺</span><div><b>{matureCount}</b><small>成熟待收</small></div></article>
          <article><span>🐾</span><div><b>{world.barn.animals.length}</b><small>牧场动物</small></div></article>
          <article><span>📦</span><div><b>{Object.values(world.warehouse).reduce((sum, value) => sum + value, 0)}</b><small>仓库物资</small></div></article>
          <article><span>⚙</span><div><b>{activeTasks.length}</b><small>正在执行</small></div></article>
        </section>

        {activeView === "field" && (
          <section className="world-panel">
            <div className="panel-title"><div><p>FIELD 01 · 南侧轮作田</p><h2>土地与作物实时状态</h2></div><div className="quick-actions">
              <button onClick={() => {
                const emptyPlot = world.plots.find((plot) => !plot.crop);
                if (emptyPlot) setSelectedPlotId(emptyPlot.id);
                else setNotice("土地已种满，没有空地可以播种。");
              }}>🌰 选择作物播种</button>
              <button onClick={() => issueTask("water")}>💧 浇水</button>
              <button onClick={() => issueTask("harvest")}>🧺 收割</button>
            </div></div>
            <div className="crop-catalog" aria-label="本季可种作物">
              {Object.entries(CROP_DEFINITIONS).map(([crop, definition]) => (
                <button
                  type="button"
                  key={crop}
                  className={catalogCrop === crop ? "active" : ""}
                  onClick={() => setCatalogCrop(crop)}
                >
                  <img src={cropStageImage(crop, 4)} alt="" />
                  <span><b>{crop}</b><small>种子 {world.warehouse[definition.seed] || 0}</small></span>
                </button>
              ))}
            </div>
            <div className="growth-journey" aria-label={`${catalogCrop}完整生长过程`}>
              {CROP_STAGES.map((stage, index) => (
                <div className="growth-step" key={stage}>
                  <div className="growth-step-art"><img src={cropStageImage(catalogCrop, index)} alt="" /></div>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <b>{stage}</b>
                </div>
              ))}
            </div>
            <div className="field-scene">
              <div className="plot-grid">
                {world.plots.map((plot, plotIndex) => {
                  const isMature = plot.stage >= 4;
                  const layout = PLOT_LAYOUT[plotIndex];
                  return (
                    <article
                      key={plot.id}
                      className={`plot ${plot.crop ? `stage-${plot.stage}` : "empty"}`}
                      style={{
                        "--plot-x": `${layout.x}%`,
                        "--plot-y": `${layout.y}%`,
                        "--plot-width": `${layout.w}%`,
                        "--plot-height": `${layout.h}%`,
                      }}
                    >
                    <span className="plot-number">{String(plot.id).padStart(2, "0")}</span>
                    <button
                      type="button"
                      className="crop-sprite"
                      key={`${plot.id}-${plot.stage}`}
                      onClick={() => setSelectedPlotId(plot.id)}
                      aria-label={plot.crop ? `操作 ${plot.id} 号地的${plot.crop}` : `在 ${plot.id} 号空地播种`}
                    >
                      {plot.crop ? (
                        <>
                          <img
                            className="crop-current-stage"
                            src={cropStageImage(plot.crop, plot.stage)}
                            alt={`${plot.crop}：${CROP_STAGES[plot.stage]}`}
                            style={{
                              opacity: isMature ? 1 : 1 - cropCycleProgress * 0.72,
                              transform: `scale(${1 + cropCycleProgress * 0.04})`,
                            }}
                          />
                          {!isMature && (
                            <img
                              className="crop-next-stage"
                              src={cropStageImage(plot.crop, plot.stage + 1)}
                              alt=""
                              aria-hidden="true"
                              style={{
                                opacity: cropCycleProgress,
                                transform: `scale(${0.78 + cropCycleProgress * 0.22})`,
                              }}
                            />
                          )}
                        </>
                      ) : <span><b>＋</b><small>播种</small></span>}
                    </button>
                    <div className="plot-caption">
                      <strong>{plot.crop || "空地"}</strong>
                      <small>{plot.crop ? `${CROP_STAGES[plot.stage]}${isMature ? "" : ` · ${Math.round(cropCycleProgress * 100)}%`}` : "可播种"}</small>
                    </div>
                    {plot.crop && <div className="water-meter"><i style={{ width: `${plot.hydration}%` }} /></div>}
                    </article>
                  );
                })}
              </div>
              <div className="field-workers">
                {activeTasks.filter((task) => FIELD_ACTIONS.has(task.type)).map((task) => {
                  const worker = residents.find((person) => person.id === task.assignee);
                  return (
                    <div
                      key={task.id}
                      className={`field-worker action-${task.type}`}
                      style={fieldWorkerPosition(task.targetPlotId, task.type)}
                      aria-label={`${worker.name} ${taskDisplayLabel(task)} ${task.progress}%`}
                    >
                      <div className="field-worker-art" aria-hidden="true">
                        {[0, 1, 2, 3].map((frame) => (
                          <img
                            key={frame}
                            className="field-worker-frame"
                            src={`/assets/farm/worker-${worker.id}-${task.type}-frame-${frame}-pixel-v2.webp`}
                            alt=""
                            style={{ "--frame-index": frame }}
                          />
                        ))}
                      </div>
                      <div className="field-worker-status">
                        <b>{worker.name}</b>
                        <small>{taskDefinitions[task.type].label} · {task.progress}%</small>
                      </div>
                    </div>
                  );
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
            <div className={`barn-scene mode-${barnMode}`}>
              <div className="barn-mode-badge"><i />{{
                idle: "日常活动",
                feed: "集中进食",
                graze: "草场放牧",
                milk: "奶牛挤奶",
              }[barnMode]}</div>
              <div className="pasture">
                {world.barn.animals.map((animal, index) => {
                  const visual = animalVisualState(animal, index, barnMode);
                  return (
                    <div
                      className={`animal animal-${animal.kind} behavior-${visual.mode}`}
                      key={animal.id}
                      style={{
                        "--animal-left": `${visual.left}%`,
                        "--animal-top": `${visual.top}%`,
                        "--animal-delay": `${index * -0.65}s`,
                      }}
                    >
                      <div className="animal-art">
                        <img src={ANIMAL_IMAGES[animal.kind]} alt={animal.kind} />
                        <i className="animal-action-mark" aria-hidden="true" />
                      </div>
                      <div className="animal-card">
                        <b>{animal.name}</b>
                        <span>{visual.label}</span>
                        <small>饥饿 {animal.hunger}% · 心情 {animal.mood}%</small>
                      </div>
                    </div>
                  );
                })}
                {activeTasks.filter((task) => BARN_ACTIONS.has(task.type)).map((task, index) => {
                  const worker = residents.find((person) => person.id === task.assignee);
                  return <div className={`working-character barn-worker action-${task.type}`} key={task.id} style={{ right: `${8 + index * 20}%`, top: "8%" }}>
                    <div className="work-particle">{taskDefinitions[task.type].icon}</div>
                    <img className="barn-worker-pixel" src={`/assets/farm/resident-${worker.id}-pixel-v2.webp`} alt="" />
                    <b>{worker.name}</b><small>{taskDisplayLabel(task)} {task.progress}%</small>
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
              {Object.entries(world.warehouse).map(([item, count]) => {
                const cropDefinition = CROP_DEFINITIONS[item];
                const seedCrop = Object.entries(CROP_DEFINITIONS).find(([, definition]) => definition.seed === item);
                const icon = cropDefinition?.icon || (seedCrop ? "🌰" : { 饲料: "🌾", 牛奶: "🥛", 鸡蛋: "🥚" }[item]) || "📦";
                const unit = cropDefinition?.unit || (item === "牛奶" ? "瓶" : "份");
                return <article key={item}><span>{icon}</span><div><strong>{item}</strong><b>{count}</b><small>{unit}</small></div></article>;
              })}
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
                  return <article key={task.id} className={`operation ${task.status}`}><span>{taskDefinitions[task.type].icon}</span><div><h3>{taskDisplayLabel(task)}</h3><p>{worker.name} · {task.status === "working" ? "正在执行" : task.status === "queued" ? "等待前序任务" : task.status === "cancelled" ? "旧任务已取消" : "已完成"}</p><div className="progress"><i style={{ width: `${task.progress}%` }} /></div></div><b>{task.progress}%</b></article>;
                })}
              </div>
              <aside className="event-log"><h3>农场事件</h3>{world.events.slice(0, 12).map((event) => <p key={event.id}><time>{event.time}</time>{event.text}</p>)}</aside>
            </div>
          </section>
        )}
      </main>

      <button className="ai-settings-button" onClick={() => setAiOpen(true)}>✦ AI 模型设置</button>
      {notice && <div className="game-toast">{notice}</div>}

      {selectedPlot && (
        <div className="game-modal plot-action-backdrop" onMouseDown={() => setSelectedPlotId(null)}>
          <section className="plot-action-panel" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelectedPlotId(null)}>×</button>
            <p>PLOT {String(selectedPlot.id).padStart(2, "0")}</p>
            <div className="plot-action-header">
              <div className={`plot-action-preview ${selectedPlot.crop ? "" : "empty"}`}>
                {selectedPlot.crop
                  ? <img src={cropStageImage(selectedPlot.crop, selectedPlot.stage)} alt={selectedPlot.crop} />
                  : <span>＋</span>}
              </div>
              <div>
                <h2>{selectedPlot.crop || "选择要播种的作物"}</h2>
                <small>
                  {selectedPlot.crop
                    ? `${CROP_STAGES[selectedPlot.stage]} · 土壤含水量 ${selectedPlot.hydration}%`
                    : "选择一种种子，农民会前往这块空地播种。"}
                </small>
              </div>
            </div>

            {!selectedPlot.crop && (
              <div className="plot-crop-options">
                {Object.entries(CROP_DEFINITIONS).map(([crop, definition]) => {
                  const seedCount = world.warehouse[definition.seed] || 0;
                  return (
                    <button
                      type="button"
                      key={crop}
                      disabled={seedCount === 0}
                      onClick={() => {
                        setCatalogCrop(crop);
                        issueTask("sow", null, { targetPlotId: selectedPlot.id, crop });
                      }}
                    >
                      <img src={cropStageImage(crop, 4)} alt="" />
                      <span><b>{crop}</b><small>{definition.seed} · {seedCount}</small></span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedPlot.crop && selectedPlot.stage < 4 && (
              <div className="plot-action-buttons">
                <button type="button" onClick={() => issueTask("water", null, { targetPlotId: selectedPlot.id })}>
                  <span>💧</span><b>安排农民浇水</b><small>只处理 {selectedPlot.id} 号地</small>
                </button>
              </div>
            )}

            {selectedPlot.crop && selectedPlot.stage >= 4 && (
              <>
                <div className="mature-lock-note">
                  <span>✓</span>
                  <div><b>作物已经成熟并锁定</b><small>不会重新变成幼苗，也不会继续消耗水分；后续操作只有收割。</small></div>
                </div>
                <div className="plot-action-buttons">
                  <button type="button" className="harvest" onClick={() => issueTask("harvest", null, { targetPlotId: selectedPlot.id })}>
                    <span>🧺</span><b>安排农民收割</b><small>收获将实时进入中央仓库</small>
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

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
            <div className="suggestions">{["去给最干的田地浇水", "播种胡萝卜", "收割一块成熟作物", "带动物去放牧"].map((text) => <button key={text} onClick={() => setMessage(text)}>{text}</button>)}</div>
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
