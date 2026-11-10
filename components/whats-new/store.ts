"use client";

import { createHashDialog } from "@/lib/hash-dialog";

// The full changelog dialog, open while the URL hash is #changelog.
const changelog = createHashDialog("#changelog");

export const CHANGELOG_HASH = changelog.hash;
export const useChangelogOpen = changelog.useOpen;
export const requestChangelogOpen = changelog.open;
export const closeChangelog = changelog.close;
