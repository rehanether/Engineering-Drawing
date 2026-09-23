function allowedOriginsFor(env = process.env) {
  const production = env.VERCEL_ENV === 'production' || env.NODE_ENV === 'production';
  const defaults = ['https://www.engineeringdrawing.io', 'https://engineeringdrawing.io'];
  if (!production) defaults.push('http://localhost:3000', 'http://localhost:4176');
  const origins = env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : defaults;
  return new Set(origins.map((value) => value.trim()).filter((value) => {
    try {
      const url = new URL(value);
      return url.origin === value && !url.username && !url.password &&
        (production ? url.protocol === 'https:' : ['http:', 'https:'].includes(url.protocol));
    } catch { return false; }
  }));
}

function privateApiResponse(_req, res, next) {
  res.set('Cache-Control', 'private, no-store');
  res.set('CDN-Cache-Control', 'no-store');
  res.set('Vercel-CDN-Cache-Control', 'no-store');
  next();
}

function apiMethodGuard(req, res, next) {
  if (['GET', 'POST', 'OPTIONS'].includes(req.method)) return next();
  res.set('Allow', 'GET, POST, OPTIONS');
  return res.status(405).json({ error: 'This API only accepts GET and POST requests.' });
}

function jsonRequestGuard(req, res, next) {
  if (req.method !== 'POST' || ['/payments/nowpayments/ipn', '/payments/binance-pay/webhook'].includes(req.path)) return next();
  if (req.is(['application/json', 'application/*+json'])) return next();
  return res.status(415).json({ error: 'POST requests must use application/json.' });
}

function apiErrorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body must be valid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body exceeds the 16 KB limit.' });
  if (error.type === 'encoding.unsupported' || error.type === 'charset.unsupported') return res.status(415).json({ error: 'Unsupported request encoding.' });
  if (error.message === 'Origin is not allowed by CORS.') return res.status(403).json({ error: 'Origin is not allowed.' });
  // Do not put raw request bodies, credentials or provider messages in logs.
  console.error(JSON.stringify({ level: 'error', message: 'Unhandled API error', type: error.name || 'Error' }));
  return res.status(500).json({ error: 'The service could not complete this request.' });
}

module.exports = { allowedOriginsFor, privateApiResponse, apiMethodGuard, jsonRequestGuard, apiErrorHandler };
