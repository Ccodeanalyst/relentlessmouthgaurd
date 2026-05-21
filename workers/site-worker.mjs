const STRIPE_CHECKOUT_URL = 'https://api.stripe.com/v1/checkout/sessions';
const BUSINESS_NAME = 'RELENTLESS Mouth Guards';
const MAX_ITEMS = 20;
const MAX_QTY = 10;
const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;
const ALLOWED_SHIPPING_COUNTRIES = ['US', 'CA', 'GB', 'AU'];
const ADMIN_SESSION_COOKIE = 'rmg_admin_session';
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
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
  RELENTLESS15: { discount: 15, type: 'pct', campaign: 'General Launch' },
  WELCOME10: { discount: 10, type: 'pct', campaign: 'Welcome' },
  FIGHTCLUB501: { discount: 20, type: 'pct', campaign: 'Fight Club Crate' },
  FC15OFF: { discount: 15, type: 'pct', campaign: 'Fight Club Crate' },
  FIGHTCLUBCRATE15: { discount: 15, type: 'pct', campaign: 'Fight Club Crate' },
  IM1120: { discount: 20, type: 'pct', campaign: 'Fight Club Crate' },
  FIGHTEVO: { discount: 15, type: 'pct', campaign: 'FightEvo' },
  TEAMSRISUK50: { discount: 50, type: 'pct', campaign: 'Team Srisuk' },
  SWAYCITYMT: { discount: 30, type: 'pct', campaign: 'Sway City Muay Thai' },
  RMGSPONSOR81: { discount: 50, type: 'pct', campaign: 'RMG Sponsor' }
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

    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdminApi(request, env, url);
    }

    if (url.pathname === '/api/validate-promo') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
      }

      return validatePromoRequest(request, env);
    }

    if (url.pathname === '/api/create-checkout-session') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
      }

      return createCheckoutSession(request, env, url.origin);
    }

    if (url.pathname === '/api/stripe-webhook') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
      }

      return handleStripeWebhook(request, env);
    }

    return env.ASSETS.fetch(request);
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
    return listAdminOrders(env);
  }

  if (url.pathname === '/api/admin/promos') {
    if (request.method === 'GET') return listAdminPromos(env);
    if (request.method === 'POST') return createAdminPromo(request, env, session.username);
    return json({ error: 'Method not allowed' }, 405);
  }

  const promoRedemptionsMatch = url.pathname.match(/^\/api\/admin\/promos\/([^/]+)\/redemptions$/);
  if (promoRedemptionsMatch) {
    const promoCode = decodeURIComponent(promoRedemptionsMatch[1]);
    if (request.method === 'GET') return listAdminPromoRedemptions(env, promoCode);
    return json({ error: 'Method not allowed' }, 405);
  }

  const promoMatch = url.pathname.match(/^\/api\/admin\/promos\/([^/]+)$/);
  if (promoMatch) {
    const promoCode = decodeURIComponent(promoMatch[1]);
    if (request.method === 'GET') return getAdminPromo(env, promoCode);
    if (request.method === 'PATCH') return updateAdminPromo(request, env, promoCode, session.username);
    if (request.method === 'DELETE') return deleteAdminPromo(env, promoCode);
    return json({ error: 'Method not allowed' }, 405);
  }

  const orderMatch = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (orderMatch) {
    const orderId = decodeURIComponent(orderMatch[1]);
    if (request.method === 'GET') return getAdminOrder(env, orderId);
    if (request.method === 'PATCH') return updateAdminOrder(request, env, orderId, session.username);
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

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const username = text(payload.username, 120);
  const password = String(payload.password || '');
  const valid = await verifyAdminCredentials(env, username, password);
  if (!valid) {
    return json({ error: 'Invalid username or password.' }, 401);
  }

  const cookieValue = await createAdminSession(env, username);
  return json({ authenticated: true, username }, 200, {
    'set-cookie': buildAdminCookie(cookieValue)
  });
}

