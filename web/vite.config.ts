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

function rewriteHtml(html: string): string {
  html = html.replace(/https?:\/\/yopmail\.com/g, PROXY_PREFIX);
  html = html.replace(
    /(href|src|action|data-src)="\/(?!\/|yopmail-proxy)/g,
    `$1="${PROXY_PREFIX}/`
  );
  return html;
}

function rewriteCookies(cookies: string[]): string[] {
  return cookies.map((c) =>
    c
      .replace(/;\s*domain=[^;]*/gi, "")
      .replace(/;\s*secure/gi, "")
      .replace(/;\s*samesite=[^;]*/gi, "")
  );
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

            // Rewrite referer from our proxy URL back to yopmail.com
            const rawReferer: string = req.headers["referer"] || "";
            const upstreamReferer = rawReferer
              ? rawReferer
                  .replace(/^https?:\/\/[^/]+\/yopmail-proxy/, "https://yopmail.com")
                  .replace(/^https?:\/\/[^/]+\/?$/, "https://yopmail.com/")
              : "https://yopmail.com/";

            const forwardHeaders: Record<string, string> = {
              host: "yopmail.com",
              referer: upstreamReferer,
              origin: "https://yopmail.com",
              "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
              accept: req.headers["accept"] || "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "accept-language":
                req.headers["accept-language"] || "en-US,en;q=0.9",
              "accept-encoding": "identity",
              "cache-control": "no-cache",
              pragma: "no-cache",
            };
            if (req.headers["cookie"]) {
              forwardHeaders["cookie"] = req.headers["cookie"];
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
            if (rawCookies.length) {
              res.setHeader("set-cookie", rewriteCookies(rawCookies));
            }

            res.statusCode = fetchRes.status;

            const contentType = fetchRes.headers.get("content-type") || "";
            if (contentType.includes("text/html")) {
              const html = await fetchRes.text();
              const rewritten = rewriteHtml(html);
              res.setHeader("content-type", "text/html; charset=utf-8");
              res.removeHeader("content-encoding");
              res.removeHeader("content-length");
              return res.end(rewritten);
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
