/** Plugin options: config object form, with env overrides for development. */
export interface OfficeOptions {
  /** Preferred dashboard port. Default 5117. */
  port: number
  /** Open the dashboard automatically once. Default true. */
  autoOpen: boolean
  /** Remove sessions silent for longer than this. Default 30 minutes. */
  idleTimeoutMs: number
  /** Include sessions started by other tools/terminals on this machine. Default true. */
  watchAllSessions: boolean
}

export const DEFAULT_OPTIONS: OfficeOptions = {
  port: 5117,
  autoOpen: true,
  idleTimeoutMs: 30 * 60 * 1000,
  watchAllSessions: true,
}

export function resolveOptions(raw: unknown): OfficeOptions {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>
  const port = Number(process.env.PIXEL_OFFICE_PORT ?? input.port ?? DEFAULT_OPTIONS.port)
  const noOpen = process.env.PIXEL_OFFICE_NO_OPEN === "1" || process.env.PIXEL_OFFICE_NO_OPEN === "true"
  return {
    port: Number.isFinite(port) && port > 0 && port < 65536 ? Math.floor(port) : DEFAULT_OPTIONS.port,
    autoOpen: noOpen ? false : input.autoOpen !== false,
    idleTimeoutMs:
      Number.isFinite(Number(input.idleTimeoutMs)) && Number(input.idleTimeoutMs) > 0
        ? Number(input.idleTimeoutMs)
        : DEFAULT_OPTIONS.idleTimeoutMs,
    watchAllSessions: input.watchAllSessions !== false,
  }
}
