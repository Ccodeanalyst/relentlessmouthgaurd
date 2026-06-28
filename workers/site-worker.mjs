const STRIPE_CHECKOUT_URL = 'https://api.stripe.com/v1/checkout/sessions';
const BUSINESS_NAME = 'RELENTLESS Mouth Guards';
const MAX_ITEMS = 20;
const MAX_QTY = 10;
const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;
const ALLOWED_SHIPPING_COUNTRIES = ['US', 'CA', 'GB', 'AU'];
const ADMIN_SESSION_COOKIE = 'rmg_admin_session';
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const LOGIN_RATE_LIMIT_MAX_FAILURES = 10;
const API_RATE_LIMIT_WINDOW_SECONDS = 60;
const API_RATE_LIMIT_MAX_REQUESTS = 20;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "connect-src 'self' https://api.stripe.com https://api.resend.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com https://www.youtube-nocookie.com https://www.youtube.com",
    "img-src 'self' data: https: blob:",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; ')
};
const ADMIN_STATUSES = new Set([
  'pending-payment',
  'paid',
  'payment-failed',
  'kit-shipped',
  'impressions-received',
  'proof-sent',
  'in-production',
  'shipped',
  'delivered',
  'cancelled'
]);

const PRODUCT_CATALOG = [
  {
    id: 'single-layer-basic',
    builderId: 'base-guard',
    name: 'Base Guard',
    detail: 'Single Layer Basic - Light Bite',
    cents: 9900
  },
  {
    id: 'dual-layer-basic',
    builderId: 'dual-layer-guard',
    name: 'Dual Layer Guard',
    detail: 'Dual Layer Basic - Heavy Bite',
    cents: 11900
  },
  {
    id: 'dual-layer-custom-graphics',
    builderId: 'full-custom-graphics-guard',
    name: 'Full Custom Graphics Guard',
    detail: 'Dual Layer Custom Graphics',
    cents: 14900
  }
];

const PROMOS = {
  RELENTLESS15:  { discount: 15, type: 'pct', campaign: 'General Launch',       maxUses: null },
  WELCOME10:     { discount: 10, type: 'pct', campaign: 'Welcome',               maxUses: null },
  FIGHTCLUB501:  { discount: 20, type: 'pct', campaign: 'Fight Club Crate',      maxUses: 1    },
  FC15OFF:       { discount: 15, type: 'pct', campaign: 'Fight Club Crate',      maxUses: 1    },
  IM1120:        { discount: 20, type: 'pct', campaign: 'Fight Club Crate',      maxUses: 1    },
  FIGHTEVO:      { discount: 15, type: 'pct', campaign: 'FightEvo',              maxUses: null },
  TEAMSRISUK50:  { discount: 50, type: 'pct', campaign: 'Team Srisuk',           maxUses: 200  },
  SWAYCITYMT:    { discount: 30, type: 'pct', campaign: 'Sway City Muay Thai',   maxUses: null },
  RMGSPONSOR81:  { discount: 50, type: 'pct', campaign: 'RMG Sponsor',           maxUses: 50   }
};

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers
  }
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (isAdminPath(url.pathname) && env.ADMIN_DASHBOARD_ENABLED !== 'true') {
      return new Response('Admin dashboard is not publicly available.', {
        status: 404,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store'
        }
      });
    }

    if (url.pathname === '/dashboard') {
      return Response.redirect(`${url.origin}/dashboard/`, 302);
    }

    if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
      return Response.redirect(`${url.origin}/dashboard/`, 301);
    }
    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdminApi(request, env, url);
    }

    if (url.pathname === '/api/create-checkout-session') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
      }
      if (env.DB && await checkApiRateLimit(env, request, 'create-checkout')) {
        return json({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' }, 429);
      }
      return createCheckoutSession(request, env, url.origin);
    }

    if (url.pathname === '/api/stripe-webhook') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
      }

      return handleStripeWebhook(request, env);
    }

    if (url.pathname === '/api/validate-promo') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
      }
      if (env.DB && await checkApiRateLimit(env, request, 'validate-promo')) {
        return json({ error: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' }, 429);
      }
      return validatePromoEndpoint(request, env);
    }

    if (url.pathname === '/api/verify-checkout') {
      if (request.method !== 'GET') {
        return json({ error: 'Method not allowed' }, 405);
      }
      return verifyCheckoutEndpoint(request, env);
    }

    if (url.pathname === '/api/upload-artwork') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
      }
      return uploadArtwork(request, env);
    }

    if (url.pathname.startsWith('/api/artwork/')) {
      if (request.method !== 'GET') {
        return json({ error: 'Method not allowed' }, 405);
      }
      return serveArtwork(request, env, url);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const contentType = assetResponse.headers.get('content-type') || '';
    if (contentType.startsWith('text/html')) {
      const headers = new Headers(assetResponse.headers);
      Object.entries(SECURITY_HEADERS).forEach(([k, v]) => headers.set(k, v));
      return new Response(assetResponse.body, { status: assetResponse.status, statusText: assetResponse.statusText, headers });
    }
    return assetResponse;
  }
};

