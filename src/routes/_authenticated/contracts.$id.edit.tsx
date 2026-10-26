import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ContractBuilder } from "@/components/contract/ContractBuilder";
import type { EditableField, FooterConfig, HeaderConfig } from "@/lib/contracts";

export const Route = createFileRoute("/_authenticated/contracts/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit contract — Hiblink Agreement" },
      { name: "description", content: "Edit a contract." },
    ],
  }),
  component: EditPage,
});

export const contractQuery = (id: string) => ({
  queryKey: ["contract", id],
  queryFn: async () => {
    const { data, error } = await supabase.from("contracts").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data;
  },
});

function EditPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery(contractQuery(id));
  if (isLoading) return <p className="p-10 text-muted-foreground">Loading…</p>;
  if (!data) return <p className="p-10">Contract not found.</p>;
  if (data.status === "signed")
    return (
      <p className="p-10">
        This contract is signed and locked.{" "}
        <Link to="/contracts/$id" params={{ id }} className="text-primary underline">
          View it
        </Link>
      </p>
    );
  return (
    <ContractBuilder
      key={data.id}
      initial={{
        id: data.id,
        title: data.title,
        client_name: data.client_name,
        client_email: data.client_email,
        header: data.header_config as HeaderConfig,
        body: data.body_content,
        fields: data.editable_fields as unknown as EditableField[],
        footer: data.footer_config as FooterConfig,
        status: data.status,
        signing_token: data.signing_token,
      }}
    />
  );
}
