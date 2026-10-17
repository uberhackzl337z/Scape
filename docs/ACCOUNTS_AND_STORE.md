# Email accounts and monetized store

October 17, 2026. Owner selected the US as the business country and authorized choosing the provider. Decision: Supabase email OTP for identity, Stripe Checkout for the browser store, DigitalOcean for the first small hosted alpha. Code is implemented; provider accounts, verified email delivery, merchant onboarding and live charges are not configured by this change. No real emails or payments were sent.

## Player experience

Use Account & store from the welcome screen. Enter an email, request a code, choose a unique name and verify the code. Existing verified accounts keep their name. New names use 3-16 letters/numbers/underscores, begin with a letter and are unique without case distinctions. Reserved staff names cannot be registered. The email is private; the chosen name is public. One email identity maps to one character in this world.

Before linking an existing browser character, bank the haul and reload to the welcome screen. Verification requires both email control and possession of the existing character key; linking refuses an active character or a key already bound elsewhere. Progress remains under the same internal character identity. Once linked, the old key can no longer join as a guest. Email sign-in uses an HttpOnly, SameSite cookie, hashed server sessions, seven-day expiry and logout revocation. Passwords and provider access/refresh tokens are not stored in the game. Email changes/account deletion and user-managed multi-device session revocation are not yet implemented. Lost email access requires support through the identity provider.

Account and order tables live in world.sqlite alongside world state, outside shared snapshots. Existing consistent SQLite backups include them. Restore the whole database with the stable WORLD_ID; never roll world and account/order tables back independently. Backups contain email addresses and purchase records and require restricted access and off-host protection. Supabase identity-provider configuration/records are separate from local backups.

## Store decision

Two non-tradeable nameplate appearances cost $4.99 USD each before applicable tax. Sunset uses copper lettering; Glacier uses icy blue lettering. They grant no stats, XP, resources, paid duel coins, random rewards, cash-out or resale. All combat slots and uncapped resource carrying remain free. Prices are server-owned, not accepted from the browser. A successful checkout return grants nothing by itself: only a signed, recent Stripe webhook matching the stored session, amount/subtotal, currency and order can grant ownership. Repeated deliveries are idempotent. Repeated checkout requests resume the same pending order.

Full refunds and new disputes revoke the order's appearance; late completion events cannot undo revocation. Disputes later won and partial refunds require support review; there is no automatic financial refund endpoint. An appearance supported by another valid paid order remains owned. Checkout requires an authenticated account and an offline character or a living, non-duelling character with an empty haul inside sanctuary, so leaving for payment does not abandon resources in the wild.

## Provider setup

1. Create a Supabase project in the business owner's account. Enable email OTP, configure the sender's SMTP/domain and set the email template to include {{ .Token }}. Set a short OTP expiry and appropriate provider rate limits. Supabase's default sender is restricted and is not a production mail service. Configure bot protection/edge rate limiting for a public release; this UI does not yet integrate an interactive CAPTCHA widget.
2. Configure SUPABASE_URL as the HTTPS project origin without a trailing slash, and SUPABASE_ANON_KEY as the publishable/anon key. Never put a Supabase service-role key into these settings. Set ACCOUNTS_REQUIRED=1. Production requires accounts by default; ALLOW_GUEST_ALPHA=1 exists only for isolated guest test/alpha environments and is explicitly used by container CI. The production Compose file requires email configuration and does not enable that override.
3. Create the US Stripe business account, complete identity/bank/business onboarding, and disclose the game and earned-only duel mechanic accurately. Confirm provider eligibility; cosmetic purchases do not automatically establish payment-policy approval for the whole game. Configure real support details, refund terms, privacy policy and Stripe Tax registrations as applicable. Stripe Checkout is a payment processor integration here, not a claim that all tax obligations are handled automatically.
4. Begin with STORE_MODE=test, sk_test credentials in STRIPE_SECRET_KEY, and the test endpoint signing secret in STRIPE_WEBHOOK_SECRET. The endpoint is https://YOUR_GAME_DOMAIN/api/store/webhook. Subscribe to checkout.session.completed, charge.refunded and charge.dispute.created. Test successful, cancelled, duplicate, refunded/disputed and delayed/reordered deliveries using Stripe's sandbox before enabling real payments. No sandbox-provider delivery/charge was performed in this implementation; local provider responses and signatures were mocked.
5. After real provider setup and staging tests, select STORE_MODE=live, matching sk_live credentials and live webhook secret, STORE_LIVE_ENABLED=1, STORE_SUPPORT_EMAIL, STORE_TERMS_URL and STORE_PRIVACY_URL (both real HTTPS policies). Set PUBLIC_ORIGIN to the actual HTTPS game origin. Live checkout also requests billing address, required terms acceptance and Stripe automatic tax; configure those in Stripe first. Keep secrets in the host environment/secret manager, outside Git and browser code. A live key in test mode fails startup; missing live prerequisites leave checkout unavailable. No live settings were enabled here.

Publish the exact reviewed release only after CI passes. Rotate/revoke sessions after a suspected leak, check failed webhooks/order reconciliation and support disputes. Do not enable live billing solely because a mocked test passed.

## Hosting and Steam

Start with a small browser alpha on one DigitalOcean Basic 2GiB/1vCPU Droplet (currently $12/month base; domain, backups, taxes and overages separate). Keep one authoritative process, SQLite on a persistent volume, Caddy HTTPS, restart policy, monitoring and off-host restore drills. Domain/host/merchant accounts are external requirements; nothing was purchased or publicly deployed here. See HOSTING.md.

Steam is a later client/distribution integration, not the game server. Its in-game purchases must use Steam Wallet/microtransaction APIs. STORE_CHANNEL=steam disables this Stripe checkout path; a Steam Wallet adapter is not implemented. A browser alpha lets us measure retention, player acquisition cost, conversion and support expense before funding that work. Neither browser nor Steam distribution guarantees profit.

## Current US pricing comparison and sources

Stripe standard domestic-card pricing is currently 2.9% + $0.30; PayPal Checkout is 3.49% + $0.49 USD on its standard domestic schedule, with other PayPal products having different rates. At a $4.99 domestic card purchase, Stripe processing alone leaves about $4.55 before taxes, refunds, dispute costs and operating expense. This is arithmetic, not a revenue forecast. Stripe was chosen for the hosted checkout/webhook integration and this starting price structure; PayPal can be evaluated as an additional method after actual demand.

- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/auth-smtp
- https://docs.stripe.com/checkout/fulfillment
- https://docs.stripe.com/webhooks/signature
- https://docs.stripe.com/api/checkout/sessions/create
- https://stripe.com/pricing
- https://www.paypal.com/us/business/paypal-business-fees
- https://stripe.com/legal/restricted-businesses
- https://www.digitalocean.com/pricing/droplets
- https://partner.steamgames.com/doc/features/microtransactions
- https://partner.steamgames.com/doc/gettingstarted/appfee

## Verification boundaries

The account/store regression suite tests provider-confirmed email matching, names/sessions/rates, CSRF/privacy, server pricing, replay/signature/amount failure, refunds/disputes and live-mode/Steam gates. The real WebSocket protocol test uses seeded disposable accounts to check required sign-in, legacy-key retirement, unchangeable account names, hidden emails/keys, appearance persistence across a crash and logout revocation. No production identities or funds are used. Multi-device real email delivery, actual Stripe sandbox checkout/webhook delivery, public-host TLS, security review, abuse/load testing, policies and live onboarding remain separate launch work.
