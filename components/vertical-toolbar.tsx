"use client"

import { Button } from "@/components/ui/button"
import { Box, CylinderIcon, Triangle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface VerticalToolbarProps {
  onAddCube: () => void
  onAddCylinder: (orientation: "x" | "y" | "z") => void
  onAddPyramid: () => void
}

export function VerticalToolbar({ onAddCube, onAddCylinder, onAddPyramid }: VerticalToolbarProps) {
  return (
    <div className="w-16 bg-card border-r border-border flex flex-col items-center py-4 gap-2">
      <Button variant="ghost" size="icon" onClick={onAddCube} title="Add isometric cube" className="w-12 h-12">
        <Box className="h-6 w-6" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" title="Add isometric cylinder" className="w-12 h-12">
            <CylinderIcon className="h-6 w-6" />
          </Button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-48">
          <div className="space-y-2">
            <p className="text-sm font-medium mb-3">Cylinder Orientation</p>
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={() => onAddCylinder("x")}
            >
              X Axis
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={() => onAddCylinder("y")}
            >
              Y Axis (Vertical)
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent"
              onClick={() => onAddCylinder("z")}
            >
              Z Axis
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" onClick={onAddPyramid} title="Add isometric pyramid" className="w-12 h-12">
        <Triangle className="h-6 w-6" />
      </Button>
    </div>
  )
}
