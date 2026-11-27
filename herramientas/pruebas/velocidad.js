// Velocidad en 4G simulado contra el sitio publicado (o local), como celular de gama media. Bloquea anuncios, píxel y
// analítica (regla 8): mide solo lo propio del sitio. Cada vuelta es una visita nueva (sin caché).
// Uso: node herramientas/pruebas/velocidad.js [url base] [vueltas]   (por omisión, el sitio publicado y 3 vueltas)
"use strict";
const puppeteer = require("puppeteer-core");
const BASE = process.argv[2] || "https://enletrados.cosmovil.com.mx", VUELTAS = +(process.argv[3] || 3);
const PAGINAS = [["portada", "/"], ["nivel 1", "/nivel/1/"], ["diario", "/diario/"]];
const AJENOS = /groone\.com|doubleclick\.net|googlesyndication|googletagmanager|google-analytics|facebook|clarity\.ms|hotjar|bing\.com|cloudflareinsights/;
// «4G» de Lighthouse: 1,6 Mbps de bajada, 750 Kbps de subida, 150 ms de latencia; CPU 4 veces más lenta
const RED = { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 };
(async () => {
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const filas = [];
  for (let v = 1; v <= VUELTAS; v++) for (const [nombre, ruta] of PAGINAS) {
    const ctx = await nav.createBrowserContext(), p = await ctx.newPage();
    await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const cdp = await p.createCDPSession(); await cdp.send("Network.enable"); await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", RED); await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await p.setRequestInterception(true); let bytes = 0;
    p.on("request", r => (AJENOS.test(r.url()) ? r.abort() : r.continue()));
    cdp.on("Network.loadingFinished", e => { bytes += e.encodedDataLength; });
    await p.evaluateOnNewDocument(() => { window.__lcp = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); });
    const t0 = Date.now(); await p.goto(BASE + ruta + "?v=" + Date.now(), { waitUntil: "load", timeout: 60000 }); const carga = Date.now() - t0;
    await new Promise(r => setTimeout(r, 1500));
    const m = await p.evaluate(() => { const n = performance.getEntriesByType("navigation")[0], f = performance.getEntriesByName("first-contentful-paint")[0];
      return { ttfb: Math.round(n.responseStart), fcp: Math.round(f ? f.startTime : 0), lcp: Math.round(window.__lcp) }; });
    filas.push({ vuelta: v, pagina: nombre, ...m, carga, kb: +(bytes / 1024).toFixed(1) });
    await ctx.close();
  }
  await nav.close();
  console.log("vuelta | página   | TTFB  | FCP    | LCP    | carga  | KB");
  for (const f of filas) console.log(`${f.vuelta}      | ${f.pagina.padEnd(8)} | ${String(f.ttfb).padStart(4)}ms | ${String(f.fcp).padStart(5)}ms | ${String(f.lcp).padStart(5)}ms | ${String(f.carga).padStart(5)}ms | ${f.kb}`);
  for (const [nombre] of PAGINAS) { const l = filas.filter(f => f.pagina === nombre).map(f => f.lcp).sort((a, b) => a - b);
    console.log(`${nombre}: LCP mediana ${l[Math.floor(l.length / 2)]} ms (meta de Google: menos de 2.500 ms)`); }
})();
