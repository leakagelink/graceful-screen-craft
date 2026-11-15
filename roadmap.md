# Phase 1

- [x] Connect Lovable Cloud.
- [x] Set up account profiles, recorded consent and protected role enrollment; verify admin self-promotion and KYC self-approval are blocked.
- [x] Enable email/password, Google and Lovable sign-in; add email-confirmation state and test driver signup metadata. Verify signed-in onboarding with a temporary account.
- [x] Set up persistent booking data; verify profile save, booking creation and booking readback after reload through the app.
- [ ] Verify Google/Lovable provider redirects and real confirmation-email delivery — requires user-owned provider interaction and inbox access.

# Phase 2 — Booking to delivery

- [x] Implement and verify driver offers and load visibility with signed-in test accounts.
- [x] Implement and verify offer acceptance and atomic driver assignment through the app.
- [x] Implement and verify shipper-driver chat readback and trip start through the app.
- [x] Implement and verify shipper-only OTP, incorrect-code rejection, confirmed delivery and completed-trip readback; payment status stays unchanged.
- [ ] Verify live GPS sharing on a real driver device — requires device location permission and a moving device.

# Phase 3 — First ZIP driver extras

- [x] Compare the original driver screens and integrate missing loads, trips, earnings, messages, notifications and account views.
- [x] Add participant-scoped delivery receipt download and browser permission handling where supported.
- [x] Verify driver navigation and profile saved-data readback through the app on desktop and mobile sizes.
- [ ] Verify receipt download on a populated driver trip through the app — completed-trip test account could not be minted; requires a reachable participant session.
- [ ] Verify camera and nearby-location permissions on a real phone — requires device permission and hardware.

# Phase 4 — Payments

- [x] Confirm business registration in India and payment-provider eligibility; built-in Stripe and Paddle are unavailable for this country/product combination.
- [ ] Connect an external payment service after user approval — Razorpay connection was declined; waiting for a merchant connection. Existing Razorpay code remains inactive.
- [ ] Implement secure payment collection and verified payment-status readback; keep delivery confirmation separate from payment.
- [ ] Verify supported driver settlements and subscription payments with the selected service; do not imply automatic payouts without provider support.
- [ ] Test successful, failed and cancelled payments before live activation.