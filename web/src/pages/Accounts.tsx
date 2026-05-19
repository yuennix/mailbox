import { useState, useCallback } from "react";
import {
  Plus,
  Star,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Search,
  Mail,
  Clock,
  Edit3,
  X,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAccounts, type TempEmailAccount } from "@/hooks/useAccounts";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AccountsPage() {
  const {
    accounts,
    createAccount,
    deleteAccount,
    toggleFavorite,
    updateNote,
    accessAccount,
    generateRandomAccount,
  } = useAccounts();

  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<TempEmailAccount | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newNote, setNewNote] = useState("");
  const [useRandom, setUseRandom] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState("");

  const filtered = accounts.filter(
    (a) =>
      a.username.toLowerCase().includes(search.toLowerCase()) ||
      a.note.toLowerCase().includes(search.toLowerCase()) ||
      a.domain.toLowerCase().includes(search.toLowerCase())
  );

  const favorites = filtered.filter((a) => a.isFavorite);
  const others = filtered.filter((a) => !a.isFavorite);

  const handleCopy = useCallback(
    (text: string, field: string) => {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedField(field);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopiedField(null), 1500);
      });
    },
    []
  );

  const handleCreate = useCallback(() => {
    if (useRandom) {
      generateRandomAccount();
    } else {
      if (!newUsername.trim()) return;
      createAccount(newUsername.trim(), newNote);
    }
    setShowCreate(false);
    setNewUsername("");
    setNewNote("");
    setUseRandom(true);
  }, [useRandom, newUsername, newNote, createAccount, generateRandomAccount]);

  const openYopmail = useCallback(
    (account: TempEmailAccount) => {
      accessAccount(account.id);
      const url = `https://yopmail.com/en/inbox.php?login=${encodeURIComponent(account.username)}`;
      window.open(url, "_blank");
    },
    [accessAccount]
  );

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-bold tracking-tight">Email Accounts</h1>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 bg-cyan-600 hover:bg-cyan-700">
                <Plus className="h-4 w-4" />
                New Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Account</DialogTitle>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant={useRandom ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseRandom(true)}
                    className={useRandom ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                  >
                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    Random
                  </Button>
                  <Button
                    variant={!useRandom ? "default" : "outline"}
                    size="sm"
                    onClick={() => setUseRandom(false)}
                    className={!useRandom ? "bg-cyan-600 hover:bg-cyan-700" : ""}
                  >
                    <Edit3 className="mr-1 h-3.5 w-3.5" />
                    Custom
                  </Button>
                </div>

                {!useRandom && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Username</label>
                    <Input
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="Enter username..."
                      autoFocus
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Note (optional)</label>
                  <Input
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                  />
                </div>

                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground">
                    {useRandom
                      ? `A random username will be generated automatically.`
                      : `Your email will be: ${newUsername || "..."}@yopmail.com`}
                  </p>
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={!useRandom && !newUsername.trim()}
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                >
                  Create Account
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts..."
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Mail className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Email Accounts</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Create temporary email accounts for secure, disposable communication.
              </p>
              <Button
                onClick={() => setShowCreate(true)}
                className="mt-4 gap-2 bg-cyan-600 hover:bg-cyan-700"
              >
                <Plus className="h-4 w-4" />
                Create Account
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {favorites.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Favorites
                  </h2>
                  <div className="space-y-2">
                    {favorites.map((account) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        onSelect={setSelectedAccount}
                        onToggleFavorite={() => toggleFavorite(account.id)}
                        onDelete={() => deleteAccount(account.id)}
                        onCopy={(text, field) => handleCopy(text, field)}
                        onOpen={() => openYopmail(account)}
                        copiedField={copiedField}
                      />
                    ))}
                  </div>
                </div>
              )}

              {others.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    All Accounts
                  </h2>
                  <div className="space-y-2">
                    {others.map((account) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        onSelect={setSelectedAccount}
                        onToggleFavorite={() => toggleFavorite(account.id)}
                        onDelete={() => deleteAccount(account.id)}
                        onCopy={(text, field) => handleCopy(text, field)}
                        onOpen={() => openYopmail(account)}
                        copiedField={copiedField}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Detail Sheet */}
      <Sheet
        open={!!selectedAccount}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAccount(null);
            setEditingNote("");
          }
        }}
      >
        <SheetContent className="w-[400px] sm:max-w-[400px]">
          {selectedAccount && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-cyan-400" />
                  Account Details
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-60px)] pr-4">
                <div className="mt-6 space-y-6">
                  {/* Email Address */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Email Address
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <code className="text-sm font-mono text-cyan-300">
                        {selectedAccount.username}@{selectedAccount.domain}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() =>
                          handleCopy(
                            `${selectedAccount.username}@${selectedAccount.domain}`,
                            "full"
                          )
                        }
                      >
                        {copiedField === "full" ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Username</span>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono">{selectedAccount.username}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopy(selectedAccount.username, "user")}
                        >
                          {copiedField === "user" ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Domain</span>
                      <span className="text-sm">{selectedAccount.domain}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm">{formatDate(selectedAccount.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Last Accessed</span>
                      <span className="text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(selectedAccount.lastAccessed)}
                      </span>
                    </div>
                  </div>

                  {/* Note */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Note</label>
                    <div className="flex gap-2">
                      <Input
                        value={editingNote || selectedAccount.note}
                        onChange={(e) => setEditingNote(e.target.value)}
                        placeholder="Add a note..."
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateNote(selectedAccount.id, editingNote);
                          toast.success("Note updated");
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        toggleFavorite(selectedAccount.id);
                        setSelectedAccount({
                          ...selectedAccount,
                          isFavorite: !selectedAccount.isFavorite,
                        });
                      }}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          selectedAccount.isFavorite ? "fill-yellow-400 text-yellow-400" : ""
                        }`}
                      />
                      {selectedAccount.isFavorite ? "Remove Favorite" : "Add to Favorites"}
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => openYopmail(selectedAccount)}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in Browser
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full justify-start gap-2"
                      onClick={() => {
                        deleteAccount(selectedAccount.id);
                        setSelectedAccount(null);
                        toast.success("Account deleted");
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AccountCard({
  account,
  onSelect,
  onToggleFavorite,
  onDelete,
  onCopy,
  onOpen,
  copiedField,
}: {
  account: TempEmailAccount;
  onSelect: (a: TempEmailAccount) => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onCopy: (text: string, field: string) => void;
  onOpen: () => void;
  copiedField: string | null;
}) {
  const fullAddress = `${account.username}@${account.domain}`;

  return (
    <div
      className="group relative rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50 cursor-pointer"
      onClick={() => onSelect(account)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <code className="truncate text-sm font-mono font-medium">{fullAddress}</code>
            {account.isFavorite && (
              <Star className="h-3.5 w-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
            )}
          </div>
          {account.note && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{account.note}</p>
          )}
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {formatDate(account.createdAt)}
            </Badge>
          </div>
        </div>
        <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(fullAddress, account.id);
            }}
          >
            {copiedField === account.id ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onOpen();
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            <Star
              className={`h-3.5 w-3.5 ${
                account.isFavorite ? "fill-yellow-400 text-yellow-400" : ""
              }`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
