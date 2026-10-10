// A plain module on purpose: a constant exported from a "use client" file reaches a server importer as a reference.

/** The 44px circle every rail and tab-bar control is built on. */
export const circle =
  "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full outline-none transition-[background-color,color,box-shadow,transform] duration-200 ease-swell focus-visible:ring-2 focus-visible:ring-ring active:scale-95 [&_svg]:size-[18px]";

/** A rail row (icon circle + label) that acts as one control: the whole row tints on hover. Sheet, not card: it sits on the band, where card barely shows. */
export const railRow =
  "group flex w-full items-center gap-3 rounded-full outline-none transition-colors duration-200 hover:bg-sheet focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-accent";

/** The rail's small square tools (create, search). Bare at rest; the sheet tile shows on hover, focus and while open. */
export const railTool =
  "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-2 ring-1 ring-transparent outline-none transition-[background-color,color,box-shadow] duration-200 ease-swell focus-visible:ring-2 focus-visible:ring-ring hover:bg-sheet hover:text-foreground hover:ring-border data-popup-open:bg-sheet data-popup-open:text-foreground data-popup-open:ring-border dark:hover:bg-card-nested dark:hover:ring-glass-border dark:data-popup-open:bg-card-nested dark:data-popup-open:ring-glass-border";
