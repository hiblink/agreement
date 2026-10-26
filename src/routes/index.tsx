import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Link2, PenLine, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/AppHeader";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inkline — Send contracts, get them signed" },
      {
        name: "description",
        content:
          "Draft contracts with dynamic client fields, share a secure signing link and track every signature.",
      },
      { property: "og:title", content: "Inkline — Send contracts, get them signed" },
      {
        property: "og:description",
        content:
          "Draft contracts with dynamic client fields, share a secure signing link and track every signature.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Logo />
        <Button asChild variant="ghost" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>
      <main className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-12 lg:grid-cols-2">
        <section>
          <p className="text-sm font-medium text-primary">Contracts & e-signatures</p>
          <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Paperwork that signs itself.
          </h1>
          <p className="mt-6 max-w-md text-lg text-muted-foreground">
            Draft an agreement, choose exactly what your client may fill in, and send a secure link.
            Track it from sent to signed.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                Get started <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <ul className="mt-12 grid gap-4 text-sm sm:grid-cols-3">
            {[
              { icon: PenLine, t: "Draw or type signatures" },
              { icon: Link2, t: "Unique signing links" },
              { icon: ShieldCheck, t: "Locked, timestamped records" },
            ].map(({ icon: I, t }) => (
              <li key={t} className="flex items-center gap-2 text-muted-foreground">
                <I className="h-4 w-4 text-primary" /> {t}
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl bg-canvas p-8">
          <div className="paper-sheet !min-h-0 rotate-1 px-10 py-10">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Service Agreement
            </p>
            <p className="mt-4 font-serif text-2xl font-semibold">Consulting Engagement</p>
            <p className="doc-prose mt-4 text-sm">
              This agreement is made with <span className="field-chip">Acme Studio</span> located at{" "}
              <span className="field-chip">12 Harbor Rd</span>, beginning on the date of signature.
            </p>
            <div className="mt-10 border-b border-paper-foreground/40 pb-1">
              <span className="font-signature text-4xl text-ink">Jordan Lee</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Signed · Oct 23, 2026</p>
          </div>
        </section>
      </main>
    </div>
  );
}
