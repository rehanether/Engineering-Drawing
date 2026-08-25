const test = require('node:test');
const assert = require('node:assert/strict');
const { createAiService, renderBrief, renderCalculation } = require('./ai-service');

const accountId = '0f4bbd9f-1c52-4efb-9d51-c55ad62d5a17';

test('validates version 4 account identifiers', () => {
  const service = createAiService(null);
  assert.equal(service.validAccountId(accountId), true);
  assert.equal(service.validAccountId('not-an-account'), false);
});

test('reports free allowance and grants purchased credits idempotently', async () => {
  const service = createAiService(null);
  const ipHash = service.hashIp('127.0.0.1');
  assert.deepEqual(await service.usage(accountId, ipHash), { freeLimit: 3, freeRemaining: 3, paidCredits: 0 });

  const orderId = 'AI-0f4bbd9f-1c52-4efb-9d51-c55ad62d5a17';
  await service.savePaymentOrder({ orderId, accountId, credits: 100, invoiceId: 'invoice-1' });
  await service.applyPayment({ orderId, paymentId: 'payment-1', status: 'finished' });
  await service.applyPayment({ orderId, paymentId: 'payment-1', status: 'finished' });
  assert.equal((await service.usage(accountId, ipHash)).paidCredits, 100);
});

test('fails safely when no server-side model credential is configured', async () => {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY;
  const oidcToken = process.env.VERCEL_OIDC_TOKEN;
  const vercelRuntime = process.env.VERCEL;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.VERCEL_OIDC_TOKEN;
  delete process.env.VERCEL;
  const service = createAiService(null);
  await assert.rejects(
    service.createGeneration({ accountId, ip: '127.0.0.1', prompt: 'Design an evaporator.' }),
    (error) => error.status === 503 && error.code === 'AI_NOT_CONFIGURED'
  );
  if (gatewayKey) process.env.AI_GATEWAY_API_KEY = gatewayKey;
  if (oidcToken) process.env.VERCEL_OIDC_TOKEN = oidcToken;
  if (vercelRuntime) process.env.VERCEL = vercelRuntime;
});

test('renders a dimensionally consistent verified concentration balance', () => {
  const result = renderCalculation({
    type: 'mass_balance',
    feedMassFlow: 5000,
    flowUnit: 'kg/day',
    feedSolidsMassFraction: 0.05,
    productSolidsMassFraction: 0.35,
  });
  assert.match(result, /Conserved solids: 250 kg\/day/);
  assert.match(result, /Concentrate: 714\.286 kg\/day/);
  assert.match(result, /Removed liquid: 4,285\.714 kg\/day/);
  assert.doesNotMatch(result, /17,143|102,857/);
});

test('assembles the engineering brief with fixed safety sections', () => {
  const response = renderBrief({
    interpretation: 'Concept-stage evaporator request.',
    designBasis: ['Feed basis supplied by user.'],
    route: ['Confirm properties', 'Run thermal design'],
    calculationRequests: [],
    deliverables: ['Mass balance'],
    missingInputs: ['Boiling-point elevation'],
    safetyReview: ['Qualified process review required.'],
  });
  for (const heading of ['Engineering interpretation', 'Preliminary calculations', 'Missing inputs', 'Safety and professional review']) {
    assert.match(response, new RegExp(heading));
  }
});
