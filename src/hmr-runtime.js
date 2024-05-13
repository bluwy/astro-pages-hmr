/// <reference types="vite/client" />

import * as micromorph from 'micromorph'

/** @type {DOMParser | undefined} */
let p

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', async (payload) => {
    for (const update of payload.updates) {
      try {
        const id = update.acceptedPath
        if (
          (id.includes('src/pages') &&
            !id.includes('/_') &&
            !id.endsWith('.js') &&
            !id.endsWith('.ts')) ||
          id.includes('astro:content')
        ) {
          const fetchResult = await fetch(location.href)
          const html = await fetchResult.text()
          p = p || new DOMParser()
          const doc = p.parseFromString(html, 'text/html')

          const diff = micromorph.diff(document, doc)
          const checkResult = isDiffSafe(document.documentElement, diff)
          if (typeof checkResult === 'string') {
            console.debug(`[astro-pages-hmr] reloading (${checkResult})`)
            location.reload()
          } else {
            console.debug('[astro-pages-hmr] morphing')
            await micromorph.patch(document, diff)
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
  })
}

/**
 * @param {HTMLElement} parent
 * @param {any} diff
 * @param {HTMLElement} [child]
 */
function isDiffSafe(parent, diff, child) {
  const el = child || parent

  switch (diff.type) {
    // ACTION_CREATE
    case 0: {
      const tagName = diff.node?.tagName
      if (isTagNameUnsafe(tagName)) {
        return `${tagName.toLowerCase()} created`
      }
      return
    }
    // ACTION_REMOVE
    case 1: {
      if (!el) return
      const tagName = el.tagName
      if (isTagNameUnsafe(tagName)) {
        return `${tagName.toLowerCase()} removed`
      }
      return
    }
    // ACTION_REPLACE
    case 2: {
      if (!el) return
      const tagName = el.tagName
      const otherTagName = diff.node?.tagName
      if (isTagNameUnsafe(tagName)) {
        return `${tagName.toLowerCase()} replaced`
      }
      if (isTagNameUnsafe(otherTagName)) {
        return `${otherTagName.toLowerCase()} replaced`
      }
      return
    }
    // ACTION_UPDATE
    case 3: {
      if (!el) return
      const tagName = el.tagName
      // TODO: Detect script has updated, however, the tag doesn't change so can be tricky to detect
      if (diff.attributes.length && isTagNameUnsafe(tagName)) {
        return `${tagName.toLowerCase()} attribute updated`
      }
      sanitizeDiffChildren(diff.children, el)
      for (let i = 0; i < diff.children.length; i++) {
        const childDiff = diff.children[i]
        if (!childDiff) continue
        const childNode = el.childNodes[i]
        const result = isDiffSafe(el, childDiff, childNode)
        if (result) {
          return result
        }
      }
      return
    }
  }
}

/**
 * @param {string} [tagName]
 */
function isTagNameUnsafe(tagName) {
  return (
    tagName &&
    (tagName === 'SCRIPT' ||
      (tagName.includes('-') && tagName !== 'ASTRO-DEV-TOOLBAR'))
  )
}

const dynamicallyAddedAstroIslandAttributeNames = [
  'client-render-time',
  'server-render-time',
  'ssr'
]

/**
 * Before we iterate the `diff.children` (or patches),
 *
 * @param {any[]} patches
 * @param {HTMLElement} el
 */
function sanitizeDiffChildren(patches, el) {
  for (let i = 0; i < patches.length; i++) {
    const patch = patches[i]
    // ACTION_UPDATE
    if (patch && patch.type === 3) {
      const tagName = el.childNodes[i].tagName
      // We find any `astro-island` and try to filter out dynamically changed attributes. Because usually
      // if an attribute  change is detected, we reload the page completely, but if only those in
      // `dynamicallyAddedAstroIslandAttributeNames` has changed, we don't need a full refresh.
      //
      // After filtering the attributes, if no other attributes are left, it's likely that
      // the `astro-island` is unchanged, so we remove its patch from `patches` completely
      // by setting it as `undefined`.
      if (tagName && patch.attributes.length && tagName === 'ASTRO-ISLAND') {
        patches[i].attributes = patch.attributes.filter(
          (attr) =>
            !dynamicallyAddedAstroIslandAttributeNames.includes(attr.name)
        )
        if (patches[i].attributes.length === 0) {
          patches[i] = undefined
        }
        continue
      }

      // For any scripts, we remove the `data-astro-exec` attribute from the patch as it's not relevant
      // for morphing. It's added by ViewTransition to track already executed scripts only.
      //
      // Also check if the src is actually changed, and if not, remove the attribute patch completely. It
      // might be added by micromorph with a special t=Date.now cache bust, but we want to be safe and reload
      // the page directly in that case.
      //
      // After filtering the attributes, if no other attributes are left, it's likely that
      // the `script` is unchanged, so we remove its patch from `patches` completely
      // by setting it as `undefined`.
      if (tagName && patch.attributes.length && tagName === 'SCRIPT') {
        const oldDoc = document
        patches[i].attributes = patch.attributes.filter((attr) => {
          if (attr.type === 5 && attr.name === 'data-astro-exec') {
            return false
          }
          if (attr.type === 4 && attr.name === 'src') {
            // Remove timestamp query
            const src = attr.value
              .replace(/(\?|&)t=.*?(&|$)/, (_, m1, m2) => (m2 ? m1 : ''))
              .replace(/\?$/, '') // micromorph may add a trailing &, the above replace would make this ?, so remove it
            if (oldDoc.querySelector(`script[src="${src}"]`)) {
              return false
            }
          }
          return true
        })
        if (patches[i].attributes.length === 0) {
          patches[i] = undefined
        }
        continue
      }
    }
  }
}