async function listAdminOrders(env) {
  if (!env.DB) return json({ error: 'Order database is not configured.' }, 503);

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
     LIMIT 100`
  ).all();

  return json({ orders: result.results || [] });
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
    ).bind(orderId, internalNotes ? 'Internal note saved' : 'Internal notes cleared', username || 'admin').run();
  }

  return getAdminOrder(env, orderId);
}

async function listAdminPromos(env) {
  if (!env.DB) return json({ error: 'Promo database is not configured.' }, 503);

  const result = await env.DB.prepare(
    `SELECT
       p.code, p.campaign, p.discount_type, p.discount_value, p.max_uses,
       p.starts_at, p.expires_at, p.active, p.created_at, p.updated_at, p.created_by,
       COUNT(r.id) AS uses,
       COUNT(DISTINCT r.order_id) AS order_count,
       COALESCE(SUM(r.discount_cents), 0) AS discount_total_cents,
       COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.amount_paid_cents ELSE 0 END), 0) AS paid_revenue_cents
     FROM promo_codes p
     LEFT JOIN promo_redemptions r ON UPPER(r.promo_code) = p.code
     LEFT JOIN orders o ON o.id = r.order_id
     GROUP BY p.code
     ORDER BY p.created_at DESC, p.code ASC`
  ).all();

  return json({ promos: result.results || [] });
}

async function getAdminPromo(env, rawCode) {
  if (!env.DB) return json({ error: 'Promo database is not configured.' }, 503);

  const code = normalizePromoCode(rawCode);
  if (!code) return json({ error: 'Invalid promo code.' }, 400);

  const promo = await fetchAdminPromo(env, code);
  if (!promo) return json({ error: 'Promo not found.' }, 404);
  return json({ promo });
}

async function createAdminPromo(request, env, username) {
  if (!env.DB) return json({ error: 'Promo database is not configured.' }, 503);

  const parsed = await readPromoPayload(request);
  if (parsed.error) return json({ error: parsed.error }, 400);

  const normalized = normalizePromoPayload(parsed.payload);
  if (normalized.error) return json({ error: normalized.error }, 400);

  try {
    await env.DB.prepare(
      `INSERT INTO promo_codes (
         code, campaign, discount_type, discount_value, max_uses,
         starts_at, expires_at, active, created_by
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      normalized.code,
      normalized.campaign,
      normalized.discountType,
      normalized.discountValue,
      normalized.maxUses,
      normalized.startsAt,
      normalized.expiresAt,
      normalized.active ? 1 : 0,
      username || 'admin'
    ).run();
  } catch (error) {
    console.error('Unable to create promo.', error);
    return json({ error: 'Unable to create promo. It may already exist.' }, 409);
  }

  const promo = await fetchAdminPromo(env, normalized.code);
  return json({ promo }, 201);
}

async function updateAdminPromo(request, env, rawCode, username) {
  if (!env.DB) return json({ error: 'Promo database is not configured.' }, 503);

  const code = normalizePromoCode(rawCode);
  if (!code) return json({ error: 'Invalid promo code.' }, 400);

  const existing = await fetchAdminPromo(env, code);
  if (!existing) return json({ error: 'Promo not found.' }, 404);

  const parsed = await readPromoPayload(request);
  if (parsed.error) return json({ error: parsed.error }, 400);

  const normalized = normalizePromoPayload({ ...parsed.payload, code });
  if (normalized.error) return json({ error: normalized.error }, 400);

  await env.DB.prepare(
    `UPDATE promo_codes
     SET campaign = ?,
         discount_type = ?,
         discount_value = ?,
         max_uses = ?,
         starts_at = ?,
         expires_at = ?,
         active = ?,
         updated_at = datetime('now'),
         created_by = COALESCE(created_by, ?)
     WHERE code = ?`
  ).bind(
    normalized.campaign,
    normalized.discountType,
    normalized.discountValue,
    normalized.maxUses,
    normalized.startsAt,
    normalized.expiresAt,
    normalized.active ? 1 : 0,
    username || 'admin',
    code
  ).run();

  const promo = await fetchAdminPromo(env, code);
  return json({ promo });
}

