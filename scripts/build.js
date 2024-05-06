import * as esbuild from 'esbuild'

const ctx = await esbuild.context({
  entryPoints: ['src/hmr-runtime.js'],
  outfile: 'src/hmr-runtime-bundled.js',
  bundle: true,
  format: 'esm',
  platform: 'browser'
})

if (process.argv.includes('--watch')) {
  await ctx.watch()
} else {
  await ctx.dispose()
}