async function handleAdminApi(request, env, url) {
  if (url.pathname === '/api/admin/login') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    return loginAdmin(request, env);
  }

  if (url.pathname === '/api/admin/logout') {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
    return json({ ok: true }, 200, {
      'set-cookie': clearAdminCookie()
    });
  }

  const session = await verifyAdminSession(request, env);
  if (!session.valid) {
    return json({
      error: session.error || 'Authentication required.',
      code: session.code || 'ADMIN_AUTH_REQUIRED'
    }, session.status || 401);
  }

  if (url.pathname === '/api/admin/me') {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
    return json({ authenticated: true, username: session.username });
  }

  if (url.pathname === '/api/admin/orders') {
    if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
    return listAdminOrders(env, url);
  }

  const orderMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (orderMatch) {
    const orderId = decodeURIComponent(orderMatch[1]);
    if (request.method === 'GET') return getAdminOrder(env, orderId);
    if (request.method === 'PATCH') return updateAdminOrder(request, env, orderId, session.username);
    return json({ error: 'Method not allowed' }, 405);
  }

  if (url.pathname === '/api/admin/promos') {
    if (request.method === 'GET') return listAdminPromos(env);
    if (request.method === 'POST') return createAdminPromo(request, env, session.username);
    return json({ error: 'Method not allowed' }, 405);
  }

  const promoMatch = url.pathname.match(/^\/api\/admin\/promos\/([^/]+)$/);
  if (promoMatch) {
    const code = decodeURIComponent(promoMatch[1]);
    if (request.method === 'PATCH') return updateAdminPromo(request, env, code);
    if (request.method === 'DELETE') return deleteAdminPromo(env, code);
    return json({ error: 'Method not allowed' }, 405);
  }

  return json({ error: 'Not found' }, 404);
}

