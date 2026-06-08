/* ============================================
   RELENTLESS - Cart System (localStorage)
   ============================================ */

const CART_KEY = 'relentless_cart';

const Cart = {
  get() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch { return []; }
  },

  save(items) {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    this._updateBadges();
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items, count: this.count(items) } }));
  },

  add(item) {
    const items = this.get();
    const idx = items.findIndex(i => i.id === item.id);
    if (idx > -1) items[idx].qty += 1;
    else items.push({ ...item, qty: 1 });
    this.save(items);
    this.toast(`${item.name} added to cart`);
  },

  remove(id) {
    this.save(this.get().filter(i => i.id !== id));
  },

  updateQty(id, qty) {
    const items = this.get();
    const item = items.find(i => i.id === id);
    if (item) { item.qty = Math.max(1, parseInt(qty) || 1); this.save(items); }
  },

  clear() {
    localStorage.removeItem(CART_KEY);
    this._updateBadges();
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items: [], count: 0 } }));
  },

  count(items) {
    return (items || this.get()).reduce((s, i) => s + i.qty, 0);
  },

  subtotal() {
    return this.get().reduce((s, i) => s + i.price * i.qty, 0);
  },

  _updateBadges() {
    const n = this.count();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = n;
      el.style.display = n > 0 ? 'flex' : 'none';
    });
  },

  toast(msg) {
    document.querySelector('.relentless-toast')?.remove();
    const t = document.createElement('div');
    t.className = 'relentless-toast';
    t.innerHTML = `<span class="toast-check">&check;</span>${msg}`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
  }
};

document.addEventListener('DOMContentLoaded', () => Cart._updateBadges());
