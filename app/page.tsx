"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { HorizontalToolbar } from "@/components/horizontal-toolbar"
import { VerticalToolbar } from "@/components/vertical-toolbar"
import { IsometricCanvas, type IsometricCanvasRef } from "@/components/isometric-canvas"
import { useIndexedDB, type IsometricObject, type ProjectData } from "@/hooks/use-indexed-db"
import { validateProjectJSON } from "@/lib/json-validator"
import { toast } from "sonner"
import { PropertiesPanel } from "@/components/properties-panel"
import { toIsometric, shadeColor } from "@/lib/isometric-math"

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
  const canvasRef = useRef<IsometricCanvasRef>(null)

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

  const handleExport = async (type: "svg" | "png") => {
    if (type === "png") {
      if (canvasRef.current) {
        const dataUrl = await canvasRef.current.exportPng()
        const a = document.createElement("a")
        a.href = dataUrl
        a.download = `isometric-project-${Date.now()}.png`
        a.click()
        toast.success("Exported PNG successfully")
      }
    } else if (type === "svg") {
      // Sort objects back-to-front
      const sortedObjects = [...objects].sort((a, b) => {
        const depthA = a.position.x + a.position.y + a.position.z
        const depthB = b.position.x + b.position.y + b.position.z
        return depthA - depthB
      })

      // Calculate bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      
      // We need to project all vertices to find bounds
      sortedObjects.forEach(obj => {
         const { x, y, z } = obj.position
         const { width: w, height: h, depth: d } = obj.size
         const points = [
           toIsometric(x, y, z),
           toIsometric(x+w, y, z),
           toIsometric(x, y+d, z),
           toIsometric(x+w, y+d, z),
           toIsometric(x, y, z+h),
           toIsometric(x+w, y, z+h),
           toIsometric(x, y+d, z+h),
           toIsometric(x+w, y+d, z+h)
         ]
         points.forEach(p => {
           minX = Math.min(minX, p.x)
           maxX = Math.max(maxX, p.x)
           minY = Math.min(minY, p.y)
           maxY = Math.max(maxY, p.y)
         })
      })

      // Add padding
      const padding = 50
      const width = maxX - minX + padding * 2
      const height = maxY - minY + padding * 2
      const offsetX = -minX + padding
      const offsetY = -minY + padding

      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">`
      
      // Draw objects
      sortedObjects.forEach(obj => {
        const { x, y, z } = obj.position
        const { width: w, height: h, depth: d } = obj.size
        
        const p1 = toIsometric(x, y, z)
        const p2 = toIsometric(x + w, y, z)
        const p3 = toIsometric(x + w, y + d, z)
        const p4 = toIsometric(x, y + d, z)
        const p5 = toIsometric(x, y, z + h)
        const p6 = toIsometric(x + w, y, z + h)
        const p7 = toIsometric(x + w, y + d, z + h)
        const p8 = toIsometric(x, y + d, z + h)
        
        // Helper to format path
        const path = (points: {x: number, y: number}[]) => {
           return points.map(p => `${p.x + offsetX},${p.y + offsetY}`).join(" ")
        }

        // Top Face
        svgContent += `<polygon points="${path([p5, p6, p7, p8])}" fill="${obj.color}" />`
        // Left Face
        svgContent += `<polygon points="${path([p4, p3, p7, p8])}" fill="${shadeColor(obj.color, -10)}" />`
        // Right Face
        svgContent += `<polygon points="${path([p2, p3, p7, p6])}" fill="${shadeColor(obj.color, -15)}" />`
      })

      svgContent += `</svg>`
      
      const blob = new Blob([svgContent], { type: "image/svg+xml" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `isometric-project-${Date.now()}.svg`
      a.click()
      URL.revokeObjectURL(url)
      
      toast.success("Exported SVG successfully")
    }
  }

  const handleLoadProject = (project: ProjectData) => {
    setObjects(project.objects)
    setProjectName(project.name)
    setCurrentProjectId(project.id)
    setCreatedAt(project.createdAt)
  }

  const handleClearProject = () => {
    setObjects([])
    setSelectedIds([])
    toast.info("Project cleared")
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
        onClearProject={handleClearProject}
        onExport={handleExport}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}

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
              ref={canvasRef}
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