async function loginAdmin(request, env) {
  if (!isAdminAuthConfigured(env)) {
    return json({
      error: 'Dashboard login is not configured.',
      code: 'ADMIN_AUTH_NOT_CONFIGURED'
    }, 503);
  }

  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  if (env.DB) {
    const limited = await checkLoginRateLimit(env, ip);
    if (limited) {
      return json({
        error: 'Too many failed login attempts. Try again in 15 minutes.',
        code: 'RATE_LIMITED'
      }, 429);
    }
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const username = text(payload.username, 120);
  const password = String(payload.password || '');
  const valid = await verifyAdminCredentials(env, username, password);

  if (env.DB) {
    await recordLoginAttempt(env, ip, valid);
  }

  if (!valid) {
    return json({ error: 'Invalid username or password.' }, 401);
  }

  const cookieValue = await createAdminSession(env, username);
  return json({ authenticated: true, username }, 200, {
    'set-cookie': buildAdminCookie(cookieValue)
  });
}

async function listAdminOrders(env, url) {
  if (!env.DB) return json({ error: 'Order database is not configured.' }, 503);

  const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
  const limit = 100;

  const result = await env.DB.prepare(
    `SELECT
       o.id, o.created_at, o.updated_at, o.status,
       o.customer_name, o.customer_email, o.customer_phone,
       o.shipping_address, o.sport, o.design_notes, o.internal_notes, o.promo_code,
       o.subtotal_cents, o.discount_cents, o.total_cents, o.tax_cents,
       o.amount_paid_cents, o.payment_status, o.payment_provider,
       o.payment_reference, o.email_opt_in,
       COUNT(oi.id) AS item_count,
       COALESCE(SUM(oi.quantity), 0) AS total_quantity,
       GROUP_CONCAT(oi.product_name || ' x' || oi.quantity, ' | ') AS item_summary
     FROM orders o
     LEFT JOIN order_items oi ON oi.order_id = o.id
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT ? OFFSET ?`
  ).bind(limit + 1, offset).all();

  const rows = result.results || [];
  const hasMore = rows.length > limit;
  return json({ orders: hasMore ? rows.slice(0, limit) : rows, hasMore, offset });
}

async function getAdminOrder(env, orderId) {
  if (!env.DB) return json({ error: 'Order database is not configured.' }, 503);

  const order = await env.DB.prepare(
    `SELECT *
     FROM orders
     WHERE id = ?`
  ).bind(orderId).first();

  if (!order) return json({ error: 'Order not found.' }, 404);

  const items = await env.DB.prepare(
    `SELECT *
     FROM order_items
     WHERE order_id = ?
     ORDER BY id ASC`
  ).bind(orderId).all();

  const events = await env.DB.prepare(
    `SELECT *
     FROM order_events
     WHERE order_id = ?
     ORDER BY created_at DESC, id DESC`
  ).bind(orderId).all();

  return json({
    order,
    items: items.results || [],
    events: events.results || []
  });
}

async function updateAdminOrder(request, env, orderId, username) {
  if (!env.DB) return json({ error: 'Order database is not configured.' }, 503);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const hasStatus = Object.prototype.hasOwnProperty.call(payload, 'status');
  const hasInternalNotes = Object.prototype.hasOwnProperty.call(payload, 'internalNotes');
  const status = text(payload.status, 60);
  const internalNotes = text(payload.internalNotes, 4000);

  if (!hasStatus && !hasInternalNotes) {
    return json({ error: 'No order updates were provided.' }, 400);
  }

  if (hasStatus && !ADMIN_STATUSES.has(status)) {
    return json({ error: 'Invalid order status.' }, 400);
  }

  const order = await env.DB.prepare(
    'SELECT id, status, internal_notes FROM orders WHERE id = ?'
  ).bind(orderId).first();
  if (!order) return json({ error: 'Order not found.' }, 404);

  if (hasStatus) {
    await env.DB.prepare(
      `UPDATE orders
       SET status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(status, orderId).run();

    if (status !== order.status) {
      await env.DB.prepare(
        `INSERT INTO order_events (order_id, event_type, message, created_by)
         VALUES (?, 'status_changed', ?, ?)`
      ).bind(orderId, `Status changed from ${order.status} to ${status}`, username || 'admin').run();
    }
  }

  if (hasInternalNotes && internalNotes !== String(order.internal_notes || '')) {
    await env.DB.prepare(
      `UPDATE orders
       SET internal_notes = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(internalNotes || null, orderId).run();

    await env.DB.prepare(
      `INSERT INTO order_events (order_id, event_type, message, created_by)
       VALUES (?, 'internal_note', ?, ?)`
    ).bind(orderId, internalNotes ? `Internal notes updated (${internalNotes.length} chars)` : 'Internal notes cleared', username || 'admin').run();
  }

  return getAdminOrder(env, orderId);
}

async function listAdminPromos(env) {
  if (!env.DB) return json({ error: 'Database not configured.' }, 503);

  const result = await env.DB.prepare(`
    SELECT
      p.code, p.campaign, p.discount_type, p.discount_value, p.max_uses,
      p.starts_at, p.expires_at, p.active, p.created_at, p.created_by,
      COUNT(r.id) AS uses,
      COALESCE(SUM(r.discount_cents), 0) AS discount_total_cents,
      COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_cents ELSE 0 END), 0) AS paid_revenue_cents,
      COUNT(CASE WHEN o.payment_status = 'paid' THEN 1 END) AS order_count
    FROM promo_codes p
    LEFT JOIN promo_redemptions r ON r.promo_code = p.code
    LEFT JOIN orders o ON o.id = r.order_id
    GROUP BY p.code
    ORDER BY p.created_at DESC
  `).all();

  return json({ promos: result.results || [] });
}

async function createAdminPromo(request, env, username) {
  if (!env.DB) return json({ error: 'Database not configured.' }, 503);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const code = text(payload.code).toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 40);
  const campaign = text(payload.campaign, 120);
  const discountType = payload.discountType === 'amount' ? 'amount' : 'pct';
  const discountValue = Math.max(1, Math.round(Number(payload.discountValue) || 0));
  const maxUses = payload.maxUses ? Math.max(1, Math.round(Number(payload.maxUses))) : null;
  const startsAt = payload.startsAt || null;
  const expiresAt = payload.expiresAt || null;
  const active = payload.active !== false ? 1 : 0;

  if (!code) return json({ error: 'Code is required.' }, 400);
  if (!campaign) return json({ error: 'Campaign is required.' }, 400);
  if (!discountValue) return json({ error: 'Discount value is required.' }, 400);

  const existing = await env.DB.prepare('SELECT code FROM promo_codes WHERE code = ?').bind(code).first();
  if (existing) return json({ error: `Promo code ${code} already exists.` }, 409);

  await env.DB.prepare(
    `INSERT INTO promo_codes (code, campaign, discount_type, discount_value, max_uses, starts_at, expires_at, active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(code, campaign, discountType, discountValue, maxUses, startsAt, expiresAt, active, username || 'admin').run();

  return json({ ok: true, code }, 201);
}

async function updateAdminPromo(request, env, code) {
  if (!env.DB) return json({ error: 'Database not configured.' }, 503);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const existing = await env.DB.prepare('SELECT code FROM promo_codes WHERE code = ?').bind(code).first();
  if (!existing) return json({ error: 'Promo code not found.' }, 404);

  const campaign = text(payload.campaign, 120);
  const discountType = payload.discountType === 'amount' ? 'amount' : 'pct';
  const discountValue = Math.max(1, Math.round(Number(payload.discountValue) || 0));
  const maxUses = payload.maxUses ? Math.max(1, Math.round(Number(payload.maxUses))) : null;
  const startsAt = payload.startsAt || null;
  const expiresAt = payload.expiresAt || null;
  const active = payload.active !== false ? 1 : 0;

  await env.DB.prepare(
    `UPDATE promo_codes
     SET campaign = ?, discount_type = ?, discount_value = ?, max_uses = ?,
         starts_at = ?, expires_at = ?, active = ?, updated_at = datetime('now')
     WHERE code = ?`
  ).bind(campaign, discountType, discountValue, maxUses, startsAt, expiresAt, active, code).run();

  return json({ ok: true, code });
}

async function deleteAdminPromo(env, code) {
  if (!env.DB) return json({ error: 'Database not configured.' }, 503);

  const promo = await env.DB.prepare(
    `SELECT p.code, COUNT(r.id) AS uses
     FROM promo_codes p
     LEFT JOIN promo_redemptions r ON r.promo_code = p.code
     WHERE p.code = ?
     GROUP BY p.code`
  ).bind(code).first();

  if (!promo) return json({ error: 'Promo code not found.' }, 404);

  if (Number(promo.uses || 0) > 0) {
    await env.DB.prepare(
      `UPDATE promo_codes SET active = 0, updated_at = datetime('now') WHERE code = ?`
    ).bind(code).run();
    return json({ ok: true, action: 'disabled' });
  }

  await env.DB.prepare('DELETE FROM promo_codes WHERE code = ?').bind(code).run();
  return json({ ok: true, action: 'deleted' });
}

async function createCheckoutSession(request, env, origin) {
  const stripeSecretKey = normalizeStripeSecretKey(env.STRIPE_SECRET_KEY);
  if (!stripeSecretKey) {
    return json({
      error: 'Stripe is not configured yet.',
      code: 'PAYMENTS_NOT_CONFIGURED',
      configured: false
    });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const normalized = await normalizeOrder(payload, env);
  if (normalized.error) {
    return json({ error: normalized.error }, 400);
  }

  try {
    await savePendingOrder(env, normalized.order);
  } catch (error) {
    console.error('Unable to save pending order before Stripe Checkout.', error);
  }

  const sessionParams = buildStripeSessionParams(normalized.order, origin, env);
  let stripeResponse;
  try {
    stripeResponse = await fetch(STRIPE_CHECKOUT_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${stripeSecretKey}`,
        'content-type': 'application/x-www-form-urlencoded'
      },
      body: sessionParams
    });
  } catch (error) {
    console.error('Unable to reach Stripe Checkout API.', error);
    return json({
      error: 'Unable to reach Stripe Checkout.',
      code: 'STRIPE_REQUEST_FAILED',
      message: 'Check the Stripe secret key and Cloudflare Worker network access.'
    }, 502);
  }

  let stripeBody;
  try {
    stripeBody = await stripeResponse.json();
  } catch (error) {
    console.error('Stripe Checkout API returned a non-JSON response.', {
      status: stripeResponse.status,
      statusText: stripeResponse.statusText
    });
    return json({
      error: 'Stripe returned an unreadable response.',
      code: 'STRIPE_RESPONSE_INVALID',
      status: stripeResponse.status
    }, 502);
  }

  if (!stripeResponse.ok) {
    return json({
      error: 'Stripe rejected the checkout session request.',
      code: 'STRIPE_SESSION_FAILED',
      message: stripeBody.error?.message || 'Check Stripe configuration and request data.'
    }, 502);
  }

  return json({
    id: normalized.order.id,
    checkoutSessionId: stripeBody.id,
    url: stripeBody.url
  }, 201);
}

