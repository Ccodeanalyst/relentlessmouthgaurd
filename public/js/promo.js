/* ============================================
   RELENTLESS — Promo Code Engine
   ============================================ */

const PROMO_KEY = 'relentless_promos';

/* Seed codes — always present unless overridden in localStorage */
const SEED_PROMOS = {
  'RELENTLESS15':  { discount: 15, type: 'pct', maxUses: 9999, uses: 0, expiry: '2028-12-31', campaign: 'General Launch',    created: '2026-01-01' },
  'WELCOME10':    { discount: 10, type: 'pct', maxUses: 9999, uses: 0, expiry: '2028-12-31', campaign: 'Welcome',           created: '2026-01-01' },
  'FIGHTCLUB501': { discount: 20, type: 'pct', maxUses:    1, uses: 0, expiry: '2027-06-30', campaign: 'Fight Club Crate',  created: '2026-01-01' },
  'FC15OFF':      { discount: 15, type: 'pct', maxUses:    1, uses: 0, expiry: '2027-06-30', campaign: 'Fight Club Crate',  created: '2026-01-01' },
  'IM1120':       { discount: 20, type: 'pct', maxUses:    1, uses: 0, expiry: '2027-06-30', campaign: 'Fight Club Crate',  created: '2026-01-01' },
};

const Promo = {
  getCodes() {
    try {
      const stored = JSON.parse(localStorage.getItem(PROMO_KEY) || '{}');
      return { ...SEED_PROMOS, ...stored };
    } catch { return { ...SEED_PROMOS }; }
  },

  saveCodes(codes) {
    localStorage.setItem(PROMO_KEY, JSON.stringify(codes));
  },

  validate(raw, subtotal) {
    const key = raw.trim().toUpperCase();
    if (!key) return { valid: false, msg: 'Please enter a code.' };
    const all = this.getCodes();
    const p   = all[key];
    if (!p)                  return { valid: false, msg: 'Code not recognised.' };
    if (p.uses >= p.maxUses) return { valid: false, msg: 'Code has reached its usage limit.' };
    if (new Date(p.expiry) < new Date()) return { valid: false, msg: 'Code has expired.' };

    const amount = p.type === 'pct'
      ? parseFloat(((subtotal * p.discount) / 100).toFixed(2))
      : Math.min(p.discount, subtotal);

    return {
      valid:    true,
      code:     key,
      amount,
      label:    p.type === 'pct' ? `${p.discount}% off` : `$${p.discount} off`,
      campaign: p.campaign
    };
  },

  redeem(code) {
    const key   = code.trim().toUpperCase();
    const codes = this.getCodes();
    if (codes[key]) { codes[key].uses += 1; this.saveCodes(codes); }
  },

  /* Generate bulk codes for a campaign */
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
