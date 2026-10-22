# How OpenCode V2 loads plugins (2.1.3 findings)

Everything here was verified by running a real `opencode` 2.1.3 on Windows. It matters because
it decides how users install opencode-pixel and how we test it locally.

## Discovery path (works)

```
<project>/.opencode/plugins/<name>/index.ts
```

A `default` export with `{ id, setup }` is loaded automatically, no config entry needed. This is
the reliable local-development path (used by [`.dev/`](../.dev) in this repo) and it also works
from `.opencode/plugins/<name>/index.ts` when the plugin is copied into a project.

Also loaded automatically:

- Global config dir plugins (`~/.opencode/plugins/...`).
- Anything listed under `plugin` (singular, packages only) / `plugins` (object form with options)
  in `opencode.json(c)`.

## Config `plugins` entries are npm specs

A `plugins` entry like `".."` or an absolute path is resolved with npm **against the service
working directory** (not the project directory), and fails:

```
failed to load plugin target=.. cause=NpmInstallFailedError
(cause: Error: Could not read package.json: ENOENT ... open 'C:\Users\package.json')
```

So local development must use the discovery path, and users install through a real npm package
name (`opencode plugin add opencode-pixel`).

## Per-location instances, hot reload

- Plugins are loaded **per project location**: a session in another directory loads another
  instance of the same plugin.
- Editing a plugin file hot-reloads it — the log shows repeated `msg="loading plugin"` entries
  and the previous instance's cleanup function runs.
- Instances stay alive in the background service after the `opencode run` client exits, so a
  dashboard started this way keeps serving. `opencode reload` reloads config and plugins.

## Flags that do not work in 2.1.3

| Attempt | Result |
| --- | --- |
| `opencode run --standalone ...` | `Unrecognized flag: --standalone in command opencode run` |
| `opencode --standalone run ...` | same error |

`--standalone` appears in `opencode run --help` but the parser rejects it, so there is no way to
run a private server from the `run` subcommand. Tests therefore use the shared background service.

## Logging from a plugin

- `ctx.app` is only `{ name, version, channel }` — there is no logger.
- `console.log` from a plugin goes to the background service's stdout, which is **not** captured
  in `~/.local/share/opencode/log/opencode.log`.
- Therefore this plugin writes its own log: `~/.cache/opencode-pixel/plugin.log` (rotated at
  512 KB). Ask users for that file when debugging.

## Consequences for the design

1. Because instances are per-location but the event stream is global, several instances can run
   at once and all of them would receive the same events. Only one may own the HTTP server, so
   the plugin implements a small hub: the first instance binds the port, the others forward their
   events with `POST /api/ingest` and take over if the owner disappears.
2. Startup cannot rely on options from a local config entry during development; the `.dev` shim
   injects `{ autoOpen: false, port: 5117 }` into `ctx.options` instead.
