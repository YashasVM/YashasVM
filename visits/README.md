# profile card + visits

Serves the whole profile card (the header design) with the live **VISITS** count
baked into its footer bar, so the number is part of the card instead of a
floating badge next to it.

**Live:** https://profile-visits.yvm.workers.dev/YashasVM

```html
<p align="center"><img src="https://profile-visits.yvm.workers.dev/YashasVM" width="100%" alt="YashasVM"></p>
```

## Routes

| route | returns |
|---|---|
| `/YashasVM` (any path) | the full card, increments the counter |
| `/YashasVM/chip` | just the 32px chip (also increments) |
| `?preview=1` | renders without incrementing |
| `?label=TEXT` | chip label, uppercased (chip route only) |

## How it works

- `header.svg` is the design template, imported as text (`[[rules]]` in
  `wrangler.toml`). The worker swaps the number into
  `<text id="visits">` on every render.
- Displayed number = `BASE` + real hits. `BASE = "6000"` in the `[vars]` block
  of `wrangler.toml`, so the profile starts at 6,000 and climbs from there.
  Change it and redeploy to move the floor.
- The count lives in a **Durable Object** (`Counter`), one instance per path,
  read-modify-write under the object's single-threaded lock — so concurrent
  views never lose increments (plain KV did).
- Responses are `cache-control: no-store` so GitHub's image proxy refetches.

## Editing the design

The design lives at the repo root as `header.svg`; the worker imports it
directly (`../header.svg` + the `Text` rule), so there is only ever one copy.
Edit it, then:

```sh
cd visits && npx wrangler deploy
```

## Custom domain (optional)

Uncomment in `wrangler.toml`, add the CNAME for `visits.yash0.in` → worker
subdomain, then redeploy:

```toml
routes = [{ pattern = "visits.yash0.in", custom_domain = true }]
```

## Reset the count

Set `BASE` back to `"0"` (or a new floor) and redeploy. To drop the real hits
too, bump the object suffix in `worker.js` (`key + "#v3"` → `#v4`) — a new
Durable Object starts at zero.

## Remove everything

```sh
npx wrangler delete profile-visits
```
