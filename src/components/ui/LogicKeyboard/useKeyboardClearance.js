import { useEffect } from 'react'

/*
the element the field actually scrolls in, or null for the window
the app scrolls inside #root and the fullscreen proof inside its own box, so padding the body or scrolling the window never reached either
overflow alone doesn't decide it, since a wide table sets it too and just grows taller; a scroller keeps its height
*/
function getScrollParent(node) {
  for (let el = node?.parentElement; el && el !== document.body; el = el.parentElement) {
    const style = getComputedStyle(el)
    if (!/(auto|scroll)/.test(style.overflowY)) continue
    // nudge the padding by a pixel; more than the box itself would force even a fixed box to grow
    const height = el.clientHeight
    const previous = el.style.paddingBottom
    el.style.paddingBottom = `${parseFloat(style.paddingBottom) + 1}px`
    const keepsHeight = el.clientHeight === height
    el.style.paddingBottom = previous
    if (keepsHeight) return el
  }
  return null
}

/*
while a phone keypad is open, pads whatever its field scrolls in by as much as the panel covers of it, then centres the field in what is left
so the lines below the field and the autochecker feedback can scroll up clear of the panel
*/
export default function useKeyboardClearance({ open, panel, anchorRef }) {
  useEffect(() => {
    if (!open) return undefined
    const pad = panel?.offsetHeight || 220
    const scroller = getScrollParent(anchorRef?.current)
    const padded = scroller ?? document.body
    const viewportHeight = window.visualViewport?.height || window.innerHeight
    const panelTop = viewportHeight - pad
    const viewTop = scroller ? scroller.getBoundingClientRect().top : 0
    const viewBottom = scroller ? viewTop + scroller.clientHeight : viewportHeight
    const previousPad = padded.style.paddingBottom
    padded.style.paddingBottom = `${Math.max(0, viewBottom - panelTop)}px`
    const id = window.setTimeout(() => {
      const anchor = anchorRef?.current
      if (!anchor) return
      const rect = anchor.getBoundingClientRect()
      const visibleHeight = Math.min(viewBottom, panelTop) - viewTop
      const top = rect.top - viewTop + rect.height / 2 - visibleHeight / 2
      ;(scroller ?? window).scrollBy({ top, behavior: 'smooth' })
    }, 60)
    return () => {
      window.clearTimeout(id)
      padded.style.paddingBottom = previousPad
    }
  }, [anchorRef, open, panel])
}
