import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Globe, Mail, Wrench } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import BrowserPage from "./pages/Browser";
import AccountsPage from "./pages/Accounts";
import ToolsPage from "./pages/Tools";

const queryClient = new QueryClient();

type Tab = "browser" | "accounts" | "tools";

const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>("browser");

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "browser", label: "Browser", icon: <Globe className="h-5 w-5" /> },
    { id: "accounts", label: "Accounts", icon: <Mail className="h-5 w-5" /> },
    { id: "tools", label: "Tools", icon: <Wrench className="h-5 w-5" /> },
  ];

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <div className="flex h-screen flex-col bg-background text-foreground">
          {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            {activeTab === "browser" && <BrowserPage />}
            {activeTab === "accounts" && <AccountsPage />}
            {activeTab === "tools" && <ToolsPage />}
          </main>

          {/* Bottom Tab Bar */}
          <nav className="shrink-0 border-t border-border bg-card/80 backdrop-blur-md">
            <div className="flex items-center justify-around">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 flex-col items-center gap-0.5 px-4 py-2.5 transition-colors ${
                    activeTab === tab.id
                      ? "text-cyan-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.icon}
                  <span className="text-[11px] font-medium">{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="mt-0.5 h-0.5 w-5 rounded-full bg-cyan-400" />
                  )}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
