# opencode-pixel

Pixel-art office dashboard that visualizes your [OpenCode](https://opencode.ai) agents in real time.
Each session becomes a character that types while a tool runs, raises a bubble when it is waiting
for your permission, and turns green when the task is done.

> Status: early development — the dashboard runs end to end (plugin → state → SSE → canvas), but
> the pixel art and the polished interactions are still being built.

## Roadmap

- [x] Repository bootstrap
- [x] Phase 0 — V2 event catalog spike ([`docs/event-catalog.md`](./docs/event-catalog.md))
- [x] Phase 1 — skeleton: plugin + local server + SSE + minimal office canvas
- [ ] Phase 2 — MVP: character states, subagent characters, reconnection, hub re-election
- [ ] Phase 3 — polish: CC0 art, mobile layout, optional sound
- [ ] Phase 4 — publish to npm + GitHub release

## How it works

```
opencode V2 (background service)
  └── opencode-pixel plugin (setup)
        ├── events.ts    event stream -> per-session agent state
        ├── state.ts     office snapshot (agents + stats)
        ├── server.ts    HTTP + SSE on 127.0.0.1:5117
        └── browser.ts   opens the dashboard once
                │
                └── web/  canvas office, one desk per session
```

- The plugin subscribes to the **global** OpenCode event stream, so a single instance sees every
  session on the machine, not only the project it was loaded for.
- The dashboard is plain `text/event-stream` (SSE): no dependencies, and the browser reconnects on
  its own.
- If another instance already serves the dashboard, the new one forwards its events to it
  (`POST /api/ingest`) and takes over if the owner goes away.

## Development

```sh
npm install
npm run typecheck
```

### Running it locally

OpenCode loads plugins from `<project>/.opencode/plugins/<name>/index.ts`, and config `plugins`
entries are resolved as npm packages (see [`docs/plugin-loading.md`](./docs/plugin-loading.md)).
This repo therefore ships a gitignored `.dev/` harness:

```
.dev/.opencode/plugins/pixel-office/index.ts   # re-exports src/index.ts with test options
```

Then, from `.dev/`:

```sh
opencode run -m <provider/model> --auto "Create test.txt and list this directory"
```

and open <http://127.0.0.1:5117>. `spike/sse-smoke.mjs` checks the stream:

```sh
node spike/sse-smoke.mjs http://127.0.0.1:5117/events
```

### Options

Options are passed through the config `plugins` object form:

```jsonc
{
  "plugins": [
    {
      "package": "opencode-pixel",
      "options": { "port": 5117, "autoOpen": true, "idleTimeoutMs": 1800000 }
    }
  ]
}
```

| Option | Default | Meaning |
| --- | --- | --- |
| `port` | `5117` | Preferred dashboard port (tries the next 11 if busy). |
| `autoOpen` | `true` | Open the dashboard once, on the first event. |
| `idleTimeoutMs` | `1800000` | Drop sessions silent for this long. |
| `watchAllSessions` | `true` | `false` shows only the project the plugin loaded for. |

Environment overrides for development: `PIXEL_OFFICE_PORT`, `PIXEL_OFFICE_NO_OPEN=1`.

### HTTP API

| Route | Purpose |
| --- | --- |
| `GET /api/health` | `{ name, version, uptime }` — used to detect an existing dashboard. |
| `GET /api/state` | Current office snapshot (agents + stats). |
| `GET /events` | SSE stream of snapshots (`event: state`). |
| `POST /api/ingest` | Used by secondary plugin instances to forward events. |

## Logs

The plugin writes `~/.cache/opencode-pixel/plugin.log` (OpenCode's own log file does not capture
plugin `console.log` output). Include it when reporting a problem.

## License

[MIT](./LICENSE). Assets keep their own licenses — see [LICENSE-ASSETS.md](./LICENSE-ASSETS.md).
