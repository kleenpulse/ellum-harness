@AGENTS.md

## Changelog

- Every user-visible change gets a plain-English entry under `## [Unreleased]` in `CHANGELOG.md`, as you work. It ships inside the app (What's New card, `#changelog`), so write it for users, not developers. Releases are cut only with `bun run bump patch|minor|major`; never edit the version in `package.json` by hand.

<!-- TRIGGER.DEV SKILLS START -->

## Trigger.dev agent skills

This project has Trigger.dev agent skills installed in `.claude/skills/`. Before writing or changing Trigger.dev code (background tasks, scheduled tasks, realtime, or chat.agent AI agents), load the most relevant skill: `trigger-authoring-chat-agent`, `trigger-authoring-tasks`, `trigger-chat-agent-advanced`, `trigger-cost-savings`, `trigger-getting-started`, `trigger-realtime-and-frontend`.

<!-- TRIGGER.DEV SKILLS END -->
