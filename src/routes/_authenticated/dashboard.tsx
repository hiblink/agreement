import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Clock,
  Copy,
  Eye,
  FileText,
  MoreHorizontal,
  Pencil,
  Search,
  Send,
  Trash2,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { sendContractEmail } from "@/lib/contracts.functions";
import type { ContractStatus } from "@/lib/contracts";
import { StatusBadge } from "@/components/contract/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Contract Dashboard — Inkline" },
      { name: "description", content: "Manage your contracts, invitations, and signature status." },
    ],
  }),
  component: Dashboard,
});

export const contractsQuery = {
  queryKey: ["contracts"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("contracts")
      .select("id,title,client_name,client_email,status,created_at,signed_at,signing_token")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

const fmt = (d: string | null | undefined): string =>
  d
    ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "—";

function Dashboard() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery(contractsQuery);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | ContractStatus>("all");

  const now = new Date();
  const metrics = {
    total: data.length,
    pending: data.filter((c) => c.status === "sent" || c.status === "viewed").length,
    signedMonth: data.filter((c) => {
      if (!c.signed_at) return false;
      const d = new Date(c.signed_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
  };

  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return data.filter(
      (c) =>
        (status === "all" || c.status === status) &&
        (!s ||
          [c.title, c.client_name, c.client_email].some((v) =>
            (v || "").toLowerCase().includes(s),
          )),
    );
  }, [data, q, status]);

  const copy = (token: string): void => {
    navigator.clipboard.writeText(`${window.location.origin}/sign/${token}`);
    toast.success("Public signing link copied to clipboard");
  };

  const resend = async (id: string): Promise<void> => {
    try {
      const r = await sendContractEmail({ data: { id, origin: window.location.origin } });
      if (r.sent) {
        toast.success("Invitation email sent successfully");
      } else {
        toast.warning(
          `Email notification note: ${r.reason || "Skipped"}. Copy and share the direct link.`,
        );
      }
      qc.invalidateQueries({ queryKey: ["contracts"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (id: string): Promise<void> => {
    if (!confirm("Are you sure you want to delete this contract? This action cannot be undone."))
      return;
    const { error } = await supabase.from("contracts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contract deleted");
    qc.invalidateQueries({ queryKey: ["contracts"] });
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Contracts Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor agreements, track signer engagement, and manage e-signatures.
          </p>
        </div>
        <Button asChild size="sm" className="sm:self-start">
          <Link to="/contracts/new">
            <Plus className="mr-1.5 h-4 w-4" /> New Contract
          </Link>
        </Button>
      </div>

      {/* Summary Metric Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Contracts",
            value: metrics.total,
            icon: FileText,
            desc: "All created agreements",
          },
          {
            label: "Pending Signatures",
            value: metrics.pending,
            icon: Clock,
            desc: "Awaiting client completion",
          },
          {
            label: "Signed This Month",
            value: metrics.signedMonth,
            icon: CheckCircle2,
            desc: "Legally executed & locked",
          },
        ].map(({ label, value, icon: I, desc }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <I className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-foreground tabular-nums">
              {value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {/* Filterable & Searchable Data Table */}
      <div className="mt-8 rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 bg-background"
              placeholder="Search contracts by title, client name, or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="sm:w-48 bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="signed">Signed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold">Contract Title</TableHead>
              <TableHead className="font-semibold">Client Name &amp; Email</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Created Date</TableHead>
              <TableHead className="font-semibold">Signed Date</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  Loading contracts…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">No contracts found</p>
                  <p className="text-xs text-muted-foreground">
                    {q || status !== "all"
                      ? "Try adjusting your filters"
                      : "Create your first digital contract to get started"}
                  </p>
                  <Button asChild size="sm" className="mt-4">
                    <Link to="/contracts/new">Create Contract</Link>
                  </Button>
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link
                    to="/contracts/$id"
                    params={{ id: c.id }}
                    className="hover:text-primary transition-colors font-semibold"
                  >
                    {c.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-foreground">{c.client_name || "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.client_email || "No email"}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status as ContractStatus} />
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">{fmt(c.created_at)}</TableCell>
                <TableCell className="text-muted-foreground text-xs">{fmt(c.signed_at)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/contracts/$id" params={{ id: c.id }}>
                          <Eye className="mr-2 h-4 w-4" /> View / Download
                        </Link>
                      </DropdownMenuItem>
                      {c.status !== "signed" && (
                        <DropdownMenuItem asChild>
                          <Link to="/contracts/$id/edit" params={{ id: c.id }}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit Contract
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {c.status !== "draft" && (
                        <DropdownMenuItem onClick={() => copy(c.signing_token)}>
                          <Copy className="mr-2 h-4 w-4" /> Copy Signing Link
                        </DropdownMenuItem>
                      )}
                      {c.status !== "signed" && (
                        <DropdownMenuItem onClick={() => resend(c.id)}>
                          <Send className="mr-2 h-4 w-4" />{" "}
                          {c.status === "draft" ? "Send Invitation" : "Resend Invitation"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => remove(c.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Contract
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
