const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');
const { verifyMessage, isAddress, getAddress, JsonRpcProvider } = require('ethers');
const { neon } = require('@neondatabase/serverless');
const { clerkMiddleware, getAuth } = require('@clerk/express');
const { createAiService, AI_MODEL } = require('./ai-service');
const { createProfileService } = require('./profile-service');
const binancePay = require('./binance-pay');
const { PRODUCTS: COMMERCE_PRODUCTS, createCommerceService } = require('./commerce-service');
const { allowedOriginsFor, privateApiResponse, apiMethodGuard, jsonRequestGuard, apiErrorHandler } = require('./security-policy');

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: false });

const app = express();
const PORT = process.env.PORT || 5000;
const HF_MODEL = process.env.HF_MODEL || 'stabilityai/stable-diffusion-2-1';
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY || '';
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const CONSTRUCTION_PACKAGE_USD = Number(process.env.CONSTRUCTION_PACKAGE_USD || 10);
const EVAPORATOR_PACKAGE_USD = Number(process.env.EVAPORATOR_PACKAGE_USD || 100);
const REACTOR_PACKAGE_USD = Number(process.env.REACTOR_PACKAGE_USD || 100);
const DISTILLATION_PACKAGE_USD = Number(process.env.DISTILLATION_PACKAGE_USD || 100);
const PROCESS_PACKAGE_USD = Number(process.env.PROCESS_PACKAGE_USD || 10);
const AI_CREDITS_PRICE_USD = Number(process.env.AI_CREDITS_PRICE_USD || 19);
const AI_CREDITS_PER_PACK = Number(process.env.AI_CREDITS_PER_PACK || 100);
const BINANCE_PAY_CURRENCIES = process.env.BINANCE_PAY_CURRENCIES || 'BNB,USDT,USDC';
const EDG_TOKEN_ADDRESS = process.env.EDG_TOKEN_ADDRESS || '0xa90Cc0137FDA4285Eaa6da0f7a5118A1432b2a76';
const EDG_PAYMENT_RECEIVER = process.env.EDG_PAYMENT_RECEIVER || '0xD9738cc53E9746a01cAC8EF01aF17fF4e88DD25F';
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc-dataseed.bnbchain.org';
const BINANCE_PRODUCTS = Object.freeze({
  construction: { amount: CONSTRUCTION_PACKAGE_USD, description: 'Construction design professional package', returnPath: '/construction-design' },
  evaporator: { amount: EVAPORATOR_PACKAGE_USD, description: 'MVR evaporator basic engineering package', returnPath: '/evaporators' },
  reactor: { amount: REACTOR_PACKAGE_USD, description: 'Reactor basic engineering package', returnPath: '/reactors' },
  distillation: { amount: DISTILLATION_PACKAGE_USD, description: 'Distillation basic engineering package', returnPath: '/distillation' },
  process: { amount: PROCESS_PACKAGE_USD, description: 'Process simulation export package', returnPath: '/process-design' },
  'ai-credits': { amount: AI_CREDITS_PRICE_USD, description: `${AI_CREDITS_PER_PACK} EDG AI engineering credits`, returnPath: '/workspace', credits: AI_CREDITS_PER_PACK },
});
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const sql = databaseUrl ? neon(databaseUrl) : null;
const aiService = createAiService(sql);
const commerceService = createCommerceService(sql, {
  provider: new JsonRpcProvider(BSC_RPC_URL, 56, { staticNetwork: true }),
  tokenAddress: EDG_TOKEN_ADDRESS,
  receiverAddress: EDG_PAYMENT_RECEIVER,
  minConfirmations: Math.max(1, Number(process.env.EDG_PAYMENT_CONFIRMATIONS || 1)),
});
const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY || process.env.REACT_APP_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const clerkProductionReady = process.env.VERCEL_ENV !== 'production' || clerkPublishableKey.startsWith('pk_live_');
const clerkConfigured = Boolean(clerkPublishableKey && process.env.CLERK_SECRET_KEY && clerkProductionReady);
const profileService = createProfileService(sql, {
  referralCredits: process.env.REFERRAL_REWARD_CREDITS || 25,
  welcomeCredits: process.env.REFERRAL_WELCOME_CREDITS || 10,
  referralEdg: process.env.REFERRAL_REWARD_EDG || 0,
  referralBnb: process.env.REFERRAL_REWARD_BNB || 0,
});
let binancePaymentsTableReady = false;
const allowedOrigins = allowedOriginsFor();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use('/api', privateApiResponse);
if (clerkConfigured) {
  app.use(clerkMiddleware({
    publishableKey: clerkPublishableKey,
    secretKey: process.env.CLERK_SECRET_KEY,
  }));
}
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: {
    directives: {
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://clerk.engineeringdrawing.io', 'https://*.clerk.accounts.dev', 'https://*.clerk.com'],
      connectSrc: ["'self'", 'https:'],
      frameSrc: ["'self'", 'https://clerk.engineeringdrawing.io', 'https://accounts.engineeringdrawing.io', 'https://*.clerk.accounts.dev', 'https://*.clerk.com', 'https://pay.binance.com', 'https://app.binance.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    },
  },
}));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-EDG-Account-ID'],
    optionsSuccessStatus: 204,
  })
);
app.use(express.json({ limit: '16kb', verify(req, _res, buffer) { req.rawBody = buffer.toString('utf8'); } }));
app.use('/api', apiMethodGuard);
app.use('/api', jsonRequestGuard);
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  })
);
app.use(
  ['/api/generate-image', '/api/payments/binance-pay/orders', '/api/commerce/edg/verify'],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many sensitive requests. Please try again later.' },
  })
);

