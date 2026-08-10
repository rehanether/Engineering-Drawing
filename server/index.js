const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: false });

const app = express();
const PORT = process.env.PORT || 5000;
const HF_MODEL = process.env.HF_MODEL || 'stabilityai/stable-diffusion-2-1';
const HF_TOKEN = process.env.HUGGINGFACE_API_KEY || '';
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
const CONSTRUCTION_PACKAGE_USD = Number(process.env.CONSTRUCTION_PACKAGE_USD || 10);
const EVAPORATOR_PACKAGE_USD = Number(process.env.EVAPORATOR_PACKAGE_USD || 100);
const REACTOR_PACKAGE_USD = Number(process.env.REACTOR_PACKAGE_USD || 100);
const DISTILLATION_PACKAGE_USD = Number(process.env.DISTILLATION_PACKAGE_USD || 100);
const PROCESS_PACKAGE_USD = Number(process.env.PROCESS_PACKAGE_USD || 10);
const NOWPAYMENTS_PAY_CURRENCY = process.env.NOWPAYMENTS_PAY_CURRENCY || 'bnbbsc';
const paymentOrders = new Map();
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const sql = databaseUrl ? neon(databaseUrl) : null;
let paymentsTableReady = false;
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS ||
    'https://www.engineeringdrawing.io,https://engineeringdrawing.io,http://localhost:3000,http://localhost:4176')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    optionsSuccessStatus: 204,
  })
);
app.use(express.json({ limit: '16kb' }));
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

app.get('/health', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true });
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

function recursivelySort(value) {
  if (Array.isArray(value)) return value.map(recursivelySort);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = recursivelySort(value[key]);
      return result;
    }, {});
}

