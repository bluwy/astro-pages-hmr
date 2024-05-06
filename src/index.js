import fs from 'node:fs/promises'

/** @type {import('./index.d.ts').default} */
export default function astroPagesHmr() {
  return {
    name: 'astro-pagea-hmr',
    hooks: {
      'astro:config:setup': async ({ updateConfig, injectScript }) => {
        const hmrRuntime = await fs.readFile(
          new URL('hmr-runtime-bundled.js', import.meta.url),
          'utf-8'
        )
        injectScript('page', hmrRuntime)

        updateConfig({
          vite: {
            plugins: [pagesHmrPlugin()]
          }
        })
      }
    }
  }
}

/**
 * @returns {import('vite').Plugin}
 */
function pagesHmrPlugin() {
  return {
    name: 'astro-pages-hmr',
    transform(code, id, opts) {
      if (
        (opts?.ssr &&
          id.includes('src/pages') &&
          !id.includes('/_') &&
          !id.endsWith('.js') &&
          !id.endsWith('.ts')) ||
        id.includes('astro:content')
      ) {
        // Accept HMR so an event is sent to the client to HMR this module, instead of reloading
        code += `
if (import.meta.hot) {
	import.meta.hot.accept()
}`
        return code
      }
    }
  }
}
