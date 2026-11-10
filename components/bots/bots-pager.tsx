import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { botsHref, PAGE_SIZE } from "@/lib/bots/view";

/** Previous, page numbers and next for the Bots page. Renders nothing when everything fits on one page. */
export function BotsPager({ query, page, matches }: { query: string; page: number; matches: number }) {
  const pages = Math.ceil(matches / PAGE_SIZE);
  if (pages <= 1) return null;

  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, matches);

  return (
    <div className="flex flex-col items-center gap-3 pt-2 @xl:flex-row @xl:justify-between">
      <span className="readout tabular text-ink-3">
        {first}–{last} of {matches}
      </span>
      <Pagination className="mx-0 w-auto">
        <PaginationContent className="gap-1.5">
          <PaginationItem>
            <Step href={page > 1 ? botsHref(query, page - 1) : null} label="Previous page">
              <ChevronLeft data-icon="inline-start" />
              Previous
            </Step>
          </PaginationItem>
          {Array.from({ length: pages }, (_, index) => index + 1).map((n) => (
            <PaginationItem key={n}>
              <Link
                href={botsHref(query, n)}
                aria-label={`Page ${n}`}
                aria-current={n === page ? "page" : undefined}
                className={buttonVariants({
                  size: "pill-sm",
                  variant: n === page ? "default" : "surface",
                  className: "tabular min-w-8 px-0",
                })}
              >
                {n}
              </Link>
            </PaginationItem>
          ))}
          <PaginationItem>
            <Step href={page < pages ? botsHref(query, page + 1) : null} label="Next page">
              Next
              <ChevronRight data-icon="inline-end" />
            </Step>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

/** A previous / next pill: a real link (not Button's role="button"), or a disabled button at either end. */
function Step({ href, label, children }: { href: string | null; label: string; children: React.ReactNode }) {
  return href ? (
    <Link href={href} aria-label={label} className={buttonVariants({ size: "pill-sm", variant: "surface" })}>
      {children}
    </Link>
  ) : (
    <Button size="pill-sm" variant="surface" aria-label={label} disabled>
      {children}
    </Button>
  );
}
