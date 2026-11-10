/**
 * Handoff eval: does a group-chat bot hand a message to the right bot, and
 * only when it should?
 *
 *   bun evals/handoff.ts                  # every case, 3 runs each
 *   bun evals/handoff.ts --runs 5 --concurrency 2
 *   bun evals/handoff.ts --only handoff   # one kind: handoff | answer | handed
 *   bun evals/handoff.ts --json .evals/handoff.json
 *
 * Each case is one model step with the agent's real system prompt, group
 * history rewrite and tool set (no tool runs): exactly what the bot sees when
 * it decides. Three kinds of case:
 *   handoff  the message fits another bot's job; it should hand off to that bot
 *   answer   the message is the bot's own (or nobody's in particular); no handoff
 *   handed   the message was just handed to this bot; it must answer, not bounce
 */
import { streamText, type ModelMessage, type ToolSet } from "ai";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { attributeGroupHistory } from "@/trigger/group-history";
import { createHandoffTool, type GroupMember, type Handoff } from "@/trigger/handoff";
import { chatModel } from "@/trigger/model";
import { botSystemPrompt, roster } from "@/trigger/prompt";
import { createSandboxTools } from "@/trigger/sandbox-tools";

// Compile the prompt in this tree, not whatever version the platform serves.
delete process.env.TRIGGER_SECRET_KEY;
delete process.env.TRIGGER_ACCESS_TOKEN;

const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const RUNS = Number(flag("--runs", "3"));
const CONCURRENCY = Number(flag("--concurrency", "4"));
const ONLY = flag("--only", "");
const JSON_OUT = flag("--json", "");

type Bot = GroupMember & { sandbox: boolean };
const BOTS: Bot[] = [
  { id: "linus", name: "Linus", job: "Reviews code and pull requests for bugs, style and security issues.", sandbox: true },
  { id: "sofia", name: "Sofia", job: "Tutors the owner in maths and physics, step by step.", sandbox: false },
  { id: "quill", name: "Quill", job: "Writes release notes and changelogs from lists of changes.", sandbox: false },
  { id: "iris", name: "Iris", job: "Triages the owner's email inbox: sorts, summarises and drafts replies.", sandbox: true },
];
const byName = (name: string) => BOTS.find((b) => b.name === name)!;

type Case = {
  kind: "handoff" | "answer" | "handed";
  to: string; // the bot the message is sent to (or, for handed, handed to)
  prompt: string;
  expect?: string; // handoff: the bot it should go to
  from?: string; // handed: the bot that handed it on
};

