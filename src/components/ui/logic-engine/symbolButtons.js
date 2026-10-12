const THEREFORE_BUTTON = { insert: ' ∴ ', label: '∴' }
const SLASH_BUTTONS = [{ insert: '/' }, { insert: '//' }]

// the phone logic keyboard has no comma key so comma separated arguments add one there
export const THEREFORE_SEPARATOR_BUTTONS = Object.freeze({
  desktop: [THEREFORE_BUTTON],
  mobile: [THEREFORE_BUTTON, { insert: ',', label: ',' }],
})

export const SLASH_SEPARATOR_BUTTONS = Object.freeze({
  desktop: SLASH_BUTTONS,
  mobile: SLASH_BUTTONS,
})
