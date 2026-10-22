# Phase 0 spike — V2 event catalog

Disposable harness that records every OpenCode V2 event a real session produces.

```sh
cd spike
opencode run --auto "Create spike/hello.txt with the word ok, then list the files in this directory. Reply only: done"
```

Output: `spike/events.jsonl` (one JSON object per line, gitignored).

Then the raw log is distilled into [`docs/event-catalog.md`](../docs/event-catalog.md).

Notes:

- The plugin default-exports a plain `{ id, setup }` object so no package resolution
  can interfere with the recording.
- `PIXEL_SPIKE_LOG` overrides the log path.
- Delete this folder once the catalog is written and phase 1 consumes it.
