/**
 * Shared scroll-reveal settings so hero-adjacent sections feel like one continuous page.
 */

export const landingScrollViewport = {
  once: true,
  amount: 0.22,
  margin: '0px 0px -11% 0px',
}

/** Matches hero headline easing (cubic-bezier ~ ease-out-expo). */
export const landingEase = [0.22, 1, 0.36, 1]

export function landingRevealTransition(reducedMotion) {
  if (reducedMotion) {
    return { duration: 0.01 }
  }
  return { duration: 0.68, ease: landingEase }
}

export const landingStaggerChildren = 0.095

export const landingChildHidden = { opacity: 0, y: 22 }

export function landingChildVisible(reducedMotion) {
  return {
    opacity: 1,
    y: 0,
    transition: landingRevealTransition(reducedMotion),
  }
}
