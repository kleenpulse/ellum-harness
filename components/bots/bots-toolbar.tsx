"use client";

import { LayoutGrid, Rows3, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { Spinner } from "@/components/ui/spinner";
import { type BotsView, botsHref, saveBotsView } from "@/lib/bots/view";

const DEBOUNCE_MS = 200;

const VIEWS: SegmentedOption<BotsView>[] = [
  { value: "list", label: "List", icon: Rows3 },
  { value: "cards", label: "Cards", icon: LayoutGrid },
];

/**
 * Search and the list / cards switch for the Bots page. The search lives in
 * the URL (`?q=`), the view in a cookie; the server renders the result.
 */
export function BotsToolbar({
  query,
  view,
  matches,
  total,
}: {
  query: string;
  view: BotsView;
  /** Bots matching the search, across all pages. */
  matches: number;
  total: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(query);
  const [typing, setTyping] = useState(false);
  const [searching, startSearch] = useTransition();
  const [, startSwitch] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The URL changed from outside the box (Back, "Clear search"): follow it.
  // While the user is typing, the box is ahead of the URL and wins.
  const [seen, setSeen] = useState(query);
  if (query !== seen) {
    setSeen(query);
    if (!typing && !searching && query !== value.trim()) setValue(query);
  }

  function search(next: string, delay: number) {
    setValue(next);
    setTyping(true);
    clearTimeout(timer.current);
    // A new search always starts on page 1.
    timer.current = setTimeout(() => {
      setTyping(false);
      startSearch(() => router.replace(botsHref(next.trim()), { scroll: false }));
    }, delay);
  }

  function show(next: BotsView) {
    saveBotsView(next);
    startSwitch(() => router.refresh());
  }

  return (
    <div className="entrance flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:justify-between">
      <InputGroup className="h-10 rounded-pill border-border bg-card-nested @xl:max-w-sm dark:border-glass-border dark:bg-card-nested">
        <InputGroupAddon className="pl-3.5">
          {searching ? <Spinner /> : <Search aria-hidden />}
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          aria-label="Search bots"
          placeholder="Search by name or job"
          autoComplete="off"
          value={value}
          onChange={(event) => search(event.target.value, DEBOUNCE_MS)}
          className="[&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <InputGroupAddon align="inline-end" className="pr-2.5">
            <InputGroupButton
              size="icon-xs"
              aria-label="Clear search"
              className="rounded-full"
              onClick={() => search("", 0)}
            >
              <X />
            </InputGroupButton>
          </InputGroupAddon>
        ) : null}
      </InputGroup>

      <div className="flex items-center justify-between gap-4">
        <span aria-live="polite" className="readout tabular text-ink-3">
          {query ? `${matches} of ${total}` : `${total} ${total === 1 ? "bot" : "bots"}`}
        </span>
        <Segmented label="View" iconOnly options={VIEWS} value={view} onChange={show} />
      </div>
    </div>
  );
}
