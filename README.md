# astro-pages-hmr

Adds HMR support to pages in Astro (`src/pages/*`). Supports `.astro`, `.html`, `.md`, `.mdx`, etc pages and Content Collections.

## Usage

### Using `astro add`

If you have an existing Astro project, you can run the following command to add `astro-pages-hmr` to your project:

```bash
# npm
npx astro add astro-pages-hmr
# pnpm
pnpm astro add astro-pages-hmr
```

### Manual

1. Install the package:

```bash
# npm
npm install astro-pages-hmr
# pnpm
pnpm add astro-pages-hmr
```

2. Add the integration to your `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config'
import pagesHmr from 'astro-pages-hmr'

export default defineConfig({
  integrations: [pagesHmr()]
})
```

## How it works

The integration uses [micromorph](https://github.com/natemoo-re/micromorph) to update the current HTML with the incoming new HTML via `fetch`. `micromorph` is bundled into a client HMR runtime that is injected into the page.

In some cases where it's not safe to morph, it'll fallback to a full page reload instead. The cases include:

- The `<head>` tag has changed
- The `<script>` tags have changed
- The attributes passed to Island components have changed

## Limitations

- Dynamically injected elements in the HTML may interfere with morphing as the incoming new HTML will likely not contain that element, so they will be deleted from the DOM even if needed. In which case, make sure your script is able to handle those changes and re-inject them if needed. <!-- Introduce a new event? Borrow View Transition event? -->

## License

MIT
