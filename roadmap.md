# Completed — Full end-to-end panel verification

- [x] Run all 42 automated regression tests and check hosted backend health; latest build is clean.
- [x] Exercise shipper booking, manual payment, trip progress, delivery, rating and alerts with real accounts.
- [x] Exercise driver availability, offer acceptance, chat, 40/60 confirmations, POD/OTP and receipt.
- [x] Exercise admin payment review, KYC approval, dispute resolution, settings and manual notifications.
- [x] Check desktop/mobile layouts, browser console/network failures and in-app Back behavior; fixed payment-screen wiring, KYC storage/refresh, pre-assignment payment/cancel actions, trip-detail receipts and admin feedback.

# Completed — Activity and admin notifications

- [x] Update the Alerts screen and bell in realtime without automatically requesting device permission.
- [x] Notify relevant users for bookings, offers, messages, trip progress/cancellation, POD, ratings, KYC and disputes without duplicating existing payment alerts.
- [x] Add an admin-only notification composer for one user, all users, shippers or drivers.
- [x] Verify automatic and manual delivery, authorization, tests and phone/desktop layouts.

# Completed — In-app Back navigation

- [x] Keep browser and Android Back inside the app and restore the previous shipper/driver screen or tab.
- [x] Return chat to its trip, trip details to its originating tab, and KYC to its originating screen.
- [x] Require explicit confirmation before exiting from the Android home screen.
- [x] Add regression tests and verify desktop/phone browser Back plus simulated native Back; real-device verification remains separate.

# Completed — Driver profile ratings and reviews

- [x] Add a persistent Rate & review action to the assigned driver's profile after trip completion.
- [x] Show the driver's average rating, total ratings and recent written reviews to trip participants and on the driver's own account.
- [x] Keep submissions limited to one completed-trip participant rating per booking and protect review visibility.
- [x] Verify submission, reload readback, permissions, tests and phone/desktop layouts.

# Completed — 40/60 trip payments

- [x] Show shipper loading responsibility and 40% pickup / 60% after POD+OTP conditions after booking.
- [x] Record cash/online stage payments and require driver confirmation before marking them paid.
- [x] Require confirmed 40% before trip start and POD before delivery OTP; unlock 60% only after verified delivery.
- [x] Verify shipper and driver flows, regression tests, desktop and phone layouts.

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
- [x] Verify receipt download on a populated driver trip through the app.
- [ ] Verify camera and nearby-location permissions on a real phone — requires device permission and hardware.

# Phase 4 — Payments

- [x] Add admin-controlled UPI, QR and bank transfer methods with demo details until replaced, plus per-method enable/disable controls.
- [x] Add shipper payment details, transaction/UTR submission, admin verification and automatic booking/dashboard status updates.
- [x] Verify method permissions, payment-request validation, approval/rejection and resubmission end to end.
- [x] Add isolated mock checkout with success, failure, cancellation, retry and reset; verified signed-in booking summary/trip flow, reload readback and mobile layout. All 18 tests pass; demo records never update real payment/payout fields.

- [x] Confirm business registration in India and payment-provider eligibility; built-in Stripe and Paddle are unavailable for this country/product combination.
- [ ] Connect an external payment service after user approval — Razorpay connection was declined; waiting for a merchant connection. Existing Razorpay code remains inactive.
- [x] Implement secure manual payment collection and verified payment-status readback; delivery confirmation remains separate from payment.
- [ ] Verify supported driver settlements and subscription payments with the selected service; do not imply automatic payouts without provider support.
- [ ] Test successful, failed and cancelled payments before live activation.

# Phase 5 — Final testing and publishing

- [x] Add all-India pickup/drop place search with selected coordinates and verify Delhi, Bhopal and Banaras routing.
- [x] Upgrade the location picker to a Rapido/Porter-style keyless vector map and verify pin, search, zoom and GPS flows on mobile.
- [x] Run all existing regression tests and inspect content-page metadata.
- [x] Re-run all 18 tests after mock-payment changes; verify public desktop/mobile account selection and consent-gated sign-in with no browser runtime errors.
- [x] Verify signed-in driver navigation, profile save/readback after reload, desktop/mobile layout, accessible policy documents and sign-out; no runtime errors observed.
- [x] Verify populated-trip receipt download.
- [x] Full end-to-end recheck: booking→offer→chat→OTP delivery, agreed-fare display, admin panel roles, KYC submit/approve, admin payment marking and settings save.
- [x] Recheck backend security findings: one warning for authenticated reads of shared app settings and one informational plan-catalog read rule; these contain app configuration rather than private account/payment data and preserve admin-only writes. No critical findings reported.
- [ ] Complete real-phone GPS/camera and real email/social sign-in checks — requires user device, inbox and provider interaction.
- [ ] Publish after final checks and user confirmation; online payments remain blocked on the Phase 4 merchant connection.