import { BrandMark } from "@/components/brand-mark";

// Canonical header bar for public / standalone pages (privacy, waitlist, etc.).
// Wraps the shared BrandMark lockup so the header stays consistent everywhere.
// The dashboard has its own richer header (logged-in nav) that also uses BrandMark.
//
// href is forwarded to BrandMark: pass it to make the lockup link somewhere
// (e.g. "/" or "/login"); omit it for a non-linked header (e.g. the login page).
export function SiteHeader({ href }: { href?: string }) {
  return (
    <header className="border-b bg-card px-6 py-3">
      <BrandMark href={href} />
    </header>
  );
}
