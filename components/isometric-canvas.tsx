"use client"

import type React from "react"

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react"
import type { IsometricObject } from "@/hooks/use-indexed-db"
import { toIsometric, toGrid, shadeColor, GRID_CELLS, GRID_SIZE } from "@/lib/isometric-math"

interface IsometricCanvasProps {
  objects: IsometricObject[]
  selectedIds: string[]
  showGrid: boolean
  onObjectClick: (id: string, isMultiSelect: boolean) => void
  onObjectsMove: (ids: string[], deltaX: number, deltaY: number) => void
  activeTool: "select" | "cube" | "eraser"
  onAddObject: (type: "cube", position: { x: number; y: number; z: number }) => void
}

export interface IsometricCanvasRef {
  exportPng: () => Promise<string>
}

// Helper functions removed (imported from lib/isometric-math)

function isPointInPolygon(point: { x: number; y: number }, vs: { x: number; y: number }[]) {
  let x = point.x,
    y = point.y
  let inside = false
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i].x,
      yi = vs[i].y
    let xj = vs[j].x,
      yj = vs[j].y
    let intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.strokeStyle = "rgba(100, 100, 100, 0.2)"
  ctx.lineWidth = 1

  const centerX = width / 2
  const centerY = height / 2

  for (let i = -GRID_CELLS; i <= GRID_CELLS; i++) {
    for (let j = -GRID_CELLS; j <= GRID_CELLS; j++) {
      const { x: x1, y: y1 } = toIsometric(i, j, 0)
      const { x: x2, y: y2 } = toIsometric(i + 1, j, 0)
      const { x: x3, y: y3 } = toIsometric(i, j + 1, 0)

      ctx.beginPath()
      ctx.moveTo(centerX + x1, centerY + y1)
      ctx.lineTo(centerX + x2, centerY + y2)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(centerX + x1, centerY + y1)
      ctx.lineTo(centerX + x3, centerY + y3)
      ctx.stroke()
    }
  }
}

function drawCube(
  ctx: CanvasRenderingContext2D,
  obj: IsometricObject,
  centerX: number,
  centerY: number,
  isSelected: boolean,
) {
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

  // Top face
  ctx.fillStyle = obj.color
  ctx.beginPath()
  ctx.moveTo(centerX + p5.x, centerY + p5.y)
  ctx.lineTo(centerX + p6.x, centerY + p6.y)
  ctx.lineTo(centerX + p7.x, centerY + p7.y)
  ctx.lineTo(centerX + p8.x, centerY + p8.y)
  ctx.closePath()
  ctx.fill()

  // Left face (darker)
  ctx.fillStyle = shadeColor(obj.color, -10)
  ctx.beginPath()
  ctx.moveTo(centerX + p4.x, centerY + p4.y)
  ctx.lineTo(centerX + p3.x, centerY + p3.y)
  ctx.lineTo(centerX + p7.x, centerY + p7.y)
  ctx.lineTo(centerX + p8.x, centerY + p8.y)
  ctx.closePath()
  ctx.fill()

  // Right face (lighter)
  ctx.fillStyle = shadeColor(obj.color, -15)
  ctx.beginPath()
  ctx.moveTo(centerX + p2.x, centerY + p2.y)
  ctx.lineTo(centerX + p3.x, centerY + p3.y)
  ctx.lineTo(centerX + p7.x, centerY + p7.y)
  ctx.lineTo(centerX + p6.x, centerY + p6.y)
  ctx.closePath()
  ctx.fill()

  // Outline
  if (isSelected) {
    ctx.save()
    ctx.strokeStyle = "#ffffff"
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    
    // Top Face
    ctx.moveTo(centerX + p5.x, centerY + p5.y)
    ctx.lineTo(centerX + p6.x, centerY + p6.y)
    ctx.lineTo(centerX + p7.x, centerY + p7.y)
    ctx.lineTo(centerX + p8.x, centerY + p8.y)
    ctx.closePath()

    // Left Face
    ctx.moveTo(centerX + p4.x, centerY + p4.y)
    ctx.lineTo(centerX + p3.x, centerY + p3.y)
    ctx.lineTo(centerX + p7.x, centerY + p7.y)
    ctx.lineTo(centerX + p8.x, centerY + p8.y)
    ctx.closePath()

    // Right Face
    ctx.moveTo(centerX + p2.x, centerY + p2.y)
    ctx.lineTo(centerX + p3.x, centerY + p3.y)
    ctx.lineTo(centerX + p7.x, centerY + p7.y)
    ctx.lineTo(centerX + p6.x, centerY + p6.y)
    ctx.closePath()

    ctx.stroke()
    ctx.restore()
  }
}

