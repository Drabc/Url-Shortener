import { OpenAPIV3 } from 'openapi-types'

export function patchPaths(
  orignal: OpenAPIV3.PathsObject,
  prefix: string,
): OpenAPIV3.PathsObject {
  return Object.fromEntries(
    Object.entries(orignal).map(([path, def]) => [`${prefix}${path}`, def]),
  )
}
