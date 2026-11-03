// saves still on their way so a fresh load of the same work can wait for them
const savesInFlight = new Set()

export function trackSave(save) {
  savesInFlight.add(save)
  const forget = () => savesInFlight.delete(save)
  save.then(forget, forget)
  return save
}

export function savesSettled() {
  return Promise.allSettled(savesInFlight)
}
