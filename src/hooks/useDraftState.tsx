import { useState } from 'react'

const STATE_ID = 'saved-state'

export function useDraftState<T extends object>(initial: T) {
  const [applied, setApplied] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(STATE_ID)
      const restored = stored ? JSON.parse(stored) as T : initial
      return restored
    } catch(e) {
      return initial
    }
  })
  const [draft, setDraft] = useState<T>(() => ({ ...applied }))

  const hasChanges = (Object.keys(applied) as (keyof T)[]).some(key => applied[key] !== draft[key])

  const apply = () => {
    setApplied({ ...draft })
    localStorage.setItem(STATE_ID, JSON.stringify(draft))
  }
  const cancel = () => setDraft({ ...applied });
  const update = <K extends keyof T>(field: K, value: T[K]) => setDraft((prev) => ({ ...prev, [field]: value }))

  return { draft, applied, hasChanges, apply, cancel, update }
}
