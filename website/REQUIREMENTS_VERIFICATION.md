# SHFFL PDF requirement verification

Source: SHFFL_website.pdf (3 pages), treated as the authoritative specification.

| Requirement | Implementation | Verification | Status |
| --- | --- | --- | --- |
| Single pre-launch page and exact copy | index.html | Source audit | Implemented and verified |
| Official dark wordmark and mark favicon | assets/shffl-wordmark-dark.png, assets/shffl-mark.png | Files exist and are referenced | Implemented and verified |
| Exact color tokens and single radial glow | styles.css | Source audit; one radial-gradient | Implemented and verified |
| Typography and control dimensions | styles.css; assets/fonts/*.ttf | Source audit; official font files are self-hosted with SIL OFL texts | Implemented and verified |
| Exact journey SVG, unequal stops and labels | index.html | Source audit against PDF geometry | Implemented and verified |
| One-time line and stop entrance animation | script.js and styles.css | Code audit; reduced-motion branch included | Implemented; live browser sweep required for final visual confirmation |
| Responsive mobile composition | styles.css media query | Code audit for 320px minimum and stacked controls | Implemented; live width sweep required |
| Accessible email form and honest states | index.html, script.js, api/subscribe.js | Validation, pending, error and success paths reviewed | Implemented |
| Real persistence without fake success | api/subscribe.js, .env.example | Resend Contact + segment write is required before success | Implemented; production verification requires Resend/Vercel credentials and a test inbox |
| Branded confirmation email | api/subscribe.js | Server-side HTML and plain-text payload; no browser provider call | Implemented; delivery still requires a verified Resend sender |
| OG metadata, canonical URL and favicon | index.html | Asset paths and metadata reviewed | Implemented and verified |
| No navigation, footer, extra marketing sections or fabricated testimonial | index.html; legacy pages removed | Landing-page source audit | Implemented and verified |
| No analytics, advertising pixels or cookie banner | index.html and script.js | Source search | Implemented and verified |

## Remaining verification

- Run a production browser sweep at 320, 375, 390, 768, 1024 and 1440px, including reduced motion and keyboard focus.
- Fonts are now self-hosted from `website/assets/fonts/`; each family has its official SIL Open Font License text beside the files.
- Configure the Resend environment variables and run the deployed waitlist verification in `RESEND_SETUP.md` with a dedicated test inbox.

Until the Resend variables are configured and the production browser/provider checks are completed, this document intentionally does not mark the site launch-ready.
