"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import {
	PanelLeftClose,
	PanelLeftOpen,
	Plus,
	Search,
	UsersRound,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { BotDialogPanel } from "@/components/bot-dialog";
import { ChatAvatar } from "@/components/chat-avatar";
import { Button } from "@/components/ui/button";
import CommandPalette, {
	type CommandGroupDef,
} from "@/components/ui/command-palette";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMac } from "@/hooks/use-is-mac";
import { SPRING_DETENT } from "@/lib/motion";
import { railCookie } from "@/lib/shell/rail";
import { cn } from "@/lib/utils";
import type { ChatListItem } from "@/queries/bots";
import { EllumMark } from "./ellum-mark";
import { isActive, NAV } from "./nav";
import { circle, railRow } from "./styles";
import { ThemeToggle } from "./theme-toggle";

/*
  The rail expands (Shadow Garden admin's rail). Every entry is the same row —
  a 44px icon box, then a label — so collapsed it is the 84px icon rail, and
  expanded the rail simply widens: icons never move, labels fade in beside
  them. Tooltips only exist while collapsed; expanded, the label says it.
  Below md, MobileTabBar takes over.
*/

const label =
	"min-w-0 flex-1 truncate text-left text-[13.5px] whitespace-nowrap transition-opacity duration-200 ease-swell";

function isTyping(target: EventTarget | null) {
	const el = target as HTMLElement | null;
	return Boolean(
		el &&
		(el.tagName === "INPUT" ||
			el.tagName === "TEXTAREA" ||
			el.isContentEditable),
	);
}

