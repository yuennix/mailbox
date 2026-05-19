import { useState, useCallback, useEffect } from "react";

export interface TempEmailAccount {
  id: string;
  username: string;
  domain: string;
  createdAt: string;
  lastAccessed: string;
  isFavorite: boolean;
  note: string;
}

export interface ReceivedEmail {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  receivedAt: string;
  isRead: boolean;
  bodyHtml?: string;
}

const STORAGE_KEY = "mailbox_accounts_v1";

function loadAccounts(): TempEmailAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TempEmailAccount[];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: TempEmailAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function generateId(): string {
  return crypto.randomUUID();
}

function generateRandomUsername(length = 10): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function useAccounts() {
  const [accounts, setAccounts] = useState<TempEmailAccount[]>(loadAccounts);

  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  const createAccount = useCallback(
    (username?: string, note = "") => {
      const name = username?.trim() || generateRandomUsername();
      const account: TempEmailAccount = {
        id: generateId(),
        username: name,
        domain: "yopmail.com",
        createdAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        isFavorite: false,
        note,
      };
      setAccounts((prev) => [account, ...prev]);
      return account;
    },
    []
  );

  const deleteAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, isFavorite: !a.isFavorite, lastAccessed: new Date().toISOString() }
          : a
      )
    );
  }, []);

  const updateNote = useCallback((id: string, note: string) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, note } : a))
    );
  }, []);

  const accessAccount = useCallback((id: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, lastAccessed: new Date().toISOString() } : a
      )
    );
  }, []);

  const generateRandomAccount = useCallback(() => {
    return createAccount(undefined, "Auto-generated");
  }, [createAccount]);

  const sortedAccounts = [...accounts].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
    return new Date(b.lastAccessed).getTime() - new Date(a.lastAccessed).getTime();
  });

  return {
    accounts: sortedAccounts,
    createAccount,
    deleteAccount,
    toggleFavorite,
    updateNote,
    accessAccount,
    generateRandomAccount,
  };
}
