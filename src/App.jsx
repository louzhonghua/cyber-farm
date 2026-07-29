'use client'

import { useEffect, useMemo, useState } from 'react'
import './ai.css'

const seed = {
  time: 560,
  ripeCrops: 8,
  animals: 12,
  residents: [
    { id: 'linxia', name: '林夏', role: 'farmer', roleName: '农民', icon: '🌱', traits: ['勤劳', '慢热', '爱种花'], status: '正在查看番茄田', memory: '玩家喜欢在收获前确认库存。' },
    { id: 'ahe', name: '阿禾', role: 'farmer', roleName: '农民', icon: '🧑🏽‍🌾', traits: ['开朗', '细心', '爱讲冷笑话'], status: '整理中央仓库', memory: '上周玩家夸过我整理得很利落。' },
    { id: 'zhiyuan', name: '知远', role: 'rancher', roleName: '牧民', icon: '🐄', traits: ['温柔', '固执', '动物通'], status: '准备带羊群放牧', memory: '玩家答应会修好西侧的围栏。' },
    { id: 'mo', name: '小墨', role: 'rancher', roleName: '牧民', icon: '🐑', traits: ['安静', '可靠', '早起'], status: '给牲畜添水', memory: '我记得玩家不喜欢浪费饲料。' },
    { id: 'xiya', name: '希娅', role: 'staff', roleName: '旅店员工', icon: '☕', traits: ['健谈', '好奇', '手艺好'], status: '招待第一位客人', memory: '玩家说过旅店的南瓜汤很不错。' },
  ],
  tasks: [
    { id: 1, title: '收获南侧番茄田', type: 'harvest', assignee: 'linxia', status: 'active', priority: 3, detail: '8 格作物已成熟' },
    { id: 2, title: '带羊群去东侧草场', type: 'graze', assignee: 'zhiyuan', status: 'queued', priority: 2, detail: '晴天适合放牧' },
    { id: 3, title: '清点中央仓库种子', type: 'store', assignee: 'ahe', status: 'done', priority: 1, detail: '已完成' },
  ],
  memories: [
    { date: '春 12 日 · 09:20', title: '番茄收获计划', text: '林夏记得玩家希望先确认成熟作物，再决定是否出售。', person: '林夏' },
    { date: '春 11 日 · 18:40', title: '关于围栏的承诺', text: '知远向玩家提起西侧围栏松动；玩家答应近期处理。', person: '知远' },
    { date: '春 09 日 · 12:15', title: '旅店的南瓜汤', text: '希娅记住了玩家对南瓜汤的称赞，关系值轻微上升。', person: '希娅' },
  ],
}

const taskConfig = {
  harvest: { title: '收获南侧番茄田', detail: (state) => `${state.ripeCrops} 格作物待收获`, role: 'farmer' },
  graze: { title: '带动物去东侧草场', detail: () => '晴天适合放牧', role: 'rancher' },
  feed: { title: '给月光畜舍添饲料', detail: () => '饲料库存充足', role: 'rancher' },
  store: { title: '整理中央仓库', detail: () => '按种子与产物分类', role: 'farmer' },
}

