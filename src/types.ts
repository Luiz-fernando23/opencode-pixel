/** Shared types for the office state machine. */

export type AgentStatus =
  | "idle"
  | "thinking"
  | "tool"
  | "waiting"
  | "error"
  | "done"

export interface AgentTool {
  name: string
  callID: string
  input?: unknown
  startedAt: number
}

export interface PendingPermission {
  id: string
  action: string
  resources: string[]
  askedAt: number
}

export interface AgentState {
  sessionID: string
  parentID?: string
  directory: string
  title?: string
  slug?: string
  agent?: string
  model?: string
  status: AgentStatus
  statusText: string
  tool?: AgentTool
  permission?: PendingPermission
  lastEventAt: number
  firstSeenAt: number
  tokens?: { input: number; output: number; reasoning: number }
  cost?: number
  finish?: string
}

export interface OfficeStats {
  sessions: number
  working: number
  waiting: number
  errors: number
}

export interface OfficeSnapshot {
  agents: AgentState[]
  stats: OfficeStats
  updatedAt: number
}
