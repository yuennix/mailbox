import path from "path";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

const PROXY_PREFIX = "/yopmail-proxy";
const TARGET = "https://yopmail.com";
const BLOCKED_RES_HEADERS = [
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "x-content-type-options",
];

// Diverse browser fingerprints to rotate through
const BROWSER_PROFILES = [
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    lang: "en-US,en;q=0.9",
    platform: "Win32",
  },
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    lang: "en-GB,en;q=0.9",
    platform: "MacIntel",
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    lang: "en-US,en;q=0.5",
    platform: "Win32",
  },
  {
    ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    lang: "en-US,en;q=0.9",
    platform: "Linux x86_64",
  },
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    lang: "en-US,en;q=0.9",
    platform: "MacIntel",
  },
];
let profileIndex = 0;
function nextProfile() {
  return BROWSER_PROFILES[profileIndex++ % BROWSER_PROFILES.length];
}

function isCaptchaPage(html: string): boolean {
  const lower = html.toLowerCase();
  return (
    lower.includes("g-recaptcha") ||
    lower.includes("recaptcha/api.js") ||
    lower.includes("complete the captcha") ||
    (lower.includes("captcha") && lower.includes("robot")) ||
    (lower.includes("captcha") && lower.includes("sitekey"))
  );
}

function nowYtime() {
  const d = new Date();
  return `${d.getHours()}:${d.getMinutes()}`;
}

function buildHeaders(profile: typeof BROWSER_PROFILES[0], referer: string, cookies: string): Record<string, string> {
  return {
    host: "yopmail.com",
    referer,
    origin: "https://yopmail.com",
    "user-agent": profile.ua,
    accept: profile.accept,
    "accept-language": profile.lang,
    "accept-encoding": "identity",
    "cache-control": "no-cache",
    pragma: "no-cache",
    "upgrade-insecure-requests": "1",
    connection: "keep-alive",
    cookie: cookies,
  };
}

function rewriteHtml(html: string): string {
  html = html.replace(/https?:\/\/yopmail\.com/g, PROXY_PREFIX);
  html = html.replace(
    /(href|src|action|data-src)="\/(?!\/|yopmail-proxy)/g,
    `$1="${PROXY_PREFIX}/`
  );
  return html;
}

function rewriteJs(js: string): string {
  // Strip domain=yopmail.com from JS cookie assignments
  js = js.replace(/;domain=yopmail\.com/gi, "");
  js = js.replace(/domain=yopmail\.com;/gi, "");
  js = js.replace(/https?:\/\/yopmail\.com/g, PROXY_PREFIX);
  return js;
}

function rewriteCookies(cookies: string[]): string[] {
  return cookies.map((c) =>
    c
      .replace(/;\s*domain=[^;]*/gi, "")
      .replace(/;\s*secure/gi, "")
      .replace(/;\s*samesite=[^;]*/gi, "")
  );
}

function makeYtimeCookie(): string {
  return `ytime=${nowYtime()}; path=/`;
}

// Collect Set-Cookie headers and return them as a cookie string for follow-up requests
function cookiesFromSetCookie(headers: Headers): string {
  const raw: string[] = (headers as any).getSetCookie?.() ?? [];
  return raw
    .map((c) => c.split(";")[0])  // keep only name=value
    .join("; ");
}

