"use client"

import { useState, useEffect, useCallback } from "react"

const DB_NAME = "isometric-editor-db"
const STORE_NAME = "projects"
const DB_VERSION = 1

export interface IsometricObject {
  id: string
  type: "cube" | "cylinder" | "pyramid"
  orientation?: "x" | "y" | "z" // Pour les cylindres
  position: { x: number; y: number; z: number }
  color: string
  size: { width: number; height: number; depth: number }
}

export interface ProjectData {
  id: string
  name: string
  objects: IsometricObject[]
  createdAt: number
  updatedAt: number
}

export function useIndexedDB() {
  const [db, setDb] = useState<IDBDatabase | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error("Failed to open IndexedDB")
    }

    request.onsuccess = () => {
      setDb(request.result)
      setIsReady(true)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" })
      }
    }

    return () => {
      if (db) {
        db.close()
      }
    }
  }, [])

  const saveProject = useCallback(
    async (project: ProjectData): Promise<void> => {
      if (!db) throw new Error("Database not ready")

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite")
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(project)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    },
    [db],
  )

  const loadProject = useCallback(
    async (id: string): Promise<ProjectData | null> => {
      if (!db) throw new Error("Database not ready")

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readonly")
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(id)

        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    },
    [db],
  )

  const getAllProjects = useCallback(async (): Promise<ProjectData[]> => {
    if (!db) throw new Error("Database not ready")

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly")
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }, [db])

  const deleteProject = useCallback(
    async (id: string): Promise<void> => {
      if (!db) throw new Error("Database not ready")

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], "readwrite")
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(id)

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    },
    [db],
  )

  return {
    isReady,
    saveProject,
    loadProject,
    getAllProjects,
    deleteProject,
  }
}
