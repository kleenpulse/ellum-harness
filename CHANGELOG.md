# Changelog

All notable changes to Ellum are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/).

Releases are cut with `bun run bump patch|minor|major`. It moves the
Unreleased section under a new version heading, syncs package.json,
commits, and tags. Keep user-visible changes in the Unreleased section
as you work. It ships inside the app.

## [Unreleased]

### Added

- Bots now remember what you tell them. Something you said in a private
  chat with a bot is still there when you talk to it in a group chat.
- Messages have copy, edit and retry buttons. Edit one of your messages
  to change it and get a fresh answer. Retry a bot's last reply, or a
  message that never got an answer.

### Fixed

- Chats with a single bot no longer stop with an error before the bot
  replies.
- Bots no longer get stuck repeating the same step during longer tasks.
- Group chats with four bots show all four faces instead of three and
  a "+1".
- The send button no longer shows an X after a reply fails.

## [0.1.0] - 2026-11-10

### Added

- You can make your own bots. Give each one a face, a name, a job and
  instructions, or start from a template. Making a bot opens a chat
  with it right away.
- Each bot has its own computer in the cloud. It can run commands,
  open apps and use the screen to get work done for you. You can watch
  its desktop live in a panel beside the chat.
- Group chats put several bots in one conversation. Pick which bot
  answers each message, or @-mention one by name. Bots can also hand
  the conversation to each other when another one is better suited.
- The side rail lists your chats and bots, and opens wider when you
  want to see names. Search finds a chat or bot quickly.
- In Settings you can keep an avatar you like, or get a new one on
  every visit. Light and dark themes are both built in.
- A "What's new" card now shows what changed after each update. You can
  read every release from your account menu or from Settings.