export function NavRail({
	initialExpanded,
	chats,
	className,
}: {
	/** From the cookie, so the server paints the right width. */
	initialExpanded: boolean;
	chats: ChatListItem[];
	className?: string;
}) {
	const pathname = usePathname();
	const indicatorId = useId();
	const { user } = useUser();
	const [expanded, setExpanded] = useState(initialExpanded);
	const createRef = useRef<HTMLButtonElement>(null);
	const [botOpen, setBotOpen] = useState(false);
	const [botOrigin, setBotOrigin] = useState<DOMRect | null>(null);
	const router = useRouter();
	const [searchOpen, setSearchOpen] = useState(false);

	// Group chats show their first bot's face until they get one of their own.
	const searchGroups = useMemo<CommandGroupDef[]>(
		() => [
			{
				id: "chats",
				heading: "Chats",
				commands: chats.map((chat) => {
					const href = `/chats/${chat.id}`;
					return {
						id: chat.id,
						label: chat.name,
						media: <ChatAvatar seed={chat.avatar} className="size-6" />,
						active: pathname === href,
						onRun: () => router.push(href),
					};
				}),
			},
		],
		[chats, pathname, router],
	);

	const toggle = useCallback(() => {
		document.cookie = railCookie(!expanded);
		setExpanded(!expanded);
	}, [expanded]);

	// `[` toggles the rail, the way editors bind their sidebars.
	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
			if (e.key === "[") {
				e.preventDefault();
				toggle();
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [toggle]);

	const hidden = expanded ? "opacity-100" : "pointer-events-none opacity-0";

	return (
		<nav
			aria-label="Primary"
			className={cn(
				"sticky top-0 z-10 h-svh shrink-0 flex-col gap-4 overflow-x-hidden overflow-y-auto bg-band px-5 py-5 scrollbar-none",
				"transition-[width] duration-300 ease-detent motion-reduce:transition-none",
				"dark:border-r dark:border-glass-border",
				expanded ? "w-[248px]" : "w-[84px]",
				className,
			)}
		>
			{/* One menu, two homes for its trigger: beside the logo when expanded,
			    under it when collapsed. The trigger fades in wherever it lands. */}
			<DropdownMenu>
				{/* Expanded, the row spans the capsule's outer edges (its -mx-1.5) so logo and "+" line up with it. */}
				<div
					className={cn(
						"flex items-center gap-2 transition-[margin] duration-300 ease-detent motion-reduce:transition-none",
						expanded && "-mx-1.5",
					)}
				>
					<Link
						href="/"
						aria-label="Ellum home"
						className="flex min-w-0 flex-1 items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						{/* Shrinks when expanded, giving the name room before the "+". */}
						<EllumMark
							className={cn(
								"shrink-0 transition-[width,height] duration-300 ease-detent motion-reduce:transition-none",
								expanded ? "size-9" : "size-11",
							)}
						/>
						<span
							className={cn(
								label,
								"font-display text-[15px] font-semibold tracking-[-0.01em] text-ink",
								hidden,
							)}
						>
							EllumHarness
						</span>
					</Link>
					{expanded && <CreateTrigger ref={createRef} tip={false} />}
				</div>
				{!expanded && (
					<div className="flex justify-center">
						<CreateTrigger ref={createRef} tip />
					</div>
				)}
				<DropdownMenuContent
					side={expanded ? "bottom" : "right"}
					align={expanded ? "end" : "start"}
					sideOffset={expanded ? 8 : 12}
					className="w-56 rounded-2xl p-1.5 shadow-lift"
				>
					<DropdownMenuItem
						className="gap-2.5 rounded-xl px-2.5 py-2"
						onClick={() => {
							setBotOrigin(createRef.current?.getBoundingClientRect() ?? null);
							setBotOpen(true);
						}}
					>
						<Plus />
						Create new bot
					</DropdownMenuItem>
					<DropdownMenuItem disabled className="gap-2.5 rounded-xl px-2.5 py-2">
						<UsersRound />
						Create group chat
						<span className="ml-auto font-mono text-[10.5px] text-ink-3">
							soon
						</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<SearchTrigger expanded={expanded} onOpen={() => setSearchOpen(true)} />
			<BotDialogPanel
				open={botOpen}
				onOpenChange={setBotOpen}
				origin={botOrigin}
			/>
			<CommandPalette
				open={searchOpen}
				onOpenChange={setSearchOpen}
				groups={searchGroups}
				placeholder="Search chats…"
				fixed
			/>

			<div className="-mx-1.5 mt-2 flex flex-col gap-1.5 rounded-card bg-sheet p-1.5 ring-1 ring-border dark:bg-card-nested dark:ring-glass-border">
				{NAV.map(({ href, label: text, icon: Icon }) => {
					const active = isActive(pathname, href);
					return (
						<Tooltip key={href} disabled={expanded}>
							<TooltipTrigger
								render={
									<Link
										href={href}
										aria-current={active ? "page" : undefined}
										className={cn(
											"group relative isolate flex h-11 w-full items-center gap-3 rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
											active
												? "text-primary-foreground dark:text-signal"
												: "text-ink-2 hover:bg-card hover:text-foreground dark:hover:bg-accent",
										)}
									/>
								}
							>
								{active && (
									<motion.span
										layoutId={indicatorId}
										aria-hidden
										transition={SPRING_DETENT}
										className="absolute inset-0 -z-10 rounded-full bg-primary dark:bg-signal-soft dark:shadow-glow"
									/>
								)}
								<span className="grid size-11 shrink-0 place-items-center [&_svg]:size-[18px]">
									<Icon strokeWidth={1.75} />
								</span>
								<span className={cn(label, hidden, active && "font-medium")}>
									{text}
								</span>
							</TooltipTrigger>
							<TooltipContent side="right" sideOffset={12}>
								{text}
							</TooltipContent>
						</Tooltip>
					);
				})}
			</div>

			{chats.length > 0 && (
				<ChatList chats={chats} pathname={pathname} expanded={expanded} />
			)}

			<div className="mt-auto flex flex-col gap-3">
				<Tooltip disabled={expanded}>
					<TooltipTrigger
						render={
							<button
								type="button"
								onClick={toggle}
								aria-expanded={expanded}
								aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
								className={railRow}
							/>
						}
					>
						<span
							className={cn(circle, "text-ink-2 group-hover:text-foreground")}
						>
							{expanded ? <PanelLeftClose /> : <PanelLeftOpen />}
						</span>
						<span
							className={cn(
								label,
								"text-ink-2 group-hover:text-foreground",
								hidden,
							)}
						>
							Collapse
						</span>
					</TooltipTrigger>
					<TooltipContent side="right" sideOffset={12}>
						Expand <Kbd>[</Kbd>
					</TooltipContent>
				</Tooltip>

				<ThemeToggle
					tip={!expanded}
					label={
						<span
							className={cn(
								label,
								"text-ink-2 group-hover:text-foreground",
								hidden,
							)}
						>
							Theme
						</span>
					}
				/>

				{/* Clerk owns the trigger; a pseudo-element stretches its hit area over the
				    whole row (box and trigger made static so it sizes to this row). */}
				<div
					className={cn(
						railRow,
						"relative has-focus-visible:ring-2 has-focus-visible:ring-ring",
					)}
				>
					<div className="grid size-11 shrink-0 place-items-center">
						<UserButton
							appearance={{
								elements: {
									rootBox: "static!",
									userButtonBox: "static!",
									userButtonTrigger:
										"static! focus:shadow-none! before:absolute before:inset-0 before:rounded-full before:content-['']",
								},
							}}
						/>
					</div>
					<div
						className={cn(
							"flex min-w-0 flex-1 flex-col transition-opacity duration-200 ease-swell",
							hidden,
						)}
					>
						<span className="truncate text-[13px] font-medium whitespace-nowrap text-ink">
							{user?.fullName ?? user?.username ?? ""}
						</span>
						<span className="truncate font-mono text-[11px] whitespace-nowrap text-ink-3">
							{user?.primaryEmailAddress?.emailAddress ?? ""}
						</span>
					</div>
				</div>
			</div>
		</nav>
	);
}

/** The user's chats, newest first. Collapsed, only the faces remain. */
function ChatList({
	chats,
	pathname,
	expanded,
}: {
	chats: ChatListItem[];
	pathname: string;
	expanded: boolean;
}) {
	const hidden = expanded ? "opacity-100" : "opacity-0";
	return (
		// Same capsule as the nav group; scrolls inside once it outgrows the rail.
		<section
			aria-label="Chats"
			className="-mx-1.5 flex min-h-0 flex-col gap-1.5 overflow-y-auto rounded-card bg-sheet p-1.5 ring-1 ring-border scrollbar-none dark:bg-card-nested dark:ring-glass-border"
		>
			{chats.map((chat) => {
				const href = `/chats/${chat.id}`;
				const active = pathname === href;
				return (
					<Tooltip key={chat.id} disabled={expanded}>
						<TooltipTrigger
							render={
								<Link
									href={href}
									aria-current={active ? "page" : undefined}
									className={cn(
										"group flex h-13 w-full shrink-0 items-center gap-3 rounded-full outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring",
										// The capsule is sheet, so rows tint to card like the nav rows above.
										active
											? "bg-card dark:bg-accent"
											: "hover:bg-card dark:hover:bg-accent",
									)}
								/>
							}
						>
							<span className="grid size-11 shrink-0 place-items-center">
								<ChatAvatar seed={chat.avatar} className="size-9" />
							</span>
							<span
								className={cn(
									"flex min-w-0 flex-1 flex-col pr-3 transition-opacity duration-200 ease-swell",
									hidden,
								)}
							>
								<span className="flex items-baseline gap-2 whitespace-nowrap">
									<span
										className={cn(
											"min-w-0 flex-1 truncate text-[13.5px] text-ink",
											active && "font-medium",
										)}
									>
										{chat.name}
									</span>
									{/* Relative to "now", which differs by a hair between server and client. */}
									<time
										dateTime={chat.lastMessageAt.toISOString()}
										suppressHydrationWarning
										className="shrink-0 text-[11px] text-ink-3"
									>
										{formatDistanceToNowStrict(chat.lastMessageAt)}
									</time>
								</span>
								<span className="truncate text-[12px] whitespace-nowrap text-ink-3">
									{chat.preview ?? "No messages yet"}
								</span>
							</span>
						</TooltipTrigger>
						<TooltipContent side="right" sideOffset={12}>
							{chat.name}
						</TooltipContent>
					</Tooltip>
				);
			})}
		</section>
	);
}

/** Opens the chat palette (also ⌘K / Ctrl+K). Drawn as an input, hovers as a button. */
function SearchTrigger({
	expanded,
	onOpen,
}: {
	expanded: boolean;
	onOpen: () => void;
}) {
	const isMac = useIsMac();
	const shortcut = (
		<KbdGroup>
			<Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
			<Kbd>K</Kbd>
		</KbdGroup>
	);
	return (
		<Tooltip disabled={expanded}>
			<TooltipTrigger
				render={
					<Button
						variant="outline"
						onClick={onOpen}
						aria-label="Search chats"
						aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
						className={cn(
							// components/ui/input.tsx defaults; the outline variant keeps its hover.
							"h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
							"animate-in justify-start gap-2 font-normal text-muted-foreground duration-300 fade-in-0",
							expanded
								? "-mx-1.5 w-auto"
								: "mx-auto size-9 justify-center px-0",
						)}
					/>
				}
			>
				<Search />
				{expanded && (
					<>
						<span className="min-w-0 flex-1 truncate text-left">
							Search chats
						</span>
						{shortcut}
					</>
				)}
			</TooltipTrigger>
			<TooltipContent side="right" sideOffset={12}>
				Search {shortcut}
			</TooltipContent>
		</Tooltip>
	);
}

/** The rail's "+": opens the create menu. Collapsed it carries a tooltip. */
function CreateTrigger({
	ref,
	tip,
}: {
	ref: React.Ref<HTMLButtonElement>;
	tip: boolean;
}) {
	return (
		<Tooltip disabled={!tip}>
			<TooltipTrigger
				render={
					<DropdownMenuTrigger
						ref={ref}
						aria-label="Create"
						className={cn(
							// Bare "+" at rest; the tile appears on hover and while the menu is open.
							"inline-flex size-9 shrink-0 items-center justify-center rounded-md text-ink-2 ring-1 ring-transparent outline-none",
							"transition-[background-color,color,box-shadow] duration-200 ease-swell focus-visible:ring-2 focus-visible:ring-ring",
							"hover:bg-sheet hover:text-foreground hover:ring-border data-popup-open:bg-sheet data-popup-open:text-foreground data-popup-open:ring-border",
							"dark:hover:bg-card-nested dark:hover:ring-glass-border dark:data-popup-open:bg-card-nested dark:data-popup-open:ring-glass-border",
							"animate-in fade-in-0 duration-300 [&_svg]:size-6",
						)}
					/>
				}
			>
				<Plus strokeWidth={1.75} />
			</TooltipTrigger>
			<TooltipContent side="right" sideOffset={12}>
				Create
			</TooltipContent>
		</Tooltip>
	);
}