async function deleteAdminPromo(env, rawCode) {
  if (!env.DB) return json({ error: 'Promo database is not configured.' }, 503);

  const code = normalizePromoCode(rawCode);
  if (!code) return json({ error: 'Invalid promo code.' }, 400);

  const promo = await fetchAdminPromo(env, code);
  if (!promo) return json({ error: 'Promo not found.' }, 404);

  if (Number(promo.uses || 0) > 0) {
    await env.DB.prepare(
      `UPDATE promo_codes
       SET active = 0, updated_at = datetime('now')
       WHERE code = ?`
    ).bind(code).run();
    return json({ disabled: true, code });
  }

  await env.DB.prepare('DELETE FROM promo_codes WHERE code = ?').bind(code).run();
  return json({ deleted: true, code });
}

async function listAdminPromoRedemptions(env, rawCode) {
  if (!env.DB) return json({ error: 'Promo database is not configured.' }, 503);

  const code = normalizePromoCode(rawCode);
  if (!code) return json({ error: 'Invalid promo code.' }, 400);

  const result = await env.DB.prepare(
    `SELECT
       r.id, r.order_id, r.promo_code, r.discount_cents, r.created_at,
       o.customer_name, o.customer_email, o.status, o.payment_status, o.total_cents, o.amount_paid_cents
     FROM promo_redemptions r
     LEFT JOIN orders o ON o.id = r.order_id
     WHERE UPPER(r.promo_code) = ?
     ORDER BY r.created_at DESC, r.id DESC
     LIMIT 100`
  ).bind(code).all();

  return json({ redemptions: result.results || [] });
}

async function fetchAdminPromo(env, code) {
  return env.DB.prepare(
    `SELECT
       p.code, p.campaign, p.discount_type, p.discount_value, p.max_uses,
       p.starts_at, p.expires_at, p.active, p.created_at, p.updated_at, p.created_by,
       COUNT(r.id) AS uses,
       COUNT(DISTINCT r.order_id) AS order_count,
       COALESCE(SUM(r.discount_cents), 0) AS discount_total_cents,
       COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.amount_paid_cents ELSE 0 END), 0) AS paid_revenue_cents
     FROM promo_codes p
     LEFT JOIN promo_redemptions r ON UPPER(r.promo_code) = p.code
     LEFT JOIN orders o ON o.id = r.order_id
     WHERE p.code = ?
     GROUP BY p.code`
  ).bind(code).first();
}

async function readPromoPayload(request) {
  try {
    return { payload: await request.json() };
  } catch {
    return { error: 'Invalid JSON body.' };
  }
}

function normalizePromoPayload(payload) {
  payload = payload || {};
  const code = normalizePromoCode(payload.code);
  const campaign = text(payload.campaign, 120);
  const discountType = text(payload.discountType || payload.discount_type || 'pct', 20).toLowerCase();
  const discountInput = Number(payload.discountValue ?? payload.discount_value);
  const maxUsesInput = payload.maxUses ?? payload.max_uses;
  const startsAt = normalizeDateOnly(payload.startsAt || payload.starts_at);
  const expiresAt = normalizeDateOnly(payload.expiresAt || payload.expires_at);

  if (!code) return { error: 'Promo code is required.' };
  if (code.length > 40) return { error: 'Promo code must be 40 characters or fewer.' };
  if (!campaign) return { error: 'Campaign is required.' };
  if (!['pct', 'amount'].includes(discountType)) return { error: 'Discount type must be pct or amount.' };
  if (!Number.isFinite(discountInput)) return { error: 'Discount value is required.' };

  const discountValue = Math.round(discountInput);
  if (discountType === 'pct' && (discountValue < 1 || discountValue > 100)) {
    return { error: 'Percent discounts must be between 1 and 100.' };
  }
  if (discountType === 'amount' && discountValue < 1) {
    return { error: 'Dollar discounts must be greater than zero.' };
  }

  let maxUses = null;
  if (maxUsesInput !== null && maxUsesInput !== undefined && String(maxUsesInput).trim() !== '') {
    maxUses = Math.round(Number(maxUsesInput));
    if (!Number.isFinite(maxUses) || maxUses < 1 || maxUses > 1000000) {
      return { error: 'Max uses must be between 1 and 1,000,000.' };
    }
  }

  if ((payload.startsAt || payload.starts_at) && !startsAt) {
    return { error: 'Start date must use YYYY-MM-DD.' };
  }
  if ((payload.expiresAt || payload.expires_at) && !expiresAt) {
    return { error: 'Expiry date must use YYYY-MM-DD.' };
  }

  return {
    code,
    campaign,
    discountType,
    discountValue,
    maxUses,
    startsAt: startsAt || null,
    expiresAt: expiresAt || null,
    active: payload.active !== false && payload.active !== 0 && payload.active !== 'false'
  };
}

