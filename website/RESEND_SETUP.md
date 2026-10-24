# Resend waitlist setup

This is the production checklist for the SHFFL website waitlist. It deliberately does not contain secret values.

## Dashboard steps

1. In Resend, verify the sending domain or sender address used by `RESEND_FROM_EMAIL`.
2. Create a Contacts segment named `SHFFL Waitlist` and copy its segment ID.
3. Create a restricted API key for the website function. Grant only the Contacts read/write, Segments write, and Emails send capabilities exposed by the current Resend dashboard.
4. In the Vercel website project, set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `RESEND_WAITLIST_SEGMENT_ID` for Production and Preview. Set `RESEND_REPLY_TO_EMAIL` only when needed.
5. Redeploy and use a dedicated test inbox. Do not put secrets in source control or browser-exposed variables.

## Provider flow

`POST /api/subscribe` validates the request, looks up or creates the contact, rejects an unsubscribed contact, adds it to the waitlist segment, and sends one branded confirmation. Resend is never called from the browser.

The contact and segment write happen before email. If either fails, the request is an error and no email is attempted. If the email send fails after the contact is saved, the function returns a successful saved-subscription response with `emailSent: false` and logs a request ID, status, and hashed email identifier. The visitor's place is preserved for a later operational retry.

The email send uses a deterministic idempotency key derived from a one-way email hash. This prevents duplicate sends for matching retries within Resend's documented idempotency retention window; it is not a durable exactly-once guarantee.

## Safety and privacy

The function caps request size, validates the email server-side, checks browser origins when supplied, uses an 8-second provider timeout, and does not log complete subscriber addresses. It intentionally has no in-memory rate limiter because that is unreliable across Vercel instances. Use Vercel/Resend edge controls or a durable rate-limit store if abuse requires stronger throttling.

Unsubscribe state is preserved: the function never silently changes an unsubscribed contact back to subscribed. Future campaign messages belong in Resend Broadcasts, not in this public endpoint.

Reference: [Resend Contacts](https://resend.com/docs/api-reference/contacts/create-contact), [add a contact to a segment](https://resend.com/docs/api-reference/contacts/add-contact-to-segment), and [send an email](https://resend.com/docs/api-reference/emails/send-email).
