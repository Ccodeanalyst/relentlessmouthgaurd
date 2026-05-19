const STRIPE_CHECKOUT_URL = 'https://api.stripe.com/v1/checkout/sessions';
const BUSINESS_NAME = 'RELENTLESS Mouth Guards';
const MAX_ITEMS = 20;
const MAX_QTY = 10;
const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;
const ALLOWED_SHIPPING_COUNTRIES = ['US', 'CA', 'GB', 'AU'];

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
  IM1120: { discount: 20, type: 'pct', campaign: 'Fight Club Crate' },
  FIGHTEVO: { discount: 15, type: 'pct', campaign: 'FightEvo' },
  TEAMSRISUK50: { discount: 50, type: 'pct', campaign: 'Team Srisuk' },
  SWAYCITYMT: { discount: 30, type: 'pct', campaign: 'Sway City Muay Thai' },
  RMGSPONSOR81: { discount: 50, type: 'pct', campaign: 'RMG Sponsor' }
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
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

  const normalized = normalizeOrder(payload);
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

function normalizeOrder(payload) {
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
  const promo = validatePromo(payload.promoCode, subtotalCents);
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

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function validatePromo(rawCode, subtotalCents) {
  const code = text(rawCode).toUpperCase();
  if (!code) return null;

  const promo = PROMOS[code];
  if (!promo) return null;

  const discountCents = promo.type === 'pct'
    ? Math.round(subtotalCents * (promo.discount / 100))
    : Math.min(subtotalCents, Math.round(promo.discount * 100));

  return {
    code,
    campaign: promo.campaign,
    discountCents
  };
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
