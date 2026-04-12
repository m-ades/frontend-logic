/**
 * Bento “Features” screenshots — add WebP files under `frontend-logic/public/landing/`.
 * Served from the site root as `/landing/<filename>` (prefixed with `import.meta.env.BASE_URL` when needed).
 *
 * Expected files (or change `path` values below):
 *   - feature-logic-keyboard.webp         — md+ iPhone frame (tall)
 *   - feature-logic-keyboard-mobile.webp  — horizontal Mac window (below-md layout)
 *   - feature-analytics.webp
 *   - feature-auto-grade.webp
 */
const base = import.meta.env.BASE_URL || '/'

function publicAsset(path) {
  const root = base.endsWith('/') ? base.slice(0, -1) : base
  const p = path.startsWith('/') ? path : `/${path}`
  return `${root}${p}`
}

/** Paths are relative to `public/`; width/height are intrinsic hints for layout (CLS). */
const BENTO_ASSET_DEFS = {
  logicKeyboard: {
    path: '/landing/feature-logic-keyboard.webp',
    width: 1170,
    height: 2532,
  },
  logicKeyboardMobile: {
    path: '/landing/feature-logic-keyboard-mobile.webp',
    width: 1920,
    height: 1080,
  },
  analytics: {
    path: '/landing/feature-analytics.webp',
    width: 2400,
    height: 1200,
  },
  autoGrade: {
    path: '/landing/feature-auto-grade.webp',
    width: 1920,
    height: 1080,
  },
}

export const BENTO_SCREENSHOTS = Object.fromEntries(
  Object.entries(BENTO_ASSET_DEFS).map(([key, { path }]) => [key, publicAsset(path)]),
)

const LOGIC_KEYBOARD_VARIANT_TO_KEY = {
  phone: 'logicKeyboard',
  'mobile-mac': 'logicKeyboardMobile',
}

/**
 * @param {'phone' | 'mobile-mac'} [variant]
 * @returns {{ src: string, width: number, height: number }}
 */
export function resolveBentoLogicKeyboardImage(variant = 'phone') {
  const key = LOGIC_KEYBOARD_VARIANT_TO_KEY[variant] ?? LOGIC_KEYBOARD_VARIANT_TO_KEY.phone
  const def = BENTO_ASSET_DEFS[key]
  return {
    src: BENTO_SCREENSHOTS[key],
    width: def.width,
    height: def.height,
  }
}

const MAC_STILL_SLOTS = /** @type {const} */ (['analytics', 'autoGrade'])

/**
 * @param {(typeof MAC_STILL_SLOTS)[number]} slot
 * @returns {{ src: string, width: number, height: number }}
 */
export function resolveBentoMacStill(slot) {
  if (!MAC_STILL_SLOTS.includes(slot)) {
    throw new Error(`[bento-screenshots] unknown Mac still slot: ${String(slot)}`)
  }
  const def = BENTO_ASSET_DEFS[slot]
  return {
    src: BENTO_SCREENSHOTS[slot],
    width: def.width,
    height: def.height,
  }
}
