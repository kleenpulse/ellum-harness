"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

// A dialog whose open state lives only in a URL hash (#changelog, #pricing):
// deep-linkable, Back closes it, and a navigation can't strand it open. The
// hash is invisible to Next's hooks, so this is a useSyncExternalStore over
// location.hash: `hashchange` covers manual edits and plain `#x` links,
// `popstate` back/forward, and a private event for our own history writes and
// router navigations (which fire none of the above; see notifyHashDialogs).

const HASH_EVENT = "ellum:dialog-hash";

function subscribe(cb: () => void): () => void {
	window.addEventListener("hashchange", cb);
	window.addEventListener("popstate", cb);
	window.addEventListener(HASH_EVENT, cb);
	return () => {
		window.removeEventListener("hashchange", cb);
		window.removeEventListener("popstate", cb);
		window.removeEventListener(HASH_EVENT, cb);
	};
}

// Fragments never reach the server: hydrating closed, then opening on a
// deep link, is correct rather than a mismatch.
const serverSnapshot = () => false;

/** Re-reads every hash dialog. Call after a router navigation. */
export function notifyHashDialogs(): void {
	window.dispatchEvent(new Event(HASH_EVENT));
}

export function createHashDialog(hash: `#${string}`) {
	const read = () => window.location.hash === hash;

	return {
		hash,
		useOpen: (): boolean => useSyncExternalStore(subscribe, read, serverSnapshot),
		/** Opens it from anywhere. Push, not replace, so Back closes it. */
		open(): void {
			if (read()) return;
			window.history.pushState(window.history.state, "", window.location.pathname + window.location.search + hash);
			notifyHashDialogs();
		},
		/** Replace, never history.back(): a deep link's previous entry may be another site. */
		close(): void {
			if (!read()) return;
			window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
			notifyHashDialogs();
		},
	};
}

/** Mounted once in the shell: router navigations fire neither hashchange nor popstate. */
export function HashDialogSync(): null {
	const pathname = usePathname();
	useEffect(() => {
		notifyHashDialogs();
	}, [pathname]);
	return null;
}
