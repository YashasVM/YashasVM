// Profile-visits chip for github.com/YashasVM
// Serves the whole profile card (header.svg, with the VISITS value injected at
// render time) and a matching standalone chip at /KEY/chip. Counts one view per
// card render, stored in KV.
//
//   wrangler kv namespace create VISITS     -> paste the id into wrangler.toml
//   wrangler deploy
//   <img src="https://visits.yash0.in/YashasVM">

// Geist Mono subset (V I S T 0-9 , .) lifted from assets/header.svg so the
// chip is pixel-identical to the header on every machine, no font install needed.
const GM = "data:font/woff2;base64,d09GMgABAAAAAALYAA4AAAAABXwAAAKGAAHmZgAAAAAAAAAAAAAAAAAAAAAAAAAAGhYbIBwqBmAARBEICoFsgVsBNgIkAw4LDAAEIAWDXAcgG2oECC4G7MblooCiJHLCMa1n0dFMuQxQi4fv137nvt0vhkeTpIlsIokSyKRAyqRi08nsz9vpi92puVJXERfiJ62nTl0maoQnaBPHemIHKi4y639EaM4NYH31f/5vphUFGMgSDTXaC+xbL8CNZRrQmB5wt7bdO8Cznams2WeW6XGSTOxSAk1AEkImBOp6eSIt5ZXUAFMOBQAWjQtExurxXzuRBTzgJcjTGekbjfTuAACb+pMAcQN4pAOkUAMQAHBykF0CezClJvv8vyGfI40ACEg95H0MoiMhQw+KQA+qGaCqKmFKoZoCQdUXf9a+ggQgREE7KIE6ciwB9wDkgDDNzQkmtRGNUj1a6rTk/r3LuvqLC05XJJYHu7BLElcLF7U147E9h7eli8KLA8Db+XkYae+Jhp3HefPE1vVUENNe6kjNttAKjXTWZnV5TmYeHqk8KwsokhZImvDgoviWIbvNOjjE0hhpA7klGck58RHK1Vzlc42cSA6pSkpObbBEwj9xgqkfAS/DDQNAIL5fju+83e2ClB+mIPuFr4b5AfDD/wXERVvKI3+hLIHgC246g9D/UTFclDDFH5wpZUIE2j5Qso6iTRIAIAlUXKCIvIYPAA8Pw6bxpM0nnpl1Wc5RvOQkuN9VNhhdkM3KppeDnpYOgsFFwsXA1NBRw+RT03NCMBUcrAzUCAgmkwuiY+XghAmkgyA2TkkiRNDS63qXLuEIVmYR3NQcCGomkovGwmhYWSDhCdWgN4xSyLA6oZqKnvdkVkVNy8Wkk0OUcIkiRUpWp0q2EsnSFKWHwXWaAzP0UsXEwLoBjU6t41Y6ehZoGu6AlmDhmH+LEieMWpc4MYLKA4rNrBgcCAA=";
const FONT = "GM, 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const ESC = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function chip({ label = "VISITS", value = "0", dot = "#DCDCDC" }) {
  const fs = 11, ls = 1.1, adv = fs * 0.6 + ls;
  const padL = 12, padR = 14, dotW = 6, gap = 8, gap2 = 10;
  const labelW = String(label).length * adv;
  const valueW = String(value).length * (fs + 1) * 0.62;
  const w = padL + dotW + gap + labelW + gap2 + valueW + padR;
  const h = 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(1)}" height="${h}" viewBox="0 0 ${w.toFixed(1)} ${h}" role="img" aria-label="${ESC(label)} ${ESC(value)}">
<style>@font-face{font-family:GM;font-weight:500;src:url(${GM}) format('woff2')}text{font-family:${FONT}}</style>
<rect x="0.5" y="0.5" width="${(w - 1).toFixed(1)}" height="${h - 1}" fill="#000000" stroke="#1E1E1E"/>
<rect x="${padL}" y="13" width="${dotW}" height="${dotW}" fill="${dot}"/>
<text x="${padL + dotW + gap}" y="21" font-size="${fs}" letter-spacing="${ls}" fill="#595959">${ESC(label)}</text>
<text x="${(w - padR).toFixed(1)}" y="21" font-size="${fs + 1}" text-anchor="end" fill="#EDEDED">${ESC(value)}</text>
</svg>`;
}

import HEADER from "../header.svg";

// Inject the live count into the card's footer cell.
function card(n) {
  const v = n.toLocaleString("en-US");
  return HEADER.replace(
    /(<text id="visits"[^>]*>)[^<]*(<\/text>)/,
    (_m, a, b) => a + v + b,
  );
}

// Strongly consistent counter: one Durable Object per key, no lost increments.
export class Counter {
  constructor(state) {
    this.state = state;
    this.n = null;
  }

  async fetch(request) {
    if (this.n === null) this.n = (await this.state.storage.get("n")) || 0;
    if (new URL(request.url).pathname.endsWith("/hit")) {
      this.n += 1;
      await this.state.storage.put("n", this.n);
    }
    return new Response(String(this.n));
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const key = parts[0] || "profile";
    const kind = (parts[1] || "").toLowerCase();
    const preview = url.searchParams.get("preview") === "1";

    const id = env.COUNTER.idFromName(key + "#v3");
    const path = preview ? "https://c/peek" : "https://c/hit";
    const hits = Number(await (await env.COUNTER.get(id).fetch(path)).text());

    // Start the public number at BASE (6k) and grow from there.
    const n = (Number(env.BASE) || 0) + hits;

    const body = kind.startsWith("chip")
      ? chip({ label: (url.searchParams.get("label") || "VISITS").slice(0, 16).toUpperCase(), value: n.toLocaleString("en-US") })
      : card(n);

    return new Response(body, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  },
};
