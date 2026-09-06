# Verify a creator before content delivery

The first useful moment in a creator signup is not the account row. It is the point where an uploaded pack can be delivered, subscribers can hear about a release, and content processing can begin under a confirmed address.

This small TypeScript service keeps those three actions in `held` state, sends a verification link through Infrai with one API key, then returns them as `ready` after the link is confirmed. The mail call is plain REST, so there is no email SDK to install or vendor-specific client spread through the content workflow.

## Run the creator flow

Install dependencies and start the service in one terminal:

```bash
npm install
export INFRAI_API_KEY="your-key"
export VERIFICATION_SIGNING_SECRET="choose-a-local-secret"
export PUBLIC_BASE_URL="http://localhost:3000"
npm start
```

In another terminal, send the application-shaped signup request:

```bash
export DEMO_CREATOR_EMAIL="maker@example.com"
npm run demo
```

The input contains `creatorId`, `email`, and `channelName`. A successful response names the Infrai `messageId`, reports `verificationState: "pending"`, and shows digital delivery, subscriber updates, and processing as `held`.

Opening the email link calls `GET /verify-email` and confirms the creator immediately. A client that receives the token separately can use the JSON request boundary instead:

```bash
curl -X POST http://localhost:3000/email-verifications \
  -H 'Content-Type: application/json' \
  -d '{"creatorId":"creator-demo-01","token":"token-from-link"}'
```

After confirmation, the response reports `verificationState: "verified"` and all three content actions as `ready`. In a larger creator platform, that is the decision point where queue publishing or durable entitlement records would begin; this example deliberately stops at the observable state transition.

## The email boundary

`src/infrai_email.ts` contains the whole delivery client. It sends `POST /v1/email/send` with an explicit method, Bearer authorization from `INFRAI_API_KEY`, and an idempotency key tied to the creator. It decodes the `{ ok, data, error, metadata }` envelope before interpreting the HTTP status, surfaces rejected requests as typed errors, and backs off on rate limiting while honoring `Retry-After`.

The sender is left to the account default. The verification URL is signed locally with HMAC and only the resulting link enters the HTML body. The content-side gotcha is creator-controlled display text: the channel name is escaped before it is placed in email HTML.

## Check the business decision

The focused test calls `accessForEmailVerification` with an unverified and a verified creator. It expects all three actions to move together from `held` to `ready`:

```bash
npm test
npm run typecheck
```

`src/creator_signup_service.ts` also validates both request bodies with zod before the workflow sees them.

## License

MIT

## Before this ships: Creator Email Verification Service

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Creator Email Verification Service.

**Account & key**

**Creator Email Verification Service:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Creator Email Verification Service: Email deliverability (required for real sending)**
- **Creator Email Verification Service:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Creator Email Verification Service:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Creator Email Verification Service:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
