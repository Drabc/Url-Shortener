import { OpenAPIV3 } from 'openapi-types'

/**
 * Patches the given OpenAPI PathsObject by prefixing each path unless marked with 'x-unversioned'.
 * @param {OpenAPIV3.PathsObject} original The original OpenAPI PathsObject.
 * @param {string} prefix The prefix to add to each path.
 * @returns {OpenAPIV3.PathsObject} A new OpenAPI PathsObject with updated paths.
 */
export function patchPaths(
  original: OpenAPIV3.PathsObject,
  prefix: string,
): OpenAPIV3.PathsObject {
  return Object.fromEntries(
    Object.entries(original).map(([path, def]) => {
      // custom tag to exclude from patching
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (def as any)['x-unversioned']
        ? [path, def]
        : [`${prefix}${path}`, def]
    }),
  )
}