app.get(['/health', '/api/health'], (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true });
});

function accountIdFrom(req) {
  return String(req.get('x-edg-account-id') || req.body?.accountId || '').trim();
}

function authenticatedUserId(req) {
  if (!clerkConfigured) return '';
  try {
    const auth = getAuth(req);
    return auth?.userId ? String(auth.userId) : '';
  } catch {
    return '';
  }
}

function logAuthenticationFailure(req, route) {
  try {
    const auth = getAuth(req);
    console.warn(JSON.stringify({
      level: 'warn',
      message: 'Authentication rejected',
      route,
      hasAuthorization: Boolean(req.get('authorization')),
      hasCookie: Boolean(req.get('cookie')),
      tokenType: auth?.tokenType || null,
      sessionStatus: auth?.sessionStatus || null,
      reason: auth?.reason || null,
    }));
  } catch (error) {
    console.warn(JSON.stringify({ level: 'warn', message: 'Authentication inspection failed', route, error: error?.message || 'Unknown error' }));
  }
}

async function authenticatedProfile(req, res) {
  if (!clerkConfigured) {
    res.status(503).json({ error: 'User accounts are waiting for Clerk production keys.' });
    return null;
  }
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Sign in to access your Engineering Drawing profile.' });
    return null;
  }
  try {
    return await profileService.bootstrap(userId, '');
  } catch (error) {
    console.error('Profile authentication error:', error.message);
    res.status(503).json({ error: 'Profile storage is temporarily unavailable.' });
    return null;
  }
}

async function accountIdFor(req) {
  const userId = authenticatedUserId(req);
  if (!userId) return aiService.guestAccountId(accountIdFrom(req), req.ip);
  const profile = await profileService.bootstrap(userId, '');
  return String(profile.account_id);
}

app.get('/api/account/config', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  return res.json({
    authentication: clerkConfigured,
    referral: {
      welcomeCredits: profileService.welcomeCredits,
      qualifiedCredits: Number(process.env.REFERRAL_REWARD_CREDITS || 25),
      edgEnabled: Number(process.env.REFERRAL_REWARD_EDG || 0) > 0,
      bnbEnabled: Number(process.env.REFERRAL_REWARD_BNB || 0) > 0,
    },
  });
});

