/* ============================================
   RELENTLESS — Promo Code Engine
   Validation is performed server-side via /api/validate-promo.
   No promo codes or discount values are stored in this file.
   ============================================ */

const PROMO_KEY = 'relentless_promos';

const Promo = {
  getCodes() {
    try { return JSON.parse(localStorage.getItem(PROMO_KEY) || '{}'); }
    catch { return {}; }
  },

  saveCodes(codes) {
    localStorage.setItem(PROMO_KEY, JSON.stringify(codes));
  },

  /* Validate a promo code against the server. Returns a result object.
     subtotalDollars — the current cart subtotal in dollars (e.g. 99.00). */
  async validate(raw, subtotalDollars) {
    const key = String(raw || '').trim().toUpperCase();
    if (!key) return { valid: false, msg: 'Please enter a code.' };

    try {
      const response = await fetch('/api/validate-promo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: key, subtotalCents: Math.round(subtotalDollars * 100) })
      });
      const data = await response.json();
      if (!data.valid) return { valid: false, msg: data.msg || 'Code not recognised.' };
      return {
        valid:    true,
        code:     data.code,
        amount:   data.discountCents / 100,
        label:    data.label,
        campaign: data.campaign
      };
    } catch {
      return { valid: false, msg: 'Unable to validate code. Please try again.' };
    }
  },

  /* Usage redemption is enforced server-side. This is a no-op kept for call-site compatibility. */
  redeem(_code) {},

  /* Generate bulk codes for a campaign (stored locally for admin tracking). */
  generate({ campaign, count = 1, discount = 15, type = 'pct', maxUses = 1, expiry = '2027-12-31' }) {
    const codes  = this.getCodes();
    const prefix = campaign.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);
    const today  = new Date().toISOString().slice(0, 10);
    const out    = [];

    for (let i = 0; i < count; i++) {
      let code;
      do { code = `${prefix}${String(Math.floor(Math.random() * 9000) + 1000)}`; }
      while (codes[code]);

      codes[code] = { discount, type, maxUses, uses: 0, expiry, campaign, created: today };
      out.push(code);
    }

    this.saveCodes(codes);
    return out;
  },

  deleteCode(code) {
    const codes = this.getCodes();
    delete codes[code.trim().toUpperCase()];
    this.saveCodes(codes);
  },

  resetUsage(code) {
    const key   = code.trim().toUpperCase();
    const codes = this.getCodes();
    if (codes[key]) { codes[key].uses = 0; this.saveCodes(codes); }
  },

  getAll() { return this.getCodes(); },

  stats() {
    const all    = this.getCodes();
    const keys   = Object.keys(all);
    const active = keys.filter(k => all[k].uses < all[k].maxUses && new Date(all[k].expiry) >= new Date());
    return { total: keys.length, active: active.length, totalUses: keys.reduce((s, k) => s + all[k].uses, 0) };
  }
};
