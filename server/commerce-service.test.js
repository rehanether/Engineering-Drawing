const test = require('node:test');
const assert = require('node:assert/strict');
const { Interface, parseUnits } = require('ethers');
const { inspectEdgReceipt } = require('./commerce-service');

const token = '0xa90Cc0137FDA4285Eaa6da0f7a5118A1432b2a76';
const receiver = '0xD9738cc53E9746a01cAC8EF01aF17fF4e88DD25F';
const payer = '0x1111111111111111111111111111111111111111';
const iface = new Interface(['event Transfer(address indexed from, address indexed to, uint256 value)']);

function transferLog(amount = '5000', to = receiver) {
  const encoded = iface.encodeEventLog(iface.getEvent('Transfer'), [payer, to, parseUnits(amount, 18)]);
  return { address: token, topics: encoded.topics, data: encoded.data };
}

test('accepts the exact confirmed EDG transfer for a product', () => {
  const result = inspectEdgReceipt({
    receipt: { status: 1, blockNumber: 100, logs: [transferLog()] },
    transaction: { from: payer }, currentBlock: 101, productId: 'evaporator', tokenAddress: token,
    receiverAddress: receiver, expectedWallet: payer, minConfirmations: 2,
  });
  assert.equal(result.amount, '5000');
  assert.equal(result.confirmations, 2);
});

test('rejects wrong amount, receiver, sender, and unconfirmed receipts', () => {
  const base = { transaction: { from: payer }, currentBlock: 101, productId: 'evaporator', tokenAddress: token, receiverAddress: receiver, expectedWallet: payer };
  assert.throws(() => inspectEdgReceipt({ ...base, receipt: { status: 1, blockNumber: 100, logs: [transferLog('4999')] } }), /required 5000 EDG/);
  assert.throws(() => inspectEdgReceipt({ ...base, receipt: { status: 1, blockNumber: 100, logs: [transferLog('5000', '0x2222222222222222222222222222222222222222')] } }), /required 5000 EDG/);
  assert.throws(() => inspectEdgReceipt({ ...base, expectedWallet: '0x3333333333333333333333333333333333333333', receipt: { status: 1, blockNumber: 100, logs: [transferLog()] } }), /sender/);
  assert.throws(() => inspectEdgReceipt({ ...base, receipt: { status: 0, blockNumber: 100, logs: [transferLog()] } }), /not confirmed/);
});