app.post('/api/profile/bootstrap', async (req, res) => {
  if (!clerkConfigured) return res.status(503).json({ error: 'User accounts are waiting for Clerk production keys.' });
  const userId = authenticatedUserId(req);
  if (!userId) {
    logAuthenticationFailure(req, '/api/profile/bootstrap');
    return res.status(401).json({ error: 'Sign in to create your Engineering Drawing profile.' });
  }
  try {
    const profile = await profileService.bootstrap(userId, req.body?.referralCode);
    if (profile.referred_by && profileService.welcomeCredits > 0) {
      await aiService.addCredits(String(profile.account_id), profileService.welcomeCredits, 'referral_welcome', `referral-welcome:${profile.account_id}`);
    }
    const [campaign, entitlement] = await Promise.all([
      profileService.summary(String(profile.account_id)),
      aiService.usage(String(profile.account_id), aiService.hashIp(req.ip)),
    ]);
    res.set('Cache-Control', 'no-store');
    return res.json({
      profile: { accountId: String(profile.account_id), referralCode: profile.referral_code, walletAddress: profile.wallet_address || '', createdAt: profile.created_at },
      campaign: { ...campaign, policy: profileService.policy },
      entitlement,
    });
  } catch (error) {
    console.error('Profile bootstrap error:', error.message);
    return res.status(503).json({ error: 'Profile storage is temporarily unavailable.' });
  }
});

app.get('/api/profile', async (req, res) => {
  const profile = await authenticatedProfile(req, res);
  if (!profile) return undefined;
  try {
    const [campaign, entitlement] = await Promise.all([
      profileService.summary(String(profile.account_id)),
      aiService.usage(String(profile.account_id), aiService.hashIp(req.ip)),
    ]);
    res.set('Cache-Control', 'no-store');
    return res.json({ profile: { accountId: String(profile.account_id), referralCode: profile.referral_code, walletAddress: profile.wallet_address || '', createdAt: profile.created_at }, campaign: { ...campaign, policy: profileService.policy }, entitlement });
  } catch (error) {
    console.error('Profile summary error:', error.message);
    return res.status(503).json({ error: 'Profile summary is temporarily unavailable.' });
  }
});

app.post('/api/profile/wallet/challenge', async (req, res) => {
  const profile = await authenticatedProfile(req, res);
  if (!profile) return undefined;
  try {
    const challenge = await profileService.issueWalletChallenge(String(profile.account_id), SITE_URL);
    res.set('Cache-Control', 'no-store');
    return res.json(challenge);
  } catch (error) {
    console.error('Wallet challenge error:', error.message);
    return res.status(503).json({ error: 'Could not create a wallet verification challenge.' });
  }
});

app.post('/api/profile/wallet/verify', async (req, res) => {
  const profile = await authenticatedProfile(req, res);
  if (!profile) return undefined;
  const address = String(req.body?.address || '');
  const signature = String(req.body?.signature || '');
  if (!isAddress(address) || !/^0x[0-9a-f]+$/i.test(signature)) return res.status(400).json({ error: 'A valid wallet address and signature are required.' });
  try {
    const result = await profileService.consumeWalletChallenge(String(profile.account_id), getAddress(address), signature, verifyMessage);
    if (!result.ok) return res.status(400).json({ error: result.reason });
    return res.json({ walletAddress: getAddress(address) });
  } catch (error) {
    if (/unique/i.test(error.message || '')) return res.status(409).json({ error: 'That wallet is already linked to another account.' });
    console.error('Wallet verification error:', error.message);
    return res.status(503).json({ error: 'Could not link this wallet.' });
  }
});

app.get('/api/ai/status', async (req, res) => {
  try {
    const accountId = await accountIdFor(req);
    if (!aiService.validAccountId(accountId)) return res.status(400).json({ error: 'A valid EDG account identifier is required.' });
    const entitlement = await aiService.usage(accountId, aiService.hashIp(req.ip));
    return res.json({ configured: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL), model: AI_MODEL, entitlement });
  } catch (error) {
    console.error('AI status error:', error.message);
    return res.status(503).json({ error: 'AI usage storage is unavailable.' });
  }
});

