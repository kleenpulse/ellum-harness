import { animate } from "motion";
import { flushSync } from "react-dom";
import { motionReduced } from "./motion-pref";

/*
  Shadow Garden's theme reveal: the new theme wipes in as a circle growing from
  the toggle. View Transitions where supported; elsewhere a motion-driven hole
  in an overlay painted with the outgoing canvas. Reduced motion swaps instantly.

  Clip coordinates are percentages, not px: `::view-transition-new(root)` is
  sized to the snapshot containing block, which on Android Chrome is larger
  than the visual viewport, so px would land toward the top-left.
*/

function clipPaths(cx: number, cy: number, maxRadius: number, w: number, h: number): [string, string] {
	const at = `${((cx / w) * 100).toFixed(3)}% ${((cy / h) * 100).toFixed(3)}%`;
	// circle() resolves a % radius against hypot(w, h) / √2 of the reference box.
	const r = ((maxRadius / (Math.hypot(w, h) / Math.SQRT2)) * 100).toFixed(3);
	return [`circle(0% at ${at})`, `circle(${r}% at ${at})`];
}

function fallbackReveal(x: number, y: number, maxRadius: number, duration: number, applyTheme: () => void) {
	const overlay = document.createElement("div");
	Object.assign(overlay.style, {
		position: "fixed",
		inset: "0",
		zIndex: "2147483647",
		pointerEvents: "none",
		background: getComputedStyle(document.body).backgroundColor,
	});
	overlay.style.setProperty("--hole", "0px");
	const mask = `radial-gradient(circle at ${x}px ${y}px, transparent var(--hole), #000 calc(var(--hole) + 0.5px))`;
	overlay.style.webkitMaskImage = mask;
	overlay.style.maskImage = mask;
	document.body.appendChild(overlay);

	const remove = () => overlay.remove();
	applyTheme();
	animate(0, maxRadius * 1.02, {
		duration: duration / 1000,
		ease: "easeInOut",
		onUpdate: (v) => overlay.style.setProperty("--hole", `${v}px`),
	}).finished.then(remove, remove);
	// Never leave the overlay behind if the animation is interrupted.
	setTimeout(remove, duration + 100);
}

export function runThemeTransition({
	triggerEl,
	duration = 400,
	applyTheme,
}: {
	/** The reveal grows from this element's center (viewport center without one). */
	triggerEl?: HTMLElement | null;
	duration?: number;
	/** Applies the new theme synchronously, so the View Transition snapshot has it. */
	applyTheme: () => void;
}) {
	if (motionReduced()) {
		applyTheme();
		return;
	}

	const w = window.visualViewport?.width ?? window.innerWidth;
	const h = window.visualViewport?.height ?? window.innerHeight;
	let x = w / 2;
	let y = h / 2;
	if (triggerEl) {
		const { top, left, width, height } = triggerEl.getBoundingClientRect();
		x = left + width / 2;
		y = top + height / 2;
	}
	const maxRadius = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));

	if (typeof document.startViewTransition !== "function") {
		fallbackReveal(x, y, maxRadius, duration, applyTheme);
		return;
	}

	const clipPath = clipPaths(x, y, maxRadius, w, h);
	const root = document.documentElement;
	// Pins the collapsed clip in CSS so Firefox doesn't paint the new theme
	// unclipped between the snapshot and the animation below.
	root.setAttribute("data-theme-vt", "active");
	root.style.setProperty("--theme-vt-clip-from", clipPath[0]);

	const transition = document.startViewTransition(() => flushSync(applyTheme));
	transition.finished.finally(() => {
		root.removeAttribute("data-theme-vt");
		root.style.removeProperty("--theme-vt-clip-from");
	});
	transition.ready.then(() => {
		root.animate(
			{ clipPath },
			{ duration, easing: "ease-in-out", fill: "forwards", pseudoElement: "::view-transition-new(root)" },
		);
	});
}
