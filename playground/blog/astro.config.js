import { defineConfig } from 'astro/config'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import preact from '@astrojs/preact'
import pagesHmr from 'astro-pages-hmr'

// https://astro.build/config
export default defineConfig({
  devToolbar: { enabled: false },
  site: 'https://example.com',
  integrations: [mdx(), sitemap(), preact(), pagesHmr()]
})