async function validatePromoRequest(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const cart = normalizeCartItems(payload?.items);
  if (cart.error) return json({ error: cart.error }, 400);

  const validation = await validatePromo(env, payload.promoCode, cart.subtotalCents);
  if (validation.error) {
    return json({
      valid: false,
      msg: validation.error,
      subtotalCents: cart.subtotalCents,
      totalCents: cart.subtotalCents
    });
  }

  if (!validation.promo) {
    return json({
      valid: false,
      msg: 'Please enter a code.',
      subtotalCents: cart.subtotalCents,
      totalCents: cart.subtotalCents
    });
  }

  const discountCents = validation.promo.discountCents;
  return json({
    valid: true,
    code: validation.promo.code,
    campaign: validation.promo.campaign,
    label: validation.promo.label,
    discountCents,
    discountAmount: Number((discountCents / 100).toFixed(2)),
    subtotalCents: cart.subtotalCents,
    totalCents: Math.max(0, cart.subtotalCents - discountCents)
  });
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
    if (env.DB) {
      return json({
        error: 'Unable to save order before payment.',
        code: 'ORDER_SAVE_FAILED'
      }, 503);
    }
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

  const cart = normalizeCartItems(payload?.items);
  if (cart.error) return { error: cart.error };

  const promoValidation = await validatePromo(env, payload.promoCode, cart.subtotalCents);
  if (promoValidation.error) return { error: promoValidation.error };

  const promo = promoValidation.promo;
  const discountCents = promo ? promo.discountCents : 0;
  const totalCents = Math.max(0, cart.subtotalCents - discountCents);

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
      items: cart.items,
      promo,
      subtotalCents: cart.subtotalCents,
      discountCents,
      totalCents
    }
  };
}

function normalizeCartItems(rawItems) {
  const items = Array.isArray(rawItems) ? rawItems : [];
  if (!items.length) return { error: 'Cart is empty.' };
  if (items.length > MAX_ITEMS) return { error: 'Cart has too many line items.' };

  const normalizedItems = [];
  for (const item of items) {
    const product = resolveProduct(item);
    if (!product) return { error: `Unknown product: ${text(item?.name) || text(item?.id)}` };

    const qty = clampInt(item.qty, 1, MAX_QTY);
    const hasRush = String(item.id || '').endsWith('-rush') || /rush requested/i.test(String(item.meta || ''));
    const unitCents = product.cents + (hasRush ? 3000 : 0);

    normalizedItems.push({
      productId: product.id,
      name: product.name,
      detail: product.detail,
      quantity: qty,
      unitCents,
      meta: text(item.meta, 400),
      rush: hasRush
    });
  }

  const subtotalCents = normalizedItems.reduce((sum, item) => sum + item.unitCents * item.quantity, 0);
  return { items: normalizedItems, subtotalCents };
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
        unit_price_cents, rush_requested, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      order.id,
      item.productId,
      item.name,
      item.detail,
      item.quantity,
      item.unitCents,
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
}

