import { useState, useCallback } from "react"

interface UseHistoryReturn<T> {
  state: T
  setState: (newState: T | ((prev: T) => T)) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  history: T[] // Exposed for debugging or other uses if needed
}

export function useHistory<T>(initialState: T, maxHistory: number = 30): UseHistoryReturn<T> {
  const [history, setHistory] = useState<T[]>([initialState])
  const [currentIndex, setCurrentIndex] = useState(0)

  const state = history[currentIndex]

  const setState = useCallback(
    (newState: T | ((prev: T) => T)) => {
      setHistory((prev) => {
        const currentState = prev[currentIndex]
        const resolvedState =
          typeof newState === "function" ? (newState as (prev: T) => T)(currentState) : newState

        // If no change, strictly speaking we might not want to push, 
        // but for array comparisons it's expensive to check deep equality.
        // We assume generic usage where setState implies a change.

        // Remove future search (redo branch)
        const newHistory = prev.slice(0, currentIndex + 1)
        
        // Add new state
        newHistory.push(resolvedState)

        // Enforce max history limit
        // We want 'maxHistory' past actions, so total length is maxHistory + 1 (current)
        if (newHistory.length > maxHistory + 1) {
          newHistory.shift()
        }

        return newHistory
      })
      
      // Update index to point to the new last element
      // If we shifted, the length stays the same (at limit), index is length - 1
      // If we didn't shift, the length increased, index is length - 1
      setHistory((finalHistory) => {
        setCurrentIndex(finalHistory.length - 1)
        return finalHistory
      })
    },
    [currentIndex, maxHistory]
  )

  const undo = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const redo = useCallback(() => {
    setCurrentIndex((prev) => Math.min(history.length - 1, prev + 1))
  }, [history.length])

  const canUndo = currentIndex > 0
  const canRedo = currentIndex < history.length - 1

  return {
    state,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    history,
  }
}
