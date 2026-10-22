# opencode-pixel

Pixel-art office dashboard that visualizes your [OpenCode](https://opencode.ai) agents in real time.
Each session becomes a character that walks to a desk, types while editing files, reads while searching,
and raises a bubble when it is waiting for your permission.

> Status: early development (Phase 0/1 of the roadmap). Not published yet.

## Roadmap

- [x] Repository bootstrap
- [ ] Phase 0 — V2 event catalog spike
- [ ] Phase 1 — skeleton: plugin + WebSocket server + minimal dashboard
- [ ] Phase 2 — MVP: characters, states, multi-session, reconnection
- [ ] Phase 3 — polish: CC0 art, mobile layout, optional sound
- [ ] Phase 4 — publish to npm + GitHub release

## How it will work

```
opencode V2
  └── opencode-pixel plugin (setup)
        ├── state   -> per-session agent state
        ├── server  -> HTTP + WebSocket + dashboard assets
        └── browser -> pixel office (canvas 2D)
```

Install (once published):

```sh
opencode plugin add opencode-pixel
```

## Development

```sh
git clone https://github.com/Luiz-fernando23/opencode-pixel.git
cd opencode-pixel
npm install
npm run typecheck
```

## License

[MIT](./LICENSE). Assets keep their own licenses — see [LICENSE-ASSETS.md](./LICENSE-ASSETS.md).