async function markOrderPaymentFailed(env, { orderId, sessionId }) {
  if (!env.DB || !orderId) return;

  await env.DB.prepare(
    `UPDATE orders
     SET status = 'payment-failed',
         payment_status = 'failed',
         payment_reference = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).bind(sessionId || null, orderId).run();

  await env.DB.prepare(
    `INSERT INTO order_events (order_id, event_type, message)
     VALUES (?, 'payment_failed', 'Stripe asynchronous payment failed')`
  ).bind(orderId).run();
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

async function validatePromo(env, rawCode, subtotalCents) {
  const code = normalizePromoCode(rawCode);
  if (!code) return { promo: null };

  const dbPromo = await fetchPromoForCheckout(env, code);
  if (dbPromo.found) {
    return buildValidatedPromo(dbPromo.record, subtotalCents);
  }

  if (dbPromo.usedDb) {
    return { error: 'Code not recognised.' };
  }

  const fallback = PROMOS[code];
  if (!fallback) return { error: 'Code not recognised.' };

  const discountValue = fallback.type === 'pct'
    ? fallback.discount
    : Math.round(fallback.discount * 100);

  return buildValidatedPromo({
    code,
    campaign: fallback.campaign,
    discount_type: fallback.type,
    discount_value: discountValue,
    active: 1,
    uses: 0,
    max_uses: null
  }, subtotalCents);
}

async function fetchPromoForCheckout(env, code) {
  if (!env.DB) return { usedDb: false, found: false };

  try {
    const record = await env.DB.prepare(
      `SELECT
         p.code, p.campaign, p.discount_type, p.discount_value, p.max_uses,
         p.starts_at, p.expires_at, p.active,
         COUNT(r.id) AS uses
       FROM promo_codes p
       LEFT JOIN promo_redemptions r ON UPPER(r.promo_code) = p.code
       WHERE p.code = ?
       GROUP BY p.code`
    ).bind(code).first();

    return { usedDb: true, found: Boolean(record), record };
  } catch (error) {
    console.error('Unable to read promo_codes; falling back to seed promo map.', error);
    return { usedDb: false, found: false };
  }
}

function buildValidatedPromo(record, subtotalCents) {
  if (!record || Number(record.active || 0) !== 1) {
    return { error: 'Code is inactive.' };
  }

  const startsAt = promoDateToTime(record.starts_at, false);
  const expiresAt = promoDateToTime(record.expires_at, true);
  const now = Date.now();
  if (startsAt && startsAt > now) return { error: 'Code is not active yet.' };
  if (expiresAt && expiresAt < now) return { error: 'Code has expired.' };

  const uses = Number(record.uses || 0);
  const maxUses = record.max_uses === null || record.max_uses === undefined ? null : Number(record.max_uses);
  if (Number.isFinite(maxUses) && maxUses > 0 && uses >= maxUses) {
    return { error: 'Code has reached its usage limit.' };
  }

  const discountType = text(record.discount_type, 20).toLowerCase();
  const discountValue = Number(record.discount_value || 0);
  if (!['pct', 'amount'].includes(discountType) || !Number.isFinite(discountValue) || discountValue <= 0) {
    return { error: 'Code is not configured correctly.' };
  }

  const discountCents = discountType === 'pct'
    ? Math.round(subtotalCents * (discountValue / 100))
    : Math.min(subtotalCents, Math.round(discountValue));

  return {
    promo: {
      code: record.code,
      campaign: record.campaign,
      discountCents,
      discountType,
      discountValue,
      label: promoLabel(discountType, discountValue)
    }
  };
}

function promoLabel(discountType, discountValue) {
  if (discountType === 'pct') return `${discountValue}% off`;
  return `$${(discountValue / 100).toFixed(2)} off`;
}

function promoDateToTime(value, endOfDay) {
  const normalized = normalizeDateOnly(value);
  if (!normalized) return 0;
  const suffix = endOfDay ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
  const timestamp = Date.parse(`${normalized}${suffix}`);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizePromoCode(value) {
  return text(value, 80).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

function normalizeDateOnly(value) {
  const normalized = text(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
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
  return pathname === '/admin' || pathname.startsWith('/admin/');
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
