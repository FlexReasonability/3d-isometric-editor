"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { IsometricObject } from "@/hooks/use-indexed-db"

interface PropertiesPanelProps {
  selectedObjects: IsometricObject[]
  onUpdateObject: (id: string, updates: Partial<IsometricObject>) => void
}

const PRESET_COLORS = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#f59e0b", // amber-500
  "#84cc16", // lime-500
  "#22c55e", // green-500
  "#06b6d4", // cyan-500
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#d946ef", // fuchsia-500
  "#f43f5e", // rose-500
  "#ffffff", // white
  "#9ca3af", // gray-400
  "#4b5563", // gray-600
  "#000000", // black
]

export function PropertiesPanel({ selectedObjects, onUpdateObject }: PropertiesPanelProps) {
  if (selectedObjects.length === 0) return null

  const handleColorChange = (color: string) => {
    selectedObjects.forEach((obj) => {
      onUpdateObject(obj.id, { color })
    })
  }

  // Determine current color (if all same)
  const distinctColors = Array.from(new Set(selectedObjects.map((o) => o.color)))
  const currentColor = distinctColors.length === 1 ? distinctColors[0] : "#000000"

  // Position/Size editing could be added here later, but user asked for Color specifically.
  
  return (
    <div className="w-64 bg-card border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm">Properties</h2>
        <p className="text-xs text-muted-foreground">{selectedObjects.length} object(s) selected</p>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={currentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={currentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="flex-1 font-mono text-sm"
              />
            </div>
            
            <div className="grid grid-cols-5 gap-2 mt-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className="w-full aspect-square rounded-md border border-border shadow-sm hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
          
          {selectedObjects.length === 1 && (
             <div className="space-y-4 pt-4 border-t border-border">
               <div className="space-y-2">
                 <Label>Position</Label>
                 <div className="grid grid-cols-3 gap-2">
                    <div>
                       <Label className="text-xs text-muted-foreground">X</Label>
                       <Input 
                         type="number" 
                         value={selectedObjects[0].position.x} 
                         onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!isNaN(val)) {
                              onUpdateObject(selectedObjects[0].id, {
                                position: { ...selectedObjects[0].position, x: val }
                              })
                            }
                         }}
                         className="h-8 text-xs"
                       />
                    </div>
                    <div>
                       <Label className="text-xs text-muted-foreground">Y</Label>
                       <Input 
                         type="number" 
                         value={selectedObjects[0].position.y} 
                         onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!isNaN(val)) {
                              onUpdateObject(selectedObjects[0].id, {
                                position: { ...selectedObjects[0].position, y: val }
                              })
                            }
                         }}
                         className="h-8 text-xs"
                       />
                    </div>
                    <div>
                       <Label className="text-xs text-muted-foreground">Z</Label>
                       <Input 
                         type="number" 
                         value={selectedObjects[0].position.z} 
                         onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!isNaN(val)) {
                              onUpdateObject(selectedObjects[0].id, {
                                position: { ...selectedObjects[0].position, z: val }
                              })
                            }
                         }}
                         className="h-8 text-xs"
                       />
                    </div>
                 </div>
               </div>
             </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
