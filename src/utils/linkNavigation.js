export function isPlainLinkClick(event, anchor = event.currentTarget) {
  const target = anchor?.getAttribute('target')
  return !event.defaultPrevented && event.button === 0 &&
    !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey &&
    (!target || target.toLowerCase() === '_self') && !anchor?.hasAttribute('download')
}
