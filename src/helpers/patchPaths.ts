import { OpenAPIV3 } from 'openapi-types'

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
