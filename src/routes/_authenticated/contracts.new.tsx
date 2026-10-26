import { createFileRoute } from "@tanstack/react-router";
import { ContractBuilder } from "@/components/contract/ContractBuilder";
import { DEFAULT_BODY, DEFAULT_FIELDS } from "@/lib/contracts";

export const Route = createFileRoute("/_authenticated/contracts/new")({
  head: () => ({
    meta: [
      { title: "New contract — Hiblink Agreement" },
      { name: "description", content: "Build a new contract." },
    ],
  }),
  component: () => (
    <ContractBuilder
      initial={{
        title: "Service Agreement",
        client_name: "",
        client_email: "",
        header: {
          companyName: "",
          referenceNumber: `AGR-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toISOString().slice(0, 10),
        },
        body: DEFAULT_BODY,
        fields: DEFAULT_FIELDS,
        footer: {
          disclaimer:
            "By signing electronically, the parties agree that this electronic signature is the legal equivalent of a handwritten signature and that this agreement is binding.",
        },
      }}
    />
  ),
});
