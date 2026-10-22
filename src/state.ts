/** In-memory office state: the single source of truth the dashboard renders. */
import type { OfficeSnapshot, OfficeStats } from "./types.ts"
import { reduce, type OpenCodeEvent } from "./events.ts"
import type { AgentState } from "./types.ts"

type Listener = (snapshot: OfficeSnapshot) => void

export class OfficeStore {
  private readonly agents = new Map<string, AgentState>()
  private readonly listeners = new Set<Listener>()

  constructor(private readonly version: string) {}

  apply(event: OpenCodeEvent): void {
    const { changed, removed } = reduce(this.agents, event)
    if (changed.length > 0 || removed.length > 0) this.emit()
  }

  /** Insert an already-known agent (e.g. seeded from the session list). */
  add(agent: AgentState): void {
    if (this.agents.has(agent.sessionID)) return
    this.agents.set(agent.sessionID, agent)
    this.emit()
  }

  get(sessionID: string): AgentState | undefined {
    return this.agents.get(sessionID)
  }

  stats(): OfficeStats {
    let working = 0
    let waiting = 0
    let errors = 0
    for (const agent of this.agents.values()) {
      if (agent.status === "tool" || agent.status === "thinking") working += 1
      if (agent.status === "waiting") waiting += 1
      if (agent.status === "error") errors += 1
    }
    return { sessions: this.agents.size, working, waiting, errors }
  }

  snapshot(): OfficeSnapshot {
    const agents = [...this.agents.values()].sort((a, b) => {
      if (a.parentID && !b.parentID) return 1
      if (!a.parentID && b.parentID) return -1
      return a.firstSeenAt - b.firstSeenAt
    })
    return { agents, stats: this.stats(), updatedAt: Date.now() }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Drop sessions that have been silent for a while (used when a session ends abruptly). */
  prune(maxIdleMs: number): number {
    const cutoff = Date.now() - maxIdleMs
    let removed = 0
    for (const [id, agent] of this.agents) {
      if (agent.lastEventAt < cutoff) {
        this.agents.delete(id)
        removed += 1
      }
    }
    if (removed > 0) this.emit()
    return removed
  }

  /** A finished session goes back to "idle" once the celebration is over. */
  settle(maxDoneAgeMs: number): number {
    const cutoff = Date.now() - maxDoneAgeMs
    let changed = 0
    for (const agent of this.agents.values()) {
      if (agent.status === "done" && agent.lastEventAt < cutoff) {
        agent.status = "idle"
        agent.statusText = "Idle"
        changed += 1
      }
    }
    if (changed > 0) this.emit()
    return changed
  }

  private emit(): void {
    const snapshot = this.snapshot()
    for (const listener of this.listeners) {
      try {
        listener(snapshot)
      } catch {
        /* a broken listener must not break the office */
      }
    }
  }
}
