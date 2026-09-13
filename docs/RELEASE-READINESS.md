# Release readiness — September 2026

## Changes
- My Profile displays Clerk's actual twoFactorEnabled state and opens Clerk's secure account manager for enrollment/recovery. No MFA secrets or backup codes are stored by EDG.
- Homepage uses industry4-light-v1.mp4: 126,128 bytes versus 901,232 bytes, H.264 960x540 at 20 fps, fast-start metadata. Original retained for rollback.
- Database wallet verification consumes the exact unexpired challenge and updates the wallet in a single SQL statement to prevent concurrent reuse.

## Before accepting sales
- In the production Clerk instance, enable authenticator applications and backup codes. Enroll a test account through My Profile > Set up 2FA > Security. Verify second-factor sign-in, wrong-code rejection, recovery, and session revocation. Do not claim MFA is enforced globally unless configured and tested.
- Resolve any Clerk DNS/domain deployment checks. Do not bypass security gates to assign production domains.
- Exercise checkout and signed payment webhooks in the provider's supported test environment: failed payment, duplicate webhook, correct credits, refund policy. No real purchase was made by this release's automated tests.
- Test database wallet challenge concurrency against staging PostgreSQL; unit tests alone do not certify production database behavior.
- Confirm backups, restore procedure, error alerts, privacy/terms and operational ownership. A clean build and dependency audit are not a penetration test or a bug-free guarantee.
- PlantOps remains a simulator. Do not sell or represent it as commissioned autonomous plant control.

## Verification commands
`npm run test:server`
`npm test -- --watchAll=false --runInBand`
`npm run build`
`npm audit --omit=dev`

Clerk setup reference: https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options
