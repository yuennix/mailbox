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

// Rotate user agents to reduce bot detection
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
];
let uaIndex = 0;
function nextUserAgent() {
  return USER_AGENTS[uaIndex++ % USER_AGENTS.length];
}

function isCaptchaPage(html: string): boolean {
  return (
    html.includes("g-recaptcha") ||
    html.includes("recaptcha/api.js") ||
    html.includes("Complete the CAPTCHA") ||
    html.includes("complete the captcha") ||
    (html.includes("captcha") && html.includes("robot"))
  );
}

function captchaBypassPage(retryUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Retrying Yopmail...</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0f172a; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px;
            padding: 32px 28px; max-width: 340px; width: 90%; text-align: center; }
    .icon { font-size: 40px; margin-bottom: 16px; }
    h2 { font-size: 18px; font-weight: 600; margin-bottom: 10px; color: #f1f5f9; }
    p  { font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 8px; }
    .bar { height: 4px; background: #1e3a5f; border-radius: 2px; margin: 20px 0 16px;
           overflow: hidden; }
    .bar-fill { height: 100%; background: linear-gradient(90deg, #38bdf8, #818cf8);
                animation: fill 4s linear forwards; border-radius: 2px; }
    @keyframes fill { from { width: 0% } to { width: 100% } }
    button { background: #3b82f6; color: #fff; border: none; border-radius: 8px;
             padding: 10px 22px; font-size: 14px; cursor: pointer; margin-top: 4px; }
    button:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔄</div>
    <h2>Yopmail Verification</h2>
    <p>Yopmail asked for a CAPTCHA check. Automatically retrying with a fresh session…</p>
    <div class="bar"><div class="bar-fill"></div></div>
    <p style="font-size:12px;color:#64748b">Redirecting in 4 seconds</p>
    <button onclick="go()">Retry Now</button>
  </div>
  <script>
    function go() { window.location.replace('${retryUrl}'); }
    setTimeout(go, 4000);
  </script>
</body>
</html>`;
}

function rewriteHtml(html: string, reqPath: string): string {
  // Detect CAPTCHA page and replace with an auto-retry page
  if (isCaptchaPage(html)) {
    // Retry the homepage so we get a fresh session
    return captchaBypassPage(`${PROXY_PREFIX}/en/`);
  }
  html = html.replace(/https?:\/\/yopmail\.com/g, PROXY_PREFIX);
  html = html.replace(
    /(href|src|action|data-src)="\/(?!\/|yopmail-proxy)/g,
    `$1="${PROXY_PREFIX}/`
  );
  return html;
}

function rewriteJs(js: string): string {
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
  const now = new Date();
  return `ytime=${now.getHours()}:${now.getMinutes()}; path=/`;
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

            // Build cookie string — inject ytime preemptively so Yopmail never
            // has a reason to block based on a missing ytime cookie
            const now = new Date();
            const ytimeVal = `${now.getHours()}:${now.getMinutes()}`;
            let cookieStr = req.headers["cookie"] || "";
            if (!cookieStr.includes("ytime=")) {
              cookieStr = cookieStr ? `${cookieStr}; ytime=${ytimeVal}` : `ytime=${ytimeVal}`;
            }

            const forwardHeaders: Record<string, string> = {
              host: "yopmail.com",
              referer: upstreamReferer,
              origin: "https://yopmail.com",
              "user-agent": nextUserAgent(),
              accept: req.headers["accept"] || "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "accept-language": req.headers["accept-language"] || "en-US,en;q=0.9",
              "accept-encoding": "identity",
              "cache-control": "no-cache",
              pragma: "no-cache",
              "upgrade-insecure-requests": "1",
              "connection": "keep-alive",
              "cookie": cookieStr,
            };

            // Forward sec-fetch headers so Yopmail sees a legitimate same-origin request
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

            const fetchRes = await fetch(targetUrl, {
              method: req.method,
              headers: forwardHeaders,
              body: body || undefined,
              redirect: "manual",
            });

            if (fetchRes.status >= 300 && fetchRes.status < 400) {
              const location = fetchRes.headers.get("location") || "";
              const rewritten = location
                .replace(/https?:\/\/yopmail\.com/, PROXY_PREFIX)
                .replace(/^\/(?!yopmail-proxy)/, `${PROXY_PREFIX}/`);
              res.setHeader("location", rewritten);
              res.statusCode = fetchRes.status;
              return res.end();
            }

            for (const [key, value] of fetchRes.headers.entries()) {
              const lower = key.toLowerCase();
              if (BLOCKED_RES_HEADERS.includes(lower)) continue;
              if (lower === "set-cookie") continue;
              res.setHeader(key, value);
            }

            const rawCookies: string[] =
              (fetchRes.headers as any).getSetCookie?.() ?? [];
            const rewrittenCookies = rawCookies.length ? rewriteCookies(rawCookies) : [];

            res.statusCode = fetchRes.status;

            const contentType = fetchRes.headers.get("content-type") || "";

            if (contentType.includes("text/html")) {
              const html = await fetchRes.text();
              const rewritten = rewriteHtml(html, targetPath);
              res.setHeader("content-type", "text/html; charset=utf-8");
              res.removeHeader("content-encoding");
              res.removeHeader("content-length");
              res.setHeader("set-cookie", [...rewrittenCookies, makeYtimeCookie()]);
              // If it was a CAPTCHA page, send 200 so the bypass page renders
              if (isCaptchaPage(html)) res.statusCode = 200;
              return res.end(rewritten);
            }

            if (contentType.includes("javascript") || targetPath.endsWith(".js")) {
              const js = await fetchRes.text();
              const rewritten = rewriteJs(js);
              res.setHeader("content-type", contentType || "application/javascript; charset=utf-8");
              res.removeHeader("content-encoding");
              res.removeHeader("content-length");
              if (rewrittenCookies.length) res.setHeader("set-cookie", rewrittenCookies);
              return res.end(rewritten);
            }

            if (rewrittenCookies.length) res.setHeader("set-cookie", rewrittenCookies);
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
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), yopmailProxyPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  envPrefix: ["VITE_", "EXPO_PUBLIC_"],
}));
