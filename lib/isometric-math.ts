export const ISO_ANGLE = Math.PI / 6 // 30 degrees
export const GRID_SIZE = 20
export const GRID_CELLS = 30

export function toIsometric(x: number, y: number, z: number) {
  const isoX = (x - y) * Math.cos(ISO_ANGLE) * GRID_SIZE
  const isoY = (x + y) * Math.sin(ISO_ANGLE) * GRID_SIZE - z * GRID_SIZE
  return { x: isoX, y: isoY }
}

export function shadeColor(color: string, percent: number): string {
  const num = parseInt(color.replace("#", ""), 16)
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

export function toGrid(screenX: number, screenY: number) {
  const adjX = screenX
  const adjY = screenY

  const cos = Math.cos(ISO_ANGLE) * GRID_SIZE
  const sin = Math.sin(ISO_ANGLE) * GRID_SIZE

  const y = (adjY / sin - adjX / cos) / 2
  const x = (adjY / sin + adjX / cos) / 2

  return {
    x: Math.round(x),
    y: Math.round(y),
  }
}
