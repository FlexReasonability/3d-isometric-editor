import { Button } from "@/components/ui/button"
import { Box, MousePointer2, Eraser } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface VerticalToolbarProps {
  activeTool: "select" | "cube" | "eraser"
  onSelectTool: (tool: "select" | "cube" | "eraser") => void
}

export function VerticalToolbar({ activeTool, onSelectTool }: VerticalToolbarProps) {
  return (
    <TooltipProvider>
      <div className="w-16 bg-card border-r border-border flex flex-col items-center py-4 gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onSelectTool("select")} 
              className={`w-12 h-12 ${activeTool === "select" ? "bg-accent text-accent-foreground" : ""}`}
            >
              <MousePointer2 className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Select Tool</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onSelectTool("cube")} 
              className={`w-12 h-12 ${activeTool === "cube" ? "bg-accent text-accent-foreground" : ""}`}
            >
              <Box className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Add Cube</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onSelectTool("eraser")} 
              className={`w-12 h-12 ${activeTool === "eraser" ? "bg-accent text-accent-foreground" : ""}`}
            >
              <Eraser className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Eraser</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