async function handleStripeWebhook(request, env) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return json({
      error: 'Stripe webhook secret is not configured.',
      code: 'WEBHOOK_NOT_CONFIGURED'
    }, 503);
  }

  const signature = request.headers.get('stripe-signature') || '';
  const rawBody = await request.text();
  const verification = await verifyStripeSignature(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!verification.valid) {
    return json({ error: verification.error || 'Invalid Stripe signature.' }, 400);
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return json({ error: 'Invalid webhook JSON.' }, 400);
  }

  const session = event?.data?.object || {};
  const orderId = session.client_reference_id || session.metadata?.order_id;

  if (event.type === 'checkout.session.completed') {
    await markOrderPaid(env, {
      orderId,
      sessionId: session.id,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : '',
      amountTotal: session.amount_total,
      taxCents: session.total_details?.amount_tax,
      shippingDetails: formatStripeShippingDetails(session.shipping_details),
      customerEmail: session.customer_details?.email || session.customer_email || ''
    });
  }

  if (event.type === 'checkout.session.async_payment_failed') {
    await markOrderPaymentFailed(env, {
      orderId,
      sessionId: session.id
    });
  }

  return json({ received: true });
}

async function normalizeOrder(payload, env) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  if (!items.length) return { error: 'Cart is empty.' };
  if (items.length > MAX_ITEMS) return { error: 'Cart has too many line items.' };

  const customer = payload.customer || {};
  const shipping = payload.shipping || {};
  const email = text(customer.email).toLowerCase();
  const firstName = text(customer.firstName);
  const lastName = text(customer.lastName);
  const country = text(shipping.country).toUpperCase() || 'US';

  if (!firstName || !lastName) return { error: 'Customer name is required.' };
  if (!email || !email.includes('@')) return { error: 'Valid customer email is required.' };
  if (!text(shipping.address) || !text(shipping.city) || !text(shipping.zip)) {
    return { error: 'Shipping address is required.' };
  }
  if (!ALLOWED_SHIPPING_COUNTRIES.includes(country)) {
    return { error: 'Online checkout is only available for US, Canada, UK, and Australia shipping addresses right now.' };
  }

  const normalizedItems = [];
  for (const item of items) {
    const product = resolveProduct(item);
    if (!product) return { error: `Unknown product: ${text(item?.name) || text(item?.id)}` };

    const qty = clampInt(item.qty, 1, MAX_QTY);
    const hasRush = String(item.id || '').endsWith('-rush') || /rush requested/i.test(String(item.meta || ''));
    const unitCents = product.cents + (hasRush ? 3000 : 0);
    const { baseColor, customText, artworkFileName } = parseBuilderMeta(text(item.meta, 400));

    normalizedItems.push({
      productId: product.id,
      name: product.name,
      detail: product.detail,
      quantity: qty,
      unitCents,
      meta: text(item.meta, 400),
      baseColor,
      customText,
      artworkFileName,
      rush: hasRush
    });
  }

  const subtotalCents = normalizedItems.reduce((sum, item) => sum + item.unitCents * item.quantity, 0);
  const promo = await lookupPromo(env, payload.promoCode, subtotalCents);
  const discountCents = promo ? promo.discountCents : 0;
  const totalCents = Math.max(0, subtotalCents - discountCents);

  return {
    order: {
      id: `RMG-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
      customer: {
        firstName,
        lastName,
        email,
        phone: text(customer.phone)
      },
      shipping: {
        address: text(shipping.address),
        city: text(shipping.city),
        state: text(shipping.state),
        zip: text(shipping.zip),
        country
      },
      sport: text(payload.sport),
      notes: text(payload.notes, 700),
      emailOptIn: Boolean(payload.emailOptIn),
      items: normalizedItems,
      promo,
      subtotalCents,
      discountCents,
      totalCents
    }
  };
}

function buildStripeSessionParams(order, origin, env) {
  const params = new URLSearchParams();
  const collectTax = shouldCollectStripeTax(env);
  const successUrl = `${origin}/checkout.html?payment=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/checkout.html?payment=cancelled`;
  const lineItems = order.discountCents > 0
    ? [buildDiscountedOrderLine(order)]
    : order.items.map(item => ({
      name: item.name,
      description: item.meta || item.detail,
      unitAmount: item.unitCents,
      quantity: item.quantity
    }));

  params.set('mode', 'payment');
  params.set('success_url', successUrl);
  params.set('cancel_url', cancelUrl);
  params.set('customer_email', order.customer.email);
  params.set('client_reference_id', order.id);
  if (collectTax) {
    params.set('automatic_tax[enabled]', 'true');
    params.set('billing_address_collection', 'required');
    params.set('customer_creation', 'always');
    ALLOWED_SHIPPING_COUNTRIES.forEach((country, index) => {
      params.set(`shipping_address_collection[allowed_countries][${index}]`, country);
    });
  }
  params.set('payment_intent_data[metadata][order_id]', order.id);
  params.set('payment_intent_data[metadata][customer_email]', order.customer.email);
  params.set('metadata[order_id]', order.id);
  params.set('metadata[customer_name]', `${order.customer.firstName} ${order.customer.lastName}`);
  params.set('metadata[promo_code]', order.promo?.code || '');
  params.set('metadata[promo_campaign]', order.promo?.campaign || '');
  params.set('metadata[subtotal_cents]', String(order.subtotalCents));
  params.set('metadata[discount_cents]', String(order.discountCents));
  params.set('metadata[total_cents]', String(order.totalCents));
  params.set('metadata[shipping_address]', text(formatShipping(order.shipping), 500));
  params.set('metadata[sport]', text(order.sport, 120));
  params.set('metadata[design_notes]', text(order.notes, 500));
  params.set('metadata[tax_collection]', collectTax ? 'stripe_automatic_tax' : 'disabled');
  params.set('metadata[business_email]', env.BUSINESS_EMAIL || '');

  lineItems.forEach((item, index) => {
    params.set(`line_items[${index}][quantity]`, String(item.quantity));
    params.set(`line_items[${index}][price_data][currency]`, 'usd');
    params.set(`line_items[${index}][price_data][unit_amount]`, String(item.unitAmount));
    params.set(`line_items[${index}][price_data][product_data][name]`, item.name);
    if (item.description) {
      params.set(`line_items[${index}][price_data][product_data][description]`, text(item.description, 500));
    }
  });

  return params;
}

function buildDiscountedOrderLine(order) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const promoLabel = order.promo ? ` after ${order.promo.code} discount` : '';

  return {
    name: `${BUSINESS_NAME} order`,
    description: `${itemCount} item${itemCount === 1 ? '' : 's'}${promoLabel}. Full order details are attached as session metadata.`,
    unitAmount: order.totalCents,
    quantity: 1
  };
}

function resolveProduct(item) {
  const id = String(item?.id || '');
  const name = String(item?.name || '');

  return PRODUCT_CATALOG.find(product =>
    id === product.id ||
    id.startsWith(`${product.builderId}-`) ||
    name.toLowerCase().includes(product.name.toLowerCase())
  );
}

async function savePendingOrder(env, order) {
  if (!env.DB) return;

  await env.DB.prepare(
    `INSERT OR REPLACE INTO orders (
      id, updated_at, status, customer_name, customer_email, customer_phone,
      shipping_address, sport, design_notes, promo_code, subtotal_cents,
      discount_cents, total_cents, payment_status, payment_provider,
      email_opt_in
    ) VALUES (?, datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    order.id,
    'pending-payment',
    `${order.customer.firstName} ${order.customer.lastName}`,
    order.customer.email,
    order.customer.phone || null,
    formatShipping(order.shipping),
    order.sport || null,
    order.notes || null,
    order.promo?.code || null,
    order.subtotalCents,
    order.discountCents,
    order.totalCents,
    'checkout_started',
    'stripe',
    order.emailOptIn ? 1 : 0
  ).run();

  await env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(order.id).run();

  for (const item of order.items) {
    await env.DB.prepare(
      `INSERT INTO order_items (
        order_id, product_id, product_name, product_detail, quantity,
        unit_price_cents, base_color, custom_text, artwork_file_name,
        rush_requested, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      order.id,
      item.productId,
      item.name,
      item.detail,
      item.quantity,
      item.unitCents,
      item.baseColor || null,
      item.customText || null,
      item.artworkFileName || null,
      item.rush ? 1 : 0,
      item.meta || null
    ).run();
  }

  await env.DB.prepare(
    `INSERT INTO order_events (order_id, event_type, message)
     VALUES (?, 'checkout_started', 'Stripe Checkout Session requested')`
  ).bind(order.id).run();

  if (order.promo) {
    await env.DB.prepare(
      `INSERT INTO promo_redemptions (order_id, promo_code, discount_cents)
       VALUES (?, ?, ?)`
    ).bind(order.id, order.promo.code, order.discountCents).run();
  }
}

async function markOrderPaid(env, { orderId, sessionId, paymentIntentId, amountTotal, taxCents, shippingDetails, customerEmail }) {
  if (!env.DB || !orderId) return;

  await env.DB.prepare(
    `UPDATE orders
     SET status = 'paid',
         payment_status = 'paid',
         payment_provider = 'stripe',
         payment_reference = ?,
         tax_cents = ?,
         amount_paid_cents = ?,
         shipping_address = COALESCE(?, shipping_address),
         updated_at = datetime('now')
     WHERE id = ?`
  ).bind(
    sessionId || paymentIntentId || null,
    centsOrZero(taxCents),
    centsOrZero(amountTotal),
    shippingDetails || null,
    orderId
  ).run();

  await env.DB.prepare(
    `INSERT INTO order_events (order_id, event_type, message)
     VALUES (?, 'payment_succeeded', ?)`
  ).bind(
    orderId,
    `Stripe payment succeeded${amountTotal ? ` for $${(amountTotal / 100).toFixed(2)}` : ''}${taxCents ? ` including $${(taxCents / 100).toFixed(2)} tax` : ''}${customerEmail ? ` (${customerEmail})` : ''}`
  ).run();

  if (customerEmail) {
    const order = await env.DB.prepare('SELECT customer_name, total_cents, tax_cents FROM orders WHERE id = ?').bind(orderId).first();
    await sendCustomerConfirmation(env, {
      orderId,
      customerEmail,
      customerName: order?.customer_name || '',
      totalCents: centsOrZero(amountTotal || order?.total_cents),
      taxCents: centsOrZero(taxCents || order?.tax_cents)
    });
  }
}

async function markOrderPaymentFailed(env, { orderId, sessionId }) {
  if (!env.DB || !orderId) return;

  await env.DB.prepare(
    `UPDATE orders
     SET payment_status = 'failed',
         payment_reference = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).bind(sessionId || null, orderId).run();

  await env.DB.prepare(
    `INSERT INTO order_events (order_id, event_type, message)
     VALUES (?, 'payment_failed', 'Stripe asynchronous payment failed')`
  ).bind(orderId).run();
}

async function sendCustomerConfirmation(env, { orderId, customerEmail, customerName, totalCents, taxCents }) {
  if (!env.RESEND_API_KEY) return;

  const total = `$${(totalCents / 100).toFixed(2)}`;
  const taxNote = taxCents ? ` (includes $${(taxCents / 100).toFixed(2)} tax)` : '';
  const name = customerName ? customerName.split(' ')[0] : 'there';

  const html = [
    '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111;">',
    '<h2 style="color:#C1121F;letter-spacing:1px;">RELENTLESS Mouth Guards</h2>',
    `<p>Hi ${escapeHtmlEmail(name)},</p>`,
    `<p>Your payment was received. Order <strong>${escapeHtmlEmail(orderId)}</strong> is confirmed — total <strong>${total}${taxNote}</strong>.</p>`,
    '<p>Your at-home impression kit will ship soon. We\'ll follow up with tracking and, for Custom Graphics orders, a design proof before production begins.</p>',
    '<p>Questions? Reply to this email or contact <a href="mailto:relentlessmouthgaurds@gmail.com">relentlessmouthgaurds@gmail.com</a>.</p>',
    '<p>Follow our latest builds on Instagram: <a href="https://www.instagram.com/relentlessmouthguards/">@relentlessmouthguards</a></p>',
    '<hr style="border:none;border-top:1px solid #eee;margin:24px 0;">',
    '<p style="font-size:0.8em;color:#888;">RELENTLESS Mouth Guards · Custom contact sports protection</p>',
    '</div>'
  ].join('');

  try {
    const fromAddress = env.RESEND_FROM_ADDRESS || 'orders@relentlessmouthguards.com';
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.RESEND_API_KEY}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        from: `RELENTLESS Mouth Guards <${fromAddress}>`,
        to: [customerEmail],
        subject: `Order confirmed — ${orderId}`,
        html
      })
    });
  } catch (error) {
    console.error('Failed to send customer confirmation email.', error);
  }
}

