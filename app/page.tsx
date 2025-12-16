"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { HorizontalToolbar } from "@/components/horizontal-toolbar"
import { VerticalToolbar } from "@/components/vertical-toolbar"
import { IsometricCanvas } from "@/components/isometric-canvas"
import { useIndexedDB, type IsometricObject, type ProjectData } from "@/hooks/use-indexed-db"
import { validateProjectJSON } from "@/lib/json-validator"
import { toast } from "sonner"
import { PropertiesPanel } from "@/components/properties-panel"

import { useHistory } from "@/hooks/use-history"

export default function IsometricEditor() {
  const {
    state: objects,
    setState: setObjects,
    undo,
    redo,
    canUndo,
    canRedo
  } = useHistory<IsometricObject[]>([], 100)
  
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showGrid, setShowGrid] = useState(true)
  const [clipboard, setClipboard] = useState<IsometricObject[]>([])
  const [recentProjects, setRecentProjects] = useState<ProjectData[]>([])
  const [projectName, setProjectName] = useState("Untitled Project")
  const [currentProjectId, setCurrentProjectId] = useState(() => `project-${Date.now()}`)
  const initializedProjectName = useRef(false) // To ensure initial project name calculation runs only once

  const [activeTool, setActiveTool] = useState<"select" | "cube" | "eraser">("select")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { isReady, saveProject, getAllProjects, loadProject: loadProjectFromDB } = useIndexedDB()

  const loadRecentProjects = useCallback(() => {
    getAllProjects().then((projects) => {
      setRecentProjects(projects.sort((a, b) => b.updatedAt - a.updatedAt))
    })
  }, [getAllProjects])

  useEffect(() => {
    if (isReady) {
      loadRecentProjects()
    }
  }, [isReady, loadRecentProjects])

  useEffect(() => {
    if (isReady && !initializedProjectName.current) {
      getAllProjects().then((projects) => {
        setRecentProjects(projects.sort((a, b) => b.updatedAt - a.updatedAt))
        
        // Calculate default "Untitled X"
        if (objects.length === 0) { // Only if we haven't modified/loaded yet? 
           // Better strategy: If name is generic default, update it.
           // Count generic "Untitled" projects
           const untitledCount = projects.filter(p => p.name.match(/^Untitled \d+$/) || p.name === "Untitled").length
           setProjectName(`Untitled ${untitledCount + 1}`)
        }
      })
      initializedProjectName.current = true
    }
  }, [isReady, getAllProjects, objects.length])

  const [createdAt, setCreatedAt] = useState(Date.now())

  // Auto-save: Debounce objects changes (4s)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isReady && objects.length > 0) {
        saveProject({
          id: currentProjectId,
          name: projectName,
          objects,
          createdAt,
          updatedAt: Date.now(),
        })
          .then(() => loadRecentProjects())
          .catch((error) => console.error("Auto-save failed:", error))
      }
    }, 4000)

    return () => clearTimeout(timer)
  }, [objects, isReady, currentProjectId, projectName, createdAt, saveProject, loadRecentProjects])

  // Auto-save: Immediate on name change
  useEffect(() => {
    if (isReady && objects.length > 0) {
      saveProject({
        id: currentProjectId,
        name: projectName,
        objects,
        createdAt,
        updatedAt: Date.now(),
      })
        .then(() => loadRecentProjects())
        .catch((error) => console.error("Auto-save failed:", error))
    }
  }, [projectName, isReady, objects, currentProjectId, createdAt, saveProject, loadRecentProjects])


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Copy
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "c") {
        e.preventDefault()
        handleCopy()
      }
      // Paste
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "v") {
        e.preventDefault()
        handlePaste()
      }
      // Undo
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault()
        if (canUndo) {
          undo()
          // toast.info("Undo") // Optional: maybe too noisy
        }
      }
      // Redo (Mac: Cmd+Shift+Z, Win: Ctrl+Y or Ctrl+Shift+Z - supporting Shift+Z for both)
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault()
        if (canRedo) {
          redo()
        }
      }
      
      if (e.key === "Escape") {
         setActiveTool("select")
         setSelectedIds([])
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedIds, objects, clipboard, canUndo, canRedo, undo, redo])



  // Tool activation handlers
  const handleSelectTool = (tool: "select" | "cube" | "eraser") => {
    // If clicking the currently active tool, toggle off (back to select)
    if (activeTool === tool && tool !== "select") {
       setActiveTool("select")
       return
    }

    setActiveTool(tool)
    if (tool !== "select") {
      setSelectedIds([])
    }
  }

  const handleAddObject = (type: "cube", position: { x: number; y: number; z: number }) => {
    // Check if there is already an object at this exact position (collision)
    const collision = objects.find(o => 
      Math.abs(o.position.x - position.x) < 0.1 && 
      Math.abs(o.position.y - position.y) < 0.1 &&
      Math.abs(o.position.z - position.z) < 0.1
    )

    // Trust the passed position.z (which comes from raycast hit or grid fallback)
    // Only simple fallback: if the raycast failed (e.g. some edge case) and resulted in a collision, maybe strictly stack?
    // But for now, let's assume getHitPosition returns a valid adjacent empty space.
    // If collision, maybe the user wants to replace? No, usually not.
    // Let's just place it. The isometric canvas handles the logic of finding the "empty adjacent spot".
    
    // However, if we switched from stacking logic to "place at" logic, we just use position.
    
    const newObj: IsometricObject = {
      id: `${type}-${Date.now()}-${Math.random()}`,
      type,
      position: { ...position },
      color: "#8b5cf6", // Default cube color
      size: { width: 1, height: 1, depth: 1 },
    }

    setObjects(prev => [...prev, newObj])
  }

  const handleUpdateObject = (id: string, updates: Partial<IsometricObject>) => {
    setObjects(prev => prev.map(obj => obj.id === id ? { ...obj, ...updates } : obj))
  }

  const handleObjectClick = (id: string, isMultiSelect: boolean) => {
    // Eraser Tool Logic
    if (activeTool === "eraser") {
      if (id) {
        setObjects((prev) => prev.filter((obj) => obj.id !== id))
        setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
      }
      return
    }

    if (activeTool !== "select") return

    if (isMultiSelect) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
    } else {
      setSelectedIds(id ? [id] : [])
    }
  }

  const handleCopy = () => {
    const selectedObjects = objects.filter((obj) => selectedIds.includes(obj.id))
    setClipboard(selectedObjects)
    if (selectedObjects.length > 0) {
       toast.info(`${selectedObjects.length} object(s) copied to clipboard`)
    }
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
      toast.info("PNG export will be available soon")
    }
  }

  const handleLoadProject = (project: ProjectData) => {
    setObjects(project.objects)
    setProjectName(project.name)
    setCurrentProjectId(project.id)
    setCreatedAt(project.createdAt)
  }

  return (
    <div className="h-screen flex flex-col dark">
      <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileUpload} />

      <HorizontalToolbar
        projectName={projectName}
        onUpdateProjectName={setProjectName}
        onResetTool={() => setActiveTool("select")}
        onRecent={() => {}}
        onOpen={handleOpen}
        onExport={handleExport}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
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
        <VerticalToolbar 
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
        />

        <div className="flex-1 bg-background relative flex">
          <div className="flex-1 h-full">
            <IsometricCanvas
              objects={objects}
              selectedIds={selectedIds}
              showGrid={showGrid}
              onObjectClick={handleObjectClick}
              onObjectsMove={(ids, deltaX, deltaY) => {
                // Future: implement drag & drop
              }}
              activeTool={activeTool}
              onAddObject={handleAddObject}
            />
          </div>
          
          {selectedIds.length > 0 && activeTool === "select" && (
            <div className="absolute right-0 top-0 bottom-0 z-10 border-l border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-xl">
               <PropertiesPanel 
                 selectedObjects={objects.filter(o => selectedIds.includes(o.id))}
                 onUpdateObject={handleUpdateObject}
               />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
