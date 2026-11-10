# Ellum

Create AI bots that each get their own cloud computer. Chat with a bot one-on-one or put several in a group chat. Bots remember what you tell them, and they can use their computer to get work done: run shell commands, read and write files, and work a desktop with the mouse and keyboard.

**Live:** https://ellum-harness.netlify.app

## Features

- **Bots with their own computer.** Every bot runs in a Daytona sandbox with a desktop you can open and watch. Ellum shows whether each sandbox is awake, asleep or starting, and checking never wakes one up.
- **Private and group chats.** Messages stream in live. You can copy, edit or retry any message, and rename a group or change who's in it from the chat header.
- **Memory.** Something you tell a bot in a private chat is still there when you talk to it in a group.
- **Overview.** Runs this week, a 7-day chart, recent chats, and a "Needs attention" list for broken sandboxes or an allowance that's nearly used up.
- **Pro plan and usage limits.** Each month includes AI tokens, bot computer time and new bots. The Usage page shows how much is left and when it resets.
- **What's New.** The changelog ships inside the app.

## Stack

| Area | Tools |
| --- | --- |
| App | Next.js 16 (App Router, Cache Components), React, TypeScript, Tailwind CSS v4, Base UI, shadcn |
| Auth and billing | Clerk, Clerk Billing |
| Database | Neon Postgres, Drizzle ORM |
| Bot runs | Trigger.dev (`chat.agent`), AI SDK |
| Models | NVIDIA Nemotron (OpenAI-compatible API), with OpenRouter as a fallback |
| Bot computers | Daytona sandboxes |
| Hosting | Netlify |
| Tooling | Bun |

## Run it locally

You need [Bun](https://bun.sh) 1.4+ and accounts for Clerk, Neon, Trigger.dev, Daytona and NVIDIA's API.

1. Install the dependencies.

   ```bash
   bun install
   ```

2. Create `.env.local` in the repo root with the variables below.

3. Push the schema to your database. This project has no migrations: `db:push` makes the database match `lib/db/schema.ts`.

   ```bash
   bun run db:push
   ```

4. Start the Trigger.dev worker in one terminal and the app in another.

   ```bash
   bunx trigger.dev@4.8.3 dev
   bun dev
   ```

5. Open http://localhost:3000 and sign in.

### Environment variables

| Variable | Required | What it's for |
| --- | --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Clerk, browser side |
| `CLERK_SECRET_KEY` | yes | Clerk, server side |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | yes | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | yes | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | yes | Where to go after signing in, e.g. `/` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | yes | Where to go after signing up, e.g. `/` |
| `DATABASE_URL` | yes | Neon connection string (pooled) |
| `DATABASE_URL_UNPOOLED` | yes | Neon direct connection, used by Drizzle Kit |
| `NEON_BRANCH` | no | Neon branch name, e.g. `main` |
| `TRIGGER_SECRET_KEY` | yes | Lets the app start bot runs on Trigger.dev |
| `NVIDIA_API_KEY` | yes | The main model |
| `OPENROUTER_API_KEY` | no | Fallback when NVIDIA is slow or rate-limited |
| `DAYTONA_API_KEY` | yes | Creates and manages bot sandboxes |
| `DAYTONA_API_URL` | yes | `https://app.daytona.io/api` |

Bot runs execute on Trigger.dev, not in the Next.js app. Set the variables they use (database, models, Daytona) in your Trigger.dev project too.

## Scripts

| Command | What it does |
| --- | --- |
| `bun dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun test` | Run the tests |
| `bun run db:push` | Make the database match `lib/db/schema.ts` |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run shot . <route>` | Screenshot a signed-in page, e.g. `bun run shot . bots` |
| `bun run bump patch\|minor\|major` | Cut a release: moves Unreleased in `CHANGELOG.md` under a new version, syncs `package.json`, commits and tags |

## Project layout

```
app/          Routes: overview, bots, chats (/c/[chatId]), settings, usage, sign-in/up
actions/      Server actions (bots, chats, account, desktops)
components/   UI, including ai-elements for the chat
lib/          Database schema, billing, usage limits, Daytona helpers
queries/      Data reads for pages
trigger/      Trigger.dev tasks: the chat agent, model setup, sandbox tools, usage
proxy.ts      Clerk middleware
```

## Deploying

The app deploys to Netlify. Every push to `main` builds and goes live, and pull requests get Deploy Previews. Build settings live in `netlify.toml`, and the environment variables are set in the Netlify project.

The Trigger.dev tasks deploy separately:

```bash
bunx trigger.dev@4.8.3 deploy
```

## Contributing

- Read `DESIGN.md` before changing the UI, and `AGENTS.md` for the conventions that forms and schema changes follow.
- Add a plain-English line under `## [Unreleased]` in `CHANGELOG.md` for every change users will see. It shows up in the app.
- Never edit the version in `package.json` by hand. Use `bun run bump`.