export const IsometricCanvas = forwardRef<IsometricCanvasRef, IsometricCanvasProps>(({
  objects,
  selectedIds,
  showGrid,
  onObjectClick,
  onObjectsMove,
  activeTool,
  onAddObject,
}: IsometricCanvasProps, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ghostPosition, setGhostPosition] = useState<{ x: number; y: number; z: number } | null>(null)
  const [isMouseDown, setIsMouseDown] = useState(false)
  const lastPlacedPos = useRef<{ x: number; y: number; z: number } | null>(null)
  const dragStartTime = useRef<number>(0)

  /* eslint-disable react-hooks/exhaustive-deps */
  const drawScene = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    { transparentBg = false, withGrid = true, withOverlay = true } = {},
  ) => {
    const centerX = width / 2
    const centerY = height / 2

    ctx.clearRect(0, 0, width, height)
    if (!transparentBg) {
      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, width, height)
    }

    if (withGrid && showGrid) {
      drawGrid(ctx, width, height)
    }

    const sortedObjects = [...objects].sort((a, b) => {
      const depthA = a.position.x + a.position.y + a.position.z
      const depthB = b.position.x + b.position.y + b.position.z
      return depthA - depthB
    })

    sortedObjects.forEach((obj) => {
      const isSelected = withOverlay && selectedIds.includes(obj.id)
      if (obj.type === "cube") drawCube(ctx, obj, centerX, centerY, isSelected)
    })

    if (withOverlay && activeTool !== "select" && activeTool !== "eraser" && ghostPosition) {
      const ghostObj: IsometricObject = {
        id: "ghost",
        type: activeTool,
        position: { x: ghostPosition.x, y: ghostPosition.y, z: ghostPosition.z },
        size: { width: 1, height: 1, depth: 1 },
        color: "#ffffff",
      }

      ctx.save()
      ctx.globalAlpha = 0.6
      if (activeTool === "cube") drawCube(ctx, ghostObj, centerX, centerY, false)
      ctx.restore()
    }
  }

  useImperativeHandle(ref, () => ({
    exportPng: async () => {
      const canvas = canvasRef.current
      if (!canvas) return ""

      const tempCanvas = document.createElement("canvas")
      tempCanvas.width = canvas.width
      tempCanvas.height = canvas.height
      const tempCtx = tempCanvas.getContext("2d")
      if (!tempCtx) return ""

      drawScene(tempCtx, tempCanvas.width, tempCanvas.height, {
        transparentBg: true,
        withGrid: false,
        withOverlay: false,
      })

      return tempCanvas.toDataURL("image/png")
    },
  }))

  function getHitPosition(
    screenX: number,
    screenY: number,
    centerX: number,
    centerY: number,
  ): { x: number; y: number; z: number } | null {
    // Sort objects from front to back for hit testing (Highest depth first)
    // Depth = X + Y + Z is a good approximation for isometric sorting order
    const sortedObjects = [...objects].sort((a, b) => {
      const depthA = a.position.x + a.position.y + a.position.z
      const depthB = b.position.x + b.position.y + b.position.z
      return depthB - depthA
    })

    for (const obj of sortedObjects) {
      const { x, y, z } = obj.position
      const { width: w, height: h, depth: d } = obj.size
      
      const getScreenPoint = (localX: number, localY: number, localZ: number) => {
         const iso = toIsometric(localX, localY, localZ)
         return { x: centerX + iso.x, y: centerY + iso.y }
      }

      // Top Face vertices (Z max)
      const topPoly = [
        getScreenPoint(x, y, z + h),
        getScreenPoint(x + w, y, z + h),
        getScreenPoint(x + w, y + d, z + h),
        getScreenPoint(x, y + d, z + h)
      ]

      // Right Face (X max)
      const rightPoly = [
        getScreenPoint(x + w, y, z),
        getScreenPoint(x + w, y + d, z),
        getScreenPoint(x + w, y + d, z + h),
        getScreenPoint(x + w, y, z + h)
      ]

      // Left Face (Y max)
      const leftPoly = [
         getScreenPoint(x, y + d, z),
         getScreenPoint(x + w, y + d, z),
         getScreenPoint(x + w, y + d, z + h),
         getScreenPoint(x, y + d, z + h)
      ]
      
      const point = { x: screenX, y: screenY }

      if (isPointInPolygon(point, topPoly)) return { x, y, z: z + h }
      if (isPointInPolygon(point, rightPoly)) return { x: x + w, y, z }
      if (isPointInPolygon(point, leftPoly)) return { x, y: y + d, z }
    }

    return null
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    drawScene(ctx, canvas.width, canvas.height)
  }, [objects, selectedIds, showGrid, activeTool, ghostPosition])

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    setIsMouseDown(true)
    dragStartTime.current = Date.now()

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    if (activeTool !== "select" && activeTool !== "eraser") {
      const hitPos = getHitPosition(x, y, centerX, centerY)
      
      let finalPos = { x: 0, y: 0, z: 0 }
      
      if (hitPos) {
        finalPos = hitPos
      } else {
         const gridPos = toGrid(x - centerX, y - centerY)
         finalPos = { x: gridPos.x, y: gridPos.y, z: 0 }
      }

      onAddObject(activeTool, finalPos)
      lastPlacedPos.current = finalPos
    } else {
      // Selection or Eraser Logic via Raycast
      const sortedObjects = [...objects].sort((a, b) => {
        const depthA = a.position.x + a.position.y + a.position.z
        const depthB = b.position.x + b.position.y + b.position.z
        return depthB - depthA
      })

      let clickedId: string | null = null

      for (const obj of sortedObjects) {
          const { x: ox, y: oy, z: oz } = obj.position
          const { width: w, height: h, depth: d } = obj.size
          const getScreenPoint = (localX: number, localY: number, localZ: number) => {
             const iso = toIsometric(localX, localY, localZ)
             return { x: centerX + iso.x, y: centerY + iso.y }
          }
          
          const topPoly = [getScreenPoint(ox, oy, oz + h), getScreenPoint(ox + w, oy, oz + h), getScreenPoint(ox + w, oy + d, oz + h), getScreenPoint(ox, oy + d, oz + h)]
          const rightPoly = [getScreenPoint(ox + w, oy, oz), getScreenPoint(ox + w, oy + d, oz), getScreenPoint(ox + w, oy + d, oz + h), getScreenPoint(ox + w, oy, oz + h)]
          const leftPoly = [getScreenPoint(ox, oy + d, oz), getScreenPoint(ox + w, oy + d, oz), getScreenPoint(ox + w, oy + d, oz + h), getScreenPoint(ox, oy + d, oz + h)]
          
          const p = {x, y}
          if (isPointInPolygon(p, topPoly) || isPointInPolygon(p, rightPoly) || isPointInPolygon(p, leftPoly)) {
             clickedId = obj.id
             break
          }
      }
      
      if (clickedId) {
        onObjectClick(clickedId, e.ctrlKey || e.metaKey)
      } else if (!e.ctrlKey && !e.metaKey && activeTool === "select") { // Only deselect if in "select" mode and clicking empty space
        onObjectClick("", false)
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    if (activeTool !== "select" && activeTool !== "eraser") {
      const hitPos = getHitPosition(x, y, centerX, centerY)
      let newPos = { x: 0, y: 0, z: 0 }

      if (hitPos) {
        newPos = hitPos
      } else {
        const gridPos = toGrid(x - centerX, y - centerY)
        newPos = { x: gridPos.x, y: gridPos.y, z: 0 }
      }
      
      setGhostPosition(newPos)

      if (isMouseDown && Date.now() - dragStartTime.current > 500) {
         if (!lastPlacedPos.current || (lastPlacedPos.current.x !== newPos.x || lastPlacedPos.current.y !== newPos.y || lastPlacedPos.current.z !== newPos.z)) {
            onAddObject(activeTool, newPos)
            lastPlacedPos.current = newPos
         }
      }
    }
  }

  const handleMouseUp = () => {
    setIsMouseDown(false)
    lastPlacedPos.current = null
  }

  const handleMouseLeave = () => {
    setGhostPosition(null)
    setIsMouseDown(false)
    lastPlacedPos.current = null
  }

  return (
    <canvas 
      ref={canvasRef} 
      className={`w-full h-full ${activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  )
})
IsometricCanvas.displayName = "IsometricCanvas"

