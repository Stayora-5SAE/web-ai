# Kawther Lahneynè — Guest–host conversations and inquiries

## Your business module

You own the communication between guests and hosts, both before booking and during a reservation. This is a distinct business module: it owns conversation creation, inboxes, unread state, sending, editing, and removing messages. Account management supplies identity; it is not counted as your business module.

The implementation is in `backend/src/main/java/com/stayora/messages/` and `frontend/src/app/messages/`. Migration `V6__guest_host_conversations.sql` owns the `stayora.conversations` table and extends the pre-existing `stayora.messages` table. Entities reference other modules by UUID, not JPA relationships. `AccountService`, `ListingService`, and `ReservationService` provide authorized DTO contracts.

## Demonstration for the professors

1. Use the guest demo, open a published property, and select Contact host. An inquiry can start before a reservation exists.
2. Send a question, refresh the host inbox, and open the conversation. The inbox shows unread messages, and opening the conversation records read status.
3. Reply as host, then refresh as guest. Select Edit on your own message; select Remove and confirm removal. The other participant cannot edit or remove your message.
4. Open a reservation and its Message host / Message guest link. A single authorized reservation conversation is created or reused.
5. Select an arrival, property-question, or checkout purpose. Request an AI draft, review it, and select Use this draft in the message box. Nothing is sent until Send message is selected.
6. For real accounts, register guest and host accounts with the shared authentication module. Cookie sessions and CSRF checks apply to mutation requests. The development demo header remains a local demonstration shortcut.

Guest routes are `/messages`, `/messages?propertyId=<uuid>`, `/messages/:reservationId`, and `/messages/threads/:threadId`. Host routes use the `/host/messages` prefix. This distinction preserves the selected demo identity when navigating. Inbox refresh is explicit; there are no WebSocket or push notifications.

## Database and CRUD rules

- A conversation holds the property UUID, optional reservation UUID, guest UUID, host UUID, subject, creation time, and participant read timestamps.
- A unique partial index permits one inquiry per guest/property/host. A unique reservation index permits one reservation thread. Creation takes the property's shared pessimistic lock to serialize duplicate requests.
- A message holds its conversation UUID, optional reservation UUID for legacy compatibility, sender UUID, plain text, creation/edit times, recipient-read time, and removal flag.
- `recipient_read_at` records received rows visible when the read mutation executes. A later message stays unread. Editing and removing messages lock the message row, preventing an edit from restoring a concurrently removed body.
- Sending and editing accept 1–2,000 trimmed characters. Sender identity is always derived from the current session, never request JSON.
- Removal erases stored body text and leaves a message tombstone for the participants. A removed message cannot be edited. It is not a complete audit-log or legal-retention system.
- All read and write APIs check conversation participation. Only the sender can edit or remove a message. Hosts cannot initiate guest-only property inquiries, and drafts/archived properties cannot receive new public inquiries.
- Migration V6 backfills conversation records for any existing reservation messages, then requires a conversation UUID. Reservation deletion cascades its conversation/messages; existing message data is preserved during migration.

## API contracts

All paths below are relative to `/api/messages`. Authentication is shared. Consistent error responses come from the application's common API exception handler.

| Method | Path                                 | Purpose                                                     |
| ------ | ------------------------------------ | ----------------------------------------------------------- |
| GET    | `/`                                  | Current participant's inbox, newest activity first          |
| POST   | `/inquiries`                         | Create/reuse an inquiry; JSON `{ "propertyId": "uuid" }`    |
| POST   | `/reservations/{id}`                 | Authorized create/reuse of a reservation thread             |
| GET    | `/threads/{id}`                      | Read participant-visible thread without changing read state |
| POST   | `/threads/{id}/read`                 | Record received messages as read and return the thread      |
| POST   | `/threads/{id}/messages`             | Send JSON `{ "body": "plain text" }`; HTTP 201              |
| PUT    | `/threads/{id}/messages/{messageId}` | Replace your own message text                               |
| DELETE | `/threads/{id}/messages/{messageId}` | Remove your own message body; HTTP 204                      |

