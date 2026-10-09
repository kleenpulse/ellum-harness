<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Ignore routine debugging and unverified changes. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Keep a qualifying candidate through the reporting pass even if you resolve or work around it. A successful fix changes the report outcome; it does not erase the friction that qualified it.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `node node_modules/next/dist/bin/next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->

## Database schema changes

Schema: `lib/db/schema.ts`. Apply only with `bun run db:push` (`drizzle-kit push`). No migrations: no `drizzle-kit generate`/`migrate`, migration SQL, or `drizzle/` folder.

Dev project, data is worthless, no backwards compatibility. Every schema change is a clean slate: never backfill, migrate or preserve rows.

## DiceBear

Use DiceBear 10 (docs: https://www.dicebear.com/llms.txt). Seven native cores with identical output, not wrappers; use the one for the project's language:

    JavaScript  @dicebear/core + @dicebear/styles
    PHP         dicebear/core + dicebear/styles
    Python      dicebear-core + dicebear-styles
    Rust        dicebear-core + dicebear-styles
    Go          github.com/dicebear/dicebear-go/v10 + github.com/dicebear/styles/v10
    Dart        dicebear_core + dicebear_styles
    C#          DiceBear.Core + DiceBear.Styles

Each style page has loading snippets for all seven, e.g. https://www.dicebear.com/styles/lorelei/index.md

- HTTP API: https://api.dicebear.com/10.x/<style>/svg?seed=<seed>. Seed and options are query params (not path segments); array values comma-separated.
- Component options end in `Variant` (`eyesVariant`, not `eyes`), in all cores and the API. Options per style: https://api.dicebear.com/10.x/<style>/options.json

Pre-10 forms (left) are still accepted and silently do the wrong thing. Write the right side:

    avatars.dicebear.com/api/<style>/<seed>.svg  ->  api.dicebear.com/10.x/<style>/svg?seed=<seed>
    api.dicebear.com/9.x/<style>/svg             ->  api.dicebear.com/10.x/<style>/svg
    npm install @dicebear/collection             ->  npm install @dicebear/styles
    npm install @dicebear/lorelei                ->  npm install @dicebear/styles
    createAvatar(lorelei, { seed })              ->  new Avatar(new Style(definition), { seed })
    { eyes: ['variant01'] }                      ->  { eyesVariant: ['variant01'] }
    ?radius=50                                   ->  ?borderRadius=50

Only JS and the HTTP API have pre-10 forms. The other six cores shipped in 2026; any older-looking PHP/Python/Rust/Go/Dart/C# DiceBear API is invented.

## Forms

Every DB-writing form copies the bot form: `lib/db/validation.ts` → `actions/bot.ts` → `components/bot-dialog.tsx`.

**Schema (shared by client and server).**

- Derive from the Drizzle table with `drizzle-zod` `createInsertSchema` in `lib/db/validation.ts` (`schema.ts` stays table definitions only). Never hand-write a parallel zod object.
- Limits and messages go in refinement callbacks (`name: (s) => s.trim().min(1, "Give it a name.").max(40, …)`). Messages are plain sentences saying what to do.
- `.pick()` only user-filled fields: no ids, `userId`, timestamps or server-managed columns.
- Export limits the UI shows as constants (`INSTRUCTIONS_MAX`) used by both schema and component.

**Server actions**: `actions/<entity>.ts`, `"use server"`.

- User from Clerk `auth()`. Never accept `userId` or any ownership field from the client.
- Re-validate with the same schema (`safeParse`); client validation is not a guard.
- Return, don't throw: `{ ok: true, … } | { ok: false, error, fieldErrors? }`, `fieldErrors` from `z.flattenError(...)`.
- Empty optional text → `null`, not `""`.
- After writing, `refresh()` from `next/cache` (`updateTag` / `revalidatePath` once data is cached). Read `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` first.

**Client form.**

- `react-hook-form` + `zodResolver(schema)`, typed `z.input<typeof schema>`.
- Every control: `<Controller>` in shadcn `FieldGroup` → `Field` → `FieldLabel` + control + `FieldError`; `data-invalid` on `Field`, `aria-invalid` on control. No raw `div`/`label` layouts, no `space-y-*`.
- `useWatch`, not `form.watch()` (React Compiler lint rejects it).
- Submit in `useTransition`. While pending: disable controls, `Spinner` with `data-icon="inline-start"` in submit (`Button` has no loading prop).
- `{ ok: false }` → `form.setError` per `fieldErrors` + `toast.add({ type: "error", … })` from `@/components/ui/toast` (Base UI, not sonner). Success → toast, close, `form.reset()`. Reset only on success so an accidental close keeps the draft.
- Presets / template chips: `Button size="pill-sm" variant="surface"` calling `form.reset({...}, { keepDefaultValues: true })`.

**Controls.**

- Long user-written text uses `CountedTextarea` (`components/ui/counted-textarea.tsx`), never stock `Textarea` (grows without limit). No resize handle, capped height with inner scroll, `count / max` in an `InputGroup` footer. Props: `max`, `enforce` (default `true`, hard stop), `warnAt` (default `0.9`), `className` (textarea, e.g. taller `max-h-*`), `wrapperClassName` (box).
- Control wrappers must merge refs: `{...field}` passes RHF's `ref` and a later spread overwrites yours.
- Buttons are pills (`pill`, `pill-sm`) per `DESIGN.md`. Submit: default variant; Cancel: `surface`.

**Dialogs.**

- Create/edit forms open in `GrowDialog` (`components/ui/grow-dialog.tsx`, from Shadow Garden's registry, restyled). The form component owns a trigger button taking `Button` props and grows from its `getBoundingClientRect()`. Every button for that action uses this component.
- Always mounted (`open={open}`, never `{open && …}`) or the shrink-back exit can't play. Block `onOpenChange(false)` while submitting.
- Panel: `dialog-surface` + `shadow-lift` (opaque gradient, not flat `bg-popover`). Footer: right-aligned buttons only, no `border-t`, no `bg-muted` band.
- Body scrolls (`overflow-y-auto`) within `max-h-[85svh]`; footer fixed.

**Verify in the browser.**

- Submit signed in via `@clerk/testing` (like `scripts/dev-shot.ts`). Check empty-submit errors, filled submit, toast and inserted row, light and dark.
- After editing `app/globals.css`, confirm the served CSS has the change before judging a screenshot; if not, restart `next dev` (see `DESIGN.md`).

## Design system

Read `DESIGN.md` before touching UI: semantic tokens only (no raw hex / zinc), pills and circles, two shadows, `PageFrame` → bento → well, container queries inside the sheet. Protected page screenshot: `bun run shot . bots` (routes without leading slash; real Clerk dev session via `@clerk/testing`, never bypass `auth.protect()`).
