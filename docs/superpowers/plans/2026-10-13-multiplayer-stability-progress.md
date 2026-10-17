# SDD ledger — plan: docs/superpowers/plans/2026-10-13-multiplayer-stability.md

Base: ea8e4ecbfc68e9370db52851c187170ccf7a1f27

Pre-flight: action ids identify each sent operation; attack ids separately correlate intent, defense answer, result and cancellation. Card slots cannot serve as ids.

Task 1: complete — timer tests observed failing then passing, including starting a new timer inside expiry/tick callbacks.
Task 2: complete — consecutive same-slot actions and rapid sends observed failing then passing. Dedup retained for the match and reset at multiplayer setup.
Task 3: implemented — cancellation/refund, stale answers, sender/type validation, defensive-card consumption and turn-end cleanup observed failing then passing. Full suite: 23/23 passing before final review.

Ruling: first batch preserves local game structure; relay routing unification, reconnect snapshots and full host-authoritative rules remain follow-up work. Cost: this patch does not fix existing relay-only gameplay limitations or all client-trusted effects.
Ruling: defense answers require the current attack id; all participants must refresh to the same build. Cost: mixed old/new clients cannot complete the new challenge protocol reliably.
Implementation note: Windows scripts run directly rather than Bash bookkeeping helpers; this ledger and plan retain the evidence in the checkout.

Validation tooling: pnpm used because system npm is unavailable; package-lock.json unchanged. Existing ESLint test configuration incorrectly parsed ESM tests as scripts; adjusted only the test override after reproducing the lint error.

Final review: self-review after independent review attempts returned no usable result (interrupted prior session; gpt-6-astra, gpt-6.1-sol and gpt-6-sol capacity failures). No independent-review approval is claimed.

Final: fixed shuffled displayed answer letters being compared with original answers — real DOM single/multiple answer routing tests RED→GREEN. Popup callbacks retain display choices and add originalChoice for network validation.
Final: fixed matching cancellation leaving defense modals open and a delayed popup timer restarting after dismissal — host/client real DOM tests RED→GREEN.
Final: fixed client juesha success limit, host enforcement and next-turn reset — RED→GREEN. Cancelled juesha can be retried.
Final: fixed stale local callbacks updating answer statistics — normal attack, duel and juesha tests RED→GREEN.
Final: fixed new hand-index validation rejecting delayed lightning judgments — separate judgment-result packets do not discard another card; regression RED→GREEN.

Final verification (2026-10-14): npm test — 33/33 passing (30 new regression cases and 3 existing smoke cases). ESLint on all changed source/test files — exit 0. npm run build — exit 0 with both core/game bundles minified. node --check on both generated bundles — exit 0. git diff --check — clean.
Legacy tools/test-headless.js: fails at Resources.gainKP (removed API), plus stale module/version/resource assertions. Reproduced the same failure from untouched HEAD exported to a separate baseline directory; it predates this change.

Remaining release validation: real devices and cross-network two/three-player sessions. Automated tests exercise browser DOM and real game modules with network I/O replaced; they do not establish live network reliability.