`ThreadView` includes IDs, property title, subject, the other participant's display name, `viewerId`, unread count, last activity, and ordered messages. `MessageView` includes sender ID, body, timestamps, removal flag, and recipient-read time. Personal profile email is not included in these messaging DTOs.

## AI integration and privacy

`MessageDraftAiSkill` contributes the `message-draft` skill through the shared `AiSkill` registry. The browser supplies only a selected intent and the public property title, capped at 150 characters. It never submits conversation history, typed private text, participant names, emails, booking references, or access codes to this skill.

The skill's system prompt requests a short polite English draft, treats context as untrusted, prohibits invented personal/access/payment facts, and asks for clarification where policy or timing is unknown. Deterministic mock responses cover arrival, checkout, and a general property question. Shared `AiService`/`AiProvider` control mock/live mode, output validation, notices, and provider fallback. Keys belong only in ignored backend environment configuration.

AI output is rendered through Angular text interpolation. A person must explicitly apply the draft and separately send it. The assistant cannot trigger the message API itself. An AI draft is a writing suggestion, not a guarantee about the property's policies or instructions.

## Software testing discussion

`MessagingIntegrationTest` exercises real HTTP requests against disposable PostgreSQL and asserts the database name is `stayora_test` before cleanup. Its cases cover idempotent inquiry creation, server-owned sender IDs, guest/host replies, unread/read state, sender-only editing/removal, body erasure, attempts to restore removed messages, blank/oversized validation, unknown threads, host-only role rejection, draft-property rejection, and a newly registered unrelated account attempting read/send/edit/delete/read mutations. The AI case checks deterministic mock output and confirms requesting a draft does not create a message.

`messaging-api.service.spec.ts` checks request shape, sender omission, plain-text content, explicit read mutation, and error propagation. `messages.component.spec.ts` checks that private composer content and participant names never enter the AI request, applying a draft does not send it, failed sends retain the typed message, empty/duplicate clicks are blocked, and host links stay within host routes.

Useful answers for the software testing professor:

- **Why test on PostgreSQL rather than H2?** PostgreSQL migration constraints, partial indexes, UUIDs, row locks, and read visibility are part of the implementation.
- **What prevents unauthorized messages?** Server-side participant checks happen before reading or writing; JavaScript visibility alone is not authorization. An actual third-party authenticated account is used in the IDOR test.
- **Why are read APIs separate?** GET is observational. A dedicated POST records read state; listing an inbox does not acknowledge unseen messages.
- **What is a meaningful negative test?** Sending 2,001 characters, blank text, or editing the other participant's message must fail and leave stored state intact.
- **What is not demonstrated by these tests?** They do not prove large-scale throughput, exhaustive race schedules, moderation quality, delivery of email/push notifications, or real-provider language quality.

Useful answers for the AI integration professor:

- **What does AI add?** It reduces the effort of composing common guest–host questions while retaining human control.
- **How do you avoid private-chat leakage?** This module sends only intent/public title. Shared privacy validation adds another layer; the module does not rely on sending chat content and hoping it is redacted.
- **How does it work without a provider key?** Each intent has a deterministic mock response. The UI labels mock mode and retains the same request/response interface for a configured provider.
- **How do you evaluate it?** Offline tests establish determinism, privacy boundaries, and no unintended sending. Human review is still needed for tone, factual accuracy, and live-model behavior.

## Honest limitations and future work

There are no attachments, typing indicators, push/email delivery, blocked-user moderation, message search, chat export, or real-time sockets. Inbox/thread retrieval currently loads the participant's full conversation history; pagination and batched projections are future performance work. Message removal is an application tombstone with erased text, not an immutable moderation audit trail. Rate limiting and abuse reporting should be added before public launch. This module needs no additional key in mock mode; live AI uses the project's shared backend provider configuration.

Follow the root README for setup/check commands, the English technical report for functional verification and the French static-analysis report for ESLint evidence. Do not describe an unexecuted test or a mock response as proof of production-provider behavior.