function validNowPaymentsSignature(body, signature) {
  if (!NOWPAYMENTS_IPN_SECRET || typeof signature !== 'string') return false;
  const digest = crypto
    .createHmac('sha512', NOWPAYMENTS_IPN_SECRET)
    .update(JSON.stringify(recursivelySort(body)))
    .digest('hex');
  if (digest.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

async function ensurePaymentsTable() {
  if (!sql || paymentsTableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS construction_payment_orders (
      order_id TEXT PRIMARY KEY,
      invoice_id TEXT,
      payment_id TEXT,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  paymentsTableReady = true;
}

async function savePaymentOrder(orderId, values) {
  if (!sql) {
    paymentOrders.set(orderId, { ...(paymentOrders.get(orderId) || {}), ...values });
    return;
  }
  await ensurePaymentsTable();
  await sql`
    INSERT INTO construction_payment_orders
      (order_id, invoice_id, payment_id, status, created_at, updated_at)
    VALUES
      (${orderId}, ${values.invoiceId || null}, ${values.paymentId || null}, ${values.status || 'waiting'}, NOW(), NOW())
    ON CONFLICT (order_id) DO UPDATE SET
      invoice_id = COALESCE(EXCLUDED.invoice_id, construction_payment_orders.invoice_id),
      payment_id = COALESCE(EXCLUDED.payment_id, construction_payment_orders.payment_id),
      status = EXCLUDED.status,
      updated_at = NOW()
  `;
}

async function getPaymentOrder(orderId) {
  if (!sql) return paymentOrders.get(orderId) || null;
  await ensurePaymentsTable();
  const rows = await sql`
    SELECT order_id, invoice_id, payment_id, status, created_at, updated_at
    FROM construction_payment_orders
    WHERE order_id = ${orderId}
    LIMIT 1
  `;
  return rows[0] || null;
}

app.post('/api/payments/nowpayments/invoice', async (req, res) => {
  if (!NOWPAYMENTS_API_KEY || !NOWPAYMENTS_IPN_SECRET) {
    return res.status(503).json({ error: 'The BNB payment gateway is not configured yet.' });
  }
  if (!Number.isFinite(CONSTRUCTION_PACKAGE_USD) || CONSTRUCTION_PACKAGE_USD <= 0) {
    return res.status(503).json({ error: 'The construction package price is not configured.' });
  }

  const design = req.body?.design || {};
  const width = Number(design.width);
  const length = Number(design.length);
  const floors = Number(design.floors);
  if (
    !Number.isFinite(width) || width < 18 || width > 100 ||
    !Number.isFinite(length) || length < 24 || length > 150 ||
    !Number.isInteger(floors) || floors < 1 || floors > 3
  ) {
    return res.status(400).json({ error: 'Invalid construction design details.' });
  }

  const orderId = `CD-${crypto.randomUUID()}`;
  try {
    const response = await axios.post(
      'https://api.nowpayments.io/v1/invoice',
      {
        price_amount: CONSTRUCTION_PACKAGE_USD,
        price_currency: 'usd',
        pay_currency: NOWPAYMENTS_PAY_CURRENCY,
        order_id: orderId,
        order_description: `Construction design package ${width}x${length}, ${floors} floor${floors === 1 ? '' : 's'}`,
        ipn_callback_url: `${PUBLIC_API_URL}/api/payments/nowpayments/ipn`,
        success_url: `${SITE_URL}/construction-design?payment=return&order=${encodeURIComponent(orderId)}`,
        cancel_url: `${SITE_URL}/construction-design?payment=cancelled&order=${encodeURIComponent(orderId)}`,
        is_fixed_rate: true,
        is_fee_paid_by_user: true,
      },
      {
        headers: { 'x-api-key': NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
        timeout: 15_000,
      }
    );

    if (!response.data?.invoice_url || !response.data?.id) {
      throw new Error('NOWPayments returned an incomplete invoice.');
    }
    await savePaymentOrder(orderId, {
      invoiceId: String(response.data.id),
      status: 'waiting',
    });
    return res.status(201).json({
      orderId,
      invoiceId: String(response.data.id),
      invoiceUrl: response.data.invoice_url,
    });
  } catch (error) {
    console.error('NOWPayments invoice error:', error?.response?.status || error.message);
    return res.status(502).json({ error: 'Could not create the secure BNB checkout. Please try again.' });
  }
});

app.post('/api/payments/nowpayments/evaporator/invoice', async (req, res) => {
  if (!NOWPAYMENTS_API_KEY || !NOWPAYMENTS_IPN_SECRET) {
    return res.status(503).json({ error: 'The BNB payment gateway is not configured yet.' });
  }
  if (!Number.isFinite(EVAPORATOR_PACKAGE_USD) || EVAPORATOR_PACKAGE_USD <= 0) {
    return res.status(503).json({ error: 'The evaporator package price is not configured.' });
  }

  const design = req.body?.design || {};
  const capacityTph = Number(design.capacityTph);
  const feedConc = Number(design.feedConc);
  const finalConc = Number(design.finalConc);
  if (
    !Number.isInteger(capacityTph) || capacityTph < 1 || capacityTph > 5 ||
    !Number.isFinite(feedConc) || feedConc < 0.2 || feedConc > 35 ||
    !Number.isFinite(finalConc) || finalConc <= feedConc || finalConc > 60
  ) {
    return res.status(400).json({ error: 'Invalid evaporator design details.' });
  }

  const orderId = `EV-${crypto.randomUUID()}`;
  try {
    const response = await axios.post(
      'https://api.nowpayments.io/v1/invoice',
      {
        price_amount: EVAPORATOR_PACKAGE_USD,
        price_currency: 'usd',
        pay_currency: NOWPAYMENTS_PAY_CURRENCY,
        order_id: orderId,
        order_description: `${capacityTph} TPH MVR evaporator Basic Engineering Package`,
        ipn_callback_url: `${PUBLIC_API_URL}/api/payments/nowpayments/ipn`,
        success_url: `${SITE_URL}/evaporators?payment=return&order=${encodeURIComponent(orderId)}`,
        cancel_url: `${SITE_URL}/evaporators?payment=cancelled&order=${encodeURIComponent(orderId)}`,
        is_fixed_rate: true,
        is_fee_paid_by_user: true,
      },
      {
        headers: { 'x-api-key': NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
        timeout: 15_000,
      }
    );

    if (!response.data?.invoice_url || !response.data?.id) {
      throw new Error('NOWPayments returned an incomplete invoice.');
    }
    await savePaymentOrder(orderId, {
      invoiceId: String(response.data.id),
      status: 'waiting',
    });
    return res.status(201).json({
      orderId,
      invoiceId: String(response.data.id),
      invoiceUrl: response.data.invoice_url,
    });
  } catch (error) {
    console.error('NOWPayments evaporator invoice error:', error?.response?.status || error.message);
    return res.status(502).json({ error: 'Could not create the secure BNB checkout. Please try again.' });
  }
});

app.post('/api/payments/nowpayments/reactor/invoice', async (req, res) => {
  if (!NOWPAYMENTS_API_KEY || !NOWPAYMENTS_IPN_SECRET) {
    return res.status(503).json({ error: 'The BNB payment gateway is not configured yet.' });
  }
  if (!Number.isFinite(REACTOR_PACKAGE_USD) || REACTOR_PACKAGE_USD <= 0) {
    return res.status(503).json({ error: 'The reactor package price is not configured.' });
  }
  const design = req.body?.design || {};
  const capacity = Number(design.capacity);
  const type = String(design.type || '');
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 5 || !['Batch', 'CSTR', 'PFR'].includes(type)) {
    return res.status(400).json({ error: 'Invalid reactor design details.' });
  }
  const orderId = `RX-${crypto.randomUUID()}`;
  try {
    const response = await axios.post('https://api.nowpayments.io/v1/invoice', {
      price_amount: REACTOR_PACKAGE_USD,
      price_currency: 'usd',
      pay_currency: NOWPAYMENTS_PAY_CURRENCY,
      order_id: orderId,
      order_description: `${capacity} ${type} reactor basic engineering package`,
      ipn_callback_url: `${PUBLIC_API_URL}/api/payments/nowpayments/ipn`,
      success_url: `${SITE_URL}/reactors?payment=return&order=${encodeURIComponent(orderId)}`,
      cancel_url: `${SITE_URL}/reactors?payment=cancelled&order=${encodeURIComponent(orderId)}`,
      is_fixed_rate: true,
      is_fee_paid_by_user: true,
    }, {
      headers: { 'x-api-key': NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
      timeout: 15_000,
    });
    if (!response.data?.invoice_url || !response.data?.id) throw new Error('NOWPayments returned an incomplete invoice.');
    await savePaymentOrder(orderId, { invoiceId: String(response.data.id), status: 'waiting' });
    return res.status(201).json({ orderId, invoiceId: String(response.data.id), invoiceUrl: response.data.invoice_url });
  } catch (error) {
    console.error('NOWPayments reactor invoice error:', error?.response?.status || error.message);
    return res.status(502).json({ error: 'Could not create the secure BNB checkout. Please try again.' });
  }
});

app.post('/api/payments/nowpayments/distillation/invoice', async (req, res) => {
  if (!NOWPAYMENTS_API_KEY || !NOWPAYMENTS_IPN_SECRET) {
    return res.status(503).json({ error: 'The BNB payment gateway is not configured yet.' });
  }
  if (!Number.isFinite(DISTILLATION_PACKAGE_USD) || DISTILLATION_PACKAGE_USD <= 0) {
    return res.status(503).json({ error: 'The distillation package price is not configured.' });
  }
  const design = req.body?.design || {};
  const feedFlow = Number(design.feedFlow);
  const system = String(design.system || '').slice(0, 80);
  if (!Number.isFinite(feedFlow) || feedFlow <= 0 || feedFlow > 5000 || !system) {
    return res.status(400).json({ error: 'Invalid distillation design details.' });
  }
  const orderId = `DS-${crypto.randomUUID()}`;
  try {
    const response = await axios.post('https://api.nowpayments.io/v1/invoice', {
      price_amount: DISTILLATION_PACKAGE_USD,
      price_currency: 'usd',
      pay_currency: NOWPAYMENTS_PAY_CURRENCY,
      order_id: orderId,
      order_description: `${system} industrial distillation basic engineering package`,
      ipn_callback_url: `${PUBLIC_API_URL}/api/payments/nowpayments/ipn`,
      success_url: `${SITE_URL}/distillation?payment=return&order=${encodeURIComponent(orderId)}`,
      cancel_url: `${SITE_URL}/distillation?payment=cancelled&order=${encodeURIComponent(orderId)}`,
      is_fixed_rate: true,
      is_fee_paid_by_user: true,
    }, {
      headers: { 'x-api-key': NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
      timeout: 15_000,
    });
    if (!response.data?.invoice_url || !response.data?.id) throw new Error('NOWPayments returned an incomplete invoice.');
    await savePaymentOrder(orderId, { invoiceId: String(response.data.id), status: 'waiting' });
    return res.status(201).json({ orderId, invoiceId: String(response.data.id), invoiceUrl: response.data.invoice_url });
  } catch (error) {
    console.error('NOWPayments distillation invoice error:', error?.response?.status || error.message);
    return res.status(502).json({ error: 'Could not create the secure BNB checkout. Please try again.' });
  }
});

app.post('/api/payments/nowpayments/process/invoice', async (req, res) => {
  if (!NOWPAYMENTS_API_KEY || !NOWPAYMENTS_IPN_SECRET) {
    return res.status(503).json({ error: 'The BNB payment gateway is not configured yet.' });
  }
  if (!Number.isFinite(PROCESS_PACKAGE_USD) || PROCESS_PACKAGE_USD <= 0) {
    return res.status(503).json({ error: 'The process simulation price is not configured.' });
  }
  const design = req.body?.design || {};
  const projectName = String(design.projectName || '').trim().slice(0, 80);
  const blockCount = Number(design.blockCount);
  if (!projectName || !Number.isInteger(blockCount) || blockCount < 1 || blockCount > 250) {
    return res.status(400).json({ error: 'Invalid process simulation details.' });
  }
  const orderId = `PD-${crypto.randomUUID()}`;
  try {
    const response = await axios.post('https://api.nowpayments.io/v1/invoice', {
      price_amount: PROCESS_PACKAGE_USD,
      price_currency: 'usd',
      pay_currency: NOWPAYMENTS_PAY_CURRENCY,
      order_id: orderId,
      order_description: `${projectName} process simulation export (${blockCount} blocks)`,
      ipn_callback_url: `${PUBLIC_API_URL}/api/payments/nowpayments/ipn`,
      success_url: `${SITE_URL}/process-design?payment=return&order=${encodeURIComponent(orderId)}`,
      cancel_url: `${SITE_URL}/process-design?payment=cancelled&order=${encodeURIComponent(orderId)}`,
      is_fixed_rate: true,
      is_fee_paid_by_user: true,
    }, {
      headers: { 'x-api-key': NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
      timeout: 15_000,
    });
    if (!response.data?.invoice_url || !response.data?.id) throw new Error('NOWPayments returned an incomplete invoice.');
    await savePaymentOrder(orderId, { invoiceId: String(response.data.id), status: 'waiting' });
    return res.status(201).json({ orderId, invoiceId: String(response.data.id), invoiceUrl: response.data.invoice_url });
  } catch (error) {
    console.error('NOWPayments process invoice error:', error?.response?.status || error.message);
    return res.status(502).json({ error: 'Could not create the secure BNB checkout. Please try again.' });
  }
});

app.get('/api/payments/nowpayments/status/:orderId', async (req, res) => {
  const orderId = String(req.params.orderId || '');
  if (!/^(CD|EV|RX|DS|PD)-[0-9a-f-]{36}$/i.test(orderId)) {
    return res.status(400).json({ error: 'Invalid payment order.' });
  }
  try {
    const order = await getPaymentOrder(orderId);
    if (!order) return res.status(404).json({ error: 'Payment order was not found or has expired.' });
    return res.json({ orderId, status: order.status });
  } catch (error) {
    console.error('Payment status storage error:', error.message);
    return res.status(503).json({ error: 'Payment verification storage is unavailable.' });
  }
});

app.post('/api/payments/nowpayments/ipn', async (req, res) => {
  const signature = req.get('x-nowpayments-sig');
  if (!validNowPaymentsSignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid payment notification signature.' });
  }
  const orderId = String(req.body?.order_id || '');
  const paymentStatus = String(req.body?.payment_status || '').toLowerCase();
  if (!/^(CD|EV|RX|DS|PD)-[0-9a-f-]{36}$/i.test(orderId)) return res.status(400).json({ error: 'Invalid order.' });

  try {
    await savePaymentOrder(orderId, {
      paymentId: req.body?.payment_id ? String(req.body.payment_id) : null,
      status: paymentStatus,
    });
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Payment notification storage error:', error.message);
    return res.status(503).json({ error: 'Payment notification could not be stored.' });
  }
});

app.use((error, _req, res, next) => {
  if (error.message === 'Origin is not allowed by CORS.') {
    return res.status(403).json({ error: 'Origin is not allowed.' });
  }
  console.error(JSON.stringify({ level:'error', message:'Unhandled API error', error:error?.message||'Unknown error' }));
  if(res.headersSent)return next(error);
  return res.status(500).json({error:'The service could not complete this request.'});
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
