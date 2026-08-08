# SHOPLINE hosted checkout setup

Reactor and distillation BEPs support SHOPLINE hosted checkout in addition to the existing BNB and EDG payment methods. The SHOPLINE option is intentionally hidden until a valid HTTPS product checkout URL is configured, so production never displays a broken payment method.

## Merchant setup

1. In SHOPLINE, create two digital/service products priced at USD 100:
   - Industrial Reactor Basic Engineering Package
   - Industrial Distillation Basic Engineering Package
2. Configure the available card/payment provider in **Settings → Payments**.
3. Generate the external-site Buy Button or hosted product checkout link for each product.
4. Add these variables to the Vercel Production environment:

```text
REACT_APP_SHOPLINE_REACTOR_CHECKOUT_URL=https://your-secure-shopline-url
REACT_APP_SHOPLINE_DISTILLATION_CHECKOUT_URL=https://your-secure-shopline-url
```

5. Redeploy the production project. A third **Card / SHOPLINE** option will appear automatically on both package cards.

Never store SHOPLINE Admin API access tokens in `REACT_APP_*` variables. Those variables are compiled into browser code. A future order-status/webhook integration must keep Admin API credentials and HMAC verification exclusively in the server environment.

The existing BNB and EDG flows remain independent and continue to unlock downloads in the current browser after confirmed payment.
