"use client"

import { Button } from "@/components/ui/button"
import { Clock, FolderOpen, Save, Download, Copy, Clipboard, ArrowDown, ArrowUp, Grid3x3, Undo2, Redo2, Pencil, Check, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState, useEffect } from "react"
import type { ProjectData } from "@/hooks/use-indexed-db"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"

interface HorizontalToolbarProps {
  projectName: string
  onUpdateProjectName: (name: string) => void
  onResetTool: () => void
  onRecent: () => void
  onOpen: () => void
  onClearProject: () => void
  onExport: (type: "svg" | "png") => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  showGrid: boolean
  onToggleGrid: () => void
  recentProjects: ProjectData[]
  onLoadProject: (project: ProjectData) => void
}

export function HorizontalToolbar({
  projectName,
  onUpdateProjectName,
  onResetTool,
  onRecent,
  onOpen,
  onClearProject,
  onExport,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  showGrid,
  onToggleGrid,
  recentProjects,
  onLoadProject,
}: HorizontalToolbarProps) {
  const [showRecent, setShowRecent] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState(projectName)

  useEffect(() => {
    if (!isEditingName) {
      setTempName(projectName)
    }
  }, [projectName, isEditingName])

  const handleNameSave = () => {
    if (tempName.trim() && tempName !== projectName) {
      onUpdateProjectName(tempName)
    } else {
      setTempName(projectName) // Revert if empty or unchanged
    }
    setIsEditingName(false)
  }

  return (
    <TooltipProvider>
      <div className="h-14 bg-card border-b border-border flex items-center px-4 gap-2">
        <div className="font-bold text-lg tracking-tight mr-4 flex items-center gap-2 select-none">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-all duration-300">
             <span className="text-white font-mono text-sm font-bold">3D</span>
          </div>
          <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">IsoEditor</span>
        </div>
        

        {isEditingName ? (
          <div className="flex items-center gap-1">
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
              className="h-8 w-48 bg-background"
              autoFocus
            />
          </div>
        ) : (
          <button
            onClick={() => {
              setIsEditingName(true)
              onResetTool()
            }}
            className="text-sm font-medium hover:bg-accent px-3 py-1.5 rounded-md flex items-center gap-2 group transition-colors w-48"
          >
            {projectName}
            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
          </button>
        )}

        <div className="w-px h-8 bg-border mx-2" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onRecent()
                setShowRecent(true)
              }}
            >
              <Clock className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Recent projects</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onOpen}>
              <FolderOpen className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Open project</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => setShowExport(true)}>
              <Download className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onUndo} 
              disabled={!canUndo} 
            >
              <Undo2 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onRedo} 
              disabled={!canRedo} 
            >
              <Redo2 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo</p>
          </TooltipContent>
        </Tooltip>        

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleGrid}
              className={showGrid ? "bg-accent" : ""}
            >
              <Grid3x3 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{showGrid ? "Hide grid" : "Show grid"}</p>
          </TooltipContent>
        </Tooltip>

        <AlertDialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50">
                  <Trash2 className="h-5 w-5" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear project</p>
            </TooltipContent>
          </Tooltip>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all objects in the current project. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onClearProject} className="bg-red-500 hover:bg-red-600 text-white">
                Clear Project
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Dialog open={showRecent} onOpenChange={setShowRecent}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recent Projects</DialogTitle>
            <DialogDescription>Select a project to load from your recent work</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {recentProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent projects</p>
              ) : (
                recentProjects.map((project) => (
                  <button
                    key={project.id}
                    className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                    onClick={() => {
                      onLoadProject(project)
                      setShowRecent(false)
                    }}
                  >
                    <div className="font-medium">{project.name || "Untitled Project"}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(project.updatedAt).toLocaleDateString()} - {project.objects.length} objects
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Project</DialogTitle>
            <DialogDescription>Choose your export format</DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 pt-4">
            <Button
              onClick={() => {
                onExport("svg")
                setShowExport(false)
              }}
              className="flex-1"
            >
              Export as SVG
            </Button>
            <Button
              onClick={() => {
                onExport("png")
                setShowExport(false)
              }}
              className="flex-1"
            >
              Export as PNG
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
