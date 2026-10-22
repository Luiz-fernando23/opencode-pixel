/**
 * The plugin context has no logger (`ctx.app` is only `{ name, version, channel }`), and
 * `console.log` from a plugin goes to the background service's stdout, which is not
 * captured in OpenCode's log file. So keep our own small log next to OpenCode's cache.
 */
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const MAX_LOG_BYTES = 512 * 1024

export function cacheDir(): string {
  const base = process.env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache")
  return path.join(base, "opencode-pixel")
}

export function logFile(name: string): string {
  return path.join(cacheDir(), `${name}.log`)
}

export function createLogger(name: string): (message: string) => void {
  const file = logFile(name)
  return (message: string): void => {
    try {
      console.log(`[${name}] ${message}`)
    } catch {
      /* stdout can be gone */
    }
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true })
      try {
        if (fs.statSync(file).size > MAX_LOG_BYTES) fs.renameSync(file, `${file}.1`)
      } catch {
        /* first write */
      }
      fs.appendFileSync(file, `${new Date().toISOString()} ${message}\n`)
    } catch {
      /* logging must never break the plugin */
    }
  }
}
