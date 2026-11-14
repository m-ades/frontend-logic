import { useSyncExternalStore } from 'react'

// stores the opt out so phones default to the logic keypad
const STORAGE_KEY = 'logicapp_desktop_keyboard_on_mobile'
const listeners = new Set()

const isEnabled = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'true'
  } catch {
    return true
  }
}

const subscribe = (listener) => {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

export function setMobileLogicKeyboardEnabled(enabled) {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(!enabled))
  } catch {
    // the choice just doesn't stick without storage
  }
  listeners.forEach((listener) => listener())
}

// whether phones use the logic keypad instead of their own keyboard
export default function useMobileLogicKeyboardEnabled() {
  return useSyncExternalStore(subscribe, isEnabled)
}
