import '../src/index.css'

export const metadata = {
  title: '霓虹农场 · Cyber Farm',
  description: '一个会记住玩家对话的赛博农场模拟原型。',
  openGraph: {
    title: '霓虹农场 · Cyber Farm',
    description: '管理作物、牧场与有记忆的居民。',
    images: ['/og.png'],
  },
}

export default function RootLayout({ children }) {
  return <html lang="zh-CN"><body>{children}</body></html>
}
