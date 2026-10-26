import { STATUS_LABEL, type ContractStatus } from "@/lib/contracts";

const styles: Record<ContractStatus, string> = {
  draft: "bg-status-draft/10 text-status-draft ring-status-draft/25",
  sent: "bg-status-sent/10 text-status-sent ring-status-sent/25",
  viewed: "bg-status-viewed/10 text-status-viewed ring-status-viewed/30",
  signed: "bg-status-signed/10 text-status-signed ring-status-signed/25",
};

export function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}