const CASES: Case[] = [
  // Clearly another bot's job.
  { kind: "handoff", to: "Linus", expect: "Quill", prompt: "Write release notes for v2.1: we added dark mode and fixed the login redirect bug." },
  { kind: "handoff", to: "Linus", expect: "Sofia", prompt: "Can you explain how derivatives work? I have a calculus exam tomorrow." },
  { kind: "handoff", to: "Linus", expect: "Iris", prompt: "Sort my inbox and tell me which emails need a reply today." },
  { kind: "handoff", to: "Linus", expect: "Quill", prompt: "Turn these merged PRs into user-facing release notes: #41 faster search, #42 SSO login." },
  { kind: "handoff", to: "Quill", expect: "Linus", prompt: "Review this function for bugs: function avg(a){ return a.reduce((s,x)=>s+x)/a.length }" },
  { kind: "handoff", to: "Quill", expect: "Sofia", prompt: "Help me understand Newton's second law with an example." },
  { kind: "handoff", to: "Quill", expect: "Iris", prompt: "Summarise my unread emails and draft a reply to the one from my landlord." },
  { kind: "handoff", to: "Sofia", expect: "Quill", prompt: "Draft a changelog entry for these commits: add CSV export; fix timezone bug in reports." },
  { kind: "handoff", to: "Sofia", expect: "Linus", prompt: "Is this safe? db.query(`SELECT * FROM users WHERE id = ${req.params.id}`)" },
  { kind: "handoff", to: "Sofia", expect: "Quill", prompt: "Ask Quill to write the release notes for 3.0: new billing page." },
  { kind: "handoff", to: "Iris", expect: "Linus", prompt: "Review my React hook: useEffect(() => { setCount(count + 1) })" },
  { kind: "handoff", to: "Iris", expect: "Sofia", prompt: "Teach me how to solve quadratic equations." },

  // The bot's own job, small talk, or nobody's in particular: answer.
  { kind: "answer", to: "Linus", prompt: "Review this diff: - if (x = 1) + if (x === 1)" },
  { kind: "answer", to: "Linus", prompt: "Hi Linus, how's it going?" },
  { kind: "answer", to: "Linus", prompt: "What's the capital of France?" },
  { kind: "answer", to: "Linus", prompt: "Explain what a race condition is." },
  { kind: "answer", to: "Sofia", prompt: "What's the integral of x^2?" },
  { kind: "answer", to: "Sofia", prompt: "Thanks, that was helpful!" },
  { kind: "answer", to: "Quill", prompt: "Write release notes for 1.4: offline mode." },
  { kind: "answer", to: "Quill", prompt: "What's your name?" },
  { kind: "answer", to: "Quill", prompt: "Fix the typo in this sentence: 'Teh release is out.'" },
  { kind: "answer", to: "Iris", prompt: "Draft a polite reply declining a meeting invite for Friday." },
  { kind: "answer", to: "Iris", prompt: "What's 15% of 80?" },

  // Just handed over, rightly or not: answer, never hand it on again.
  { kind: "handed", to: "Quill", from: "Linus", prompt: "Write release notes for v2.1: we added dark mode and fixed the login redirect bug." },
  { kind: "handed", to: "Sofia", from: "Quill", prompt: "Review this function for bugs: function avg(a){ return a.reduce((s,x)=>s+x)/a.length }" },
  { kind: "handed", to: "Linus", from: "Iris", prompt: "Can you explain how derivatives work? I have a calculus exam tomorrow." },
];

/** The bot's tools as the agent offers them, without `execute`: the step only decides. */
function toolsFor(bot: Bot): ToolSet {
  const sandbox = bot.sandbox ? createSandboxTools(() => Promise.reject(new Error("eval"))) : {};
  const all: ToolSet = { ...sandbox, handoff: createHandoffTool(BOTS, bot.id, () => false) };
  return Object.fromEntries(Object.entries(all).map(([name, t]) => [name, { ...t, execute: undefined }]));
}

/** The history as the agent's prepareMessages would hand it to `me`. */
function historyFor(c: Case): ModelMessage[] {
  const me = byName(c.to);
  if (c.kind !== "handed") return [{ role: "user", content: c.prompt }];

  const from = byName(c.from!);
  const handoff: Handoff = { botId: me.id, name: me.name, from: from.name, reason: `${me.name} fits this better.` };
  const raw: ModelMessage[] = [
    { role: "user", content: c.prompt },
    {
      role: "assistant",
      content: [
        { type: "text", text: `Passing this to ${me.name}.` },
        { type: "tool-call", toolCallId: "h1", toolName: "handoff", input: { to: me.name, reason: handoff.reason } },
      ],
    },
    {
      role: "tool",
      content: [{ type: "tool-result", toolCallId: "h1", toolName: "handoff", output: { type: "json", value: handoff } }],
    },
  ];
  const names = new Map(BOTS.map((b) => [b.id, b.name]));
  return attributeGroupHistory(raw, [from.id], me.id, names);
}

type Result = {
  case: number;
  kind: Case["kind"];
  to: string;
  expect?: string;
  handedTo?: string;
  pass: boolean;
  wrongTarget: boolean;
  lineFirst: boolean;
  ms: number;
  error?: string;
};

