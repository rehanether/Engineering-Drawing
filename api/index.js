const app = require('../server/index');

module.exports = (req, res) => {
  const forwardedPath = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
  if (forwardedPath) {
    const query = new URLSearchParams(req.query);
    query.delete('path');
    const suffix = query.toString();
    req.url = `/api/${forwardedPath}${suffix ? `?${suffix}` : ''}`;
  }
  return app(req, res);
};
