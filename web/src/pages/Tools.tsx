import { useState, useCallback } from "react";
import {
  User,
  Globe,
  ArrowRightLeft,
  QrCode,
  Shield,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { DOMAINS, AUTOMATION_SCRIPTS } from "@/lib/automation";

export default function ToolsPage() {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="border-b border-border p-4">
        <h1 className="text-xl font-bold tracking-tight">Tools</h1>
        <p className="text-sm text-muted-foreground">
          Generators, utilities, and automation helpers
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-8">
          <UsernameGenerator />
          <Separator />
          <DomainPicker />
          <Separator />
          <AlternateAddresses />
          <Separator />
          <QRCodeGenerator />
          <Separator />
          <CaptchaInfo />
          <Separator />
          <AutomationScriptsList />
        </div>
      </ScrollArea>
    </div>
  );
}

function UsernameGenerator() {
  const [count, setCount] = useState(5);
  const [length, setLength] = useState(10);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [usernames, setUsernames] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generate = useCallback(() => {
    const chars = "abcdefghijklmnopqrstuvwxyz" + (includeNumbers ? "0123456789" : "");
    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      let result = "";
      for (let j = 0; j < length; j++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      results.push(result);
    }
    setUsernames(results);
  }, [count, length, includeNumbers]);

  const copy = useCallback((username: string, index: number) => {
    navigator.clipboard.writeText(username).then(() => {
      setCopiedIndex(index);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedIndex(null), 1500);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-cyan-400" />
        <h2 className="text-lg font-semibold">Username Generator</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Count</label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCount((c) => Math.max(1, c - 1))}
            >
              -
            </Button>
            <span className="w-8 text-center text-sm font-medium">{count}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCount((c) => Math.min(20, c + 1))}
            >
              +
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Length</label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setLength((l) => Math.max(5, l - 1))}
            >
              -
            </Button>
            <span className="w-8 text-center text-sm font-medium">{length}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setLength((l) => Math.min(20, l + 1))}
            >
              +
            </Button>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeNumbers}
          onChange={(e) => setIncludeNumbers(e.target.checked)}
          className="rounded border-border"
        />
        Include numbers
      </label>

      <Button
        onClick={generate}
        className="gap-2 bg-cyan-600 hover:bg-cyan-700"
      >
        <Sparkles className="h-4 w-4" />
        Generate Usernames
      </Button>

      {usernames.length > 0 && (
        <div className="space-y-2">
          {usernames.map((username, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2"
            >
              <code className="text-sm font-mono">{username}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => copy(username, i)}
              >
                {copiedIndex === i ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DomainPicker() {
  const [username, setUsername] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("");
  const [copied, setCopied] = useState(false);

  const fullAddress = username && selectedDomain ? `${username}@${selectedDomain}` : "";

  const copy = useCallback(() => {
    if (!fullAddress) return;
    navigator.clipboard.writeText(fullAddress).then(() => {
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    });
  }, [fullAddress]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Globe className="h-5 w-5 text-cyan-400" />
        <h2 className="text-lg font-semibold">Yopmail Domains</h2>
      </div>

      <Input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter username..."
      />

      <div className="grid grid-cols-2 gap-2">
        {DOMAINS.map((domain) => (
          <Button
            key={domain}
            variant={selectedDomain === domain ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDomain(domain)}
            className={`justify-start text-xs ${
              selectedDomain === domain ? "bg-cyan-600 hover:bg-cyan-700" : ""
            }`}
          >
            {domain}
            {selectedDomain === domain && <Check className="ml-auto h-3 w-3" />}
          </Button>
        ))}
      </div>

      {fullAddress && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
          <code className="text-sm font-mono">{fullAddress}</code>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copy}>
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function AlternateAddresses() {
  const [username, setUsername] = useState("");
  const [formats, setFormats] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const separators = [".", "-", "_", "+"];

  const generate = useCallback(() => {
    if (!username.trim()) return;
    const results: string[] = [];
    for (const sep of separators) {
      const formatted = username.split("").join(sep);
      results.push(`${formatted}@yopmail.com`);
    }
    results.push(`${username}@yopmail.com`);
    setFormats(results);
  }, [username]);

  const copy = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedIndex(null), 1500);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5 text-cyan-400" />
        <h2 className="text-lg font-semibold">Alternate Addresses</h2>
      </div>

      <Input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="Enter username..."
      />
      <Button
        onClick={generate}
        disabled={!username.trim()}
        className="bg-cyan-600 hover:bg-cyan-700"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Generate Alternates
      </Button>

      {formats.length > 0 && (
        <div className="space-y-2">
          {formats.map((format, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2"
            >
              <code className="text-xs font-mono">{format}</code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => copy(format, i)}
              >
                {copiedIndex === i ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QRCodeGenerator() {
  const [text, setText] = useState("");
  const [showQR, setShowQR] = useState(false);

  const generate = useCallback(() => {
    if (!text.trim()) return;
    setShowQR(true);
  }, [text]);

  const qrUrl = showQR && text.trim()
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(text.trim())}`
    : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <QrCode className="h-5 w-5 text-cyan-400" />
        <h2 className="text-lg font-semibold">QR Code Generator</h2>
      </div>

      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text or URL..."
      />
      <Button
        onClick={generate}
        disabled={!text.trim()}
        className="bg-cyan-600 hover:bg-cyan-700"
      >
        <QrCode className="mr-2 h-4 w-4" />
        Generate QR Code
      </Button>

      {showQR && qrUrl && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <img
            src={qrUrl}
            alt="QR Code"
            className="h-[200px] w-[200px] rounded-lg"
            onError={() => {
              toast.error("Failed to generate QR code");
              setShowQR(false);
            }}
          />
          <p className="max-w-[250px] truncate text-xs text-muted-foreground">{text}</p>
        </div>
      )}
    </div>
  );
}

function CaptchaInfo() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-cyan-400" />
        <h2 className="text-lg font-semibold">CAPTCHA Detection</h2>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Yopmail uses CAPTCHA challenges to prevent automated access. This app provides
          tools to detect and work with these challenges.
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-cyan-400" />
            <span>HTML pattern matching</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-cyan-400" />
            <span>DOM element analysis</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Info className="h-4 w-4 text-cyan-400" />
            <span>Response status monitoring</span>
          </div>
        </div>

        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Use the browser automation tools to inject scripts</p>
          <p>Generate random usernames to avoid patterns</p>
          <p>Rate limiting may trigger additional challenges</p>
          <p>Always respect website terms of service</p>
        </div>
      </div>
    </div>
  );
}

function AutomationScriptsList() {
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const copy = useCallback((code: string, name: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedName(name);
      toast.success(`${name} copied to clipboard`);
      setTimeout(() => setCopiedName(null), 1500);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Terminal className="h-5 w-5 text-cyan-400" />
        <h2 className="text-lg font-semibold">Automation Scripts</h2>
      </div>

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
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => copy(script.code, script.name)}
              >
                {copiedName === script.name ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
            <div className="mt-2 rounded bg-black/60 p-2">
              <code className="block max-h-20 overflow-auto text-[10px] leading-relaxed text-cyan-300">
                {script.code.substring(0, 180)}...
              </code>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