const aiProviders = {
  openai: { label: 'OpenAI', models: ['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4.1-mini'] },
  anthropic: { label: 'Claude', models: ['claude-sonnet-4-5', 'claude-haiku-4-5'] },
  gemini: { label: 'Google Gemini', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  deepseek: { label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
  qwen: { label: '通义千问', models: ['qwen-max', 'qwen-plus', 'qwen-turbo'] },
  kimi: { label: 'Kimi', models: ['moonshot-v1-8k', 'moonshot-v1-32k'] },
  zhipu: { label: '智谱 GLM', models: ['glm-4.7', 'glm-4-plus'] },
  openrouter: { label: 'OpenRouter', models: ['openai/gpt-5-mini', 'anthropic/claude-sonnet-4-5', 'google/gemini-2.5-flash'] },
}

const npcPrompts = {
  linxia: 'You are Linxia, a patient and diligent crop farmer. You notice ripeness, storage, watering, and flowers. Speak softly, be practical, and do not over-promise.',
  ahe: 'You are Ahe, an upbeat and meticulous farmer. You love order, inventory, and harmless jokes. Offer clear next steps and keep the mood light.',
  zhiyuan: 'You are Zhiyuan, a gentle but stubborn rancher. Animal welfare and safe fences come first. Be warm, observant, and firmly decline unsafe animal work.',
  mo: 'You are Mo, a quiet, reliable rancher who prefers early work and efficient routines. Use few but thoughtful words; pay attention to feed and water.',
  xiya: 'You are Xiya, a curious, sociable inn worker. You love guests, recipes, and local stories. Be welcoming and turn small details into friendly conversation.',
}

const load = () => {
  try { return JSON.parse(localStorage.getItem('cyber-farm-state')) ?? structuredClone(seed) } catch { return structuredClone(seed) }
}

const formatTime = (time) => `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`

function Avatar({ person }) { return <div className={`avatar ${person.role}`}>{person.icon}</div> }

function ResidentCard({ person, directory = false, onTalk }) {
  return <article className={`resident-card ${directory ? 'directory-card' : ''}`}>
    <Avatar person={person} />
    <div>
      <h3 className="resident-name">{person.name}</h3>
      <p className="resident-role">{person.roleName}</p>
      {directory ? <div className="traits">{person.traits.map((trait) => <span className="trait" key={trait}>{trait}</span>)}</div> : <p className="status">{person.status}</p>}
    </div>
    {directory && <button className="talk-button" onClick={() => onTalk(person.id)}>交谈</button>}
  </article>
}

export default function App() {
  const [state, setState] = useState(load)
  const [tab, setTab] = useState('farm')
  const [filter, setFilter] = useState('all')
  const [activePersonId, setActivePersonId] = useState(null)
  const [chat, setChat] = useState([])
  const [message, setMessage] = useState('')
  const [taskModal, setTaskModal] = useState(false)
  const [taskDraft, setTaskDraft] = useState({ assignee: 'linxia', type: 'harvest', priority: 2 })
  const [notice, setNotice] = useState('')
  const [aiModal, setAiModal] = useState(false)
  const [aiConfig, setAiConfig] = useState({ provider: 'openai', model: 'gpt-4.1-mini', apiKey: '' })

  useEffect(() => { localStorage.setItem('cyber-farm-state', JSON.stringify(state)) }, [state])
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(''), 2500); return () => window.clearTimeout(timer) }, [notice])

  const person = (id) => state.residents.find((item) => item.id === id)
  const activePerson = activePersonId ? person(activePersonId) : null
  const counts = useMemo(() => state.tasks.reduce((total, task) => ({ ...total, [task.status]: total[task.status] + 1 }), { active: 0, queued: 0, done: 0 }), [state.tasks])
  const setResidentStatus = (residents, id, status) => residents.map((resident) => resident.id === id ? { ...resident, status } : resident)

  const addMemory = (draft, personName, title, text) => ({ ...draft, memories: [{ date: `春 12 日 · ${formatTime(draft.time)}`, title, text, person: personName }, ...draft.memories].slice(0, 12) })
  const createTask = (assignee, type, priority = 2) => {
    const config = taskConfig[type]
    const assigneePerson = person(assignee)
    if (!assigneePerson || assigneePerson.role !== config.role) { setNotice(`${assigneePerson?.name ?? '这位居民'}不适合这项工作`); return false }
    if (state.tasks.some((task) => task.type === type && task.status !== 'done')) { setNotice('这项工作已经在任务列表中了'); return false }
    const task = { id: Date.now(), title: config.title, type, assignee, status: state.tasks.some((item) => item.status === 'active') ? 'queued' : 'active', priority: Number(priority), detail: config.detail(state) }
    setState((old) => {
      const updated = { ...old, tasks: [task, ...old.tasks], residents: setResidentStatus(old.residents, assignee, `准备${config.title}`) }
      return addMemory(updated, assigneePerson.name, '接受了新的安排', `${assigneePerson.name}记住了玩家交办的事：${config.title}。`)
    })
    setNotice(`任务已经安排给 ${assigneePerson.name}`)
    return true
  }
  const completeTask = (taskId) => {
    const task = state.tasks.find((item) => item.id === taskId)
    if (!task) return
    setState((old) => {
      const nextTask = old.tasks.find((item) => item.status === 'queued')
      const updatedTasks = old.tasks.map((item) => item.id === taskId ? { ...item, status: 'done', detail: item.type === 'harvest' ? '已收入仓库' : item.type === 'graze' ? '动物正在草场活动' : '已完成' } : item.id === nextTask?.id ? { ...item, status: 'active' } : item)
      let updated = { ...old, ripeCrops: task.type === 'harvest' ? 0 : old.ripeCrops, tasks: updatedTasks, residents: setResidentStatus(old.residents, task.assignee, '等待新的安排') }
      if (nextTask) updated = { ...updated, residents: setResidentStatus(updated.residents, nextTask.assignee, `正在${nextTask.title}`) }
      return addMemory(updated, person(task.assignee).name, '完成了一项工作', `${person(task.assignee).name}完成了玩家安排的工作：${task.title}。`)
    })
    setNotice('任务已完成')
  }
  const openChat = (id) => { const resident = person(id); setActivePersonId(id); setChat([{ kind: 'npc', text: `你好，今天农场的空气很好。${resident.memory}` }]); setMessage('') }
  const sendChat = async (event) => {
    event.preventDefault()
    const input = message.trim()
    if (!input || !activePerson) return
    let response = '我记下了。有什么需要我帮忙处理的吗？'
    let type = null
    if (/番茄|收获|收菜/.test(input)) { type = 'harvest'; response = activePerson.role === 'farmer' ? '好，我会优先处理南侧番茄田，收完后向你汇报。' : '番茄田需要农民照料；我已经替你通知一位农民。' }
    else if (/放牧|羊|牛|牲畜/.test(input)) { type = 'graze'; response = activePerson.role === 'rancher' ? '明白，天气正好，我会带动物去东侧草场。' : '牲畜的事交给牧民更合适，我已经替你转达。' }
    else if (/喜欢|这里|心情|怎么样/.test(input)) response = `我挺喜欢这里的。${activePerson.traits[0]}的我，最在意农场里每个人都能安心做自己的事。`
    else if (/谢谢|辛苦/.test(input)) { response = '不用客气！你的这句话我会记住的。'; setState((old) => addMemory(old, activePerson.name, '来自玩家的感谢', `玩家在 ${formatTime(old.time)} 向${activePerson.name}表达了感谢。`)) }
    if (aiConfig.apiKey) {
      try {
        const memories = state.memories.filter((item) => item.person === activePerson.name).slice(0, 6).map((item) => `${item.title}: ${item.text}`)
        const result = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...aiConfig, npc: { ...activePerson, rolePrompt: npcPrompts[activePerson.id] }, memories, message: input, farm: { time: formatTime(state.time), ripeCrops: state.ripeCrops, animals: state.animals } }) })
        if (!result.ok) throw new Error('AI unavailable')
        const data = await result.json()
        if (data.reply) response = data.reply
        if (data.task && taskConfig[data.task.type]) type = data.task.type
        if (data.memory) setState((old) => addMemory(old, activePerson.name, 'AI 归纳的长期记忆', String(data.memory).slice(0, 180)))
      } catch { setNotice('AI 暂时不可用，已使用本地规则回复') }
    }
    if (type) { const worker = activePerson.role === taskConfig[type].role ? activePerson : state.residents.find((item) => item.role === taskConfig[type].role); createTask(worker.id, type, 3) }
    setState((old) => addMemory(old, activePerson.name, '与玩家的一次交谈', `玩家说：“${input.slice(0, 60)}”。${activePerson.name}的回应已记录。`))
    setChat((old) => [...old, { kind: 'player', text: input }, { kind: 'npc', text: response }]); setMessage('')
  }

  const briefings = [
    state.ripeCrops ? ['作物待收获', `南侧番茄田有 ${state.ripeCrops} 格成熟作物。`] : ['田地状态良好', '南侧番茄已全部收完。'],
    ['放牧条件适宜', '今天晴朗，东侧草场可供动物活动。'],
    counts.active ? ['正在执行', `${person(state.tasks.find((task) => task.status === 'active').assignee).name} 正在处理优先工作。`] : ['等待新的安排', '居民们目前没有紧急工作。'],
  ]
  const filteredResidents = filter === 'all' ? state.residents : state.residents.filter((resident) => resident.role === filter)
  const nav = [['farm', '⌁', '农场总览'], ['people', '◌', '居民名册'], ['tasks', '✓', '任务中心'], ['memory', '◈', '记忆档案']]
  const pageTitles = { farm: '农场总览', people: '居民名册', tasks: '任务中心', memory: '记忆档案' }

  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#root"><span className="brand-mark">✦</span><span>霓虹农场</span></a><nav>{nav.map(([id, icon, label]) => <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}><span>{icon}</span>{label}</button>)}</nav><div className="sidebar-footer"><span className="online-dot" /> 模拟系统运行中</div></aside>
    <main className="main-content">
      <header className="topbar"><div><p className="eyebrow">春季 · 第 12 天</p><h1>{pageTitles[tab]}</h1></div><div className="clock-panel"><span>{formatTime(state.time)}</span><button className="icon-button" title="推进 30 分钟" onClick={() => { setState((old) => ({ ...old, time: (old.time + 30) % 1440 })); setNotice('时间已推进 30 分钟') }}>＋</button></div></header>
      {tab === 'farm' && <><div className="farm-layout"><section className="map-card card"><div className="card-heading"><div><p className="eyebrow">现场状态</p><h2>晨雾谷农场</h2></div><span className="weather">☀ 晴朗 18°C</span></div><div className="farm-map"><div className="path path-one" /><div className="path path-two" /><button className="map-zone field-zone" onClick={() => setNotice('南侧番茄田：可在任务中心安排收获')}><span>♧</span><strong>南侧番茄田</strong><small><b>{state.ripeCrops}</b> 格待收获</small></button><button className="map-zone barn-zone" onClick={() => setNotice('月光畜舍：可安排牧民放牧或添饲料')}><span>♘</span><strong>月光畜舍</strong><small><b>{state.animals}</b> 只动物</small></button><button className="map-zone storage-zone" onClick={() => setNotice('中央仓库：库存充足')}><span>▣</span><strong>中央仓库</strong><small>库存充足</small></button><button className="map-zone inn-zone" onClick={() => setNotice('星尘旅店：营业中')}><span>⌂</span><strong>星尘旅店</strong><small>营业中</small></button><span className="map-person person-1">●</span><span className="map-person person-2">●</span><span className="map-person person-3">●</span></div><div className="legend"><span><i className="legend-green" />可作业区域</span><span><i className="legend-blue" />服务设施</span><span><i className="legend-pink" />居民位置</span></div></section><aside className="today-card card"><div className="card-heading"><div><p className="eyebrow">每日简报</p><h2>今天要紧的事</h2></div></div><ul className="briefing-list">{briefings.map(([heading, text]) => <li key={heading}><b>{heading}</b>{text}</li>)}</ul><button className="text-button" onClick={() => setTab('tasks')}>查看任务中心 →</button></aside></div><section className="residents-section"><div className="section-heading"><div><p className="eyebrow">正在工作</p><h2>居民动态</h2></div><button className="text-button" onClick={() => setTab('people')}>全部居民 →</button></div><div className="resident-grid">{state.residents.map((resident) => <ResidentCard key={resident.id} person={resident} />)}</div></section></>}
      {tab === 'people' && <section><div className="section-heading"><div><p className="eyebrow">共 5 位居民</p><h2>居民名册</h2></div><div className="filter-group">{[['all', '全部'], ['farmer', '农民'], ['rancher', '牧民'], ['staff', '员工']].map(([id, label]) => <button key={id} className={`filter ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>{label}</button>)}</div></div><div className="directory-grid">{filteredResidents.map((resident) => <ResidentCard key={resident.id} person={resident} directory onTalk={openChat} />)}</div></section>}
      {tab === 'tasks' && <section><div className="section-heading"><div><p className="eyebrow">人机协作</p><h2>任务中心</h2></div><button className="primary-button" onClick={() => setTaskModal(true)}>＋ 新建任务</button></div><div className="task-summary">{[['active', '执行中'], ['queued', '等待中'], ['done', '今日完成']].map(([id, label]) => <div key={id}><span>{counts[id]}</span><small>{label}</small></div>)}</div><div className="task-list">{state.tasks.map((task) => <article className="task-item" key={task.id}><i className={`priority-dot priority-${task.priority}`} /><div><h3>{task.title}</h3><p>{person(task.assignee).name} · {task.detail}</p></div><span className="task-status">{{ active: '执行中', queued: '等待中', done: '已完成' }[task.status]}</span>{task.status !== 'done' && <button className="complete-task" onClick={() => completeTask(task.id)}>标为完成</button>}</article>)}</div></section>}
      {tab === 'memory' && <section><div className="section-heading"><div><p className="eyebrow">关系与经历</p><h2>记忆档案</h2></div><p className="muted">只保留对居民关系和行为有影响的事件</p></div><div className="memory-list">{state.memories.map((memory, index) => <article className="memory-item" key={`${memory.date}-${index}`}><div className="memory-date">{memory.date}<br /><br />{memory.person}</div><div><h3>{memory.title}</h3><p>{memory.text}</p></div></article>)}</div></section>}
    </main>
    {activePerson && <div className="modal"><div className="dialogue-window"><button className="close-button" onClick={() => setActivePersonId(null)}>×</button><div className="dialogue-person"><Avatar person={activePerson} /><div><h2>{activePerson.name}</h2><p>{activePerson.roleName} · {activePerson.traits.join(' · ')}</p></div></div><div className="chat-log">{chat.map((item, index) => <div key={index} className={`message ${item.kind}`}>{item.text}</div>)}</div><form className="chat-form" onSubmit={sendChat}><input value={message} onChange={(event) => setMessage(event.target.value)} autoFocus placeholder="例如：今天优先收获番茄" /><button className="primary-button" type="submit">发送</button></form><p className="input-hint">试试：收番茄 / 去放牧 / 你喜欢这里吗？</p></div></div>}
    {taskModal && <div className="modal"><form className="form-window" onSubmit={(event) => { event.preventDefault(); if (createTask(taskDraft.assignee, taskDraft.type, taskDraft.priority)) setTaskModal(false) }}><button type="button" className="close-button" onClick={() => setTaskModal(false)}>×</button><p className="eyebrow">清晰的任务会被优先执行</p><h2>安排一项工作</h2><label>交给谁<select value={taskDraft.assignee} onChange={(event) => setTaskDraft((old) => ({ ...old, assignee: event.target.value }))}>{state.residents.map((resident) => <option value={resident.id} key={resident.id}>{resident.name} · {resident.roleName}</option>)}</select></label><label>工作内容<select value={taskDraft.type} onChange={(event) => setTaskDraft((old) => ({ ...old, type: event.target.value }))}>{Object.entries(taskConfig).map(([id, config]) => <option value={id} key={id}>{config.title}</option>)}</select></label><label>优先级<div className="priority-input"><input type="range" min="1" max="3" value={taskDraft.priority} onChange={(event) => setTaskDraft((old) => ({ ...old, priority: event.target.value }))} /><span>{['', '低', '普通', '紧急'][taskDraft.priority]}</span></div></label><button className="primary-button" type="submit">确认安排</button></form></div>}
    <button className="ai-fab" onClick={() => setAiModal(true)}>✦ AI 设置</button>
    {aiModal && <div className="modal"><form className="form-window ai-window" onSubmit={(event) => { event.preventDefault(); setAiModal(false); setNotice(aiConfig.apiKey ? `已连接 ${aiProviders[aiConfig.provider].label}` : '未填写 API Key，将继续使用本地规则') }}><button type="button" className="close-button" onClick={() => setAiModal(false)}>×</button><p className="eyebrow">AI 对话引擎</p><h2>选择你的模型</h2><label>服务商<select value={aiConfig.provider} onChange={(event) => { const provider = event.target.value; setAiConfig((old) => ({ ...old, provider, model: aiProviders[provider].models[0] })) }}>{Object.entries(aiProviders).map(([id, provider]) => <option key={id} value={id}>{provider.label}</option>)}</select></label><label>模型<select value={aiConfig.model} onChange={(event) => setAiConfig((old) => ({ ...old, model: event.target.value }))}>{aiProviders[aiConfig.provider].models.map((model) => <option key={model}>{model}</option>)}</select></label><label>你的 API Key<input type="password" value={aiConfig.apiKey} onChange={(event) => setAiConfig((old) => ({ ...old, apiKey: event.target.value }))} placeholder="仅在本次页面会话中使用" autoComplete="off" /></label><p className="input-hint">密钥不会写入农场存档。连接后，NPC 会按所选模型生成回复并提炼记忆。</p><button className="primary-button" type="submit">保存 AI 设置</button></form></div>}
    {notice && <div className="toast">{notice}</div>}
  </div>
}
