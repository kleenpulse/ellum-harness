import "server-only";

// App entry. Trigger tasks run outside Next, where "server-only" throws, so
// they import ./client directly.
export * from "./client";