app.post('/api/ai/generations', async (req, res) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  try {
    const generation = await aiService.createGeneration({ accountId: await accountIdFor(req), ip: req.ip, prompt });
    res.set('Cache-Control', 'no-store');
    return res.status(201).json(generation);
  } catch (error) {
    if (error.status >= 500) console.error('AI generation error:', error.code || error.message);
    return res.status(error.status || 500).json({ error: error.message, code: error.code, entitlement: error.usage });
  }
});

app.post('/api/generate-image', async (req, res) => {
  const safePrompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  if (!safePrompt || safePrompt.length > 1200) {
    return res.status(400).json({ error: 'Enter a prompt between 1 and 1,200 characters.' });
  }

  if (!HF_TOKEN) {
    return res.status(503).json({ error: 'Image generation is not configured.' });
  }

  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      { inputs: safePrompt },
      {
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 60_000,
      }
    );

    return res.status(200).json({ imageBase64: Buffer.from(response.data).toString('base64') });
  } catch (error) {
    const status = error?.response?.status;
    console.error('Image generation provider error:', status || 'unknown');
    const message =
      status === 429
        ? 'Image generation is busy. Please try again later.'
        : 'Image generation failed. Please try again later.';
    return res.status(502).json({ error: message });
  }
});

async function ensureBinancePaymentsTable() {
  if (!sql || binancePaymentsTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS binance_payment_orders (
      merchant_trade_no TEXT PRIMARY KEY,
      prepay_id TEXT,
      clerk_user_id TEXT NOT NULL,
      fiat_amount NUMERIC(20, 8) NOT NULL,
      fiat_currency TEXT NOT NULL,
      crypto_currency TEXT,
      crypto_amount NUMERIC(20, 8),
      status TEXT NOT NULL DEFAULT 'INITIAL',
      transaction_id TEXT,
      checkout_url TEXT,
      product_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE binance_payment_orders ADD COLUMN IF NOT EXISTS product_id TEXT`;
  binancePaymentsTableReady = true;
}

async function saveBinanceOrder(order) {
  if (!sql) throw new Error('Binance Pay requires persistent payment storage.');
  await ensureBinancePaymentsTable();
  const rows = await sql`
    INSERT INTO binance_payment_orders (
      merchant_trade_no, prepay_id, clerk_user_id, fiat_amount, fiat_currency,
      crypto_currency, crypto_amount, status, transaction_id, checkout_url, product_id
    ) VALUES (
      ${order.merchantTradeNo}, ${order.prepayId || null}, ${order.userId}, ${order.fiatAmount},
      ${order.fiatCurrency}, ${order.currency || null}, ${order.totalFee || null}, ${order.status || 'INITIAL'},
      ${order.transactionId || null}, ${order.checkoutUrl || null}, ${order.productId || null}
    )
    ON CONFLICT (merchant_trade_no) DO UPDATE SET
      prepay_id = COALESCE(EXCLUDED.prepay_id, binance_payment_orders.prepay_id),
      crypto_currency = COALESCE(EXCLUDED.crypto_currency, binance_payment_orders.crypto_currency),
      crypto_amount = COALESCE(EXCLUDED.crypto_amount, binance_payment_orders.crypto_amount),
      status = EXCLUDED.status,
      transaction_id = COALESCE(EXCLUDED.transaction_id, binance_payment_orders.transaction_id),
      checkout_url = COALESCE(EXCLUDED.checkout_url, binance_payment_orders.checkout_url),
      product_id = COALESCE(EXCLUDED.product_id, binance_payment_orders.product_id),
      updated_at = NOW()
    RETURNING *
  `;
  return rows[0];
}

async function getBinanceOrder(merchantTradeNo) {
  if (!sql) return null;
  await ensureBinancePaymentsTable();
  const rows = await sql`SELECT * FROM binance_payment_orders WHERE merchant_trade_no = ${merchantTradeNo} LIMIT 1`;
  return rows[0] || null;
}

async function finalizeAiCreditPayment(merchantTradeNo, paymentId) {
  await aiService.applyPayment({ orderId: merchantTradeNo, paymentId: paymentId || null, status: 'finished' });
  const aiOrder = await aiService.getPaymentOrder(merchantTradeNo);
  const accountId = String(aiOrder?.account_id || aiOrder?.accountId || '');
  if (!accountId) return;
  const referral = await profileService.activateReferral(accountId);
  if (referral?.credits > 0) {
    await aiService.addCredits(referral.referrerId, referral.credits, 'referral_reward', `referral-reward:${accountId}`);
  }
}

async function recordBinanceProductPurchase(stored, current) {
  if (!stored?.product_id || stored.product_id === 'ai-credits') return;
  await commerceService.recordProviderPurchase({
    productId: stored.product_id,
    providerName: 'binance_pay',
    reference: `binance:${stored.merchant_trade_no}`,
    amount: current.totalFee || stored.crypto_amount || stored.fiat_amount,
    currency: current.currency || stored.crypto_currency || stored.fiat_currency,
    clerkUserId: stored.clerk_user_id === 'guest' ? '' : stored.clerk_user_id,
  });
}

function isPaidStatus(status) {
  return ['PAID', 'SUCCESS', 'PAY_SUCCESS'].includes(String(status || '').toUpperCase());
}

app.get('/api/commerce/products', (_req, res) => {
  const products = Object.entries(COMMERCE_PRODUCTS).map(([id, product]) => ({
    id, title: product.title, edgAmount: product.edgAmount, chainId: 56,
    tokenAddress: EDG_TOKEN_ADDRESS, receiverAddress: EDG_PAYMENT_RECEIVER,
  }));
  res.set('Cache-Control', 'public, max-age=300');
  return res.json({ products, explorer: 'https://bscscan.com/tx/' });
});

app.post('/api/commerce/edg/verify', async (req, res) => {
  const productId = String(req.body?.productId || '').trim().toLowerCase();
  const txHash = String(req.body?.txHash || '').trim();
  const walletAddress = String(req.body?.walletAddress || '').trim();
  if (!COMMERCE_PRODUCTS[productId]) return res.status(400).json({ error: 'Unknown product.' });
  if (!/^0x[0-9a-f]{64}$/i.test(txHash) || !isAddress(walletAddress)) return res.status(400).json({ error: 'A valid transaction hash and wallet are required.' });
  try {
    const purchase = await commerceService.verifyEdgPurchase({
      productId, txHash, expectedWallet: walletAddress, clerkUserId: authenticatedUserId(req),
    });
    res.set('Cache-Control', 'no-store');
    return res.status(201).json({
      confirmed: true, productId, txHash: purchase.provider_reference,
      walletAddress: purchase.payer_address, verifiedAt: purchase.verified_at,
      explorerUrl: `https://bscscan.com/tx/${purchase.provider_reference}`,
    });
  } catch (error) {
    const clientError = /valid|required|unknown|already|confirmations|sender|does not contain/i.test(error.message || '');
    if (!clientError) console.error('EDG purchase verification error:', error.message);
    return res.status(clientError ? 400 : 503).json({ error: clientError ? error.message : 'Purchase verification is temporarily unavailable.' });
  }
});

