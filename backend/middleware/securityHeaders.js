// Headers for API responses only. The API serves JSON, never documents, so the
// CSP can deny everything. These do NOT protect the SPA: its CSP,
// frame-ancestors and Referrer-Policy must be sent by whatever serves
// index.html (Nginx/CloudFront) — see "Frontend response headers" in README.
const securityHeaders = (req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    "Referrer-Policy": "no-referrer",
  });
  next();
};

export default securityHeaders;
