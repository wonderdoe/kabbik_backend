require('dotenv').config();

const DEFAULT_KABBIK_BACKEND_API = 'https://api.kabbik.com';

const normalizeBaseUrl = (url) => String(url).replace(/\/$/, '');

const KABBIK_BACKEND_API = normalizeBaseUrl(
  process.env.KABBIK_BACKEND_API || DEFAULT_KABBIK_BACKEND_API
);

const backendPath = (path) =>
  `${KABBIK_BACKEND_API}${path.startsWith('/') ? path : `/${path}`}`;

const rewriteBackendApiUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  try {
    const { pathname, search } = new URL(url);
    return `${KABBIK_BACKEND_API}${pathname}${search}`;
  } catch {
    return url;
  }
};

module.exports = {
  KABBIK_BACKEND_API,
  rewriteBackendApiUrl,
  MERCHENT_CALLBACK_URL: backendPath('/v4/nagad/nagad-redirect'),
  UPAY_PAYMENT_CALLBACK_URL: backendPath('/v4/upay/upay-redirect'),
  ROBI_CALLBACK_URL: backendPath('/v4/robi/robi-redirect'),
  URL_REDIRECT_BKASH_ONETIME: backendPath('/v3/bkash/bkash-onetime-callback'),
  URL_REDIRECT_BKASH_ONETIME_Audiobook_Purchase: backendPath(
    '/v3/bkash/bkash-onetime-audiobook-purchase-callback'
  ),
  URL_REDIRECT_BKASH_ONETIME_COURSE_PURCHASE: backendPath(
    '/v3/bkash/bkash-onetime-course-purchase-callback'
  ),
  URL_BKASH_REDIRECT: backendPath('/v3/bkash/bkash-redirect'),
  URL_BKASH_REDIRECT_BKASHAPP: backendPath('/v3/bkash/bkash-redirect-bkashapp'),
  URL_BKASH_REDIRECT_MC: backendPath('/v3/bkash/bkash-redirect-mc'),
  URL_BKASH_REDIRECT_BKASH_MICROSITE: backendPath(
    '/v3/bkash/bkash-redirect-bkash-microsite'
  ),
  URL_BKASH_ONETIME_CALLBACK_BKASH_MICROSITE: backendPath(
    '/v3/bkash/bkash-onetime-callback-bkash-microsite'
  ),
  AMRPAY_REDIRECT_URL: backendPath('/v4/amrpay/redirect-url-amrpay'),
  STRIPE_REDIRECT_URL: backendPath('/v4/stripe/redirect-url-stripe'),
};
