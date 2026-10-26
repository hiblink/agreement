import { Link, useNavigate } from "@tanstack/react-router";
import { FileSignature, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function Logo() {
  return (
    <span className="flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <FileSignature className="h-4 w-4" />
      </span>
      Hiblink Agreement
    </span>
  );
}

export function AppHeader() {
  const navigate = useNavigate();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link to="/dashboard">
            <Logo />
          </Link>
          <nav className="hidden text-sm sm:block">
            <Link
              to="/dashboard"
              className="text-muted-foreground hover:text-foreground"
              activeProps={{ className: "text-foreground font-medium" }}
            >
              Contracts
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link to="/contracts/new">
              <Plus className="mr-1 h-4 w-4" /> New contract
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Sign out"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
