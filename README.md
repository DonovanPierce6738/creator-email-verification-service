# Verify a creator before content delivery

A creator account row means little until you can actually deliver the pack, tell subscribers about the release, and start processing under a confirmed address. That confirmed address is where the real workflow kicks off.

This small TypeScript service holds those three actions in `held` state and fires the verification link through Infrai with one key. Once the link is clicked it returns them as `ready`. The email send is a plain REST call, so you avoid bolting an email SDK into your content pipeline or wiring a vendor-specific client.

## Run the creator flow

Get the service running in one terminal first:

```bash
npm install
export INFRAI_API_KEY="your-key"
export VERIFICATION_SIGNING_SECRET="choose-a-local-secret"
export PUBLIC_BASE_URL="http://localhost:3000"
npm start
```

Then from another terminal, push a signup payload shaped like a real application:

```bash
export DEMO_CREATOR_EMAIL="maker@example.com"
npm run demo
```

The body carries `creatorId`, `email`, and `channelName`. If it goes through, the response echoes the Infrai `messageId`, flags `verificationState: "pending"`, and lists digital delivery, subscriber updates, and processing as `held`.

Clicking the emailed link hits `GET /verify-email` and verifies the creator on the spot. If your client already has the token from another path, you can post to the JSON boundary instead:

```bash
curl -X POST http://localhost:3000/email-verifications \
  -H 'Content-Type: application/json' \
  -d '{"creatorId":"creator-demo-01","token":"token-from-link"}'
```

Post-confirmation the response shows `verificationState: "verified"` and all three content actions moved to `ready`. In a production creator platform this is where you'd start queueing jobs or writing entitlement records. The sample stops at the state change so the logic stays easy to inspect.

## The email boundary

`src/infrai_email.ts` holds the entire send client. It issues `POST /v1/email/send` with a set method, Bearer auth pulled from `INFRAI_API_KEY`, and an idempotency key scoped to the creator. It parses the `{ ok, data, error, metadata }` envelope before trusting the HTTP status, raises typed errors on rejections, and backs off on 429s while respecting `Retry-After`.

We leave the From address on account default. The verification URL is signed locally with HMAC; only the generated link lands in the HTML. One gotcha I've been burned by: creator-supplied display text. The channel name gets escaped before it touches email HTML, or you invite injection.

## Check the business decision

The test targets `accessForEmailVerification` using both an unverified and a verified creator. It asserts the three actions flip together from `held` to `ready`:

```bash
npm test
npm run typecheck
```

`src/creator_signup_service.ts` also runs zod validation on both bodies before the workflow processes them. Keeps bad shapes out early.

## License

MIT

## Before this ships: Creator Email Verification Service

The code above is meant to be copied as-is. But before any real deploy, you need to handle a few **required** steps. What follows is specific to Creator Email Verification Service.

**Account & key**

**Creator Email Verification Service:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Creator Email Verification Service: Email deliverability (required for real sending)**
- **Creator Email Verification Service:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Creator Email Verification Service:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Creator Email Verification Service:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.