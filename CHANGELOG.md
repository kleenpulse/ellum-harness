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

- Settings is rebuilt. Appearance now has the theme (System, Light or Dark), a Reduced motion option, whether the side rail stays open, and the Bots layout, with one button to reset them all.
- Settings shows your account, with Manage account and Sign out, and your plan with how much of this period's allowance is used.
- Settings has a Danger zone where you can delete all your bots and chats at once. It asks you to type DELETE first, and it doesn't change your plan or give back any usage.
- Bots page: switch between a list and cards, search your bots by name or job, and page through them. Your choice of view is remembered.
- The Overview now shows real numbers. Runs this week counts every
  time a bot answered you, compares it with the week before and draws
  a bar for each of the last 7 days. The sample figures are gone.
- Each bot shows whether its sandbox is awake, asleep or starting,
  checked live, on the Overview and on the Bots page. Checking never
  wakes a sandbox.
- A "Needs attention" list on the Overview points out a sandbox that
  has a fault or is missing, and an allowance that is nearly used up.
- The Overview lists your recent chats, and clicking a bot there or
  on the Bots page opens its chat.

- Links to pages that don't exist now land on a proper "not found"
  screen with a way back home, instead of a blank black page.
- Ellum now has a Pro plan. Creating bots, chatting with them and
  opening their desktops need Pro. On the free plan you'll see a
  message with a "See plans" button that opens the plans, where you
  can subscribe. You can still read your old chats, and edit or delete
  your bots.
- Pro includes a monthly allowance: 10 million AI tokens, 30 hours of
  bot computer time and 20 new bots, with up to 10 bots at once. A new
  Usage page, in your account menu, shows how much you've used and
  how long until it resets. When something runs out, the bot tells you
  and points you to the Usage page.
- Click a group chat's name at the top of the chat to edit it. Rename
  the group, add or remove bots, or delete the group.
- Bots now remember what you tell them. Something you said in a private
  chat with a bot is still there when you talk to it in a group chat.
- Messages have copy, edit and retry buttons. Edit one of your messages
  to change it and get a fresh answer. Retry a bot's last reply, or a
  message that never got an answer.

### Fixed

- The plans no longer stay open behind the checkout panel: they close when checkout opens. In the dark theme the checkout panel is now solid, so the page no longer shows through it.
- Avatar picker: a failed save now tells you and goes back to your last choice, and the grid no longer ends on an empty space.
- Chats now sort by their latest message and show a line of the last
  reply. Before, the time next to a chat was when it was created.
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
