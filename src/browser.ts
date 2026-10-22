/** Open the dashboard in the user's default browser. Best-effort, never throws. */
import { spawn } from "node:child_process"

export function openBrowser(url: string): void {
  try {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore", windowsHide: true }).unref()
      return
    }
    const command = process.platform === "darwin" ? "open" : "xdg-open"
    spawn(command, [url], { detached: true, stdio: "ignore" }).unref()
  } catch {
    /* headless machines simply keep the URL in the log */
  }
}
