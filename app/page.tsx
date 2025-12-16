"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { HorizontalToolbar } from "@/components/horizontal-toolbar"
import { VerticalToolbar } from "@/components/vertical-toolbar"
import { IsometricCanvas } from "@/components/isometric-canvas"
import { useIndexedDB, type IsometricObject, type ProjectData } from "@/hooks/use-indexed-db"
import { validateProjectJSON } from "@/lib/json-validator"
import { toast } from "sonner"

export default function IsometricEditor() {
  const [objects, setObjects] = useState<IsometricObject[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showGrid, setShowGrid] = useState(true)
  const [clipboard, setClipboard] = useState<IsometricObject[]>([])
  const [recentProjects, setRecentProjects] = useState<ProjectData[]>([])
  const [currentProjectId] = useState(() => `project-${Date.now()}`)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { isReady, saveProject, getAllProjects, loadProject } = useIndexedDB()

  useEffect(() => {
    if (isReady) {
      loadRecentProjects()
    }
  }, [isReady])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault()
        handleCopy()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault()
        handlePaste()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedIds, objects, clipboard])

  const loadRecentProjects = async () => {
    try {
      const projects = await getAllProjects()
      setRecentProjects(projects.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10))
    } catch (error) {
      console.error("Failed to load recent projects", error)
    }
  }

  const handleAddCube = () => {
    const newCube: IsometricObject = {
      id: `cube-${Date.now()}`,
      type: "cube",
      position: { x: 0, y: 0, z: 0 },
      color: "#8b5cf6",
      size: { width: 1, height: 1, depth: 1 },
    }
    setObjects([...objects, newCube])
  }

  const handleAddCylinder = (orientation: "x" | "y" | "z") => {
    const newCylinder: IsometricObject = {
      id: `cylinder-${Date.now()}`,
      type: "cylinder",
      orientation,
      position: { x: 0, y: 0, z: 0 },
      color: "#22c55e",
      size: { width: 1, height: 1, depth: 1 },
    }
    setObjects([...objects, newCylinder])
  }

  const handleAddPyramid = () => {
    const newPyramid: IsometricObject = {
      id: `pyramid-${Date.now()}`,
      type: "pyramid",
      position: { x: 0, y: 0, z: 0 },
      color: "#f59e0b",
      size: { width: 1, height: 1.5, depth: 1 },
    }
    setObjects([...objects, newPyramid])
  }

  const handleObjectClick = (id: string, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
    } else {
      setSelectedIds([id])
    }
  }

  const handleCopy = () => {
    const selectedObjects = objects.filter((obj) => selectedIds.includes(obj.id))
    setClipboard(selectedObjects)
    toast.info(`${selectedObjects.length} object(s) copied to clipboard`)
  }

  const handlePaste = () => {
    if (clipboard.length === 0) {
      toast.error("Clipboard is empty")
      return
    }

    const newObjects = clipboard.map((obj) => ({
      ...obj,
      id: `${obj.type}-${Date.now()}-${Math.random()}`,
      position: {
        x: obj.position.x + 1,
        y: obj.position.y + 1,
        z: obj.position.z,
      },
    }))

    setObjects([...objects, ...newObjects])
    setSelectedIds(newObjects.map((obj) => obj.id))

    toast.info(`${newObjects.length} object(s) pasted`)
  }

  const handleSendBack = () => {
    if (selectedIds.length === 0) return

    setObjects((prev) => {
      const selected = prev.filter((obj) => selectedIds.includes(obj.id))
      const notSelected = prev.filter((obj) => !selectedIds.includes(obj.id))
      return [...selected, ...notSelected]
    })
  }

  const handleSendFront = () => {
    if (selectedIds.length === 0) return

    setObjects((prev) => {
      const selected = prev.filter((obj) => selectedIds.includes(obj.id))
      const notSelected = prev.filter((obj) => !selectedIds.includes(obj.id))
      return [...notSelected, ...selected]
    })
  }

  const handleSave = async () => {
    const project: ProjectData = {
      id: currentProjectId,
      name: `Project ${new Date().toLocaleDateString()}`,
      objects,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    try {
      await saveProject(project)
      await loadRecentProjects()
      toast.info("Project saved successfully")
    } catch (error) {
      toast.error("Failed to save project")
    }
  }

  const handleOpen = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const validatedProject = validateProjectJSON(data)

      if (!validatedProject) {
        toast.error("The JSON file is not in the correct format")
        return
      }

      setObjects(validatedProject.objects)
      toast.info("Project loaded successfully")
    } catch (error) {
      toast.error("Failed to load JSON file")
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleExport = (type: "svg" | "png") => {
    const project: ProjectData = {
      id: currentProjectId,
      name: `Project ${new Date().toLocaleDateString()}`,
      objects,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    if (type === "svg") {
      // For now, export as JSON since SVG generation is complex
      const json = JSON.stringify(project, null, 2)
      const blob = new Blob([json], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `isometric-project-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)

      toast.info("Project exported as JSON (SVG coming soon)")
    } else {
      // PNG export would use canvas.toDataURL()
      toast.info("PNG export will be available soon")
    }
  }

  const handleLoadProject = async (project: ProjectData) => {
    setObjects(project.objects)
    setSelectedIds([])
    toast.info(`Loaded ${project.name}`)
  }

  return (
    <div className="h-screen flex flex-col dark">
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileUpload} />

      <HorizontalToolbar
        onRecent={() => {}}
        onOpen={handleOpen}
        onSave={handleSave}
        onExport={handleExport}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onSendBack={handleSendBack}
        onSendFront={handleSendFront}
        showGrid={showGrid}
        onToggleGrid={() => setShowGrid(!showGrid)}
        recentProjects={recentProjects}
        onLoadProject={handleLoadProject}
      />

      <div className="flex-1 flex overflow-hidden">
        <VerticalToolbar onAddCube={handleAddCube} onAddCylinder={handleAddCylinder} onAddPyramid={handleAddPyramid} />

        <div className="flex-1 bg-background">
          <IsometricCanvas
            objects={objects}
            selectedIds={selectedIds}
            showGrid={showGrid}
            onObjectClick={handleObjectClick}
            onObjectsMove={(ids, deltaX, deltaY) => {
              // Future: implement drag & drop
            }}
          />
        </div>
      </div>
    </div>
  )
}