app.get('/api/commerce/entitlements/:productId', async (req, res) => {
  const productId = String(req.params.productId || '').trim().toLowerCase();
  const walletAddress = String(req.query.wallet || '').trim();
  if (!COMMERCE_PRODUCTS[productId]) return res.status(404).json({ error: 'Unknown product.' });
  if (walletAddress && !isAddress(walletAddress)) return res.status(400).json({ error: 'Invalid wallet.' });
  try {
    const purchase = await commerceService.entitlement({ productId, walletAddress, clerkUserId: authenticatedUserId(req) });
    res.set('Cache-Control', 'no-store');
    return res.json({ entitled: Boolean(purchase), productId, transaction: purchase ? {
      provider: purchase.payment_provider,
      reference: purchase.provider_reference,
      explorerUrl: purchase.payment_provider === 'edg_bsc' ? `https://bscscan.com/tx/${purchase.provider_reference}` : null,
      verifiedAt: purchase.verified_at,
    } : null });
  } catch (error) {
    console.error('Commerce entitlement error:', error.message);
    return res.status(503).json({ error: 'Purchase entitlement is temporarily unavailable.' });
  }
});

app.get('/api/payments/binance-pay/config', async (req, res) => {
  return res.json({
    enabled: binancePay.isConfigured(),
    payCurrencies: BINANCE_PAY_CURRENCIES.split(',').map((value) => value.trim()).filter(Boolean),
    methods: { metamask: true, binancePay: binancePay.isConfigured(), upi: false },
  });
});