function escapeHtmlEmail(value) {
  return String(value || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map(part => {
      const [key, ...value] = part.split('=');
      return [key, value.join('=')];
    })
  );
  const timestamp = Number(parts.t);
  const signatures = signatureHeader
    .split(',')
    .filter(part => part.startsWith('v1='))
    .map(part => part.slice(3));

  if (!timestamp || !signatures.length) {
    return { valid: false, error: 'Missing Stripe signature fields.' };
  }

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > STRIPE_WEBHOOK_TOLERANCE_SECONDS) {
    return { valid: false, error: 'Stripe signature timestamp is outside the tolerance window.' };
  }

  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  const valid = signatures.some(signature => timingSafeEqual(signature, expected));
  return valid ? { valid: true } : { valid: false, error: 'Stripe signature mismatch.' };
}

async function hmacSha256Hex(secret, payload) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const digest = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(payload) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function isAdminAuthConfigured(env) {
  return Boolean(
    text(env.ADMIN_USERNAME) &&
    text(env.ADMIN_SESSION_SECRET) &&
    (text(env.ADMIN_PASSWORD) || text(env.ADMIN_PASSWORD_HASH))
  );
}

async function verifyAdminCredentials(env, username, password) {
  const expectedUsername = text(env.ADMIN_USERNAME);
  const usernameMatches = timingSafeEqualText(username, expectedUsername);
  const expectedPasswordHash = text(env.ADMIN_PASSWORD_HASH);
  const expectedPassword = String(env.ADMIN_PASSWORD || '');
  const passwordMatches = expectedPasswordHash
    ? timingSafeEqualText(await sha256Hex(password), expectedPasswordHash.toLowerCase())
    : timingSafeEqualText(password, expectedPassword);

  return usernameMatches && passwordMatches;
}

