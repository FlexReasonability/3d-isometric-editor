"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import type { IsometricObject } from "@/hooks/use-indexed-db"

interface IsometricCanvasProps {
  objects: IsometricObject[]
  selectedIds: string[]
  showGrid: boolean
  onObjectClick: (id: string, isMultiSelect: boolean) => void
  onObjectsMove: (ids: string[], deltaX: number, deltaY: number) => void
}

export function IsometricCanvas({
  objects,
  selectedIds,
  showGrid,
  onObjectClick,
  onObjectsMove,
}: IsometricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Isometric projection constants
  const ISO_ANGLE = Math.PI / 6 // 30 degrees
  const GRID_SIZE = 40
  const GRID_CELLS = 15

  function toIsometric(x: number, y: number, z: number) {
    const isoX = (x - y) * Math.cos(ISO_ANGLE) * GRID_SIZE
    const isoY = (x + y) * Math.sin(ISO_ANGLE) * GRID_SIZE - z * GRID_SIZE
    return { x: isoX, y: isoY }
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
    ctx.fillStyle = shadeColor(obj.color, -30)
    ctx.beginPath()
    ctx.moveTo(centerX + p1.x, centerY + p1.y)
    ctx.lineTo(centerX + p4.x, centerY + p4.y)
    ctx.lineTo(centerX + p8.x, centerY + p8.y)
    ctx.lineTo(centerX + p5.x, centerY + p5.y)
    ctx.closePath()
    ctx.fill()

    // Right face (lighter than left)
    ctx.fillStyle = shadeColor(obj.color, -15)
    ctx.beginPath()
    ctx.moveTo(centerX + p2.x, centerY + p2.y)
    ctx.lineTo(centerX + p3.x, centerY + p3.y)
    ctx.lineTo(centerX + p7.x, centerY + p7.y)
    ctx.lineTo(centerX + p6.x, centerY + p6.y)
    ctx.closePath()
    ctx.fill()

    // Outline
    ctx.strokeStyle = isSelected ? "#8b5cf6" : "rgba(0, 0, 0, 0.3)"
    ctx.lineWidth = isSelected ? 3 : 1
    ctx.beginPath()
    ctx.moveTo(centerX + p5.x, centerY + p5.y)
    ctx.lineTo(centerX + p6.x, centerY + p6.y)
    ctx.lineTo(centerX + p7.x, centerY + p7.y)
    ctx.lineTo(centerX + p8.x, centerY + p8.y)
    ctx.closePath()
    ctx.stroke()
  }

  function drawPyramid(
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
    const apex = toIsometric(x + w / 2, y + d / 2, z + h)

    // Base
    ctx.fillStyle = shadeColor(obj.color, -30)
    ctx.beginPath()
    ctx.moveTo(centerX + p1.x, centerY + p1.y)
    ctx.lineTo(centerX + p2.x, centerY + p2.y)
    ctx.lineTo(centerX + p3.x, centerY + p3.y)
    ctx.lineTo(centerX + p4.x, centerY + p4.y)
    ctx.closePath()
    ctx.fill()

    // Left face
    ctx.fillStyle = shadeColor(obj.color, -20)
    ctx.beginPath()
    ctx.moveTo(centerX + p1.x, centerY + p1.y)
    ctx.lineTo(centerX + p4.x, centerY + p4.y)
    ctx.lineTo(centerX + apex.x, centerY + apex.y)
    ctx.closePath()
    ctx.fill()

    // Right face
    ctx.fillStyle = obj.color
    ctx.beginPath()
    ctx.moveTo(centerX + p2.x, centerY + p2.y)
    ctx.lineTo(centerX + p3.x, centerY + p3.y)
    ctx.lineTo(centerX + apex.x, centerY + apex.y)
    ctx.closePath()
    ctx.fill()

    // Outline
    ctx.strokeStyle = isSelected ? "#8b5cf6" : "rgba(0, 0, 0, 0.3)"
    ctx.lineWidth = isSelected ? 3 : 1
    ctx.beginPath()
    ctx.moveTo(centerX + p1.x, centerY + p1.y)
    ctx.lineTo(centerX + apex.x, centerY + apex.y)
    ctx.lineTo(centerX + p2.x, centerY + p2.y)
    ctx.moveTo(centerX + apex.x, centerY + apex.y)
    ctx.lineTo(centerX + p3.x, centerY + p3.y)
    ctx.moveTo(centerX + apex.x, centerY + apex.y)
    ctx.lineTo(centerX + p4.x, centerY + p4.y)
    ctx.stroke()
  }

  function drawCylinder(
    ctx: CanvasRenderingContext2D,
    obj: IsometricObject,
    centerX: number,
    centerY: number,
    isSelected: boolean,
  ) {
    const { x, y, z } = obj.position
    const { width: w, height: h, depth: d } = obj.size
    const orientation = obj.orientation || "y"

    if (orientation === "y") {
      // Vertical cylinder
      const baseCenter = toIsometric(x + w / 2, y + d / 2, z)
      const topCenter = toIsometric(x + w / 2, y + d / 2, z + h)
      const radius = (w / 2) * GRID_SIZE

      // Bottom ellipse
      ctx.fillStyle = shadeColor(obj.color, -30)
      ctx.beginPath()
      ctx.ellipse(centerX + baseCenter.x, centerY + baseCenter.y, radius, radius / 2, 0, 0, Math.PI * 2)
      ctx.fill()

      // Side
      ctx.fillStyle = shadeColor(obj.color, -15)
      ctx.fillRect(centerX + baseCenter.x - radius, centerY + topCenter.y, radius * 2, baseCenter.y - topCenter.y)

      // Top ellipse
      ctx.fillStyle = obj.color
      ctx.beginPath()
      ctx.ellipse(centerX + topCenter.x, centerY + topCenter.y, radius, radius / 2, 0, 0, Math.PI * 2)
      ctx.fill()

      // Outline
      ctx.strokeStyle = isSelected ? "#8b5cf6" : "rgba(0, 0, 0, 0.3)"
      ctx.lineWidth = isSelected ? 3 : 1
      ctx.beginPath()
      ctx.ellipse(centerX + topCenter.x, centerY + topCenter.y, radius, radius / 2, 0, 0, Math.PI * 2)
      ctx.stroke()
    } else {
      // Simplified horizontal cylinder - draw as a cube for now
      drawCube(ctx, obj, centerX, centerY, isSelected)
    }
  }

  function shadeColor(color: string, percent: number): string {
    const num = Number.parseInt(color.replace("#", ""), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = ((num >> 8) & 0x00ff) + amt
    const B = (num & 0x0000ff) + amt
    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    )
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Clear canvas
    ctx.fillStyle = "#0a0a0a"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    if (showGrid) {
      drawGrid(ctx, canvas.width, canvas.height)
    }

    // Draw objects
    objects.forEach((obj) => {
      const isSelected = selectedIds.includes(obj.id)

      if (obj.type === "cube") {
        drawCube(ctx, obj, centerX, centerY, isSelected)
      } else if (obj.type === "pyramid") {
        drawPyramid(ctx, obj, centerX, centerY, isSelected)
      } else if (obj.type === "cylinder") {
        drawCylinder(ctx, obj, centerX, centerY, isSelected)
      }
    })
  }, [objects, selectedIds, showGrid])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Simple hit detection - check if click is near any object center
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    let clickedId: string | null = null

    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i]
      const { x: isoX, y: isoY } = toIsometric(
        obj.position.x + obj.size.width / 2,
        obj.position.y + obj.size.depth / 2,
        obj.position.z + obj.size.height / 2,
      )

      const objX = centerX + isoX
      const objY = centerY + isoY

      if (Math.abs(x - objX) < 50 && Math.abs(y - objY) < 50) {
        clickedId = obj.id
        break
      }
    }

    if (clickedId) {
      onObjectClick(clickedId, e.ctrlKey || e.metaKey)
    }
  }

  return <canvas ref={canvasRef} className="w-full h-full cursor-pointer" onClick={handleCanvasClick} />
}