function yopmailProxyPlugin(): Plugin {
  return {
    name: "yopmail-proxy",
    configureServer(server) {
      server.middlewares.use(
        PROXY_PREFIX,
        async (req: any, res: any, next: any) => {
          try {
            const targetPath = req.url || "/";
            const targetUrl = TARGET + targetPath;

            const rawReferer: string = req.headers["referer"] || "";
            const upstreamReferer = rawReferer
              ? rawReferer
                  .replace(/^https?:\/\/[^/]+\/yopmail-proxy/, "https://yopmail.com")
                  .replace(/^https?:\/\/[^/]+\/?$/, "https://yopmail.com/")
              : "https://yopmail.com/";

            // Build cookie string — always include ytime
            let cookieStr = req.headers["cookie"] || "";
            if (!cookieStr.includes("ytime=")) {
              cookieStr = cookieStr ? `${cookieStr}; ytime=${nowYtime()}` : `ytime=${nowYtime()}`;
            }

            let profile = nextProfile();
            let forwardHeaders = buildHeaders(profile, upstreamReferer, cookieStr);

            // Forward sec-fetch headers
            for (const h of ["sec-fetch-site", "sec-fetch-mode", "sec-fetch-dest", "sec-fetch-user"]) {
              if (req.headers[h]) forwardHeaders[h] = req.headers[h];
            }

            let body: Buffer | undefined;
            if (req.method !== "GET" && req.method !== "HEAD") {
              body = await new Promise<Buffer>((resolve) => {
                const chunks: Buffer[] = [];
                req.on("data", (c: Buffer) => chunks.push(c));
                req.on("end", () => resolve(Buffer.concat(chunks)));
              });
            }

            let fetchRes = await fetch(targetUrl, {
              method: req.method,
              headers: forwardHeaders,
              body: body || undefined,
              redirect: "manual",
            });

            // ── AUTO CAPTCHA BYPASS ───────────────────────────────────────────
            // If Yopmail serves a CAPTCHA page, silently retry up to 5 times.
            // Each retry uses a fresh browser fingerprint + clean session cookies
            // so Yopmail's bot heuristic sees a new, clean visitor.
            if (fetchRes.headers.get("content-type")?.includes("text/html")) {
              const peek = await fetchRes.text();
              if (isCaptchaPage(peek)) {
                let bypassed = false;
                for (let attempt = 0; attempt < 5; attempt++) {
                  // Small backoff: 200 ms, 400 ms, 600 ms …
                  await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));

                  // Fresh fingerprint + clean session (only keep ytime)
                  profile = nextProfile();
                  const freshCookies = `ytime=${nowYtime()}`;
                  const retryHeaders = buildHeaders(profile, "https://yopmail.com/en/", freshCookies);

                  // Always GET on retry so we don't re-submit a stale form
                  const retryRes = await fetch(`${TARGET}/en/`, {
                    method: "GET",
                    headers: retryHeaders,
                    redirect: "manual",
                  });

                  if (retryRes.headers.get("content-type")?.includes("text/html")) {
                    const retryHtml = await retryRes.text();
                    if (!isCaptchaPage(retryHtml)) {
                      // Success — swap in the clean response
                      fetchRes = retryRes;

                      // Collect any new session cookies and merge them into
                      // the response so the browser carries them forward
                      const newCookies = cookiesFromSetCookie(retryRes.headers);
                      for (const [k, v] of retryRes.headers.entries()) {
                        const lk = k.toLowerCase();
                        if (BLOCKED_RES_HEADERS.includes(lk) || lk === "set-cookie") continue;
                        res.setHeader(k, v);
                      }
                      const rawNew = (retryRes.headers as any).getSetCookie?.() ?? [];
                      res.setHeader("set-cookie", [
                        ...rewriteCookies(rawNew),
                        makeYtimeCookie(),
                      ]);
                      res.statusCode = 200;
                      res.setHeader("content-type", "text/html; charset=utf-8");
                      res.removeHeader("content-encoding");
                      res.removeHeader("content-length");
                      return res.end(rewriteHtml(retryHtml));
                    }
                  }
                }

                // All 5 retries got CAPTCHA — very rate-limited IP.
                // Show a friendly message telling the user to wait a minute.
                res.statusCode = 200;
                res.setHeader("content-type", "text/html; charset=utf-8");
                res.removeHeader("content-encoding");
                res.removeHeader("content-length");
                return res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Yopmail – Retrying</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
         background:#0f172a;color:#e2e8f0;display:flex;align-items:center;
         justify-content:center;min-height:100vh}
    .card{background:#1e293b;border:1px solid #334155;border-radius:12px;
          padding:32px 28px;max-width:340px;width:90%;text-align:center}
    h2{font-size:18px;font-weight:600;margin:12px 0 10px;color:#f1f5f9}
    p{font-size:13px;color:#94a3b8;line-height:1.6;margin-bottom:10px}
    .count{font-size:28px;font-weight:700;color:#38bdf8;margin-bottom:4px}
    button{background:#3b82f6;color:#fff;border:none;border-radius:8px;
           padding:10px 22px;font-size:14px;cursor:pointer;margin-top:12px}
    button:hover{background:#2563eb}
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:40px">⏳</div>
    <h2>Too many requests</h2>
    <p>Yopmail temporarily rate-limited this server.<br>
       Retrying automatically in:</p>
    <div class="count" id="c">60</div>
    <p style="font-size:12px;color:#64748b">This resets every ~60 seconds</p>
    <button onclick="go()">Retry Now</button>
  </div>
  <script>
    var n = 60;
    var t = setInterval(function(){
      document.getElementById('c').textContent = --n;
      if(n <= 0){ clearInterval(t); go(); }
    }, 1000);
    function go(){ window.location.replace('${PROXY_PREFIX}/en/'); }
  </script>
</body>
</html>`);
              }

              // Normal page — no CAPTCHA
              for (const [k, v] of fetchRes.headers.entries()) {
                const lk = k.toLowerCase();
                if (BLOCKED_RES_HEADERS.includes(lk) || lk === "set-cookie") continue;
                res.setHeader(k, v);
              }
              const rawCk = (fetchRes.headers as any).getSetCookie?.() ?? [];
              res.setHeader("set-cookie", [...rewriteCookies(rawCk), makeYtimeCookie()]);
              res.statusCode = fetchRes.status;
              res.setHeader("content-type", "text/html; charset=utf-8");
              res.removeHeader("content-encoding");
              res.removeHeader("content-length");
              return res.end(rewriteHtml(peek));
            }
            // ─────────────────────────────────────────────────────────────────

            if (fetchRes.status >= 300 && fetchRes.status < 400) {
              const location = fetchRes.headers.get("location") || "";
              const rewritten = location
                .replace(/https?:\/\/yopmail\.com/, PROXY_PREFIX)
                .replace(/^\/(?!yopmail-proxy)/, `${PROXY_PREFIX}/`);
              res.setHeader("location", rewritten);
              res.statusCode = fetchRes.status;
              return res.end();
            }

            for (const [k, v] of fetchRes.headers.entries()) {
              const lk = k.toLowerCase();
              if (BLOCKED_RES_HEADERS.includes(lk) || lk === "set-cookie") continue;
              res.setHeader(k, v);
            }
            const rawCookies: string[] = (fetchRes.headers as any).getSetCookie?.() ?? [];
            if (rawCookies.length) res.setHeader("set-cookie", rewriteCookies(rawCookies));

            res.statusCode = fetchRes.status;

            const contentType = fetchRes.headers.get("content-type") || "";
            if (contentType.includes("javascript") || targetPath.endsWith(".js")) {
              const js = await fetchRes.text();
              res.setHeader("content-type", contentType || "application/javascript; charset=utf-8");
              res.removeHeader("content-encoding");
              res.removeHeader("content-length");
              return res.end(rewriteJs(js));
            }

            const buffer = Buffer.from(await fetchRes.arrayBuffer());
            res.removeHeader("content-encoding");
            res.removeHeader("content-length");
            return res.end(buffer);
          } catch (err: any) {
            console.error("[yopmail-proxy] error:", err.message);
            res.statusCode = 502;
            res.end("Proxy error: " + err.message);
          }
        }
      );
    },
  };
}

export default defineConfig(() => ({
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: { overlay: false },
  },
  plugins: [react(), yopmailProxyPlugin()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  envPrefix: ["VITE_", "EXPO_PUBLIC_"],
}));
