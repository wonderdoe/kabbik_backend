const paymentUrls = require('./payment-urls');

module.exports = Object.freeze({
  PORT: 8080,
  API: "/api",
  VERSION_1: "/v1",
  VERSION_2: "/v2",
  VERSION_3: "/v3",
  VERSION_4: "/v4",
  BAD_REQ: "Bad request",
  UNAUTH_REQ: "Unauthorized",
  NOT_FOUND: "Not found",
  INTERNAL_SERVER_ERROR: "Internal server error",
  UPDATE_FAILED: "Update failed",
  GENERIC_ERROR: "An error occurred",
  COM_KABBIK: "com.kabbik",
  SECRET_JWT_ADMIN: "kabbik_crm_2024_jwt",
  KABBIK_BACKEND_API: paymentUrls.KABBIK_BACKEND_API,
  KABBIK_FRONTEND_URL: "https://kabbik.com",
  FB_BASE_URL: "https://graph.facebook.com",
  //SHURJO_BASE_URL: 'https://sandbox.shurjopayment.com/api',
  SHURJO_BASE_URL: "https://engine.shurjopayment.com/api",
  SMS_API_BASE_IP: "66.45.237.70",
  SMS_API_ID: "8IQ3HNF6SJ",
  SMS_API_USER_NAME: "01784464747",
  SMS_API_PASS: "Wonder@987",
  ROOT_PATH: "./",
  GOOGLE: "google",
  FACEBOOK: "facebook",
  PHONE: "phone",
  MAX_DEVICE_LIMIT: 2,
  EXTERNAL_TOKEN:
    "de3f20f29aa553d717528e289655ee0ee18b8d2575e60a6b68717000eedd118702e1750ec23123a18b2f4b7e597967d21a33",
  HTTP_200: 200, // ok
  HTTP_201: 201, // created
  HTTP_400: 400, // bad req
  HTTP_422: 422, // unprocessable entity
  HTTP_406: 406, // bad req
  HTTP_401: 401, // Unauthorized
  HTTP_404: 404,
  HTTP_500: 500,
  HTTP_498: 498,
  SMS_SENDER_ID: 820,
  REDIS_KEY_MAXAGE: 28 * 24 * 3600,
  LOG_INTERVAL: 10 * 1000,
  //shurjopay
  SANDBOX_USERNAME: "sp_sandbox",
  SANDBOX_PASSWORD: "pyyk97hu&6u6",
  SP_USERNAME: "wondersoftsolution",
  SP_PASSWORD: "wondxwherq27zz2w",
  SP_ORDER_PREFIX: "WON",
  STORE_ID: 33,
  RETURN_URL: "https://kabbik.com/paymentSuccess",
  CANCEL_URL: "https://kabbik.com/paymentFailure",

  MYBL_RETURN_URL: "https://mybl.kabbik.com/paymentSuccess",
  MYBL_CANCEL_URL: "https://mybl.kabbik.com/paymentFailure",

  MERCHANT_ID: "689632224125331",
  ACCOUNT_NUMBER: "01963222412",
  CURRENCY_CODE: "050",
  // PUBLIC_KEY: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjBH1pFNSSRKPuMcNxmU5jZ1x8K9LPFM4XSu11m7uCfLUSE4SEjL30w3ockFvwAcuJffCUwtSpbjr34cSTD7EFG1Jqk9Gg0fQCKvPaU54jjMJoP2toR9fGmQV7y9fz31UVxSk97AqWZZLJBT2lmv76AgpVV0k0xtb/0VIv8pd/j6TIz9SFfsTQOugHkhyRzzhvZisiKzOAAWNX8RMpG+iqQi4p9W9VrmmiCfFDmLFnMrwhncnMsvlXB8QSJCq2irrx3HG0SJJCbS5+atz+E1iqO8QaPJ05snxv82Mf4NlZ4gZK0Pq/VvJ20lSkR+0nk+s/v3BgIyle78wjZP1vWLU4wIDAQAB',
  PRIVATE_KEY:
    "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCJakyLqojWTDAVUdNJLvuXhROV+LXymqnukBrmiWwTYnJYm9r5cKHj1hYQRhU5eiy6NmFVJqJtwpxyyDSCWSoSmIQMoO2KjYyB5cDajRF45v1GmSeyiIn0hl55qM8ohJGjXQVPfXiqEB5c5REJ8Toy83gzGE3ApmLipoegnwMkewsTNDbe5xZdxN1qfKiRiCL720FtQfIwPDp9ZqbG2OQbdyZUB8I08irKJ0x/psM4SjXasglHBK5G1DX7BmwcB/PRbC0cHYy3pXDmLI8pZl1NehLzbav0Y4fP4MdnpQnfzZJdpaGVE0oI15lq+KZ0tbllNcS+/4MSwW+afvOw9bazAgMBAAECggEAIkenUsw3GKam9BqWh9I1p0Xmbeo+kYftznqai1pK4McVWW9//+wOJsU4edTR5KXK1KVOQKzDpnf/CU9SchYGPd9YScI3n/HR1HHZW2wHqM6O7na0hYA0UhDXLqhjDWuM3WEOOxdE67/bozbtujo4V4+PM8fjVaTsVDhQ60vfv9CnJJ7dLnhqcoovidOwZTHwG+pQtAwbX0ICgKSrc0elv8ZtfwlEvgIrtSiLAO1/CAf+uReUXyBCZhS4Xl7LroKZGiZ80/JE5mc67V/yImVKHBe0aZwgDHgtHh63/50/cAyuUfKyreAH0VLEwy54UCGramPQqYlIReMEbi6U4GC5AQKBgQDfDnHCH1rBvBWfkxPivl/yNKmENBkVikGWBwHNA3wVQ+xZ1Oqmjw3zuHY0xOH0GtK8l3Jy5dRL4DYlwB1qgd/Cxh0mmOv7/C3SviRk7W6FKqdpJLyaE/bqI9AmRCZBpX2PMje6Mm8QHp6+1QpPnN/SenOvoQg/WWYM1DNXUJsfMwKBgQCdtddE7A5IBvgZX2o9vTLZY/3KVuHgJm9dQNbfvtXw+IQfwssPqjrvoU6hPBWHbCZl6FCl2tRh/QfYR/N7H2PvRFfbbeWHw9+xwFP1pdgMug4cTAt4rkRJRLjEnZCNvSMVHrri+fAgpv296nOhwmY/qw5Smi9rMkRY6BoNCiEKgQKBgAaRnFQFLF0MNu7OHAXPaW/ukRdtmVeDDM9oQWtSMPNHXsx+crKY/+YvhnujWKwhphcbtqkfj5L0dWPDNpqOXJKV1wHt+vUexhKwus2mGF0flnKIPG2lLN5UU6rs0tuYDgyLhAyds5ub6zzfdUBG9Gh0ZrfDXETRUyoJjcGChC71AoGAfmSciL0SWQFU1qjUcXRvCzCK1h25WrYS7E6pppm/xia1ZOrtaLmKEEBbzvZjXqv7PhLoh3OQYJO0NM69QMCQi9JfAxnZKWx+m2tDHozyUIjQBDehve8UBRBRcCnDDwU015lQN9YNb23Fz+3VDB/LaF1D1kmBlUys3//r2OV0Q4ECgYBnpo6ZFmrHvV9IMIGjP7XIlVa1uiMCt41FVyINB9SJnamGGauW/pyENvEVh+ueuthSg37e/l0Xu0nm/XGqyKCqkAfBbL2Uj/j5FyDFrpF27PkANDo99CdqL5A4NQzZ69QRlCQ4wnNCq6GsYy2WEJyU2D+K8EBSQcwLsrI7QL7fvQ==",

  NAGAD_BASE_URL: "http://sandbox.mynagad.com:10080",

  NAGAD_CREATE_PAYMENT: "https://api.mynagad.com/api/dfs/check-out/initialize",

  NAGAD_COMPLETE_PAYMENT: "https://api.mynagad.com/api/dfs/check-out/complete",

  NAGAD_VERIFY_PAYMENT: "https://api.mynagad.com/api/dfs/verify/payment",

  MERCHENT_CALLBACK_URL: paymentUrls.MERCHENT_CALLBACK_URL,

  USERNAME_BKASH_ONETIME: "01974422993",
  PASSWORD_BKASH_ONETIME: "qRzd)[6?hAe",
  APPKEY_BKASH_ONETIME: "70AalQwa54vlq2GmpN716yV7tc",
  APP_SECRET_BKASH_ONETIME:
    "fqdpwGrf1mJcfBD8jwDOV8hLFox1pzYO7THJ6I5qj5XwAbsi6EKV",
  // URL_GRANT_TOKEN_BKASH_ONETIME:
  //   "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant",
  // URL_CREATE_PAYMENT_BKASH_ONETIME:
  //   "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/create",
  // URL_EXECUTE_PAYMENT_BKASH_ONETIME:
  //   "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/execute",
  // URL_PAYMENT_STATUS_BKASH_ONETIME:
  //   "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/payment/status",
  // URL_REDIRECT_BKASH_ONETIME:
  //   "https://api.kabbik.com/v3/bkash/bkash-onetime-callback",

  URL_GRANT_TOKEN_BKASH_ONETIME: "https://tokenized.pay.bka.sh/v2/tokenized-checkout/auth/grant-token",
    // "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant",
  URL_CREATE_PAYMENT_BKASH_ONETIME: "https://tokenized.pay.bka.sh/v2/tokenized-checkout/payment/create",
    // "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/create",
  URL_EXECUTE_PAYMENT_BKASH_ONETIME: "https://tokenized.pay.bka.sh/v2/tokenized-checkout/payment/execute",
    // "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/execute",
  URL_PAYMENT_STATUS_BKASH_ONETIME: "https://tokenized.pay.bka.sh/v2/tokenized-checkout/refund/payment/status",
    // "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/payment/status",
  URL_REDIRECT_BKASH_ONETIME: paymentUrls.URL_REDIRECT_BKASH_ONETIME,
  URL_REDIRECT_BKASH_ONETIME_Audiobook_Purchase:
    paymentUrls.URL_REDIRECT_BKASH_ONETIME_Audiobook_Purchase,
  URL_REDIRECT_BKASH_ONETIME_COURSE_PURCHASE:
    paymentUrls.URL_REDIRECT_BKASH_ONETIME_COURSE_PURCHASE,
  URL_BKASH_REDIRECT: paymentUrls.URL_BKASH_REDIRECT,
  URL_BKASH_REDIRECT_BKASHAPP: paymentUrls.URL_BKASH_REDIRECT_BKASHAPP,
  URL_BKASH_REDIRECT_MC: paymentUrls.URL_BKASH_REDIRECT_MC,
  URL_BKASH_REDIRECT_BKASH_MICROSITE: paymentUrls.URL_BKASH_REDIRECT_BKASH_MICROSITE,
  URL_BKASH_ONETIME_CALLBACK_BKASH_MICROSITE:
    paymentUrls.URL_BKASH_ONETIME_CALLBACK_BKASH_MICROSITE,
  AMRPAY_REDIRECT_URL: paymentUrls.AMRPAY_REDIRECT_URL,
  STRIPE_REDIRECT_URL: paymentUrls.STRIPE_REDIRECT_URL,

  //Amrpay sandbox
  // AMRPAY_PRODUCTIONURL: "https://sandbox.aamarpay.com/jsonpost.php",
  // AMRPAY_STORE_ID_PRODUCTION: "aamarpaytest",
  // AMRPAY_SINGATURE_KEY_PRODUCTION: "dbb74894e82415a2f7ff0ec3a97e4183",

  //production
  AMRPAY_PRODUCTIONURL: "https://secure.aamarpay.com/jsonpost.php",
  AMRPAY_STORE_ID_PRODUCTION: "kabbik",
  AMRPAY_SINGATURE_KEY_PRODUCTION: "cfafddc6f48c6f1fa924de40d9050b14",

  // USERNAME_BKASH_ONETIME: "01974422993",
  // PASSWORD_BKASH_ONETIME: "qRzd)[6?hAe",
  // APPKEY_BKASH_ONETIME: "70AalQwa54vlq2GmpN716yV7tc",
  // APP_SECRET_BKASH_ONETIME:
  //   "fqdpwGrf1mJcfBD8jwDOV8hLFox1pzYO7THJ6I5qj5XwAbsi6EKV",

  // URL_GRANT_TOKEN_BKASH_ONETIME:
  //   "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant",
  // URL_CREATE_PAYMENT_BKASH_ONETIME:
  //   "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/create",
  // URL_EXECUTE_PAYMENT_BKASH_ONETIME:
  //   "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/execute",
  // URL_PAYMENT_STATUS_BKASH_ONETIME:
  //   "https://tokenized.pay.bka.sh/v1.2.0-beta/tokenized/checkout/payment/status",
  // URL_REDIRECT_BKASH_ONETIME:
  //   "https://api.kabbik.com/v3/bkash/bkash-onetime-callback",

  UPAY_MERCHANT_ID: "1150101020010417",
  UPAY_MERCHANT_KEY: "7iDUZ7B49xc39yfdnvm0hLeuBap3NxR5",
  UPAY_MERCHANT_CODE: "5734",
  UPAY_MERCHANT_CATEGORY_CODE: "5734",
  UPAY_MERCHANT_MOBILE_NUMBER: "01978519690",
  UPAY_MERCHANT_NAME: "Wonder Soft Solution",

  // UPAY_BASE_URL : "https://uat-pg.upay.systems/",
  UPAY_BASE_URL: "https://pg.upaysystem.com/",
  UPAY_MERCHANT_AUTH: "payment/merchant-auth/",
  UPAY_PAYMENT_INIT: "payment/merchant-payment-init/",
  UPAY_PAYMENT_STATUS: "payment/single-payment-status/",
  UPAY_PAYMENT_STATUS_BULK: "payment/bulk-payment-status/",

  UPAY_PAYMENT_CALLBACK_URL: paymentUrls.UPAY_PAYMENT_CALLBACK_URL,

  // ROBI_BASE_URL
  ROBI_APIKEY: "5iq0pnUceFlVNy5r",
  ROBI_USERNAME: "WondersoftKabbiq",
  ROBI_ONBEHALF_OF: "Apigate_AOC-Wondersoft(Kabbiq)",

  ROBI_CALLBACK_URL: paymentUrls.ROBI_CALLBACK_URL,

  ROBI_UNSUBSCRIBE_URL: "https://kabbik.com",
  ROBI_CONTACT_INFO: "01915225026",
  // ROBI_CONTACT_INFO: '01925492550',
  ROBI_AOC_Token_URL: "https://robi-prod.mife-aoc.com/api/getAOCToken",
  ROBI_AOC_BILLING_URL: "http://robi.mife-aoc.com/api/aoc",
  ROBI_CHARGE_STATUS_URL: "https://robi-prod.mife-aoc.com/api/chargeStatus",
  ROBI_SUBSCRIPTIONSTATUS_URL:
    "https://robi-prod.mife-aoc.com/api/subscriptionStatus",
  ROBI_RENEW_SUBSCRIPTION_URL:
    "https://robi-prod.mife-aoc.com/api/renewSubscription",
  ROBI_CANCEL_SUBSCRIPTION_URL:
    "https://robi-prod.mife-aoc.com/api/cancelSubscription",

  //MYBL Notification send webhook payment sandbox
  // MYBL_PARTNER_ID : 'audiobook',
  // MYBL_PARTNER_API_KEY : 'nm8SFWxfOKr7cSnvgzblWfAa0iK',
  // MYBL_PARTNER_SECRET : 'GzFtN1PHs9KHUhq12wv2b3RqsFZRB6bbi7qzE',
  // MYBL_PARTNER_HASH : '56c0edccb63e134a09d51ad3bfc1e1bf6df3128aecaca3a658655db6219a53e8',
  // URL_GET_ACCESS_TOKEN_MYBL: 'https://myblapi-test.banglalink.net/api/partner/auth/get-access-token',
  // URL_POST_TRANSACTION_MYBL: 'https://myblapi-test.banglalink.net/api/v1/partners/audiobook/transactions',

  //MYBL Notification send webhook payment live
  MYBL_PARTNER_ID: "audiobook",
  MYBL_PARTNER_API_KEY: "BwlFwUb90Nwrk2XNEK5iga1UIjMZlH",
  MYBL_PARTNER_SECRET: "zjw5StTUgUhq1MN12MBgY6qcHxPW6Yn05sl2Pr",
  MYBL_PARTNER_HASH:
    "56c0edccb63e134a09d51ad3bfc1e1bf6df3128aecaca3a658655db6219a53e8",
  URL_GET_ACCESS_TOKEN_MYBL:
    "https://myblapi.banglalink.net/api/partner/auth/get-access-token",
  URL_POST_TRANSACTION_MYBL:
    "https://myblapi.banglalink.net/api/v1/partners/audiobook/transactions",
  GP_DCB_STAGING_URL: "https://api.dob-staging.telenordigital.com",
  GP_DCB_PRODUCTION_URL: "https://api.dob.telenordigital.com",
});
