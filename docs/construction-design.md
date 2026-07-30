# Construction Design

## Product purpose

The Construction Design page converts validated residential plot inputs into
coordinated concept outputs: a 2D plan, interactive 3D model, room schedule,
material quantities, preliminary cost estimate, and downloadable professional
document package.

The generated work is a concept. It is not a structural design, permit drawing,
or authorization to construct. Local licensed professionals must verify the
site, regulations, structure, services, accessibility, and safety.

## Supported inputs

- Plot width: 18–100 ft, in 0.5 ft planning increments
- Plot length: 24–150 ft, in 0.5 ft planning increments
- Two or three bedrooms
- One to three floors
- East, north, west, or south road-facing orientation
- Courtyard Light, Open Social, and Quiet Zones alternatives

Every output derives from the same validated design object. A change to the
inputs or alternative must update the 2D plan, 3D geometry, quantities, cost,
DXF, OBJ, schedules, and report together.

## Payment configuration

Only public receiving identifiers belong in `.env`. Never place a wallet
private key, wallet seed phrase, payment secret, or gateway secret in a
`REACT_APP_*` variable because Create React App exposes those values to the
browser.

Required public configuration:

```env
REACT_APP_BNB_TESTNET_RECEIVER=0xPublicReceivingWallet
REACT_APP_EDG_TESTNET_TOKEN=0xPublicEdgTokenContract
REACT_APP_EDG_CHAIN_ID_HEX=0x38
REACT_APP_EDG_DOWNLOAD_PRICE=100
REACT_APP_EDG_TOKEN_DECIMALS=18
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_CONSTRUCTION_PRICE_USD=10
REACT_APP_UPI_ID=yourname@bank
REACT_APP_ENABLE_UPI=false
REACT_APP_UPI_NAME=Engineering Drawing
REACT_APP_UPI_DOWNLOAD_PRICE=999
REACT_APP_UPI_TEST_MODE=false
```

BNB uses a NOWPayments hosted invoice. The React application asks the Express
backend to create the invoice, redirects the customer to the hosted checkout,
and polls the backend after the customer returns. The API key and IPN secret
must exist only in `server/.env` locally or in the deployment platform's
encrypted server environment:

```env
NOWPAYMENTS_API_KEY=private_api_key
NOWPAYMENTS_IPN_SECRET=private_ipn_secret
NOWPAYMENTS_PAY_CURRENCY=bnbbsc
CONSTRUCTION_PACKAGE_USD=10
PUBLIC_API_URL=http://localhost:5000
SITE_URL=http://localhost:3000
```

The production NOWPayments webhook is:
`https://www.engineeringdrawing.io/api/payments/nowpayments/ipn`.
The backend validates `x-nowpayments-sig` with HMAC-SHA512 before accepting a
status update. EDG uses the configured BSC network (`0x38` is BSC Mainnet) and
therefore transfers tokens with real value.

UPI is hidden when `REACT_APP_ENABLE_UPI=false`. It can be restored after a
payment gateway and server verification are ready. When enabled, UPI launches
a standards-based `upi://pay` intent. A user-submitted UTR is not
proof of payment by itself. Production must verify UPI through an approved
payment provider or reconciliation service before unlocking the package.
`REACT_APP_UPI_TEST_MODE=true` is allowed only for local interface testing.

## Professional package

The ZIP contains:

- Branded printable HTML project report
- Drawing and document index
- Floor-by-floor dimensioned SVG plans
- Front elevation SVG
- Editable DXF plan
- OBJ 3D model
- Room schedule CSV
- Preliminary material BOQ CSV
- Cost breakdown CSV
- Concept specifications CSV
- Complete design-data JSON

The HTML report is designed for A4 printing and can be saved as PDF from the
browser print dialog.

## Brand and contact

- Brand: Engineering Drawing
- Website: https://engineeringdrawing.io
- Contact: contact@engineeringdrawing.io

## Production requirements

1. Replace the temporary in-memory BNB order store and browser unlock state
   with a durable database and signed, expiring download authorization.
2. Add independent server verification for direct EDG transfers.
3. Integrate an approved UPI payment provider for automatic verification.
4. Store immutable payment-to-project records.
5. Generate download archives on the server and return expiring URLs.
6. Have architects and engineers review production templates and local rules.
