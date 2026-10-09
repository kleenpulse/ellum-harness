// A plain module on purpose: a constant exported from a "use client" file reaches a server importer as a reference.

/** The 44px circle every rail and tab-bar control is built on. */
export const circle =
  "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full outline-none transition-[background-color,color,box-shadow,transform] duration-200 ease-swell focus-visible:ring-2 focus-visible:ring-ring active:scale-95 [&_svg]:size-[18px]";
