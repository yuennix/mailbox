import { useState, useRef, useCallback, useEffect } from "react";
import {
  Globe,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  Wand2,
  Copy,
  Check,
  ExternalLink,
  Shield,
  ShieldAlert,
  X,
  Play,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ANTI_CAPTCHA_SCRIPT,
  GENERATE_USERNAME_SCRIPT,
  SUBMIT_LOGIN_SCRIPT,
  BYPASS_YOPMAIL_SCRIPT,
  CLICK_REFRESH_SCRIPT,
  AUTOMATION_SCRIPTS,
} from "@/lib/automation";

export default function BrowserPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [url, setUrl] = useState("https://yopmail.com");
  const [inputUrl, setInputUrl] = useState("https://yopmail.com");
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [captchaDetected, setCaptchaDetected] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [showAutomation, setShowAutomation] = useState(false);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState(false);

  const updateNavState = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      setCanGoBack(iframe.contentWindow.history.length > 1);
    } catch {
      // cross-origin
    }
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setIframeError(false);
    updateNavState();

    // Try to detect captcha in iframe (limited by CORS)
    const iframe = iframeRef.current;
    if (iframe) {
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          const html = doc.body?.innerHTML.toLowerCase() || "";
          const indicators = [
            "captcha",
            "recaptcha",
            "robot",
            "verify",
            "challenge",
            "antibot",
            "security check",
            "human verification",
          ];
          const detected = indicators.some((term) => html.includes(term));
          setCaptchaDetected(detected);
          if (detected) {
            // Auto-apply anti-captcha if we have access
            setTimeout(() => {
              tryInjectScript(ANTI_CAPTCHA_SCRIPT);
              setTimeout(() => tryInjectScript(BYPASS_YOPMAIL_SCRIPT), 500);
            }, 500);
          }
        }
      } catch {
        // cross-origin, can't inspect
      }
    }
  }, [updateNavState]);

  const tryInjectScript = useCallback((script: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      const win = iframe.contentWindow as Window & { eval?: (s: string) => unknown };
      if (win.eval) {
        const result = win.eval(script);
        setLastAction(String(result));
      }
    } catch {
      // cross-origin injection blocked
    }
  }, []);

  const navigate = useCallback(
    (target: string) => {
      let finalUrl = target.trim();
      if (!finalUrl.startsWith("http")) {
        finalUrl = "https://" + finalUrl;
      }
      setUrl(finalUrl);
      setInputUrl(finalUrl);
      setIsLoading(true);
      setIframeError(false);
    },
    []
  );

  const goBack = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.history.back();
    } catch {
      toast.info("Navigation blocked by browser security");
    }
  }, []);

  const goForward = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.history.forward();
    } catch {
      toast.info("Navigation blocked by browser security");
    }
  }, []);

  const reload = useCallback(() => {
    const iframe = iframeRef.current;
    if (iframe) {
      setIsLoading(true);
      iframe.src = iframe.src;
    }
  }, []);

  const openInNewTab = useCallback(() => {
    window.open(url, "_blank");
  }, [url]);

  const copyScript = useCallback(
    (script: string, name: string) => {
      navigator.clipboard.writeText(script).then(() => {
        setCopiedScript(name);
        toast.success(`${name} copied to clipboard`);
        setTimeout(() => setCopiedScript(null), 2000);
      });
    },
    []
  );

  const runScriptInIframe = useCallback(
    (script: string, name: string) => {
      tryInjectScript(script);
      toast.info(`Attempted to run ${name} in iframe`);
    },
    [tryInjectScript]
  );

  const loadYopmail = useCallback(() => {
    navigate("https://yopmail.com");
  }, [navigate]);

  const handleIframeError = useCallback(() => {
    setIsLoading(false);
    setIframeError(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      updateNavState();
    }, 1000);
    return () => clearInterval(interval);
  }, [updateNavState]);

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border p-2 px-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goBack}
            disabled={!canGoBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={goForward}
            disabled={!canGoForward}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={reload}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            navigate(inputUrl);
          }}
        >
          <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="h-8 flex-1 bg-muted text-sm"
            placeholder="Enter URL..."
          />
        </form>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openInNewTab}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Sheet open={showAutomation} onOpenChange={setShowAutomation}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 ${captchaDetected ? "text-destructive" : "text-cyan-400"}`}
              >
                {captchaDetected ? <ShieldAlert className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[420px] sm:max-w-[420px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-cyan-400" />
                  Automation Tools
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-80px)] pr-4">
                <div className="mt-6 space-y-6">
                  {/* Quick Actions */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => runScriptInIframe(ANTI_CAPTCHA_SCRIPT, "Anti-Captcha")}
                      >
                        <ShieldAlert className="h-4 w-4" />
                        Anti-Captcha
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => runScriptInIframe(BYPASS_YOPMAIL_SCRIPT, "Yopmail Bypass")}
                      >
                        <Shield className="h-4 w-4" />
                        Yopmail Bypass
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => runScriptInIframe(GENERATE_USERNAME_SCRIPT, "Auto-Fill")}
                      >
                        <Wand2 className="h-4 w-4" />
                        Auto-Fill Username
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => runScriptInIframe(SUBMIT_LOGIN_SCRIPT, "Submit Form")}
                      >
                        <Play className="h-4 w-4" />
                        Submit Form
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => runScriptInIframe(CLICK_REFRESH_SCRIPT, "Refresh Inbox")}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh Inbox
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={loadYopmail}
                      >
                        <Globe className="h-4 w-4" />
                        Go to Yopmail
                      </Button>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </h3>
                    <div className="rounded-lg border border-border bg-muted/50 p-3">
                      <div className="flex items-center gap-2 text-sm">
                        {captchaDetected ? (
                          <>
                            <ShieldAlert className="h-4 w-4 text-destructive" />
                            <span className="text-destructive">CAPTCHA detected on page</span>
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 text-emerald-400" />
                            <span className="text-emerald-400">No CAPTCHA detected</span>
                          </>
                        )}
                      </div>
                      {lastAction && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Last action: {lastAction}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Scripts Library */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Script Library
                    </h3>
                    <div className="space-y-2">
                      {AUTOMATION_SCRIPTS.map((script) => (
                        <div
                          key={script.name}
                          className="rounded-lg border border-border bg-muted/30 p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{script.name}</p>
                              <p className="text-xs text-muted-foreground">{script.description}</p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => copyScript(script.code, script.name)}
                              >
                                {copiedScript === script.name ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => runScriptInIframe(script.code, script.name)}
                              >
                                <Play className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 rounded bg-black/60 p-2">
                            <code className="block max-h-24 overflow-auto text-[10px] leading-relaxed text-cyan-300">
                              {script.code.substring(0, 200)}...
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Iframe or Fallback */}
      <div className="relative flex-1 overflow-hidden">
        {iframeError ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <ShieldAlert className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Cannot Load in Frame</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Yopmail blocks iframe embedding. Open it in a new tab to continue.
              </p>
            </div>
            <Button onClick={openInNewTab} className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Open Yopmail
            </Button>
          </div>
        ) : (
          <>
            <iframe
              ref={iframeRef}
              src={url}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
              onLoad={handleLoad}
              onError={handleIframeError}
              title="Browser"
            />
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              </div>
            )}
            {captchaDetected && !isLoading && (
              <div className="absolute left-4 right-4 top-4 z-10 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 backdrop-blur-sm">
                <ShieldAlert className="h-5 w-5 shrink-0 text-destructive" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-destructive">CAPTCHA Detected</p>
                  <p className="text-xs text-muted-foreground">
                    Open automation tools to apply bypass scripts
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => setCaptchaDetected(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bookmarklet Helper Bar */}
      <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-3 py-2">
        <Code className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Copy scripts and paste into the browser console (F12) if iframe injection is blocked
        </span>
      </div>
    </div>
  );
}
