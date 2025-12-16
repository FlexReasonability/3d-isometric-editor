"use client"

import { Button } from "@/components/ui/button"
import { Clock, FolderOpen, Save, Download, Copy, Clipboard, ArrowDown, ArrowUp, Grid3x3 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useState } from "react"
import type { ProjectData } from "@/hooks/use-indexed-db"
import { ScrollArea } from "@/components/ui/scroll-area"

interface HorizontalToolbarProps {
  onRecent: () => void
  onOpen: () => void
  onSave: () => void
  onExport: (type: "svg" | "png") => void
  onCopy: () => void
  onPaste: () => void
  onSendBack: () => void
  onSendFront: () => void
  showGrid: boolean
  onToggleGrid: () => void
  recentProjects: ProjectData[]
  onLoadProject: (project: ProjectData) => void
}

export function HorizontalToolbar({
  onRecent,
  onOpen,
  onSave,
  onExport,
  onCopy,
  onPaste,
  onSendBack,
  onSendFront,
  showGrid,
  onToggleGrid,
  recentProjects,
  onLoadProject,
}: HorizontalToolbarProps) {
  const [showRecent, setShowRecent] = useState(false)
  const [showExport, setShowExport] = useState(false)

  return (
    <>
      <div className="h-14 bg-card border-b border-border flex items-center px-4 gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            onRecent()
            setShowRecent(true)
          }}
          title="Recent projects"
        >
          <Clock className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={onOpen} title="Open JSON file">
          <FolderOpen className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={onSave} title="Save project">
          <Save className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={() => setShowExport(true)} title="Export">
          <Download className="h-5 w-5" />
        </Button>

        <div className="w-px h-8 bg-border mx-2" />

        <Button variant="ghost" size="icon" onClick={onCopy} title="Copy element">
          <Copy className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={onPaste} title="Paste element">
          <Clipboard className="h-5 w-5" />
        </Button>

        <div className="w-px h-8 bg-border mx-2" />

        <Button variant="ghost" size="icon" onClick={onSendBack} title="Send to back">
          <ArrowDown className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={onSendFront} title="Send to front">
          <ArrowUp className="h-5 w-5" />
        </Button>

        <div className="w-px h-8 bg-border mx-2" />

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleGrid}
          title={showGrid ? "Hide grid" : "Show grid"}
          className={showGrid ? "bg-accent" : ""}
        >
          <Grid3x3 className="h-5 w-5" />
        </Button>
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
                    <div className="font-medium">{project.name}</div>
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
    </>
  )
}
