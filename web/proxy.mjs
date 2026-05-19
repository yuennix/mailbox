import express from "express";

const app = express();
const TARGET = "https://yopmail.com";
const PROXY_PREFIX = "/yopmail-proxy";

const BLOCKED_REQ_HEADERS = ["host", "origin", "referer"];
const BLOCKED_RES_HEADERS = [
  "x-frame-options",
  "content-security-policy",
  "content-security-policy-report-only",
  "x-content-type-options",
];

function rewriteHtml(html) {
  // Absolute yopmail URLs → proxy prefix
  html = html.replace(/https?:\/\/yopmail\.com/g, PROXY_PREFIX);
  // Root-relative paths in HTML attributes → proxy prefix + path
  html = html.replace(
    /(href|src|action|data-src)="\/(?!\/|yopmail-proxy)/g,
    `$1="${PROXY_PREFIX}/`
  );
  // CSS url() references
  html = html.replace(/url\(['"]?\//g, `url('${PROXY_PREFIX}/`);
  return html;
}

function rewriteCookies(setCookieHeaders) {
  if (!setCookieHeaders) return undefined;
  const headers = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : [setCookieHeaders];
  return headers.map((cookie) =>
    cookie
      .replace(/;\s*domain=[^;]*/gi, "")
      .replace(/;\s*secure/gi, "")
      .replace(/;\s*samesite=[^;]*/gi, "")
  );
}

app.use(async (req, res) => {
  try {
    const targetPath = req.url || "/";
    const targetUrl = TARGET + targetPath;

    const forwardHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!BLOCKED_REQ_HEADERS.includes(key.toLowerCase())) {
        forwardHeaders[key] = value;
      }
    }
    forwardHeaders["host"] = "yopmail.com";
    forwardHeaders["referer"] = "https://yopmail.com/";
    forwardHeaders["origin"] = "https://yopmail.com";
    forwardHeaders["user-agent"] =
      "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

    let body = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await new Promise((resolve) => {
        const chunks = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", () => resolve(Buffer.concat(chunks)));
      });
    }

    const fetchRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body: body || undefined,
      redirect: "manual",
    });

    // Handle redirects — rewrite Location header through proxy
    if (fetchRes.status >= 300 && fetchRes.status < 400) {
      const location = fetchRes.headers.get("location") || "";
      const rewritten = location
        .replace(/https?:\/\/yopmail\.com/, PROXY_PREFIX)
        .replace(/^\/(?!yopmail-proxy)/, `${PROXY_PREFIX}/`);
      res.setHeader("location", rewritten);
      return res.status(fetchRes.status).end();
    }

    // Copy and filter response headers
    for (const [key, value] of fetchRes.headers.entries()) {
      const lower = key.toLowerCase();
      if (BLOCKED_RES_HEADERS.includes(lower)) continue;
      if (lower === "set-cookie") continue;
      res.setHeader(key, value);
    }

    // Rewrite cookies
    const rawCookies = fetchRes.headers.getSetCookie?.() || [];
    const rewrittenCookies = rewriteCookies(rawCookies);
    if (rewrittenCookies?.length) {
      res.setHeader("set-cookie", rewrittenCookies);
    }

    res.status(fetchRes.status);

    const contentType = fetchRes.headers.get("content-type") || "";
    if (contentType.includes("text/html")) {
      const html = await fetchRes.text();
      const rewritten = rewriteHtml(html);
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.removeHeader("content-encoding");
      res.removeHeader("content-length");
      return res.send(rewritten);
    }

    const buffer = Buffer.from(await fetchRes.arrayBuffer());
    res.removeHeader("content-length");
    return res.send(buffer);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(502).send("Proxy error: " + err.message);
  }
});

const PORT = 3001;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`Yopmail proxy running on http://localhost:${PORT}`);
});
