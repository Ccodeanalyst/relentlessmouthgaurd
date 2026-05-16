// RELENTLESS Orders API foundation for a future Cloudflare Workers + D1 backend.
// This file is not wired into wrangler yet. Keep payments/email checkout as-is
// until the backend phase is ready to deploy.

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

    if (request.method === 'GET' && url.pathname === '/api/orders') {
      return listOrders(env);
    }

    if (request.method === 'POST' && url.pathname === '/api/orders') {
      return createOrder(request, env);
    }

    if (request.method === 'PATCH' && url.pathname.startsWith('/api/orders/')) {
      const id = url.pathname.split('/').pop();
      return updateOrderStatus(request, env, id);
    }

    return json({ error: 'Not found' }, 404);
  }
};

async function listOrders(env) {
  const result = await env.DB.prepare(
    `SELECT id, created_at, status, customer_name, customer_email, total_cents, promo_code
     FROM orders
     ORDER BY created_at DESC
     LIMIT 100`
  ).all();

  return json({ orders: result.results || [] });
}

async function createOrder(request, env) {
  const payload = await request.json();
  const id = payload.id || `ORD-${Date.now()}`;

  await env.DB.prepare(
    `INSERT INTO orders (
      id, status, customer_name, customer_email, customer_phone, shipping_address,
      sport, design_notes, promo_code, subtotal_cents, discount_cents, total_cents,
      email_opt_in
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    'pending',
    payload.name,
    payload.email,
    payload.phone || null,
    payload.address,
    payload.sport || null,
    payload.notes || null,
    payload.promo || null,
    dollarsToCents(payload.subtotal || 0),
    dollarsToCents(payload.discount || 0),
    dollarsToCents(payload.total || 0),
    payload.emailOptIn ? 1 : 0
  ).run();

  for (const item of payload.items || []) {
    await env.DB.prepare(
      `INSERT INTO order_items (
        order_id, product_id, product_name, quantity, unit_price_cents,
        image_path, meta
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      item.id,
      item.name,
      item.qty || 1,
      dollarsToCents(item.price || 0),
      item.img || null,
      item.meta || null
    ).run();
  }

  await env.DB.prepare(
    `INSERT INTO order_events (order_id, event_type, message)
     VALUES (?, 'created', 'Order request created')`
  ).bind(id).run();

  return json({ id, status: 'pending' }, 201);
}

async function updateOrderStatus(request, env, id) {
  const payload = await request.json();
  const status = payload.status;
  const allowed = new Set([
    'pending',
    'kit-shipped',
    'impressions-received',
    'proof-sent',
    'in-production',
    'shipped',
    'delivered',
    'cancelled'
  ]);

  if (!allowed.has(status)) {
    return json({ error: 'Invalid status' }, 400);
  }

  await env.DB.prepare(
    `UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(status, id).run();

  await env.DB.prepare(
    `INSERT INTO order_events (order_id, event_type, message)
     VALUES (?, 'status_changed', ?)`
  ).bind(id, `Status changed to ${status}`).run();

  return json({ id, status });
}

function dollarsToCents(value) {
  return Math.round(Number(value || 0) * 100);
}
