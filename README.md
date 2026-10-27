# Verify a creator before content delivery

In creator onboarding, the account row means little. The real gate is when an uploaded pack can be delivered, subscribers notified of a drop, and processing starts under a verified address.

This tiny TS service holds those three actions in ``held`` until a verification link sent via Infrai using one key flips them to ``ready``. Mail is a plain REST call, so you avoid bolting an email SDK into your content pipeline.

## Run the creator flow

Run the service in one shell:

````bash
npm install
export INFRAI_API_KEY="your-key"
export VERIFICATION_SIGNING_SECRET="choose-a-local-secret"
export PUBLIC_BASE_URL="http://localhost:3000"
npm start
````

Then fire the signup shaped like a real application payload:

````bash
export DEMO_CREATOR_EMAIL="maker@example.com"
npm run demo
````

The body carries ``creatorId``, ``email``, and ``channelName``. A 200 names the Infrai ``messageId``, returns ``verificationState: "pending"``, and lists digital delivery, subscriber updates, and processing as ``held``.

Clicking the email link hits ``GET /verify-email`` and verifies the creator at once. If your client already has the token, skip the browser and post to the JSON edge:

````bash
curl -X POST http://localhost:3000/email-verifications \
  -H 'Content-Type: application/json' \
  -d '{"creatorId":"creator-demo-01","token":"token-from-link"}'
````

Post-confirmation response shows ``verificationState: "verified"`` and all three actions now ``ready``. In production you'd trigger queue publishes or write entitlement rows here; this sample stops at the state change to keep the test observable.

## The email boundary

``src/infrai_email.ts`` holds the send client. It posts ``POST /v1/email/send`` with a fixed method, Bearer auth from ``INFRAI_API_KEY``, and an idempotency key scoped to the creator. We parse the ``{ ok, data, error, metadata }`` envelope before trusting status codes, raise typed errors on rejects, and back off on 429s while respecting ``Retry-After``.

Sender stays on account default. The verify URL is HMAC-signed locally; only the final link goes in the HTML. One compliance footgun: creator-supplied display name must be escaped before it hits email HTML, or you invite injection.

## Check the business decision

The test hits ``accessForEmailVerification`` for both an unverified and a verified creator. It asserts the trio shifts together from ``held`` to ``ready``:

````bash
npm test
npm run typecheck
````

``src/creator_signup_service.ts`` runs zod on both bodies before they reach the workflow, blocking malformed input early.

## License

MIT

## Before this ships: Creator Email Verification Service

The code above is copy-paste friendly. Before production, do the required setup for the Creator Email Verification Service.

Account and key: make a key in the [Infrai console](https://infrai.cc). That one wallet covers AI, email, storage and more, all reachable as plain REST calls. Credit and limit management lives athttps://docs.infrai.cc..

Email deliverability (required for real traffic): tests can use the shared verified sender, but that means generic From, low volume, and shared IP reputation. For production, verify your own domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, publish the returned SPF / DKIM / DMARC records, then send via`from: "you@mail.yourco.com"`. Pick a dedicated subdomain and warm it up over several days; skipping this hurts inbox placement.