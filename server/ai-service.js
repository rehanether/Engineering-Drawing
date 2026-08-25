const crypto = require('crypto');
const { generateText, jsonSchema, stepCountIs, tool } = require('ai');

const FREE_DAILY_GENERATIONS = Number(process.env.AI_FREE_DAILY_GENERATIONS || 3);
const AI_MODEL = process.env.AI_MODEL || 'openai/gpt-5.6-luna';
const AI_MAX_OUTPUT_TOKENS = Number(process.env.AI_MAX_OUTPUT_TOKENS || 2400);

const SYSTEM_INSTRUCTIONS = `You are EDG AI, a cautious multidisciplinary engineering copilot.
Create useful concept-stage engineering work while keeping facts, calculations, assumptions, and unknowns distinct.
When numerical inputs are sufficient, use the supplied calculation tools instead of mental arithmetic.
Never claim a conceptual response is a stamped, certified, construction-ready, or safety-approved design.
Structure every answer with these headings: Engineering interpretation, Design basis, Recommended route, Preliminary calculations, Deliverables, Missing inputs, Safety and professional review.
Use SI units and show assumptions. Do not invent code compliance, material compatibility, kinetics, physical properties, prices, or site conditions. If they are absent, list them as missing inputs.
Keep the answer concise enough to work as an actionable project brief.`;

const tools = {
  massBalance: tool({
    description: 'Calculate a steady-state single-solute concentration mass balance with no solute loss.',
    inputSchema: jsonSchema({
      type: 'object',
      properties: {
        feedMassFlowKgH: { type: 'number', exclusiveMinimum: 0 },
        feedSolidsMassFraction: { type: 'number', exclusiveMinimum: 0, maximum: 1 },
        productSolidsMassFraction: { type: 'number', exclusiveMinimum: 0, maximum: 1 },
      },
      required: ['feedMassFlowKgH', 'feedSolidsMassFraction', 'productSolidsMassFraction'],
      additionalProperties: false,
    }),
    execute: async ({ feedMassFlowKgH, feedSolidsMassFraction, productSolidsMassFraction }) => {
      if (productSolidsMassFraction <= feedSolidsMassFraction) {
        return { error: 'Product solids fraction must exceed feed solids fraction.' };
      }
      const solidsKgH = feedMassFlowKgH * feedSolidsMassFraction;
      const productKgH = solidsKgH / productSolidsMassFraction;
      return {
        solidsKgH,
        productKgH,
        removedLiquidKgH: feedMassFlowKgH - productKgH,
        basis: 'Steady state, one conserved non-volatile solute, no entrainment or solute loss.',
      };
    },
  }),
  lmtd: tool({
    description: 'Calculate counter-current log mean temperature difference for a heat exchanger.',
    inputSchema: jsonSchema({
      type: 'object',
      properties: {
        hotInC: { type: 'number' }, hotOutC: { type: 'number' },
        coldInC: { type: 'number' }, coldOutC: { type: 'number' },
      },
      required: ['hotInC', 'hotOutC', 'coldInC', 'coldOutC'],
      additionalProperties: false,
    }),
    execute: async ({ hotInC, hotOutC, coldInC, coldOutC }) => {
      const deltaT1 = hotInC - coldOutC;
      const deltaT2 = hotOutC - coldInC;
      if (deltaT1 <= 0 || deltaT2 <= 0) return { error: 'Temperature cross or non-positive terminal difference.' };
      const lmtdC = Math.abs(deltaT1 - deltaT2) < 1e-9
        ? deltaT1
        : (deltaT1 - deltaT2) / Math.log(deltaT1 / deltaT2);
      return { deltaT1C: deltaT1, deltaT2C: deltaT2, lmtdC, basis: 'Counter-current flow; correction factor not applied.' };
    },
  }),
  cylindricalVesselVolume: tool({
    description: 'Calculate the internal volume of a straight cylindrical vessel section.',
    inputSchema: jsonSchema({
      type: 'object',
      properties: {
        internalDiameterM: { type: 'number', exclusiveMinimum: 0 },
        straightLengthM: { type: 'number', exclusiveMinimum: 0 },
        fillFraction: { type: 'number', exclusiveMinimum: 0, maximum: 1 },
      },
      required: ['internalDiameterM', 'straightLengthM', 'fillFraction'],
      additionalProperties: false,
    }),
    execute: async ({ internalDiameterM, straightLengthM, fillFraction }) => {
      const totalVolumeM3 = Math.PI * internalDiameterM ** 2 * straightLengthM / 4;
      return {
        totalVolumeM3,
        workingVolumeM3: totalVolumeM3 * fillFraction,
        basis: 'Straight cylindrical section only; heads, internals, and nozzles excluded.',
      };
    },
  }),
};