async function runOnce(c: Case, index: number): Promise<Result> {
  const me = byName(c.to);
  const started = performance.now();
  const base = { case: index, kind: c.kind, to: c.to, expect: c.expect };
  try {
    const { text: system } = await botSystemPrompt.resolve({
      name: me.name,
      job: me.job,
      sandbox: me.sandbox ? "on" : undefined,
      group: roster(BOTS, me.id),
      handedBy: c.kind === "handed" ? c.from : undefined,
    });
    const result = streamText({
      model: chatModel,
      system,
      messages: historyFor(c),
      tools: toolsFor(me),
      // The decision is the first step: a handoff call there ends the agent's turn.
    });
    const [calls, text] = await Promise.all([result.toolCalls, result.text]);
    const call = calls.find((t) => t.toolName === "handoff");
    const handedTo = call ? String((call.input as { to?: string }).to ?? "") : undefined;
    const correct = handedTo?.trim().toLowerCase() === c.expect?.toLowerCase();
    return {
      ...base,
      handedTo,
      pass: c.kind === "handoff" ? correct : !call,
      wrongTarget: c.kind === "handoff" && !!call && !correct,
      lineFirst: !!call && text.trim().length > 0,
      ms: performance.now() - started,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ...base, pass: false, wrongTarget: false, lineFirst: false, ms: performance.now() - started, error: message };
  }
}

const cases = CASES.map((c, i) => ({ c, i })).filter(({ c }) => !ONLY || c.kind === ONLY);
const jobs = cases.flatMap(({ c, i }) => Array.from({ length: RUNS }, () => () => runOnce(c, i)));
const results: Result[] = [];
let done = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let job = jobs.shift(); job; job = jobs.shift()) {
      results.push(await job());
      process.stdout.write(`\r${++done}/${cases.length * RUNS}`);
    }
  }),
);
process.stdout.write("\n\n");

// Provider failures say nothing about the bot's judgement: counted, not scored.
const scored = results.filter((r) => !r.error);
const errors = results.length - scored.length;
const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "n/a");
const of = (kind: Case["kind"]) => scored.filter((r) => r.kind === kind);
const handoffs = scored.filter((r) => r.handedTo !== undefined);
const sorted = scored.map((r) => r.ms).sort((a, b) => a - b);

const summary = {
  model: "chatModel (trigger/model.ts)",
  runs: RUNS,
  calls: results.length,
  errors,
  accuracy: pct(scored.filter((r) => r.pass).length, scored.length),
  handoffRecall: pct(of("handoff").filter((r) => r.pass).length, of("handoff").length),
  wrongTarget: pct(of("handoff").filter((r) => r.wrongTarget).length, of("handoff").length),
  missedHandoff: pct(of("handoff").filter((r) => r.handedTo === undefined).length, of("handoff").length),
  falseHandoff: pct(of("answer").filter((r) => !r.pass).length, of("answer").length),
  bounce: pct(of("handed").filter((r) => !r.pass).length, of("handed").length),
  handoffPrecision: pct(
    handoffs.filter((r) => r.kind === "handoff" && r.pass).length,
    handoffs.length,
  ),
  lineBeforeHandoff: pct(handoffs.filter((r) => r.lineFirst).length, handoffs.length),
  medianMs: Math.round(sorted[Math.floor(sorted.length / 2)] ?? 0),
};

console.log("case  kind     to     expect  pass   handed to");
for (const { c, i } of cases) {
  const rs = scored.filter((r) => r.case === i);
  const got = rs.map((r) => r.handedTo ?? "-").join(",");
  const failed = results.filter((r) => r.case === i && r.error).length;
  console.log(
    `${String(i).padStart(4)}  ${c.kind.padEnd(7)}  ${c.to.padEnd(5)}  ${(c.expect ?? "-").padEnd(6)}  ${`${rs.filter((r) => r.pass).length}/${rs.length}`.padEnd(5)}  ${got}${failed ? `  (${failed} errored)` : ""}`,
  );
}
console.log();
console.table(summary);
for (const r of results.filter((r) => r.error).slice(0, 3)) console.log(`error: ${r.error}`);

if (JSON_OUT) {
  mkdirSync(dirname(JSON_OUT), { recursive: true });
  writeFileSync(JSON_OUT, JSON.stringify({ summary, cases: CASES, results }, null, 2));
}