async function createAdminSession(env, username) {
  const exp = Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS;
  const payload = base64UrlEncode(JSON.stringify({ u: username, exp }));
  const signature = await hmacSha256Hex(env.ADMIN_SESSION_SECRET, payload);
  return `${payload}.${signature}`;
}

async function verifyAdminSession(request, env) {
  if (!isAdminAuthConfigured(env)) {
    return {
      valid: false,
      status: 503,
      code: 'ADMIN_AUTH_NOT_CONFIGURED',
      error: 'Dashboard login is not configured.'
    };
  }

  const cookie = parseCookies(request.headers.get('cookie') || '')[ADMIN_SESSION_COOKIE];
  if (!cookie) return { valid: false };

  const [payload, signature] = cookie.split('.');
  if (!payload || !signature) return { valid: false };

  const expected = await hmacSha256Hex(env.ADMIN_SESSION_SECRET, payload);
  if (!timingSafeEqual(signature, expected)) return { valid: false };

  let session;
  try {
    session = JSON.parse(base64UrlDecode(payload));
  } catch {
    return { valid: false };
  }

  if (!session?.u || !session?.exp || session.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false };
  }

  if (!timingSafeEqualText(session.u, text(env.ADMIN_USERNAME))) {
    return { valid: false };
  }

  return { valid: true, username: session.u };
}

