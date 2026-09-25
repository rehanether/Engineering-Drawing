describe('EDG wallet mobile fast path', () => {
  const account = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    delete window.ethereum;
  });

  test('reuses an injected MetaMask session without loading the connector or requesting accounts again', async () => {
    const request = jest.fn(async ({ method }) => {
      if (method === 'eth_accounts') return [account];
      if (method === 'eth_chainId') return '0x38';
      throw new Error(`Unexpected method: ${method}`);
    });
    window.ethereum = { isMetaMask: true, request, on: jest.fn() };

    const { connectEdgWallet } = require('./edgWallet');
    const result = await connectEdgWallet();

    expect(result.account).toBe(account);
    expect(result.client).toBeNull();
    expect(request).toHaveBeenCalledWith({ method: 'eth_accounts' });
    expect(request).not.toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
  });

  test('deduplicates simultaneous connect taps', async () => {
    const request = jest.fn(async ({ method }) => {
      if (method === 'eth_accounts') return [account];
      if (method === 'eth_chainId') return '0x38';
      throw new Error(`Unexpected method: ${method}`);
    });
    window.ethereum = { isMetaMask: true, request, on: jest.fn() };

    const { connectEdgWallet } = require('./edgWallet');
    const [first, second] = await Promise.all([connectEdgWallet(), connectEdgWallet()]);

    expect(first.account).toBe(account);
    expect(second.account).toBe(account);
    expect(request.mock.calls.filter(([input]) => input.method === 'eth_accounts')).toHaveLength(1);
  });
});