app.post('/api/payments/binance-pay/orders', async (req, res) => {
  if (!binancePay.isConfigured()) return res.status(503).json({ error: 'Binance Pay is disabled until merchant credentials are configured.' });
  if (!sql) return res.status(503).json({ error: 'Persistent payment storage is required before Binance Pay can be enabled.' });
  const productId = String(req.body?.productId || '').trim().toLowerCase();
  const product = BINANCE_PRODUCTS[productId];
  if (!product || !Number.isFinite(product.amount) || product.amount <= 0) return res.status(400).json({ error: 'Invalid payment product.' });
  let userId = authenticatedUserId(req) || 'guest';
  let accountId = null;
  if (product.credits) {
    const profile = await authenticatedProfile(req, res);
    if (!profile) return undefined;
    userId = authenticatedUserId(req);
    accountId = String(profile.account_id);
  }

  const merchantTradeNo = `EDG${crypto.randomBytes(15).toString('hex').slice(0, 29)}`;
  const amount = Number(product.amount.toFixed(2));
  const description = product.description;
  try {
    const data = await binancePay.createOrder({
      env: { terminalType: 'WEB', orderClientIp: req.ip },
      merchantTradeNo,
      fiatAmount: amount,
      fiatCurrency: 'USD',
      description,
      goodsDetails: [{ goodsType: '02', goodsCategory: 'F000', referenceGoodsId: productId.replace(/[^a-z0-9]/g, '').toUpperCase(), goodsName: description, goodsDetail: description }],
      returnUrl: `${SITE_URL}${product.returnPath}?payment=binance`,
      cancelUrl: `${SITE_URL}${product.returnPath}?payment=cancelled`,
      webhookUrl: `${PUBLIC_API_URL}/api/payments/binance-pay/webhook`,
      supportPayCurrency: BINANCE_PAY_CURRENCIES,
      passThroughInfo: JSON.stringify({ productId }),
    });
    await saveBinanceOrder({ merchantTradeNo, userId, fiatAmount: amount, fiatCurrency: 'USD', productId, ...data, status: 'INITIAL' });
    if (product.credits) await aiService.savePaymentOrder({ orderId: merchantTradeNo, accountId, credits: product.credits, invoiceId: data.prepayId });
    return res.status(201).json({
      merchantTradeNo, prepayId: data.prepayId, checkoutUrl: data.checkoutUrl,
      universalUrl: data.universalUrl, qrcodeLink: data.qrcodeLink, qrContent: data.qrContent,
      currency: data.currency, totalFee: data.totalFee, fiatCurrency: data.fiatCurrency, fiatAmount: data.fiatAmount,
    });
  } catch (error) {
    console.error('Binance Pay create order error:', error.providerCode || error.message);
    return res.status(502).json({ error: 'Could not create the Binance Pay checkout.', providerCode: error.providerCode || undefined });
  }
});