function parseCookies(header) {
  return Object.fromEntries(
    header
      .split(';')
      .map(part => part.trim())
      .filter(Boolean)
      .map(part => {
        const [name, ...value] = part.split('=');
        return [decodeURIComponent(name), decodeURIComponent(value.join('='))];
      })
  );
}

function buildAdminCookie(value) {
  return `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(value)}; Max-Age=${ADMIN_SESSION_TTL_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

function clearAdminCookie() {
  return `${ADMIN_SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

function base64UrlEncode(value) {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(base64 + padding);
}

function timingSafeEqualText(a, b) {
  return timingSafeEqual(String(a || ''), String(b || ''));
}

async function uploadArtwork(request, env) {
  if (!env.ARTWORK_BUCKET) {
    return json({ error: 'Artwork storage is not configured.', code: 'ARTWORK_NOT_CONFIGURED' }, 503);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'Invalid multipart form data.' }, 400);
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return json({ error: 'No file provided.' }, 400);
  }

  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  const EXT_MAP = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
  const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

  if (!ALLOWED_TYPES.includes(file.type)) {
    return json({ error: 'Only PNG, JPEG, and WebP images are accepted.' }, 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return json({ error: 'File exceeds the 10 MB size limit.' }, 400);
  }

  const ext = EXT_MAP[file.type] || 'bin';
  const key = `artwork/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  await env.ARTWORK_BUCKET.put(key, arrayBuffer, {
    httpMetadata: { contentType: file.type },
    customMetadata: { originalName: text(file.name, 200) }
  });

  return json({ key, url: `/api/artwork/${key}` }, 201);
}

async function serveArtwork(request, env, url) {
  if (!env.ARTWORK_BUCKET) {
    return new Response('Artwork storage is not configured.', { status: 503 });
  }

  const session = await verifyAdminSession(request, env);
  if (!session.valid) {
    return new Response('Authentication required.', { status: 401 });
  }

  const key = url.pathname.replace('/api/artwork/', '');
  if (!key) return new Response('Not found.', { status: 404 });

  const object = await env.ARTWORK_BUCKET.get(key);
  if (!object) return new Response('Artwork not found.', { status: 404 });

  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType || 'application/octet-stream',
      'cache-control': 'private, max-age=3600',
      'content-disposition': `inline; filename="${object.customMetadata?.originalName || key}"`
    }
  });
}

async function verifyCheckoutEndpoint(request, env) {
  const url = new URL(request.url);
  const sessionId = text(url.searchParams.get('session_id') || '', 200);
  if (!sessionId) return json({ error: 'session_id is required.' }, 400);

  const stripeKey = normalizeStripeSecretKey(env.STRIPE_SECRET_KEY);
  if (!stripeKey) return json({ verified: false, error: 'Stripe not configured.', code: 'PAYMENTS_NOT_CONFIGURED' });

  let session;
  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
      headers: { authorization: `Bearer ${stripeKey}` }
    });
    if (!res.ok) return json({ verified: false, error: 'Unable to verify session with Stripe.' }, 502);
    session = await res.json();
  } catch {
    return json({ verified: false, error: 'Unable to reach Stripe.' }, 502);
  }

  if (session.payment_status !== 'paid') {
    return json({ verified: false, paymentStatus: session.payment_status });
  }

  const orderId = session.client_reference_id || session.metadata?.order_id || null;
  let dbStatus = null;
  if (env.DB && orderId) {
    const row = await env.DB.prepare('SELECT status FROM orders WHERE id = ?').bind(orderId).first();
    dbStatus = row?.status || null;
  }

  return json({ verified: true, orderId, orderStatus: dbStatus, customerEmail: session.customer_details?.email || '' });
}

async function checkApiRateLimit(env, request, endpoint) {
  const ip = request.headers.get('cf-connecting-ip') ||
             request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const windowStart = new Date(Date.now() - API_RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  try {
    const row = await env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM api_requests WHERE ip = ? AND endpoint = ? AND created_at > ?'
    ).bind(ip, endpoint, windowStart).first();
    if ((row?.cnt || 0) >= API_RATE_LIMIT_MAX_REQUESTS) return true;
    await env.DB.prepare('INSERT INTO api_requests (ip, endpoint) VALUES (?, ?)').bind(ip, endpoint).run();
    await env.DB.prepare("DELETE FROM api_requests WHERE created_at < datetime('now', '-1 hour')").run();
    return false;
  } catch {
    return false;
  }
}

function parseBuilderMeta(metaString) {
  const result = { baseColor: null, customText: null, artworkFileName: null };
  if (!metaString) return result;

  for (const part of metaString.split(' - ')) {
    const lower = part.toLowerCase();
    if (lower.startsWith('color: ')) {
      result.baseColor = part.slice('color: '.length).trim() || null;
    } else if (lower.startsWith('text: ')) {
      const val = part.slice('text: '.length).trim();
      result.customText = val.replace(/^"(.*)"$/, '$1') || null;
    } else if (lower.startsWith('artwork file: ')) {
      result.artworkFileName = part.slice('artwork file: '.length).trim() || null;
    }
  }
  return result;
}

async function lookupPromo(env, rawCode, subtotalCents) {
  const code = text(rawCode).toUpperCase();
  if (!code) return null;

  if (env.DB) {
    const row = await env.DB.prepare(
      `SELECT code, campaign, discount_type, discount_value, max_uses, starts_at, expires_at, active
       FROM promo_codes WHERE code = ?`
    ).bind(code).first();

    if (row && Number(row.active) === 1) {
      const today = new Date();
      if (row.starts_at && new Date(row.starts_at + 'T00:00:00') > today) return null;
      if (row.expires_at && new Date(row.expires_at + 'T23:59:59') < today) return null;

      if (row.max_uses) {
        const usage = await env.DB.prepare(
          'SELECT COUNT(*) as cnt FROM promo_redemptions WHERE promo_code = ?'
        ).bind(code).first();
        if ((usage?.cnt || 0) >= Number(row.max_uses)) return null;
      }

      const discountCents = row.discount_type === 'amount'
        ? Math.min(subtotalCents, Number(row.discount_value))
        : Math.round(subtotalCents * (Number(row.discount_value) / 100));

      return { code, campaign: row.campaign, discountCents };
    }
  }

  // Fallback to hardcoded list when DB is unavailable
  const promo = PROMOS[code];
  if (!promo) return null;

  const discountCents = promo.type === 'pct'
    ? Math.round(subtotalCents * (promo.discount / 100))
    : Math.min(subtotalCents, Math.round(promo.discount * 100));

  return { code, campaign: promo.campaign, discountCents };
}

function calculateItemsSubtotalCents(items) {
  if (!Array.isArray(items) || !items.length) return 0;

  return items.slice(0, MAX_ITEMS).reduce((sum, item) => {
    const product = resolveProduct(item);
    if (!product) return sum;

    const qty = clampInt(item.qty ?? item.quantity, 1, MAX_QTY);
    const hasRush = String(item.id || '').endsWith('-rush') || /rush requested/i.test(String(item.meta || ''));
    return sum + (product.cents + (hasRush ? 3000 : 0)) * qty;
  }, 0);
}

async function validatePromoEndpoint(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const code = text(payload.code || payload.promoCode).toUpperCase();
  const subtotalCents = Math.max(
    0,
    Math.round(Number(payload.subtotalCents) || calculateItemsSubtotalCents(payload.items) || 0)
  );

  if (!code) {
    return json({ valid: false, msg: 'Please enter a code.' });
  }

  const result = await lookupPromo(env, code, subtotalCents);
  if (!result) {
    return json({ valid: false, msg: 'Code not recognised.' });
  }

  const label = env.DB
    ? await (async () => {
        const row = await env.DB.prepare(
          'SELECT discount_type, discount_value FROM promo_codes WHERE code = ?'
        ).bind(code).first();
        if (!row) return `${result.discountCents / 100} off`;
        return row.discount_type === 'amount'
          ? `$${(Number(row.discount_value) / 100).toFixed(2)} off`
          : `${row.discount_value}% off`;
      })()
    : (() => {
        const p = PROMOS[code];
        return p ? (p.type === 'pct' ? `${p.discount}% off` : `$${p.discount} off`) : '';
      })();

  return json({
    valid: true,
    code: result.code,
    discountCents: result.discountCents,
    discountAmount: result.discountCents / 100,
    label,
    campaign: result.campaign
  });
}

async function checkLoginRateLimit(env, ip) {
  const windowStart = new Date(Date.now() - LOGIN_RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  try {
    const result = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM login_attempts WHERE ip = ? AND created_at > ? AND success = 0`
    ).bind(ip, windowStart).first();
    return (result?.cnt || 0) >= LOGIN_RATE_LIMIT_MAX_FAILURES;
  } catch {
    return false;
  }
}

