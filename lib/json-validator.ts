import type { IsometricObject, ProjectData } from "@/hooks/use-indexed-db"

export function validateProjectJSON(data: unknown): ProjectData | null {
  try {
    if (!data || typeof data !== "object") return null

    const project = data as Partial<ProjectData>

    if (
      !project.id ||
      !project.name ||
      !Array.isArray(project.objects) ||
      typeof project.createdAt !== "number" ||
      typeof project.updatedAt !== "number"
    ) {
      return null
    }

    // Validate each object
    for (const obj of project.objects) {
      if (!validateIsometricObject(obj)) {
        return null
      }
    }

    return project as ProjectData
  } catch {
    return null
  }
}

function validateIsometricObject(obj: unknown): obj is IsometricObject {
  if (!obj || typeof obj !== "object") return false

  const object = obj as Partial<IsometricObject>

  return !!(
    object.id &&
    object.type &&
    ["cube", "cylinder", "pyramid"].includes(object.type) &&
    object.position &&
    typeof object.position.x === "number" &&
    typeof object.position.y === "number" &&
    typeof object.position.z === "number" &&
    object.color &&
    object.size &&
    typeof object.size.width === "number" &&
    typeof object.size.height === "number" &&
    typeof object.size.depth === "number"
  )
}
