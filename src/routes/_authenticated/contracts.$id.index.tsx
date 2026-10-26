import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Copy, Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DocumentView } from "@/components/contract/DocumentView";
import { StatusBadge } from "@/components/contract/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  parseSignature,
  type ContractStatus,
  type EditableField,
  type FooterConfig,
  type HeaderConfig,
} from "@/lib/contracts";

export const Route = createFileRoute("/_authenticated/contracts/$id/")({
  head: () => ({
    meta: [
      { title: "Contract — Inkline" },
      { name: "description", content: "View contract details." },
    ],
  }),
  component: ViewPage,
});

function ViewPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["contract", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <p className="p-10 text-muted-foreground">Loading…</p>;
  if (!data) return <p className="p-10">Contract not found.</p>;
  const ts = (d: string | null) => (d ? new Date(d).toLocaleString() : "—");

  return (
    <div className="bg-canvas px-4 py-8 sm:px-8">
      <div className="no-print mx-auto mb-6 flex max-w-[816px] flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/dashboard">
            <ArrowLeft className="mr-1 h-4 w-4" /> Contracts
          </Link>
        </Button>
        <div className="flex gap-2">
          {data.status !== "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/sign/${data.signing_token}`,
                );
                toast.success("Link copied");
              }}
            >
              <Copy className="mr-1 h-4 w-4" /> Copy link
            </Button>
          )}
          {data.status !== "signed" && (
            <Button asChild variant="outline" size="sm">
              <Link to="/contracts/$id/edit" params={{ id }}>
                <Pencil className="mr-1 h-4 w-4" /> Edit
              </Link>
            </Button>
          )}
          <Button size="sm" onClick={() => window.print()}>
            <Download className="mr-1 h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>
      <div className="no-print mx-auto mb-6 grid max-w-[816px] gap-4 rounded-lg border border-border bg-card p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-1">
            <StatusBadge status={data.status as ContractStatus} />
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Sent</p>
          <p className="mt-1">{ts(data.sent_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Viewed</p>
          <p className="mt-1">{ts(data.viewed_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            Signed {data.signer_ip ? `· IP ${data.signer_ip}` : ""}
          </p>
          <p className="mt-1">{ts(data.signed_at)}</p>
        </div>
      </div>
      <DocumentView
        header={data.header_config as HeaderConfig}
        body={data.body_content}
        fields={data.editable_fields as unknown as EditableField[]}
        footer={data.footer_config as FooterConfig}
        clientName={data.client_name}
        signature={parseSignature(data.signature_data)}
        signedAt={data.signed_at}
      />
    </div>
  );
}
