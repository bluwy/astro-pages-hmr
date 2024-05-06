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

          const oldHead = document.head?.outerHTML
          const newHead = doc.head?.outerHTML
          if (oldHead !== newHead) {
            console.debug('[astro-pages-hmr] reloading (head changed)')
            location.reload()
            return
          }

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
 * Before we iterate the `diff.children` (or patches), we find any `astro-island`
 * and try to filter out dynamically changed attributes. Because usually if an attribute
 * change is detected, we reload the page completely, but if only those in
 * `dynamicallyAddedAstroIslandAttributeNames` has changed, we don't need a full refresh.
 *
 * After filtering the attributes, if no other attributes are left, it's likely that
 * the `astro-island` is unchanged, so we remove its patch from `patches` completely
 * by setting it as `undefined`.
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
      if (tagName && patch.attributes.length && tagName === 'ASTRO-ISLAND') {
        patches[i].attributes = patch.attributes.filter(
          (attr) =>
            !dynamicallyAddedAstroIslandAttributeNames.includes(attr.name)
        )
        if (patches[i].attributes.length === 0) {
          patches[i] = undefined
        }
      }
    }
  }
}
