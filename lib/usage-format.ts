// How usage amounts read, on the Usage page and in Settings.

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** "1.2M" */
export const formatTokens = (n: number) => compact.format(n);

/** Seconds as "12 min" under an hour, else "4.5 h". */
export const formatHours = (seconds: number) => {
  if (seconds > 0 && seconds < 3600) return `${Math.max(1, Math.round(seconds / 60))} min`;
  const h = seconds / 3600;
  return `${h < 10 ? h.toFixed(1).replace(/\.0$/, "") : Math.round(h)} h`;
};

export const formatWhole = (n: number) => String(n);