async function recordLoginAttempt(env, ip, success) {
  try {
    await env.DB.prepare(
      `INSERT INTO login_attempts (ip, success) VALUES (?, ?)`
    ).bind(ip, success ? 1 : 0).run();
    await env.DB.prepare(
      `DELETE FROM login_attempts WHERE created_at < datetime('now', '-30 days')`
    ).run();
  } catch {
    // Non-fatal: don't block login if attempt recording fails.
  }
}

function formatShipping(shipping) {
  return [
    shipping.address,
    shipping.city,
    [shipping.state, shipping.zip].filter(Boolean).join(' '),
    shipping.country
  ].filter(Boolean).join(', ');
}

function formatStripeShippingDetails(shippingDetails) {
  const address = shippingDetails?.address;
  if (!address) return '';

  return [
    shippingDetails.name,
    address.line1,
    address.line2,
    address.city,
    [address.state, address.postal_code].filter(Boolean).join(' '),
    address.country
  ].filter(Boolean).join(', ');
}

function text(value, max = 240) {
  return String(value || '').trim().slice(0, max);
}

function isAdminPath(pathname) {
  return pathname === '/admin' || pathname.startsWith('/admin/') ||
         pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

function shouldCollectStripeTax(env) {
  const value = String(env.STRIPE_TAX_ENABLED ?? 'true').trim().toLowerCase();
  return !['0', 'false', 'no', 'off'].includes(value);
}

function normalizeStripeSecretKey(value) {
  return String(value || '')
    .trim()
    .replace(/^STRIPE_SECRET_KEY\s*=\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, '')
    .slice(0, 500);
}

function centsOrZero(value) {
  const cents = Number(value);
  return Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
}

function clampInt(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}