function createAiService(sql) {
  const memoryGenerations = new Map();
  const memoryLedger = [];
  let tablesReady = false;

  async function ensureTables() {
    if (!sql || tablesReady) return;
    await sql`
      CREATE TABLE IF NOT EXISTS edg_ai_generations (
        id UUID PRIMARY KEY,
        account_id UUID NOT NULL,
        ip_hash TEXT NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT,
        model TEXT NOT NULL,
        status TEXT NOT NULL,
        charge_type TEXT NOT NULL,
        input_tokens INTEGER,
        output_tokens INTEGER,
        total_tokens INTEGER,
        error_code TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS edg_ai_generations_account_created_idx ON edg_ai_generations (account_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS edg_ai_generations_ip_created_idx ON edg_ai_generations (ip_hash, created_at DESC)`;
    await sql`
      CREATE TABLE IF NOT EXISTS edg_ai_credit_ledger (
        id UUID PRIMARY KEY,
        account_id UUID NOT NULL,
        delta INTEGER NOT NULL,
        reason TEXT NOT NULL,
        reference_id TEXT UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS edg_ai_payment_orders (
        order_id TEXT PRIMARY KEY,
        account_id UUID NOT NULL,
        credits INTEGER NOT NULL,
        invoice_id TEXT,
        payment_id TEXT,
        status TEXT NOT NULL,
        credited_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    tablesReady = true;
  }

  function validAccountId(accountId) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(accountId || '');
  }

  function hashIp(ip) {
    const salt = process.env.AI_USAGE_SALT || process.env.NOWPAYMENTS_IPN_SECRET || 'edg-local-development';
    return crypto.createHmac('sha256', salt).update(String(ip || 'unknown')).digest('hex');
  }

  async function usage(accountId, ipHash) {
    if (!sql) {
      const today = new Date().toISOString().slice(0, 10);
      const freeUsed = [...memoryGenerations.values()].filter((item) =>
        item.ipHash === ipHash && item.chargeType === 'free' && item.createdAt.startsWith(today) && item.status !== 'failed'
      ).length;
      const paidCredits = memoryLedger.filter((item) => item.accountId === accountId).reduce((sum, item) => sum + item.delta, 0);
      return { freeLimit: FREE_DAILY_GENERATIONS, freeRemaining: Math.max(0, FREE_DAILY_GENERATIONS - freeUsed), paidCredits };
    }
    await ensureTables();
    const [freeRows, creditRows] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM edg_ai_generations WHERE ip_hash = ${ipHash} AND charge_type = 'free' AND status <> 'failed' AND created_at >= date_trunc('day', NOW())`,
      sql`SELECT COALESCE(SUM(delta), 0)::int AS balance FROM edg_ai_credit_ledger WHERE account_id = ${accountId}`,
    ]);
    const freeUsed = Number(freeRows[0]?.count || 0);
    return { freeLimit: FREE_DAILY_GENERATIONS, freeRemaining: Math.max(0, FREE_DAILY_GENERATIONS - freeUsed), paidCredits: Number(creditRows[0]?.balance || 0) };
  }

  async function createGeneration({ accountId, ip, prompt }) {
    if (!validAccountId(accountId)) {
      const error = new Error('A valid EDG account identifier is required.');
      error.status = 400;
      throw error;
    }
    if (!prompt || prompt.length > 6000) {
      const error = new Error('Enter an engineering request between 1 and 6,000 characters.');
      error.status = 400;
      throw error;
    }
    if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN && !process.env.VERCEL) {
      const error = new Error('EDG AI is not configured yet. Add AI_GATEWAY_API_KEY or enable Vercel OIDC.');
      error.status = 503;
      error.code = 'AI_NOT_CONFIGURED';
      throw error;
    }

    const ipHash = hashIp(ip);
    const currentUsage = await usage(accountId, ipHash);
    const chargeType = currentUsage.freeRemaining > 0 ? 'free' : currentUsage.paidCredits > 0 ? 'credit' : null;
    if (!chargeType) {
      const error = new Error('Daily free generations are used. Add an AI credit pack to continue.');
      error.status = 402;
      error.code = 'CREDITS_REQUIRED';
      error.usage = currentUsage;
      throw error;
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const generation = { id, accountId, ipHash, prompt, model: AI_MODEL, status: 'started', chargeType, createdAt };
    if (!sql) memoryGenerations.set(id, generation);
    else {
      await ensureTables();
      await sql`INSERT INTO edg_ai_generations (id, account_id, ip_hash, prompt, model, status, charge_type) VALUES (${id}, ${accountId}, ${ipHash}, ${prompt}, ${AI_MODEL}, 'started', ${chargeType})`;
    }

    if (chargeType === 'credit') await addCredits(accountId, -1, 'generation', `generation:${id}`);

    try {
      const result = await generateText({
        model: AI_MODEL,
        system: SYSTEM_INSTRUCTIONS,
        prompt,
        tools,
        stopWhen: stepCountIs(4),
        maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
        maxRetries: 2,
      });
      const response = result.text.trim();
      const completedAt = new Date().toISOString();
      const tokenUsage = {
        inputTokens: result.usage?.inputTokens || 0,
        outputTokens: result.usage?.outputTokens || 0,
        totalTokens: result.usage?.totalTokens || 0,
      };
      if (!sql) memoryGenerations.set(id, { ...generation, response, status: 'completed', completedAt, ...tokenUsage });
      else await sql`
        UPDATE edg_ai_generations SET response = ${response}, status = 'completed', input_tokens = ${tokenUsage.inputTokens}, output_tokens = ${tokenUsage.outputTokens}, total_tokens = ${tokenUsage.totalTokens}, completed_at = NOW() WHERE id = ${id}
      `;
      return { id, response, model: AI_MODEL, usage: tokenUsage, entitlement: await usage(accountId, ipHash) };
    } catch (providerError) {
      const errorCode = providerError?.name || 'AI_PROVIDER_ERROR';
      if (!sql) memoryGenerations.set(id, { ...generation, status: 'failed', errorCode });
      else await sql`UPDATE edg_ai_generations SET status = 'failed', error_code = ${errorCode}, completed_at = NOW() WHERE id = ${id}`;
      if (chargeType === 'credit') await addCredits(accountId, 1, 'generation_refund', `refund:${id}`);
      const error = new Error('The engineering model could not complete this request. No paid credit was consumed.');
      error.status = 502;
      error.code = 'AI_PROVIDER_ERROR';
      throw error;
    }
  }

  async function addCredits(accountId, delta, reason, referenceId) {
    if (!sql) {
      if (memoryLedger.some((item) => item.referenceId === referenceId)) return false;
      memoryLedger.push({ id: crypto.randomUUID(), accountId, delta, reason, referenceId });
      return true;
    }
    await ensureTables();
    const rows = await sql`
      INSERT INTO edg_ai_credit_ledger (id, account_id, delta, reason, reference_id)
      VALUES (${crypto.randomUUID()}, ${accountId}, ${delta}, ${reason}, ${referenceId})
      ON CONFLICT (reference_id) DO NOTHING RETURNING id
    `;
    return rows.length > 0;
  }

  async function savePaymentOrder({ orderId, accountId, credits, invoiceId, status = 'waiting' }) {
    if (!validAccountId(accountId)) throw new Error('Invalid account identifier.');
    if (!sql) {
      memoryGenerations.set(`payment:${orderId}`, { orderId, accountId, credits, invoiceId, status });
      return;
    }
    await ensureTables();
    await sql`
      INSERT INTO edg_ai_payment_orders (order_id, account_id, credits, invoice_id, status)
      VALUES (${orderId}, ${accountId}, ${credits}, ${invoiceId}, ${status})
      ON CONFLICT (order_id) DO UPDATE SET invoice_id = EXCLUDED.invoice_id, status = EXCLUDED.status, updated_at = NOW()
    `;
  }

  async function applyPayment({ orderId, paymentId, status }) {
    const paid = ['confirmed', 'finished'].includes(status);
    if (!sql) {
      const key = `payment:${orderId}`;
      const order = memoryGenerations.get(key);
      if (!order) return false;
      memoryGenerations.set(key, { ...order, paymentId, status });
      if (paid) await addCredits(order.accountId, order.credits, 'ai_credit_purchase', `payment:${orderId}`);
      return true;
    }
    await ensureTables();
    const rows = await sql`
      UPDATE edg_ai_payment_orders SET payment_id = ${paymentId}, status = ${status}, updated_at = NOW(), credited_at = CASE WHEN ${paid} THEN COALESCE(credited_at, NOW()) ELSE credited_at END
      WHERE order_id = ${orderId} RETURNING account_id, credits
    `;
    if (!rows[0]) return false;
    if (paid) await addCredits(String(rows[0].account_id), Number(rows[0].credits), 'ai_credit_purchase', `payment:${orderId}`);
    return true;
  }

  async function getPaymentOrder(orderId) {
    if (!sql) return memoryGenerations.get(`payment:${orderId}`) || null;
    await ensureTables();
    const rows = await sql`SELECT order_id, account_id, credits, status, created_at, updated_at FROM edg_ai_payment_orders WHERE order_id = ${orderId} LIMIT 1`;
    return rows[0] || null;
  }

  return { applyPayment, createGeneration, getPaymentOrder, hashIp, savePaymentOrder, usage, validAccountId };
}

module.exports = { createAiService, FREE_DAILY_GENERATIONS, AI_MODEL };
