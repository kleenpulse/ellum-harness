import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Sans } from "next/font/google";
import { OfflineBanner } from "@/components/offline-banner";
import { RouteProgress } from "@/components/providers/route-progress";
import { ThemeProvider } from "@/components/theme-provider";
import { AnchoredToaster, Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RAIL_PREPAINT } from "@/lib/shell/rail";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

// display + headline figures (font-display)
const instrumentSans = Instrument_Sans({
	variable: "--font-instrument-sans",
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "EllumHarness",
	description: "Your bots, each in its own sandbox.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			className={`${geistSans.variable} ${geistMono.variable} ${instrumentSans.variable} h-full antialiased`}
			// next-themes sets the theme class before hydration
			suppressHydrationWarning
		>
			<body className="min-h-full flex flex-col">
				{/* Before anything paints: the rail's persisted width (see RAIL_PREPAINT). */}
				<script dangerouslySetInnerHTML={{ __html: RAIL_PREPAINT }} />
				<ClerkProvider appearance={{ theme: shadcn }}>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						<RouteProgress>
							<TooltipProvider>
								<Toaster>
									<OfflineBanner />
									<div className="root flex flex-1 flex-col">{children}</div>
								</Toaster>
								<AnchoredToaster />
							</TooltipProvider>
						</RouteProgress>
					</ThemeProvider>
				</ClerkProvider>
			</body>
		</html>
	);
}
