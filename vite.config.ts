import vinext from 'vinext'
import { defineConfig } from 'vite'
import hostingConfig from './.openai/hosting.json'
import { sites } from './build/sites-vite-plugin'

const { d1, r2 } = hostingConfig
const placeholderDatabaseId = '00000000-0000-4000-8000-000000000000'

export default defineConfig(async () => {
  const { cloudflare } = await import('@cloudflare/vite-plugin')
  return {
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        config: {
          main: './worker/index.ts',
          compatibility_flags: ['nodejs_compat'],
          d1_databases: d1 ? [{ binding: d1, database_name: 'cyber-farm', database_id: placeholderDatabaseId }] : [],
          r2_buckets: r2 ? [{ binding: r2, bucket_name: 'cyber-farm' }] : [],
        },
      }),
    ],
  }
})
