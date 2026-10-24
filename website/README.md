# SHFFL pre-launch site

This folder is the single-page SHFFL pre-launch site defined by `SHFFL_website.pdf`. The public form submits to the same-origin Vercel Function at `/api/subscribe`; Resend is called only from that server function.

## Local preview

From this folder:

    python -m http.server 4173

The static preview renders the page and client-side validation. The `/api/subscribe` function is provided by Vercel and cannot be exercised by Python's static server.

## Resend setup

Create a Resend API key with the minimum access needed for this flow: Contacts read/write, Segments write, and Emails send. Verify the sender domain/address in Resend, create a segment named `SHFFL Waitlist`, then add these variables to the Vercel project for Production and Preview:

    RESEND_API_KEY=
    RESEND_FROM_EMAIL=SHFFL <hello@your-verified-domain.example>
    RESEND_WAITLIST_SEGMENT_ID=
    RESEND_REPLY_TO_EMAIL=

`RESEND_REPLY_TO_EMAIL` is optional and must also be a valid address for your setup. Never use a `VITE_` or `NEXT_PUBLIC_` prefix for these values. Redeploy after changing Vercel environment variables.

The function retrieves or creates the Resend Contact, refuses an already-unsubscribed contact, adds the contact to the configured segment, and then sends the branded welcome email. Duplicate submissions are safe at the contact/segment level. The welcome email uses a deterministic Resend idempotency key; Resend's idempotency retention is finite, so this is not an exactly-once guarantee over unlimited future retries.

If contact persistence or segment membership fails, the visitor receives an error and no welcome email is sent. If the contact and segment are saved but Resend rejects the welcome email, the API returns success for the saved subscription and logs only a request ID plus a non-reversible email hash—never the full address. The contact remains available for a later email retry. There is no public broadcast endpoint; future updates should use Resend Broadcasts and unsubscribe controls.

## Verification

Before launch, verify with a dedicated test inbox on the deployed Vercel URL:

1. Submit a valid address and confirm the Contact exists and is in `SHFFL Waitlist`.
2. Confirm the welcome email has the exact subject `You’re on the SHFFL list 🎉`, correct plain-text fallback, and branded HTML.
3. Submit the same address again; confirm no duplicate contact is created and no duplicate welcome is sent within the idempotency window.
4. Unsubscribe the address in Resend and submit again; confirm the endpoint refuses to resubscribe it.
5. Submit invalid input and confirm no Resend request is made.

See `RESEND_SETUP.md` and `REQUIREMENTS_VERIFICATION.md` for the operational notes and PDF audit.