app.get('/api/payments/binance-pay/orders/:merchantTradeNo', async (req, res) => {
  const merchantTradeNo = String(req.params.merchantTradeNo || '');
  if (!/^EDG[A-Za-z0-9]{29}$/.test(merchantTradeNo)) return res.status(400).json({ error: 'Invalid Binance Pay order.' });
  try {
    const stored = await getBinanceOrder(merchantTradeNo);
    if (!stored) return res.status(404).json({ error: 'Payment order was not found.' });
    if (binancePay.isConfigured() && !['PAID', 'CANCELED', 'EXPIRED', 'REFUNDED'].includes(stored.status)) {
      const current = await binancePay.queryOrder(merchantTradeNo);
      await saveBinanceOrder({
        merchantTradeNo, userId: stored.clerk_user_id, fiatAmount: stored.fiat_amount, fiatCurrency: stored.fiat_currency,
        productId: stored.product_id, ...current, checkoutUrl: stored.checkout_url,
      });
      if (stored.product_id === 'ai-credits' && isPaidStatus(current.status)) {
        await finalizeAiCreditPayment(merchantTradeNo, current.transactionId);
      }
      if (isPaidStatus(current.status)) await recordBinanceProductPurchase(stored, current);
      return res.json({ merchantTradeNo, status: isPaidStatus(current.status) ? 'PAID' : current.status, currency: current.currency, totalFee: current.totalFee, transactionId: current.transactionId || null });
    }
    return res.json({ merchantTradeNo, status: stored.status, currency: stored.crypto_currency, totalFee: stored.crypto_amount, transactionId: stored.transaction_id });
  } catch (error) {
    console.error('Binance Pay query order error:', error.providerCode || error.message);
    return res.status(503).json({ error: 'Could not verify the Binance Pay order.' });
  }
});

app.post('/api/payments/binance-pay/webhook', async (req, res) => {
  const timestamp = req.get('BinancePay-Timestamp');
  const requestNonce = req.get('BinancePay-Nonce');
  const signature = req.get('BinancePay-Signature');
  if (!binancePay.verifyWebhook({ timestamp, requestNonce, signature, body: req.rawBody })) {
    return res.status(401).json({ returnCode: 'FAIL', returnMessage: 'Invalid signature' });
  }
  try {
    const data = typeof req.body?.data === 'string' ? JSON.parse(req.body.data) : (req.body?.data || {});
    const merchantTradeNo = String(data.merchantTradeNo || '');
    const stored = await getBinanceOrder(merchantTradeNo);
    if (!stored) return res.status(404).json({ returnCode: 'FAIL', returnMessage: 'Order not found' });
    const notificationStatus = String(req.body?.bizStatus || data.status || '').toUpperCase();
    const paid = isPaidStatus(notificationStatus);
    await saveBinanceOrder({
      merchantTradeNo, userId: stored.clerk_user_id, fiatAmount: stored.fiat_amount, fiatCurrency: stored.fiat_currency,
      prepayId: data.prepayId || stored.prepay_id, currency: data.currency || stored.crypto_currency,
      totalFee: data.totalFee || stored.crypto_amount, status: paid ? 'PAID' : String(req.body?.bizStatus || data.status || stored.status).toUpperCase(),
      transactionId: data.transactionId || stored.transaction_id, checkoutUrl: stored.checkout_url, productId: stored.product_id,
    });
    if (stored.product_id === 'ai-credits') {
      if (paid) await finalizeAiCreditPayment(merchantTradeNo, data.transactionId);
      else await aiService.applyPayment({ orderId: merchantTradeNo, paymentId: data.transactionId || null, status: 'waiting' });
    }
    if (paid) await recordBinanceProductPurchase(stored, data);
    return res.status(200).json({ returnCode: 'SUCCESS', returnMessage: null });
  } catch (error) {
    console.error('Binance Pay webhook storage error:', error.message);
    return res.status(503).json({ returnCode: 'FAIL', returnMessage: 'Storage unavailable' });
  }
});

app.use(apiErrorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
