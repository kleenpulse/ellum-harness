"use client";

import { ProgressProvider } from "@bprogress/next/app";

// Client boundary for BProgress. The package ships no "use client" banner, so the
// root layout can't import it directly and stay a Server Component.
//
// `color` feeds both the bar background and the peg's box-shadow glow; a CSS
// variable is valid in both, so the bar follows the signal across Paper and Night.
export function RouteProgress({ children }: { children: React.ReactNode }) {
	return (
		<ProgressProvider height="3px" color="var(--signal)" options={{ showSpinner: false }}>
			{children}
		</ProgressProvider>
	);
}
