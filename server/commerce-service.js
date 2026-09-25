const { Interface, getAddress, parseUnits } = require('ethers');

const TRANSFER_INTERFACE = new Interface([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

const PRODUCTS = Object.freeze({
  construction: { edgAmount: '100', title: 'Construction design professional package' },
  evaporator: { edgAmount: '5000', title: 'MVR evaporator basic engineering package' },
  reactor: { edgAmount: '5000', title: 'Reactor basic engineering package' },
  distillation: { edgAmount: '5000', title: 'Distillation basic engineering package' },
  process: { edgAmount: '500', title: 'Process simulation export package' },
});

function commerceProduct(productId) {
  return PRODUCTS[String(productId || '').trim().toLowerCase()] || null;
}

function inspectEdgReceipt({ receipt, transaction, currentBlock, productId, tokenAddress, receiverAddress, expectedWallet, minConfirmations = 1 }) {
  const product = commerceProduct(productId);
  if (!product) throw new Error('Unknown product.');
  if (!receipt || Number(receipt.status) !== 1 || !transaction) throw new Error('The transaction is not confirmed.');
  const confirmations = Number(currentBlock) - Number(receipt.blockNumber) + 1;
  if (!Number.isFinite(confirmations) || confirmations < minConfirmations) throw new Error('The transaction needs more confirmations.');
  const token = getAddress(tokenAddress);
  const receiver = getAddress(receiverAddress);
  const payer = getAddress(transaction.from);
  if (expectedWallet && getAddress(expectedWallet) !== payer) throw new Error('The transaction sender does not match the connected wallet.');
  const required = parseUnits(product.edgAmount, 18);
  const transfer = (receipt.logs || []).find((log) => {
    if (!log?.address || getAddress(log.address) !== token) return false;
    try {
      const parsed = TRANSFER_INTERFACE.parseLog(log);
      return parsed?.name === 'Transfer' && getAddress(parsed.args.from) === payer && getAddress(parsed.args.to) === receiver && parsed.args.value === required;
    } catch {
      return false;
    }
  });
  if (!transfer) throw new Error(`This transaction does not contain the required ${product.edgAmount} EDG product payment.`);
  return { payer, receiver, token, amount: product.edgAmount, confirmations, blockNumber: Number(receipt.blockNumber) };
}

function createCommerceService(sql, options) {
  const { provider, tokenAddress, receiverAddress, minConfirmations = 1 } = options;
  let tableReady = false;

  async function ensureTable() {
    if (!sql) throw new Error('Persistent purchase storage is required.');
    if (tableReady) return;
    await sql`
      CREATE TABLE IF NOT EXISTS edg_product_purchases (
        id UUID PRIMARY KEY,
        product_id TEXT NOT NULL,
        payment_provider TEXT NOT NULL,
        provider_reference TEXT NOT NULL UNIQUE,
        payer_address TEXT,
        receiver_address TEXT,
        token_address TEXT,
        amount NUMERIC(36, 18) NOT NULL,
        currency TEXT NOT NULL,
        chain_id INTEGER,
        block_number BIGINT,
        clerk_user_id TEXT,
        status TEXT NOT NULL,
        verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS edg_product_purchases_product_payer_idx ON edg_product_purchases(product_id, payer_address)`;
    tableReady = true;
  }

  async function verifyEdgPurchase({ productId, txHash, expectedWallet = '', clerkUserId = '' }) {
    if (!/^0x[0-9a-f]{64}$/i.test(String(txHash || ''))) throw new Error('A valid BNB Smart Chain transaction hash is required.');
    if (!commerceProduct(productId)) throw new Error('Unknown product.');
    await ensureTable();
    const [receipt, transaction, currentBlock] = await Promise.all([
      provider.getTransactionReceipt(txHash), provider.getTransaction(txHash), provider.getBlockNumber(),
    ]);
    const verified = inspectEdgReceipt({ receipt, transaction, currentBlock, productId, tokenAddress, receiverAddress, expectedWallet, minConfirmations });
    const id = require('crypto').randomUUID();
    const rows = await sql`
      INSERT INTO edg_product_purchases (
        id, product_id, payment_provider, provider_reference, payer_address, receiver_address,
        token_address, amount, currency, chain_id, block_number, clerk_user_id, status
      ) VALUES (
        ${id}, ${productId}, 'edg_bsc', ${txHash.toLowerCase()}, ${verified.payer.toLowerCase()},
        ${verified.receiver.toLowerCase()}, ${verified.token.toLowerCase()}, ${verified.amount}, 'EDG', 56,
        ${verified.blockNumber}, ${clerkUserId || null}, 'confirmed'
      )
      ON CONFLICT (provider_reference) DO NOTHING
      RETURNING *
    `;
    if (rows[0]) return rows[0];
    const existing = await sql`SELECT * FROM edg_product_purchases WHERE provider_reference = ${txHash.toLowerCase()} LIMIT 1`;
    if (!existing[0] || existing[0].product_id !== productId || existing[0].payer_address !== verified.payer.toLowerCase()) {
      throw new Error('This blockchain transaction has already been used for another purchase.');
    }
    return existing[0];
  }

  async function entitlement({ productId, walletAddress = '', clerkUserId = '' }) {
    if (!commerceProduct(productId)) throw new Error('Unknown product.');
    await ensureTable();
    const wallet = walletAddress ? getAddress(walletAddress).toLowerCase() : '';
    const rows = wallet
      ? await sql`SELECT * FROM edg_product_purchases WHERE product_id = ${productId} AND payer_address = ${wallet} AND status = 'confirmed' ORDER BY verified_at DESC LIMIT 1`
      : clerkUserId
        ? await sql`SELECT * FROM edg_product_purchases WHERE product_id = ${productId} AND clerk_user_id = ${clerkUserId} AND status = 'confirmed' ORDER BY verified_at DESC LIMIT 1`
        : [];
    return rows[0] || null;
  }

  async function recordProviderPurchase({ productId, providerName, reference, amount, currency, clerkUserId = '' }) {
    if (!commerceProduct(productId)) throw new Error('Unknown product.');
    if (!/^[a-z0-9_-]{2,40}$/i.test(providerName) || !reference) throw new Error('Invalid payment reference.');
    await ensureTable();
    const id = require('crypto').randomUUID();
    const rows = await sql`
      INSERT INTO edg_product_purchases (
        id, product_id, payment_provider, provider_reference, amount, currency, clerk_user_id, status
      ) VALUES (
        ${id}, ${productId}, ${providerName}, ${String(reference)}, ${String(amount)}, ${String(currency)},
        ${clerkUserId || null}, 'confirmed'
      )
      ON CONFLICT (provider_reference) DO NOTHING
      RETURNING *
    `;
    if (rows[0]) return rows[0];
    const existing = await sql`SELECT * FROM edg_product_purchases WHERE provider_reference = ${String(reference)} LIMIT 1`;
    if (!existing[0] || existing[0].product_id !== productId) throw new Error('Payment reference conflict.');
    return existing[0];
  }

  return { entitlement, ensureTable, recordProviderPurchase, verifyEdgPurchase };
}

module.exports = { PRODUCTS, commerceProduct, createCommerceService, inspectEdgReceipt };
