// สถานะการทำงานของระบบ
const state = {
  currentUser: null,
  services: [],
  cart: {},
  currentAppView: 'landing',
  orders: [],
  riders: [],
  selectedPaymentMethod: 'PROMPTPAY',
  currentRiderId: 'RIDER-01'
};

// ฟังก์ชันเรียกใช้งาน API ฝั่ง Backend
const API = {
  register: (data) => fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  login: (data) => fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  getServices: () => fetch('/api/services').then(r => r.json()),
  getOrders: (query = '') => fetch(`/api/orders${query}`).then(r => r.json()),
  getOrder: (id) => fetch(`/api/orders/${id}`).then(r => r.json()),
  createOrder: (data) => fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  updateStatus: (id, status, note = '') => fetch(`/api/orders/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note })
  }).then(r => r.json()),
  payOrder: (id, method) => fetch(`/api/orders/${id}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method })
  }).then(r => r.json()),
  adjustOrderPrice: (id, data) => fetch(`/api/orders/${id}/adjust-price`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  approveOrderPrice: (id, action = 'approve', reason = '') => fetch(`/api/orders/${id}/approve-price`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, reason })
  }).then(r => r.json()),
  confirmDelivery: (id) => fetch(`/api/orders/${id}/confirm-delivery`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }).then(r => r.json()),
  updateProfile: (id, data) => fetch(`/api/auth/profile/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  deleteAccount: (id) => fetch(`/api/auth/profile/${id}`, {
    method: 'DELETE'
  }).then(r => r.json()),
  getStats: () => fetch('/api/stats').then(r => r.json()),
  getRiders: () => fetch('/api/riders').then(r => r.json()),
  updateOrder: (id, data) => fetch(`/api/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json()),
  getUsers: () => fetch('/api/auth/users').then(r => r.json()),
  createUser: (data) => fetch('/api/auth/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(r => r.json())
};

// รายละเอียดและสีของแต่ละสถานะ
const STATUS_CONFIG = {
  ORDER_PLACED: { label: 'สั่งออเดอร์แล้ว', icon: '📝', cls: 'status-ORDER_PLACED' },
  RIDER_ASSIGNED: { label: 'จัดสรรไรเดอร์แล้ว', icon: '🛵', cls: 'status-RIDER_ASSIGNED' },
  PICKED_UP: { label: 'รับผ้าแล้ว (เข้าร้าน)', icon: '🧺', cls: 'status-PICKED_UP' },
  WAIT_PRICE_CONFIRM: { label: 'รอลูกค้ายืนยันราคา', icon: '⚖️', cls: 'status-WAIT_PRICE_CONFIRM' },
  IN_WASHING: { label: 'กำลังซัก / อบ / รีด', icon: '🧼', cls: 'status-IN_WASHING' },
  WASHED_READY: { label: 'ซักเสร็จ พร้อมจัดส่ง', icon: '✨', cls: 'status-WASHED_READY' },
  OUT_FOR_DELIVERY: { label: 'กำลังนำส่งลูกค้า', icon: '🚚', cls: 'status-OUT_FOR_DELIVERY' },
  DELIVERED: { label: 'จัดส่งแล้ว (รอตรวจรับ)', icon: '🚚', cls: 'status-DELIVERED' },
  COMPLETED: { label: 'เสร็จสิ้น (ยืนยันรับผ้าแล้ว)', icon: '✅', cls: 'status-COMPLETED' },
  CANCELLED: { label: 'ยกเลิก', icon: '❌', cls: 'status-CANCELLED' }
};

// กล่องข้อความแจ้งเตือน (Toast)
function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✅' : (type === 'error' ? '❌' : 'ℹ️');
  toast.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// เริ่มต้นโหลดข้อมูลเมื่อเปิดหน้าเว็บ
document.addEventListener('DOMContentLoaded', async () => {
  initAuth();
  await loadInitialData();
  setupBookingForm();
  setupOrderFlowForm();
  setupAuthForms();
  if (typeof syncScheduleWithPlan === 'function') syncScheduleWithPlan(false);
  updateOrderFlowTotals();
  startLiveTrackingPoll();
});

// ฟังก์ชันสลับหน้า (Landing, Order, Pricing, Privacy, Terms, Tracking, Profile, Rider, Staff, Admin)
window.switchAppView = function (viewName) {
  if ((viewName === 'order' || viewName === 'tracking' || viewName === 'profile') && !state.currentUser) {
    window.pendingAppView = viewName;
    const actionText = viewName === 'order' ? 'สั่งจองบริการ' : (viewName === 'tracking' ? 'ตรวจสอบสถานะผ้า' : 'ดูข้อมูลบัญชีผู้ใช้งาน');
    showToast(`กรุณาเข้าสู่ระบบก่อน${actionText} 🔐`, 'info');
    openAuthModal('login');
    return;
  }

  // ป้องกันความปลอดภัย: เฉพาะเจ้าหน้าที่ที่มีสิทธิ์เท่านั้นที่สามารถเปิดหน้าระบบงานหลังบ้านได้
  const userRole = (state.currentUser?.role || '').toLowerCase();
  if (viewName === 'rider' && (!state.currentUser || (userRole !== 'rider' && userRole !== 'admin'))) {
    showToast('หน้านี้สงวนสิทธิ์เฉพาะพนักงานจัดส่ง (Rider) เท่านั้น 🛵', 'error');
    return;
  }
  if (viewName === 'staff' && (!state.currentUser || (userRole !== 'staff' && userRole !== 'admin'))) {
    showToast('หน้านี้สงวนสิทธิ์เฉพาะเจ้าหน้าที่ซักรีด (Staff) เท่านั้น 🧼', 'error');
    return;
  }
  if (viewName === 'admin' && (!state.currentUser || userRole !== 'admin')) {
    showToast('หน้านี้สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น 🛡️', 'error');
    return;
  }

  state.currentAppView = viewName;

  document.querySelectorAll('.role-pill-btn').forEach(b => {
    b.classList.toggle('active', b.innerText.toLowerCase().includes(viewName));
  });

  document.querySelectorAll('.app-view-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `app-view-${viewName}`);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewName === 'order') {
    prefillCustomerForms();
    if (typeof syncScheduleWithPlan === 'function') syncScheduleWithPlan(false);
  }
  else if (viewName === 'tracking') {
    window.customerOrderTab = 'active';
    const searchInput = document.getElementById('tracking-search-input');
    if (searchInput) searchInput.value = '';
    loadTrackingView();
  }
  else if (viewName === 'profile') loadProfileView();
  else if (viewName === 'rider') loadRiderView();
  else if (viewName === 'staff') loadStaffView();
  else if (viewName === 'admin') loadAdminView();
};

// FAQ Accordion
window.toggleFaq = function (btn) {
  const item = btn.closest('.faq-item');
  const isActive = item.classList.contains('active');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
  if (!isActive) item.classList.add('active');
};

// Campus on Pricing Page (มรพส. ทะเลแก้ว)
window.setPricingCity = function (campus = 'psru_tk') {
  const tkBtn = document.getElementById('btn-city-bkk');
  if (tkBtn) tkBtn.classList.add('active');

  const priceEco = document.getElementById('price-economy');
  const priceStd = document.getElementById('price-standard');
  const priceExp = document.getElementById('price-express');

  if (priceEco) priceEco.innerText = '35';
  if (priceStd) priceStd.innerText = '49';
  if (priceExp) priceExp.innerText = '69';
};

// Navigate directly to 6-Step Order Flow and select plan
window.goToOrderPage = function (planKey = 'standard') {
  if (!state.currentUser) {
    window.pendingOrderPlan = planKey;
    window.pendingAppView = 'order';
    showToast('กรุณาเข้าสู่ระบบก่อนสั่งจองบริการ 🔐', 'info');
    openAuthModal('login');
    return;
  }
  switchAppView('order');
  if (typeof selectOrderPlan === 'function') {
    selectOrderPlan(planKey);
  }
};

// Booking Modal -> Route to dedicated Order Flow Page
window.openBookingModal = function (tier = 'standard') {
  goToOrderPage(tier);
};

window.closeBookingModal = function () {
  const el = document.getElementById('booking-modal');
  if (el) el.classList.remove('active');
};

// Terms of Service Modal Handlers
window.openTermsModal = function () {
  const el = document.getElementById('terms-modal');
  if (el) el.classList.add('active');
};

window.closeTermsModal = function () {
  const el = document.getElementById('terms-modal');
  if (el) el.classList.remove('active');
};

window.acceptTermsAndCloseModal = function () {
  const chk = document.getElementById('order-terms-checkbox');
  if (chk) chk.checked = true;
  closeTermsModal();
  showToast('ข้าพเจ้ายอมรับเงื่อนไขการบริการ DekDry @ PSRU เรียบร้อย ✅', 'success');
};

// Footer Navigation & Actions
window.goToSupportSection = function () {
  switchAppView('landing');
  setTimeout(() => {
    const el = document.getElementById('faq');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
};

window.showLanguageNotice = function () {
  showToast('ระบบนี้ยังไม่ได้ทำ', 'info');
};

window.goToCoverageSection = function (zone) {
  switchAppView('landing');
  setTimeout(() => {
    const el = document.getElementById('coverage');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (zone) {
      showToast(`📍 พื้นที่ให้บริการ: ${zone}`, 'info');
    }
  }, 100);
};

// เติมข้อมูลลูกค้าอัตโนมัติเมื่อเข้าสู่ระบบ (เชื่อมกับข้อมูลตอนสมัครสมาชิก)
function prefillCustomerForms() {
  if (!state.currentUser) return;
  const u = state.currentUser;

  const orderName = document.getElementById('order-cust-name');
  const orderPhone = document.getElementById('order-cust-phone');
  const orderEmail = document.getElementById('order-cust-email');
  const orderAddr = document.getElementById('order-cust-address');
  if (orderName) orderName.value = u.name || '';
  if (orderPhone) orderPhone.value = u.phone || '';
  if (orderEmail) orderEmail.value = u.email || '';
  if (orderAddr) orderAddr.value = u.address || '';
}

// Load Initial Data
async function loadInitialData() {
  try {
    const [srvRes, ridersRes] = await Promise.all([
      API.getServices(),
      API.getRiders()
    ]);
    if (srvRes.success) {
      state.services = srvRes.data;
      state.cart[state.services[0].id] = 5; // default 5 kg
    }
    if (ridersRes.success) {
      state.riders = ridersRes.data;
    }
  } catch (err) {
    console.error(err);
  }
}

// Render Services in Booking Wizard
function renderServicesGrid() {
  const grid = document.getElementById('services-grid');
  if (!grid) return;

  grid.innerHTML = state.services.map(srv => {
    const qty = state.cart[srv.id] || 0;
    const isSelected = qty > 0;
    return `
      <div class="service-card ${isSelected ? 'selected' : ''}" id="srv-card-${srv.id}">
        ${srv.popular ? '<span class="popular-badge">ยอดนิยม 🔥</span>' : ''}
        <div class="service-icon">${srv.icon}</div>
        <div class="service-name">${srv.name}</div>
        <div class="service-desc">${srv.description}</div>
        <div class="service-footer">
          <div>
            <span class="service-price">฿${srv.pricePerUnit}</span>
            <span style="font-size:0.75rem; color:#64748b;">/${srv.unit}</span>
          </div>
          <div class="qty-control">
            <button type="button" class="qty-btn" onclick="changeQty('${srv.id}', -1)">-</button>
            <span class="qty-val" id="qty-${srv.id}">${qty}</span>
            <button type="button" class="qty-btn" onclick="changeQty('${srv.id}', 1)">+</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

window.changeQty = function (serviceId, delta) {
  const current = state.cart[serviceId] || 0;
  const next = Math.max(0, current + delta);
  if (next === 0) delete state.cart[serviceId];
  else state.cart[serviceId] = next;

  const valEl = document.getElementById(`qty-${serviceId}`);
  if (valEl) valEl.innerText = next;

  const card = document.getElementById(`srv-card-${serviceId}`);
  if (card) card.classList.toggle('selected', next > 0);

  updateCartSummary();
};

function updateCartSummary() {
  const listEl = document.getElementById('summary-items-list');
  const subtotalEl = document.getElementById('summary-subtotal');
  const discountEl = document.getElementById('summary-discount');
  const totalEl = document.getElementById('summary-total');

  let subtotal = 0;
  const itemsHtml = [];

  Object.entries(state.cart).forEach(([id, qty]) => {
    const srv = state.services.find(s => s.id === id);
    if (srv && qty > 0) {
      const lineTotal = srv.pricePerUnit * qty;
      subtotal += lineTotal;
      itemsHtml.push(`
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; padding:0.25rem 0; border-bottom:1px solid #f1f5f9;">
          <span>${srv.icon} ${srv.name} (${qty} ${srv.unit})</span>
          <strong>฿${lineTotal}</strong>
        </div>
      `);
    }
  });

  if (itemsHtml.length === 0) {
    listEl.innerHTML = '<div style="color:#94a3b8; font-size:0.85rem; text-align:center; padding:0.5rem;">ยังไม่ได้เลือกบริการ (กด + เพื่อเพิ่มจำนวน)</div>';
  } else {
    listEl.innerHTML = itemsHtml.join('');
  }

  const deliveryFee = subtotal > 0 ? 40 : 0;
  const discount = subtotal >= 500 ? 50 : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  if (subtotalEl) subtotalEl.innerText = `฿${subtotal}`;
  if (discountEl) discountEl.innerText = discount > 0 ? `-฿${discount}` : '฿0';
  if (totalEl) totalEl.innerText = `฿${total}`;
}

// Address Helper
window.fillAddress = function (type) {
  const addr = document.getElementById('cust-address');
  const name = document.getElementById('cust-name');
  const phone = document.getElementById('cust-phone');
  if (type === 'condo' || type === 'dorm_tk') {
    name.value = 'นางสาวพิมลดา สุวรรณ (นศ. 65123456)';
    phone.value = '089-123-4567';
    addr.value = 'หอพักนักศึกษาหญิง อาคาร 2 ห้อง 314 มหาวิทยาลัยราชภัฏพิบูลสงคราม (ทะเลแก้ว)';
  } else if (type === 'home' || type === 'dorm_wc') {
    name.value = 'นายกิตติศักดิ์ ชัยชนะ (นศ. 64198765)';
    phone.value = '081-987-6543';
    addr.value = 'หอพักนักศึกษาชาย อาคาร 1 ห้อง 205 มหาวิทยาลัยราชภัฏพิบูลสงคราม (ทะเลแก้ว)';
  }
  showToast('กรอกข้อมูลจำลองหอพัก มรพส. เรียบร้อย ✨');
};

// Booking Form Logic
function setupBookingForm() {
  const form = document.getElementById('booking-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const items = Object.entries(state.cart).map(([id, qty]) => {
        const srv = state.services.find(s => s.id === id);
        return {
          serviceId: id,
          serviceName: srv ? srv.name : id,
          quantity: qty,
          pricePerUnit: srv ? srv.pricePerUnit : 0
        };
      }).filter(i => i.quantity > 0);

      if (items.length === 0) {
        showToast('กรุณาเลือกบริการอย่างน้อย 1 รายการ', 'error');
        return;
      }

      const orderData = {
        userId: state.currentUser ? state.currentUser.id : null,
        customer: {
          name: document.getElementById('cust-name').value.trim(),
          phone: document.getElementById('cust-phone').value.trim(),
          address: document.getElementById('cust-address').value.trim(),
          note: document.getElementById('cust-note').value.trim()
        },
        items: items,
        preferences: {
          detergent: document.getElementById('pref-detergent').value,
          softener: document.getElementById('pref-softener').value,
          packaging: document.getElementById('pref-pack').value
        },
        paymentMethod: 'PROMPTPAY'
      };

      // Open PromptPay Modal
      openPaymentModal(orderData);
    });
  }
}

function openPaymentModal(orderData) {
  const modal = document.getElementById('payment-modal');
  const amountEl = document.getElementById('modal-pay-amount');
  const subtotal = orderData.items.reduce((s, i) => s + (i.pricePerUnit * i.quantity), 0);
  const deliveryFee = 40;
  const discount = subtotal >= 500 ? 50 : 0;
  const total = subtotal + deliveryFee - discount;

  amountEl.innerText = `฿${total}`;
  modal.classList.add('active');

  const confirmBtn = document.getElementById('btn-confirm-pay');
  confirmBtn.onclick = async () => {
    confirmBtn.innerText = 'กำลังสร้างคำสั่งซื้อ...';
    confirmBtn.disabled = true;

    try {
      const res = await API.createOrder(orderData);
      if (res.success) {
        confirmBtn.innerText = 'ยืนยันการชำระเงิน';
        confirmBtn.disabled = false;
        closePaymentModal();
        closeBookingModal();
        showToast('🎉 สั่งซักผ้าสำเร็จ! ไรเดอร์กำลังเตรียมเข้ารับผ้า', 'success');
        switchAppView('tracking');
        loadTrackingView(res.data ? res.data.id : null);
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      confirmBtn.disabled = false;
    }
  };
}

window.closePaymentModal = function () {
  document.getElementById('payment-modal').classList.remove('active');
};

// ========================================================
// 6-Step PSRU Campus Laundry Order Flow Logic
// (ตารางแพ็กเกจข้อ 1 และตารางเวลารับส่งข้อ 2 เชื่อมโยงกันแบบไดนามิก)
// ========================================================
const SCHEDULE_PLAN_CONFIG = {
  economy: {
    key: 'economy',
    name: 'แบบประหยัด',
    fullName: 'แบบประหยัด — 3 วัน (ชุดอยู่หอ/ทั่วไป)',
    durationDays: 3,
    durationText: '3 วัน',
    icon: '🍃',
    badgeText: '🍃 ส่งคืนหลังรับผ้า 3 วัน',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
    cardBorder: '#86efac',
    cardBg: '#f0fdf4',
    returnTag: '(3 วันตามแพ็กเกจประหยัด)'
  },
  standard: {
    key: 'standard',
    name: 'แบบมาตรฐาน',
    fullName: 'แบบมาตรฐาน — วันถัดไป (ซัก-อบ-พับหอม)',
    durationDays: 1,
    durationText: 'วันถัดไป (24 ชม.)',
    icon: '⭐',
    badgeText: '⭐ ส่งคืนวันถัดไป (24 ชม.)',
    badgeBg: '#fef3c7',
    badgeColor: '#b45309',
    cardBorder: '#fde047',
    cardBg: '#fffbeb',
    returnTag: '(วันถัดไป 24 ชม.)'
  },
  express: {
    key: 'express',
    name: 'แบบเร่งด่วน',
    fullName: 'แบบเร่งด่วน — วันเดียวกัน (ทันใส่สอบ/กิจกรรม)',
    durationDays: 0,
    durationText: 'วันเดียวกัน (ด่วน 4-6 ชม.)',
    icon: '⚡',
    badgeText: '⚡ ส่งคืนวันเดียวกัน (ด่วน 4-6 ชม.)',
    badgeBg: '#ffedd5',
    badgeColor: '#c2410c',
    cardBorder: '#fdba74',
    cardBg: '#fff7ed',
    returnTag: '(วันเดียวกัน ด่วน 4-6 ชม.)'
  }
};

const AVAILABLE_DAYS = [
  { dayIndex: 0, dayName: 'ศ.', dayFull: 'วันศุกร์', num: 2, month: 'ต.ค.', year: 2026 },
  { dayIndex: 1, dayName: 'ส.', dayFull: 'วันเสาร์', num: 3, month: 'ต.ค.', year: 2026 },
  { dayIndex: 2, dayName: 'อา.', dayFull: 'วันอาทิตย์', num: 4, month: 'ต.ค.', year: 2026 },
  { dayIndex: 3, dayName: 'จ.', dayFull: 'วันจันทร์', num: 5, month: 'ต.ค.', year: 2026 },
  { dayIndex: 4, dayName: 'อ.', dayFull: 'วันอังคาร', num: 6, month: 'ต.ค.', year: 2026 },
  { dayIndex: 5, dayName: 'พ.', dayFull: 'วันพุธ', num: 7, month: 'ต.ค.', year: 2026 },
  { dayIndex: 6, dayName: 'พฤ.', dayFull: 'วันพฤหัสบดี', num: 8, month: 'ต.ค.', year: 2026 },
  { dayIndex: 7, dayName: 'ศ.', dayFull: 'วันศุกร์', num: 9, month: 'ต.ค.', year: 2026 }
];

const orderFlow = {
  region: 'psru_tk',
  plan: 'standard', // 'economy' | 'standard' | 'express'
  rates: {
    psru_tk: { economy: 35, standard: 49, express: 69 }
  },
  pickupDayIndex: 0,
  pickupDate: 'ศ. 2 ต.ค.',
  pickupDateFull: 'ศ. 2 ต.ค. 2026',
  pickupSlot: '10:00 — 12:00',
  returnDate: 'ส. 3 ต.ค.',
  returnDateFull: 'ส. 3 ต.ค. 2026',
  returnSlot: '10:00 — 12:00',
  weight: 1,
  ironing: { label: 'พับผ้า', price: 0 },
  softener: { label: 'กลิ่นอ่อนโยน', pricePerKg: 0 },
  temp: { label: 'น้ำเย็น — 30°C', pricePerKg: 0 },
  drying: { label: 'เครื่องอบผ้า (อุณหภูมิต่ำ)', pricePerKg: 0 },
  hasBedding: false,
  minCharge: 80
};

window.setOrderRegion = function (region = 'psru_tk') {
  orderFlow.region = 'psru_tk';
  const tkBtn = document.getElementById('order-city-bkk');
  if (tkBtn) tkBtn.classList.add('active');

  const rates = orderFlow.rates.psru_tk;
  const ecoEl = document.querySelector('#plan-opt-economy .price-num');
  const stdEl = document.querySelector('#plan-opt-standard .price-num');
  const expEl = document.querySelector('#plan-opt-express .price-num');
  if (ecoEl) ecoEl.innerText = `฿${rates.economy}`;
  if (stdEl) stdEl.innerText = `฿${rates.standard}`;
  if (expEl) expEl.innerText = `฿${rates.express}`;

  updateOrderFlowTotals();
};

// เลือกแพ็กเกจในข้อ 1 -> อัปเดตตารางเวลาข้อ 2 ทันที
window.selectOrderPlan = function (planKey) {
  orderFlow.plan = planKey;
  ['economy', 'standard', 'express'].forEach(k => {
    const card = document.getElementById(`plan-opt-${k}`);
    if (card) card.classList.toggle('selected', k === planKey);
  });

  // ซิงค์ตารางเวลาในข้อ 2 ให้สอดคล้องกับแพ็กเกจที่เลือก
  syncScheduleWithPlan(true);
};

// เลือกวันที่นัดรับผ้าในข้อ 2 -> คำนวณวันส่งคืนใหม่อัตโนมัติตามแพ็กเกจ
window.selectPickupDayIndex = function (idx) {
  orderFlow.pickupDayIndex = Number(idx);
  document.querySelectorAll('#pickup-date-tabs .date-tab-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i === Number(idx));
  });

  // คำนวณวันส่งคืนและอัปเดตสรุป
  syncScheduleWithPlan(true);
};

// ฟังก์ชันรองรับการคลิกแบบเดิม (fallback)
window.selectPickupDate = function (el) {
  const tabs = Array.from(document.querySelectorAll('#pickup-date-tabs .date-tab-btn'));
  const idx = tabs.indexOf(el);
  if (idx !== -1) {
    selectPickupDayIndex(idx);
  } else {
    const dayName = el.querySelector('.day-name')?.innerText || '';
    const dayNum = el.querySelector('.day-num')?.innerText || '';
    orderFlow.pickupDate = `${dayName} ${dayNum} ต.ค.`;
    syncScheduleWithPlan(true);
  }
};

// ฟังก์ชันหลัก: เชื่อมโยงแพ็กเกจบริการ (ข้อ 1) กับกำหนดเวลารับ-ส่งผ้า (ข้อ 2)
window.syncScheduleWithPlan = function (shouldAnimate = false) {
  const plan = orderFlow.plan || 'standard';
  const planCfg = SCHEDULE_PLAN_CONFIG[plan] || SCHEDULE_PLAN_CONFIG.standard;
  const pickupIdx = orderFlow.pickupDayIndex || 0;
  const pickupDay = AVAILABLE_DAYS[pickupIdx] || AVAILABLE_DAYS[0];

  // 1. คำนวณวันส่งคืนตามระยะเวลาของแพ็กเกจ
  const returnIdx = pickupIdx + planCfg.durationDays;
  const returnDay = AVAILABLE_DAYS[returnIdx] || {
    dayIndex: returnIdx,
    dayName: 'วันถัดไป',
    dayFull: 'วันถัดไป',
    num: pickupDay.num + planCfg.durationDays,
    month: pickupDay.month,
    year: pickupDay.year
  };

  orderFlow.pickupDate = `${pickupDay.dayName} ${pickupDay.num} ${pickupDay.month}`;
  orderFlow.pickupDateFull = `${pickupDay.dayName} ${pickupDay.num} ${pickupDay.month} ${pickupDay.year}`;
  orderFlow.returnDate = `${returnDay.dayName} ${returnDay.num} ${returnDay.month}`;
  orderFlow.returnDateFull = `${returnDay.dayName} ${returnDay.num} ${returnDay.month} ${returnDay.year}`;

  // 2. อัปเดตแถบ Sync Banner ด้านบนตารางเวลาข้อ 2
  const banner = document.getElementById('schedule-sync-banner');
  const bannerIcon = document.getElementById('sync-banner-icon');
  const bannerTitle = document.getElementById('sync-banner-title');
  const bannerBadge = document.getElementById('sync-banner-badge');

  if (banner) {
    banner.style.background = planCfg.cardBg;
    banner.style.borderColor = planCfg.cardBorder;
  }
  if (bannerIcon) bannerIcon.innerText = planCfg.icon;
  if (bannerTitle) bannerTitle.innerText = planCfg.fullName;
  if (bannerBadge) {
    bannerBadge.innerText = planCfg.badgeText;
    bannerBadge.style.background = planCfg.badgeBg;
    bannerBadge.style.color = planCfg.badgeColor;
  }

  // 3. อัปเดตหัวข้อวันนัดรับผ้า (Pickup Header)
  const pickupHeader = document.getElementById('pickup-date-header');
  if (pickupHeader) {
    let dayWord = 'today';
    if (pickupIdx === 0) {
      dayWord = 'today';
    } else if (pickupIdx === 1) {
      dayWord = 'tomorrow';
    } else {
      dayWord = 'on';
    }
    pickupHeader.innerHTML = `📅 Collection ${dayWord} (${orderFlow.pickupDateFull})`;
  }

  // 4. อัปเดตกล่องกำหนดส่งคืนผ้า (Return Schedule Block)
  const returnBlock = document.getElementById('return-schedule-block');
  const returnHeader = document.getElementById('return-date-header');
  const durationBadge = document.getElementById('return-plan-duration-badge');

  if (returnBlock) {
    returnBlock.style.background = planCfg.cardBg;
    returnBlock.style.borderColor = planCfg.cardBorder;
    if (shouldAnimate) {
      returnBlock.style.transform = 'scale(1.015)';
      returnBlock.style.boxShadow = '0 6px 16px rgba(2, 132, 199, 0.18)';
      setTimeout(() => {
        returnBlock.style.transform = 'scale(1)';
        returnBlock.style.boxShadow = 'none';
      }, 350);
    }
  }

  if (returnHeader) {
    if (plan === 'express') {
      returnHeader.innerHTML = `⚡ Return on ${orderFlow.returnDateFull} <span style="color:#c2410c; font-size:0.85rem; font-weight:700;">(วันเดียวกัน ด่วน 4-6 ชม.)</span>`;
    } else if (plan === 'economy') {
      returnHeader.innerHTML = `🚚 Return on ${orderFlow.returnDateFull} <span style="color:#15803d; font-size:0.85rem; font-weight:700;">(3 วันตามแพ็กเกจประหยัด)</span>`;
    } else {
      returnHeader.innerHTML = `🚚 Return on ${orderFlow.returnDateFull} <span style="color:#0284c7; font-size:0.85rem; font-weight:700;">(วันถัดไป 24 ชม.)</span>`;
    }
  }

  if (durationBadge) {
    durationBadge.innerText = `ระยะเวลา: ${planCfg.durationText}`;
    durationBadge.style.background = planCfg.badgeBg;
    durationBadge.style.color = planCfg.badgeColor;
  }

  // 5. ปรับรอบเวลาส่งคืนผ้าให้สอดคล้องกับแพ็กเกจ (โดยเฉพาะแบบเร่งด่วนที่ส่งวันเดียวกัน)
  renderReturnTimeSlots(plan);

  // 6. อัปเดตยอดรวมและกล่องสรุปคำสั่งซื้อ
  updateOrderFlowTotals();
};

// เรนเดอร์รอบเวลาส่งคืนผ้าตามเงื่อนไขของแพ็กเกจ
window.renderReturnTimeSlots = function (plan) {
  const container = document.getElementById('return-time-slots-container');
  if (!container) return;

  let slots = [];
  const currentPickup = orderFlow.pickupSlot || '10:00 — 12:00';

  if (plan === 'express') {
    // แพ็กเกจด่วนวันเดียวกัน: รอบส่งคืนจะสัมพันธ์กับรอบรับผ้า (หลังรับ 4-6 ชม.)
    if (currentPickup.includes('10:00')) {
      slots = [
        { time: '16:00 — 18:00', badge: '⚡ ด่วน 4-6 ชม. ทันใจ' },
        { time: '18:00 — 20:00', badge: 'รอบค่ำ' }
      ];
    } else if (currentPickup.includes('12:00')) {
      slots = [
        { time: '17:00 — 19:00', badge: '⚡ ด่วน 4-6 ชม. ทันใจ' },
        { time: '19:00 — 21:00', badge: 'รอบค่ำ' }
      ];
    } else if (currentPickup.includes('14:00')) {
      slots = [
        { time: '19:00 — 21:00', badge: '⚡ ด่วนรอบค่ำ' },
        { time: '21:00 — 22:30', badge: 'รอบดึก' }
      ];
    } else {
      slots = [
        { time: '21:30 — 22:30', badge: '⚡ ด่วนรอบดึก คืนนี้' },
        { time: '08:00 — 10:00', badge: 'เช้าตรู่วันรุ่งขึ้น' }
      ];
    }
  } else {
    // แพ็กเกจมาตรฐาน และ ประหยัด: รอบส่งคืนมีครบทุกช่วงเวลา
    slots = [
      { time: '10:00 — 12:00', badge: 'รอบเช้า' },
      { time: '14:00 — 16:00', badge: 'รอบบ่าย' },
      { time: '16:00 — 18:00', badge: 'รอบเย็น' }
    ];
  }

  // เลือกรอบเวลาเริ่มต้นหากยังไม่มีการเลือก
  if (!slots.some(s => s.time === orderFlow.returnSlot)) {
    orderFlow.returnSlot = slots[0].time;
  }

  container.innerHTML = slots.map((s, idx) => {
    const isSel = (s.time === orderFlow.returnSlot) || (!orderFlow.returnSlot && idx === 0);
    return `
      <div class="time-slot-option ${isSel ? 'selected' : ''}" data-slot-type="return" onclick="selectTimeSlot(this, 'return')">
        <span>🕒 ${s.time}</span>
        <div style="display:flex; align-items:center; gap:0.4rem;">
          ${s.badge ? `<span style="font-size:0.75rem; color:#64748b;">${s.badge}</span>` : ''}
          <span class="slot-check-icon">✓</span>
        </div>
      </div>
    `;
  }).join('');
};

window.selectTimeSlot = function (el, type) {
  if (type === 'pickup') {
    const pickupSlots = document.querySelectorAll('#step-schedule-card .time-slot-option[data-slot-type="pickup"], #pickup-slots-morning .time-slot-option, #pickup-slots-afternoon .time-slot-option');
    pickupSlots.forEach(slot => slot.classList.remove('selected'));
  } else if (type === 'return') {
    const returnSlots = document.querySelectorAll('#return-time-slots-container .time-slot-option, #step-schedule-card .time-slot-option[data-slot-type="return"]');
    returnSlots.forEach(slot => slot.classList.remove('selected'));
  } else {
    const container = el.parentElement;
    if (container) {
      container.querySelectorAll('.time-slot-option').forEach(slot => slot.classList.remove('selected'));
    }
  }

  el.classList.add('selected');

  const rawText = el.querySelector('span:first-child')?.innerText || '';
  const timeText = rawText.replace('🕒', '').trim();

  if (type === 'pickup') {
    orderFlow.pickupSlot = timeText;
    // หากเลือกแบบเร่งด่วน การเปลี่ยนเวลารับจะกระทบกับเวลาส่งคืนที่พร้อมส่ง
    if (orderFlow.plan === 'express') {
      renderReturnTimeSlots('express');
    }
  } else {
    orderFlow.returnSlot = timeText;
  }

  updateOrderFlowTotals();
};

window.changeOrderWeight = function (delta) {
  const input = document.getElementById('order-weight-input');
  if (!input) return;
  let val = Math.max(1, Math.min(100, (parseInt(input.value, 10) || 1) + delta));
  input.value = val;
  updateOrderFlowTotals();
};

window.setOrderWeight = function (val) {
  const input = document.getElementById('order-weight-input');
  if (!input) return;
  input.value = val;
  updateOrderFlowTotals();
};

window.toggleBeddingCheckbox = function (e) {
  if (e.target && (e.target.tagName.toLowerCase() === 'input' || e.target.type === 'checkbox')) return;
  const chk = document.getElementById('chk-bedding');
  if (chk) {
    chk.checked = !chk.checked;
    updateOrderFlowTotals();
  }
};

window.appendWashNote = function (text) {
  const textarea = document.getElementById('order-washing-note');
  if (!textarea) return;
  const current = textarea.value.trim();
  if (!current) {
    textarea.value = text;
  } else if (!current.includes(text)) {
    textarea.value = `${current}, ${text}`;
  }
  textarea.focus();
};

window.selectPrefPill = function (el, category) {
  const container = el.parentElement;
  if (container) {
    container.querySelectorAll('.pref-option-pill').forEach(p => p.classList.remove('selected'));
  }
  el.classList.add('selected');

  const titleEl = el.querySelector('.pref-pill-title') || el.querySelector('span:first-child');
  const badgeEl = el.querySelector('.pref-pill-badge') || el.querySelector('span:last-child');

  const text = titleEl ? titleEl.innerText.trim() : '';
  const priceText = badgeEl ? badgeEl.innerText.trim() : '';

  const priceMatch = priceText.match(/\+(\d+)/);
  const extra = priceMatch ? parseInt(priceMatch[1], 10) : 0;

  if (category === 'iron') {
    orderFlow.ironing = { label: text, price: extra };
  } else if (category === 'softener') {
    orderFlow.softener = { label: text, pricePerKg: extra };
  } else if (category === 'temp') {
    orderFlow.temp = { label: text, pricePerKg: extra };
  } else if (category === 'dry') {
    orderFlow.drying = { label: text, pricePerKg: extra };
  }

  updateOrderFlowTotals();
};

window.updateOrderFlowTotals = function () {
  const weightInput = document.getElementById('order-weight-input');
  const weight = Math.max(1, Number(weightInput ? weightInput.value : 1) || 1);
  orderFlow.weight = weight;

  const rates = orderFlow.rates.psru_tk;
  const baseRate = rates[orderFlow.plan] || rates.standard;

  const extraPerKg = (orderFlow.softener.pricePerKg || 0) +
    (orderFlow.temp.pricePerKg || 0) +
    (orderFlow.drying.pricePerKg || 0);

  const beddingChecked = document.getElementById('chk-bedding')?.checked || false;
  const beddingExtra = beddingChecked ? 80 : 0;

  const rawServicePrice = (baseRate + extraPerKg) * weight + (orderFlow.ironing.price || 0) + beddingExtra;
  const totalAmount = Math.max(orderFlow.minCharge, rawServicePrice);

  const planNames = {
    economy: 'แบบประหยัด (3 วัน)',
    standard: 'แบบมาตรฐาน (วันถัดไป)',
    express: 'แบบเร่งด่วน (วันเดียวกัน 4-6 ชม.)'
  };

  // Update Summary DOM
  const planEl = document.getElementById('summary-flow-plan');
  const pickupEl = document.getElementById('summary-flow-pickup');
  const returnEl = document.getElementById('summary-flow-return');
  const weightEl = document.getElementById('summary-flow-weight');
  const priceEl = document.getElementById('summary-flow-service-price');
  const totalEl = document.getElementById('summary-flow-total');

  if (planEl) planEl.innerText = planNames[orderFlow.plan] || 'แบบมาตรฐาน (วันถัดไป)';
  if (pickupEl) pickupEl.innerText = `${orderFlow.pickupDate} (${orderFlow.pickupSlot})`;
  if (returnEl) returnEl.innerText = `${orderFlow.returnDate} (${orderFlow.returnSlot})`;
  if (weightEl) weightEl.innerText = `${weight} กก.`;
  if (priceEl) priceEl.innerText = `${rawServicePrice.toLocaleString()} บาท`;
  if (totalEl) totalEl.innerText = `${totalAmount.toLocaleString()} บาท`;
};

function setupOrderFlowForm() {
  const form = document.getElementById('order-flow-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('order-cust-name').value.trim();
    const phone = document.getElementById('order-cust-phone').value.trim();
    const email = document.getElementById('order-cust-email').value.trim();
    const address = document.getElementById('order-cust-address').value.trim();
    const riderNote = document.getElementById('order-cust-note')?.value.trim() || '';
    const washNote = document.getElementById('order-washing-note')?.value.trim() || '';

    const paymentMethodEl = document.querySelector('input[name="order-payment-method"]:checked');
    const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'PROMPTPAY';

    const beddingChecked = document.getElementById('chk-bedding')?.checked || false;

    const rates = orderFlow.rates[orderFlow.region] || orderFlow.rates.psru_tk;
    const baseRate = rates[orderFlow.plan] || rates.standard;
    const planNames = {
      economy: 'แบบประหยัด (3 วัน)',
      standard: 'แบบมาตรฐาน (วันถัดไป)',
      express: 'แบบเร่งด่วน (ด่วน 4-6 ชม.)'
    };
    const campusLabel = 'มรพส. ทะเลแก้ว';

    let noteParts = [];
    if (riderNote) noteParts.push(`🛵 ส่งถึง: ${riderNote}`);
    if (washNote) noteParts.push(`🧺 ถึงร้าน: ${washNote}`);
    const finalCustomerNote = noteParts.join(' | ');

    const orderData = {
      userId: state.currentUser ? state.currentUser.id : null,
      customer: {
        name,
        phone,
        email,
        address,
        note: `[วิทยาเขต: ${campusLabel}] ${finalCustomerNote ? '| ' + finalCustomerNote : ''}`.trim()
      },
      items: [
        {
          serviceId: `srv_${orderFlow.plan}`,
          serviceName: `บริการซักอบรีด ${planNames[orderFlow.plan]} (${campusLabel})`,
          quantity: orderFlow.weight,
          pricePerUnit: baseRate
        }
      ],
      preferences: {
        detergent: `มาตรฐาน DekDry`,
        softener: orderFlow.softener.label,
        packaging: orderFlow.ironing.label,
        temperature: orderFlow.temp.label,
        drying: orderFlow.drying.label,
        bedding: beddingChecked ? 'มีผ้านวม/เครื่องนอน (+฿80)' : 'ไม่มี',
        specialNote: washNote
      },
      pickupSchedule: `${orderFlow.pickupDate} (${orderFlow.pickupSlot})`,
      returnSchedule: `${orderFlow.returnDate} (${orderFlow.returnSlot})`,
      paymentMethod
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerText = 'กำลังส่งคำสั่งซื้อ...';
      submitBtn.disabled = true;
    }

    try {
      const res = await API.createOrder(orderData);
      if (res.success) {
        showToast('🎉 บันทึกคำสั่งซื้อสำเร็จเรียบร้อย!', 'success');
        switchAppView('tracking');
        loadTrackingView(res.data ? res.data.id : null);
      } else {
        showToast(res.message || 'ไม่สามารถสร้างคำสั่งซื้อได้', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    } finally {
      if (submitBtn) {
        submitBtn.innerText = '🚀 ยืนยันการสั่งจองตอนนี้ ›';
        submitBtn.disabled = false;
      }
    }
  });
}

// ==========================================
// Authentication
// ==========================================
function initAuth() {
  const saved = localStorage.getItem('dekdry_user');
  if (saved) {
    try { state.currentUser = JSON.parse(saved); } catch (e) { }
  }
  renderAuthNavbar();
}

function renderAuthNavbar() {
  const container = document.getElementById('nav-auth-container');
  const navProfile = document.getElementById('nav-link-profile');
  if (navProfile) navProfile.style.display = state.currentUser ? 'block' : 'none';
  if (!container) return;

  if (state.currentUser) {
    const role = (state.currentUser.role || '').toLowerCase();
    let roleLabel = 'ลูกค้า';
    let portalItem = '';
    if (role === 'rider') {
      roleLabel = 'พนักงานจัดส่ง (Rider)';
      portalItem = `<button class="account-menu-item" onclick="switchAppView('rider')">🛵 งานไรเดอร์</button>`;
    } else if (role === 'staff') {
      roleLabel = 'โรงงานซักรีด (Staff)';
      portalItem = `<button class="account-menu-item" onclick="switchAppView('staff')">🧼 งานซักรีด</button>`;
    } else if (role === 'admin') {
      roleLabel = 'ผู้ดูแลระบบ (Admin)';
      portalItem = `<button class="account-menu-item" onclick="switchAppView('admin')">📊 แดชบอร์ดร้าน</button>`;
    }

    container.innerHTML = `
      <div class="account-dropdown">
        <button class="account-dropdown-btn" type="button">
          <span>👤 ${state.currentUser.name || state.currentUser.username}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="account-dropdown-menu">
          <div class="account-menu-header">
            <div class="account-menu-name">👤 ${state.currentUser.name}</div>
            <div class="account-menu-role">${roleLabel}</div>
          </div>
          <button class="account-menu-item" onclick="switchAppView('profile')">⚙️ ข้อมูลบัญชี / แก้ไขโปรไฟล์</button>
          <button class="account-menu-item" onclick="switchAppView('tracking')">🧺 ติดตามสถานะผ้าของฉัน</button>
          ${portalItem}
          <button class="account-menu-item logout" onclick="logoutUser()">🚪 ออกจากระบบ</button>
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <button class="btn btn-secondary btn-sm" onclick="openAuthModal('login')">เข้าสู่ระบบ</button>
    `;
  }
}

window.openAuthModal = function (tab = 'login') {
  document.getElementById('auth-modal').classList.add('active');
  toggleAuthTab(tab);
};

window.closeAuthModal = function () {
  document.getElementById('auth-modal').classList.remove('active');
};

window.toggleAuthTab = function (tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-auth-login').classList.toggle('active', isLogin);
  document.getElementById('tab-auth-register').classList.toggle('active', !isLogin);
  document.getElementById('login-form').style.display = isLogin ? 'block' : 'none';
  document.getElementById('register-form').style.display = isLogin ? 'none' : 'block';
  document.getElementById('auth-modal-title').innerText = isLogin ? '🔐 เข้าสู่ระบบ' : '✨ สมัครสมาชิกใหม่';
};

window.fillDemoLogin = function (u) {
  document.getElementById('login-username').value = u;
  document.getElementById('login-password').value = 'password123';
};

window.logoutUser = function () {
  state.currentUser = null;
  localStorage.removeItem('dekdry_user');
  renderAuthNavbar();
  if (state.currentAppView === 'profile' || state.currentAppView === 'rider' || state.currentAppView === 'staff' || state.currentAppView === 'admin') {
    switchAppView('landing');
  }
  showToast('ออกจากระบบเรียบร้อย 👋');
};

function onAuthSuccess(user) {
  state.currentUser = user;
  localStorage.setItem('dekdry_user', JSON.stringify(state.currentUser));
  renderAuthNavbar();
  closeAuthModal();
  prefillCustomerForms();

  if (window.pendingOrderPlan) {
    const plan = window.pendingOrderPlan;
    window.pendingOrderPlan = null;
    window.pendingAppView = null;
    goToOrderPage(plan);
  } else if (window.pendingBookingModalTier !== undefined && window.pendingBookingModalTier !== null) {
    const tier = window.pendingBookingModalTier;
    window.pendingBookingModalTier = null;
    openBookingModal(tier);
  } else if (window.pendingAppView) {
    const next = window.pendingAppView;
    window.pendingAppView = null;
    switchAppView(next);
  }
}

function setupAuthForms() {
  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const res = await API.login({
      username: document.getElementById('login-username').value.trim(),
      password: document.getElementById('login-password').value
    });
    if (res.success) {
      showToast(`ยินดีต้อนรับคุณ ${res.data.user.name} 🎉`);
      onAuthSuccess(res.data.user);
    } else {
      showToast(res.message, 'error');
    }
  };

  document.getElementById('register-form').onsubmit = async (e) => {
    e.preventDefault();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;

    if (password !== confirmPassword) {
      showToast('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง', 'error');
      return;
    }

    const res = await API.register({
      username: document.getElementById('reg-username').value.trim(),
      email: document.getElementById('reg-email').value.trim(),
      name: document.getElementById('reg-name').value.trim(),
      phone: document.getElementById('reg-phone').value.trim(),
      address: document.getElementById('reg-address').value.trim(),
      password: password,
      role: 'customer'
    });
    if (res.success) {
      showToast(res.message, 'success');
      onAuthSuccess(res.data);
    } else {
      showToast(res.message, 'error');
    }
  };
}

// ==========================================
// Order Tracking View (เช็คสถานะผ้า & ขั้นตอนการทำงาน 7 ขั้น)
// ==========================================
// Order Tracking View (เช็คสถานะผ้า & ขั้นตอนการทำงาน 8 ขั้น)
// ==========================================
const TRACKING_STEPS_FLOW = [
  { key: 'ORDER_PLACED', stepNum: 1, title: 'รับคำสั่งซื้อ', icon: '📝', desc: 'ระบบบันทึกคำสั่งซื้อของคุณเรียบร้อยแล้ว' },
  { key: 'RIDER_ASSIGNED', stepNum: 2, title: 'จัดสรรไรเดอร์', icon: '🛵', desc: 'ไรเดอร์ได้รับมอบหมายงานและกำลังเดินทางไปรับผ้า' },
  { key: 'PICKED_UP', stepNum: 3, title: 'รับผ้าเข้าร้าน', icon: '🧺', desc: 'ไรเดอร์รับผ้าจากคุณเรียบร้อย กำลังนำส่งเข้าโรงซัก มรพส.' },
  { key: 'IN_WASHING', stepNum: 4, title: 'กำลังซัก/อบ/รีด', icon: '🧼', desc: 'ผ้ากำลังอยู่ในกระบวนการซัก อบ และรีดตามโปรแกรมที่คุณเลือก' },
  { key: 'WASHED_READY', stepNum: 5, title: 'ซักเสร็จพร้อมส่ง', icon: '✨', desc: 'ผ้าผ่านการซักรีดและตรวจสอบคุณภาพ (QC) พร้อมนำส่ง' },
  { key: 'OUT_FOR_DELIVERY', stepNum: 6, title: 'กำลังนำส่ง', icon: '🚚', desc: 'ไรเดอร์กำลังนำส่งผ้าสะอาดกลับไปยังจุดนัดพบ/หอพัก' },
  { key: 'DELIVERED', stepNum: 7, title: 'จัดส่งแล้ว (รอตรวจรับ)', icon: '🚚', desc: 'ผ้าสะอาดส่งถึงมือคุณเรียบร้อยแล้ว กรุณาตรวจสอบผ้าและกดยืนยันการรับผ้า' },
  { key: 'COMPLETED', stepNum: 8, title: 'เสร็จสิ้นสมบูรณ์', icon: '🎉', desc: 'คุณได้ยืนยันการรับผ้าเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ DekDry @ PSRU' }
];

window.customerOrderTab = 'active';

window.switchCustomerOrderTab = function (tab) {
  window.customerOrderTab = tab;
  loadTrackingView();
};

async function loadTrackingView(targetOrderId = null) {
  if (!state.currentUser) {
    window.pendingAppView = 'tracking';
    showToast('กรุณาเข้าสู่ระบบก่อนตรวจสอบสถานะผ้า 🔐', 'info');
    openAuthModal('login');
    return;
  }

  const searchInput = document.getElementById('tracking-search-input');
  const quickContainer = document.getElementById('user-orders-quick-container');
  const quickChips = document.getElementById('user-orders-chips');
  const contentEl = document.getElementById('tracking-content');
  if (!contentEl) return;

  try {
    const res = await API.getOrders();
    if (!res.success) {
      contentEl.innerHTML = '<div class="card" style="text-align:center; padding:2.5rem; color:#ef4444;">ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้</div>';
      return;
    }

    state.orders = res.data || [];

    // Filter orders belonging strictly to the logged-in user
    const cleanUserPhone = (state.currentUser.phone || '').replace(/\D/g, '');
    const userOrders = state.orders.filter(o => {
      if (o.userId && String(o.userId) === String(state.currentUser.id)) return true;
      if (o.customer) {
        const cleanCustPhone = (o.customer.phone || '').replace(/\D/g, '');
        if (cleanUserPhone && cleanCustPhone && cleanCustPhone === cleanUserPhone) return true;
        if (o.customer.name && state.currentUser.name && o.customer.name.trim() === state.currentUser.name.trim()) return true;
      }
      return false;
    });

    // Split orders into Active and History (Completed / Cancelled)
    const activeOrders = userOrders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
    const historyOrders = userOrders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED');

    // Update Tab Badges
    const countActiveEl = document.getElementById('cust-active-count');
    const countHistoryEl = document.getElementById('cust-history-count');
    if (countActiveEl) countActiveEl.innerText = activeOrders.length;
    if (countHistoryEl) countHistoryEl.innerText = historyOrders.length;

    // If targetOrderId is explicitly passed, determine which tab it belongs to
    if (targetOrderId) {
      const isTargetInHistory = historyOrders.some(o => o.id === targetOrderId);
      window.customerOrderTab = isTargetInHistory ? 'history' : 'active';
    } else if (!window.customerOrderTab) {
      window.customerOrderTab = 'active';
    }

    // Update Tab Button Styles
    const tabActiveBtn = document.getElementById('tab-cust-active');
    const tabHistoryBtn = document.getElementById('tab-cust-history');
    if (tabActiveBtn && tabHistoryBtn) {
      if (window.customerOrderTab === 'history') {
        tabActiveBtn.className = 'btn btn-secondary btn-sm';
        tabHistoryBtn.className = 'btn btn-primary btn-sm';
      } else {
        tabActiveBtn.className = 'btn btn-primary btn-sm';
        tabHistoryBtn.className = 'btn btn-secondary btn-sm';
      }
    }

    const currentTabOrders = window.customerOrderTab === 'history' ? historyOrders : activeOrders;

    let activeOrderId = targetOrderId;
    if (!activeOrderId && searchInput && searchInput.value.trim()) {
      activeOrderId = searchInput.value.trim().toUpperCase();
    }

    // Only pick an active order if there is one currently in progress; NEVER fallback to old history orders
    if (!activeOrderId) {
      if (window.customerOrderTab === 'active') {
        if (activeOrders.length > 0) {
          activeOrderId = activeOrders[0].id;
        } else {
          activeOrderId = null;
        }
      } else if (window.customerOrderTab === 'history') {
        if (historyOrders.length > 0) {
          activeOrderId = historyOrders[0].id;
        } else {
          activeOrderId = null;
        }
      }
    }

    // Render Quick Chips for user orders according to selected tab
    if (quickContainer && quickChips) {
      quickContainer.style.display = 'block';
      if (currentTabOrders.length > 0) {
        quickChips.innerHTML = currentTabOrders.map(o => {
          const stLabel = STATUS_CONFIG[o.status] ? STATUS_CONFIG[o.status].label : o.status;
          const isActive = activeOrderId === o.id;
          return `
            <button type="button" class="order-chip-btn ${isActive ? 'active' : ''}" onclick="selectTrackingOrder('${o.id}')">
              <span>📦 <strong>${o.id}</strong></span>
              <span style="font-size:0.75rem; opacity:0.85;">(${stLabel})</span>
            </button>
          `;
        }).join('');
      } else {
        if (window.customerOrderTab === 'active') {
          quickChips.innerHTML = `
            <div style="font-size:0.88rem; color:#64748b; padding:0.4rem 0;">
              ✨ ไม่มีรายการที่กำลังดำเนินการอยู่ ${historyOrders.length > 0 ? `(มีประวัติงานเดิมที่เสร็จสิ้น ${historyOrders.length} รายการ)` : ''}
            </div>
          `;
        } else {
          quickChips.innerHTML = `
            <div style="font-size:0.88rem; color:#64748b; padding:0.4rem 0;">
              📜 ยังไม่มีประวัติคำสั่งซื้อที่เสร็จสิ้น
            </div>
          `;
        }
      }
    }

    if (activeOrderId) {
      if (searchInput) searchInput.value = activeOrderId;
      renderTrackingDetails(activeOrderId);
    } else {
      if (searchInput) searchInput.value = '';
      if (window.customerOrderTab === 'active') {
        contentEl.innerHTML = `
          <div class="card" style="text-align:center; padding:3.5rem 1.5rem; background:white; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
            <div style="font-size:3.5rem; margin-bottom:1rem;">🧺</div>
            <h3 style="font-weight:800; font-size:1.3rem; color:#0f172a; margin-bottom:0.5rem;">ไม่มีคำสั่งซื้อที่อยู่ระหว่างดำเนินการ</h3>
            <p style="color:#64748b; font-size:0.95rem; margin-bottom:1.5rem;">คุณ (${state.currentUser.name || state.currentUser.username}) ยังไม่มีรายการผ้าที่กำลังซักหรือจัดส่งในขณะนี้ สามารถส่งผ้าซักกับ DekDry ได้ทันที</p>
            <button class="btn btn-primary" onclick="goToOrderPage('standard')">🚀 สั่งจองบริการซักผ้าตอนนี้ &rsaquo;</button>
            ${historyOrders.length > 0 ? `
              <div style="margin-top:2rem; padding-top:1.25rem; border-top:1px dashed #cbd5e1;">
                <div style="font-size:0.85rem; color:#64748b; margin-bottom:0.6rem;">📜 คุณมีประวัติคำสั่งซื้อเดิมที่เสร็จสิ้นแล้ว ${historyOrders.length} รายการ</div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="switchCustomerOrderTab('history')">คลิกเพื่อดูประวัติคำสั่งซื้อเดิม</button>
              </div>
            ` : ''}
          </div>
        `;
      } else {
        contentEl.innerHTML = `
          <div class="card" style="text-align:center; padding:3.5rem 1.5rem; background:white; border-radius:16px; border:1px solid #e2e8f0; box-shadow:0 4px 15px rgba(0,0,0,0.03);">
            <div style="font-size:3.5rem; margin-bottom:1rem;">📜</div>
            <h3 style="font-weight:800; font-size:1.3rem; color:#0f172a; margin-bottom:0.5rem;">ยังไม่มีประวัติคำสั่งซื้อที่เสร็จสิ้น</h3>
            <p style="color:#64748b; font-size:0.95rem; margin-bottom:1.5rem;">เมื่อคำสั่งซื้อของคุณเสร็จสิ้นเรียบร้อยแล้ว รายการจะถูกจัดเก็บไว้ที่นี่</p>
            <button class="btn btn-secondary btn-sm" onclick="switchCustomerOrderTab('active')">← กลับไปที่คำสั่งซื้อปัจจุบัน</button>
          </div>
        `;
      }
    }
  } catch (err) {
    console.error('loadTrackingView error:', err);
    if (contentEl) {
      contentEl.innerHTML = '<div class="card" style="text-align:center; padding:2rem; color:#ef4444;">เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์</div>';
    }
  }
}

window.handleTrackingSearch = function (e) {
  if (e) e.preventDefault();
  const searchInput = document.getElementById('tracking-search-input');
  if (!searchInput) return;
  const orderId = searchInput.value.trim().toUpperCase();
  if (!orderId) {
    showToast('กรุณากรอกเลขออเดอร์คำสั่งซื้อ เช่น ORD-2026-001', 'error');
    return;
  }
  selectTrackingOrder(orderId);
};

window.selectTrackingOrder = async function (orderId) {
  const searchInput = document.getElementById('tracking-search-input');
  if (searchInput) searchInput.value = orderId;

  document.querySelectorAll('.order-chip-btn').forEach(btn => {
    btn.classList.toggle('active', btn.innerText.includes(orderId));
  });

  try {
    const res = await API.getOrders();
    if (res.success && Array.isArray(res.data)) {
      state.orders = res.data;
    }
  } catch (e) { }

  renderTrackingDetails(orderId);
};

function renderTrackingDetails(orderId) {
  const contentEl = document.getElementById('tracking-content');
  const searchInput = document.getElementById('tracking-search-input');
  if (!contentEl) return;

  const order = state.orders.find(o => o.id.toUpperCase() === orderId.toUpperCase());
  if (!order) {
    contentEl.innerHTML = `
      <div class="card" style="text-align:center; padding:3.5rem 1.5rem; background:white; border-radius:16px; border:1px dashed #cbd5e1;">
        <div style="font-size:3rem; margin-bottom:0.75rem;">🔍</div>
        <h3 style="font-weight:800; font-size:1.25rem; color:#0f172a; margin-bottom:0.5rem;">ไม่พบเลขออเดอร์ "${orderId}" ในระบบ</h3>
        <p style="color:#64748b; font-size:0.92rem; max-width:500px; margin:0 auto 1.25rem auto;">
          กรุณาตรวจสอบความถูกต้องของเลขออเดอร์คำสั่งซื้อ หรือเลือกจากรายการคำสั่งซื้อในบัญชีของคุณด้านบน
        </p>
      </div>
    `;
    return;
  }

  // Security Check: Customer can check their own orders, or view if explicitly searched by order ID
  const isSpecialRole = state.currentUser && ['admin', 'rider', 'staff'].includes(state.currentUser.role);
  const cleanUserPhone = (state.currentUser?.phone || '').replace(/\D/g, '');
  const cleanCustPhone = (order.customer?.phone || '').replace(/\D/g, '');
  const isOwner = state.currentUser && (
    (order.userId && String(order.userId) === String(state.currentUser.id)) || 
    (cleanUserPhone && cleanCustPhone && cleanCustPhone === cleanUserPhone) ||
    (order.customer?.name && state.currentUser.name && order.customer.name.trim() === state.currentUser.name.trim())
  );
  const isExplicitSearch = searchInput && searchInput.value.trim().toUpperCase() === orderId.toUpperCase();

  if (!isSpecialRole && !isOwner && !isExplicitSearch) {
    contentEl.innerHTML = `
      <div class="card" style="text-align:center; padding:3.5rem 1.5rem; background:#fff1f2; border-radius:16px; border:1px solid #fecdd3;">
        <div style="font-size:3rem; margin-bottom:0.75rem;">🔒</div>
        <h3 style="font-weight:800; font-size:1.25rem; color:#e11d48; margin-bottom:0.5rem;">ไม่อนุญาตให้เข้าถึงออเดอร์ "${orderId}"</h3>
        <p style="color:#475569; font-size:0.92rem; max-width:520px; margin:0 auto 1.25rem auto;">
          เลขออเดอร์นี้ไม่ใช่คำสั่งซื้อในบัญชีของคุณ (${state.currentUser.name}) เพื่อความปลอดภัยและความเป็นส่วนตัวของลูกค้า กรุณาตรวจสอบเฉพาะออเดอร์ของตนเอง
        </p>
      </div>
    `;
    return;
  }

  const currentStatus = order.status;
  const statusInfo = STATUS_CONFIG[currentStatus] || { label: currentStatus, icon: '📦', cls: '' };

  // Step indices
  const stepKeys = TRACKING_STEPS_FLOW.map(s => s.key);
  let currentStepIndex = stepKeys.indexOf(currentStatus);
  if (currentStatus === 'WAIT_PRICE_CONFIRM') {
    currentStepIndex = 2; // At PICKED_UP stage, waiting for weigh approval
  } else if (currentStatus === 'COMPLETED') {
    currentStepIndex = stepKeys.length - 1;
  }
  const effectiveIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  const isAllCompleted = currentStatus === 'COMPLETED';

  const currentStepObj = currentStatus === 'WAIT_PRICE_CONFIRM' ? {
    title: 'รอลูกค้ายืนยันราคาชั่งจริง',
    icon: '⚖️',
    desc: 'ทางร้านได้ชั่งน้ำหนักผ้าและปรับปรุงราคาใหม่ รอลูกค้ากดยืนยันเพื่อเริ่มกระบวนการซักผ้า'
  } : (TRACKING_STEPS_FLOW[effectiveIndex] || TRACKING_STEPS_FLOW[0]);

  const stepperHtml = TRACKING_STEPS_FLOW.map((step, idx) => {
    let stateClass = 'upcoming';
    let iconContent = step.icon;

    if (isAllCompleted || idx < effectiveIndex) {
      stateClass = 'completed';
      iconContent = '✓';
    } else if (idx === effectiveIndex) {
      stateClass = 'active';
    }

    return `
      <div class="tracking-step ${stateClass}">
        <div class="step-icon-circle">${iconContent}</div>
        <div class="step-title">${step.title}</div>
      </div>
    `;
  }).join('');

  const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
  const riderInfo = order.assignedRider || { name: 'กำลังรอการจัดสรรไรเดอร์', phone: '-', vehicle: '-' };
  const itemsText = (order.items || []).map(i => `${i.serviceName || i.serviceId} x ${i.quantity}`).join(', ') || 'บริการซักอบรีดมาตรฐาน';

  contentEl.innerHTML = `
    <div class="tracking-card">
      <!-- Header Banner -->
      <div class="tracking-header-bar">
        <div>
          <div style="font-size:0.85rem; opacity:0.9; margin-bottom:0.25rem;">เลขออเดอร์คำสั่งซื้อ</div>
          <div style="font-size:1.4rem; font-weight:800; letter-spacing:0.5px;">${order.id}</div>
          <div style="font-size:0.8rem; opacity:0.85; margin-top:0.2rem;">สั่งเมื่อ: ${formattedDate}</div>
        </div>
        <div style="text-align:right;">
          <span class="status-badge ${statusInfo.cls}" style="font-size:0.95rem; padding:0.45rem 1rem; border-radius:99px; background:white; color:#0369a1; font-weight:800; box-shadow:0 2px 5px rgba(0,0,0,0.15);">
            ${statusInfo.icon} ${statusInfo.label}
          </span>
          <div style="font-size:0.85rem; margin-top:0.4rem; color:rgba(255,255,255,0.9);">
            ยอดชำระ: <strong style="font-size:1.1rem; color:#fef08a;">฿${order.totalAmount || 0}</strong> (${order.paymentMethod === 'PROMPTPAY' ? 'พร้อมเพย์' : 'เงินสด'})
          </div>
        </div>
      </div>

      <!-- Customer Confirm Delivery Action Banner (When DELIVERED) -->
      ${order.status === 'DELIVERED' ? `
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #22c55e; border-radius: 14px; padding: 1.35rem 1.5rem; margin: 1.25rem 1.5rem 0 1.5rem; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.2);">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:1.25rem; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:1rem; flex:1; min-width:280px;">
            <div style="font-size:2.8rem; line-height:1;">📦</div>
            <div>
              <h3 style="margin:0 0 0.25rem 0; font-size:1.2rem; font-weight:800; color:#15803d;">
                🎉 ไรเดอร์จัดส่งผ้าสะอาดถึงมือคุณแล้ว!
              </h3>
              <p style="margin:0; font-size:0.92rem; color:#166534; line-height:1.45;">
                กรุณาตรวจสอบความเรียบร้อยของผ้า จากนั้นกดปุ่มยืนยันว่า <strong>"ได้รับผ้าเรียบร้อยแล้ว"</strong> เพื่อเสร็จสิ้นคำสั่งซื้อ
              </p>
            </div>
          </div>
          <div>
            <button class="btn btn-primary" style="background:#16a34a; border-color:#16a34a; font-weight:800; padding:0.8rem 1.75rem; font-size:1.05rem; box-shadow:0 4px 14px rgba(22, 163, 74, 0.35); border-radius:99px; cursor:pointer;" onclick="customerConfirmDelivery('${order.id}')">
              ✅ ยืนยันได้รับผ้าเรียบร้อยแล้ว
            </button>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Order Completed Archive Banner (When COMPLETED) -->
      ${order.status === 'COMPLETED' ? `
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 2px solid #cbd5e1; border-radius: 14px; padding: 1.25rem 1.5rem; margin: 1.25rem 1.5rem 0 1.5rem;">
        <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
          <div style="font-size:2.5rem; line-height:1;">🏆</div>
          <div style="flex:1;">
            <h3 style="margin:0 0 0.25rem 0; font-size:1.15rem; font-weight:800; color:#0f172a;">
              ✨ คำสั่งซื้อนี้เสร็จสิ้นสมบูรณ์แล้ว (เก็บในประวัติคำสั่งซื้อ)
            </h3>
            <p style="margin:0; font-size:0.9rem; color:#64748b; line-height:1.4;">
              คุณได้กดยืนยันการรับผ้าเรียบร้อยแล้ว ทาง DekDry @ PSRU ขอขอบพระคุณที่ไว้วางใจใช้บริการครับ!
            </p>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- Price Confirmation Alert Banner (Real-time Approval) -->
      ${order.status === 'WAIT_PRICE_CONFIRM' ? `
      <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border: 2px solid #f97316; border-radius: 14px; padding: 1.25rem 1.5rem; margin: 1.25rem 1.5rem 0 1.5rem; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.15);">
        <div style="display:flex; align-items:flex-start; gap:1rem; flex-wrap:wrap;">
          <div style="font-size:2.5rem; line-height:1;">⚖️</div>
          <div style="flex:1; min-width:260px;">
            <h3 style="margin:0 0 0.35rem 0; font-size:1.2rem; font-weight:800; color:#9a3412;">
              🔔 ทางร้านชั่งน้ำหนักผ้าและปรับปรุงราคาใหม่
            </h3>
            <p style="margin:0 0 0.75rem 0; font-size:0.92rem; color:#7c2d12; line-height:1.4;">
              ผ้าของคุณได้รับการตรวจรับและชั่งน้ำหนักจริงที่โรงซักแล้ว มีการปรับปรุงรายการและราคาตามน้ำหนักจริง กรุณาตรวจสอบยอดเงินและกดยืนยันเพื่อให้ทางร้านเริ่มดำเนินการซักได้ทันที
            </p>

            <div style="background:white; border-radius:10px; padding:0.85rem 1.15rem; border:1px solid #fed7aa; margin-bottom:0.9rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.4rem;">
                <span style="font-size:0.9rem; color:#64748b;">
                  ${order.oldAmount ? `ราคาเดิมก่อนชั่ง: <s style="color:#ef4444;">฿${order.oldAmount}</s> &nbsp;➔&nbsp; ` : ''}
                  <strong style="color:#0f172a;">ยอดสุทธิใหม่หลังชั่งจริง:</strong>
                </span>
                <span style="font-size:1.35rem; font-weight:900; color:#ea580c;">฿${order.totalAmount}</span>
              </div>
              ${order.priceAdjustNote || order.specialNotes ? `
              <div style="font-size:0.88rem; color:#431407; background:#fff7ed; padding:0.5rem 0.8rem; border-radius:6px; border-left:3px solid #ea580c; margin-top:0.35rem;">
                <strong>📝 หมายเหตุจากร้าน:</strong> ${order.priceAdjustNote || order.specialNotes}
              </div>
              ` : ''}
            </div>

            <div style="display:flex; gap:0.75rem; flex-wrap:wrap;">
              <button class="btn btn-primary" style="background:#16a34a; border-color:#16a34a; font-weight:800; padding:0.65rem 1.5rem; font-size:0.95rem; box-shadow:0 3px 8px rgba(22, 163, 74, 0.3);" onclick="customerApprovePrice('${order.id}')">
                ✅ ยืนยันราคาใหม่ (เริ่มดำเนินการซักทันที)
              </button>
              <button class="btn btn-secondary" style="color:#dc2626; border-color:#fca5a5; font-size:0.9rem;" onclick="customerRejectPrice('${order.id}')">
                ❌ ยกเลิกคำสั่งซื้อ
              </button>
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- 7-Step Progress Stepper -->
      <div class="tracking-stepper-wrapper">
        <div style="text-align:center; margin-bottom:1.5rem;">
          <div style="font-size:1.15rem; font-weight:800; color:#0f172a;">
            ขั้นตอนปัจจุบัน: <span style="color:#0284c7;">${currentStepObj.title}</span> ${currentStepObj.icon}
          </div>
          <p style="font-size:0.9rem; color:#64748b; margin-top:0.35rem;">
            ${currentStepObj.desc}
          </p>
        </div>

        <div class="tracking-stepper">
          ${stepperHtml}
        </div>
      </div>

      <!-- Order & Delivery Information Grid -->
      <div class="tracking-details-grid">
        <!-- Customer & Location -->
        <div class="tracking-info-card">
          <h4>👤 ข้อมูลผู้สั่งและสถานที่รับ-ส่ง</h4>
          <div class="tracking-info-row">
            <span class="label">ชื่อลูกค้า:</span>
            <span class="value">${order.customer.name || '-'}</span>
          </div>
          <div class="tracking-info-row">
            <span class="label">เบอร์โทรศัพท์:</span>
            <span class="value">📞 ${order.customer.phone || '-'}</span>
          </div>
          <div class="tracking-info-row">
            <span class="label">สถานที่จัดส่ง:</span>
            <span class="value" style="max-width:180px; word-break:break-word;">${order.customer.address || '-'}</span>
          </div>
          ${order.pickupSchedule ? `
          <div class="tracking-info-row">
            <span class="label">เวลานัดรับผ้า:</span>
            <span class="value" style="color:#0284c7; font-weight:700;">🕒 ${order.pickupSchedule}</span>
          </div>
          ` : ''}
          ${order.returnSchedule ? `
          <div class="tracking-info-row">
            <span class="label">เวลานัดส่งคืน:</span>
            <span class="value" style="color:#15803d; font-weight:700;">📦 ${order.returnSchedule}</span>
          </div>
          ` : ''}
          ${order.customer.note ? `
          <div class="tracking-info-row">
            <span class="label">หมายเหตุเพิ่มเติม:</span>
            <span class="value" style="max-width:180px; color:#475569; word-break:break-word;">${order.customer.note}</span>
          </div>
          ` : ''}
        </div>

        <!-- Rider Details -->
        <div class="tracking-info-card">
          <h4>🛵 ข้อมูลไรเดอร์ผู้ดูแลงาน</h4>
          <div class="tracking-info-row">
            <span class="label">ชื่อไรเดอร์:</span>
            <span class="value">${riderInfo.name}</span>
          </div>
          <div class="tracking-info-row">
            <span class="label">เบอร์ติดต่อ:</span>
            <span class="value">${riderInfo.phone !== '-' ? '📞 ' + riderInfo.phone : 'รอจัดสรร'}</span>
          </div>
          <div class="tracking-info-row">
            <span class="label">พาหนะ / โซน:</span>
            <span class="value">${riderInfo.vehicle || 'มรพส. Delivery Rider'}</span>
          </div>
          <div class="tracking-info-row">
            <span class="label">ความปลอดภัย:</span>
            <span class="value" style="color:#10b981;">🛡️ ผ่านการยืนยันตัวตน</span>
          </div>
        </div>

        <!-- Laundry Specs & Preferences -->
        <div class="tracking-info-card">
          <h4>🧼 ตัวเลือกและโปรแกรมการซัก</h4>
          <div class="tracking-info-row">
            <span class="label">รายการบริการ:</span>
            <span class="value" style="max-width:180px;">${itemsText}</span>
          </div>
          <div class="tracking-info-row">
            <span class="label">น้ำยาปรับผ้านุ่ม:</span>
            <span class="value">${order.preferences?.softener || 'กลิ่นอ่อนโยน'}</span>
          </div>
          <div class="tracking-info-row">
            <span class="label">การรีด / พับ:</span>
            <span class="value">${order.preferences?.packaging || 'พับมาตรฐาน'}</span>
          </div>
          <div class="tracking-info-row">
            <span class="label">อุณหภูมิน้ำ / อบผ้า:</span>
            <span class="value">${order.preferences?.temperature || '30°C'} / ${order.preferences?.drying || 'เครื่องอบ'}</span>
          </div>
          ${order.preferences?.bedding ? `
          <div class="tracking-info-row">
            <span class="label">ผ้านวม / เครื่องนอน:</span>
            <span class="value" style="color:#0284c7; font-weight:600;">${order.preferences.bedding}</span>
          </div>
          ` : ''}
          ${order.preferences?.specialNote ? `
          <div class="tracking-info-row" style="background:#fefce8; padding:0.5rem 0.75rem; border-radius:8px; margin-top:0.4rem; border:1px solid #fde047;">
            <span class="label" style="color:#854d0e; font-weight:700;">📝 ข้อความถึงร้าน:</span>
            <span class="value" style="color:#713f12; font-weight:700; word-break:break-word;">${order.preferences.specialNote}</span>
          </div>
          ` : ''}
          ${(order.priceAdjustmentNote || order.priceAdjustNote) ? `
          <div class="tracking-info-row" style="background:#f0fdf4; padding:0.5rem 0.75rem; border-radius:8px; margin-top:0.4rem; border:1px solid #86efac;">
            <span class="label" style="color:#15803d; font-weight:700;">📢 หมายเหตุจากร้าน:</span>
            <span class="value" style="color:#166534; font-weight:700; word-break:break-word;">${order.priceAdjustmentNote || order.priceAdjustNote}</span>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// Rider View
// ==========================================
async function loadRiderView() {
  const [ordersRes, ridersRes] = await Promise.all([API.getOrders(), API.getRiders()]);
  if (ridersRes.success) state.riders = ridersRes.data;
  if (ordersRes.success) state.orders = ordersRes.data;

  const tasks = state.orders.filter(o => ['ORDER_PLACED', 'RIDER_ASSIGNED', 'PICKED_UP', 'WASHED_READY', 'OUT_FOR_DELIVERY'].includes(o.status));
  const container = document.getElementById('rider-tasks-list');

  if (tasks.length === 0) {
    container.innerHTML = '<div class="card" style="text-align:center; padding:3rem; color:#64748b;">🎉 ไม่มีงานค้างอยู่ในระบบ</div>';
    return;
  }

  container.innerHTML = tasks.map(o => `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
        <strong>${o.id} - ${o.customer.name}</strong>
        <span class="status-badge ${STATUS_CONFIG[o.status].cls}">${STATUS_CONFIG[o.status].label}</span>
      </div>
      <div style="font-size:0.85rem; color:#475569; margin-bottom:0.75rem;">${o.customer.address} (📞 ${o.customer.phone})</div>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        ${o.status === 'ORDER_PLACED' ? `<button class="btn btn-primary btn-sm btn-block" onclick="riderUpdateStatus('${o.id}', 'RIDER_ASSIGNED')">🛵 ยืนยันรับงาน (จัดสรรไรเดอร์แล้ว)</button>` : ''}
        ${o.status === 'RIDER_ASSIGNED' ? `<button class="btn btn-primary btn-sm btn-block" style="background:#7c3aed; border-color:#7c3aed;" onclick="riderUpdateStatus('${o.id}', 'PICKED_UP')">🧺 ยืนยันรับผ้าจากลูกค้าแล้ว (นำเข้าร้าน)</button>` : ''}
        ${o.status === 'PICKED_UP' ? `<div style="font-size:0.8rem; color:#6b21a8; font-weight:700; width:100%; text-align:center; padding:0.35rem; background:#f3e8ff; border-radius:6px;">🧺 รับผ้าแล้วและนำส่งศูนย์ซัก (Staff กำลังดำเนินการ)</div>` : ''}
        ${o.status === 'WASHED_READY' ? `<button class="btn btn-primary btn-sm btn-block" style="background:#f59e0b; border-color:#f59e0b;" onclick="riderUpdateStatus('${o.id}', 'OUT_FOR_DELIVERY')">🚚 ยืนยันรับผ้าไปส่งลูกค้า</button>` : ''}
        ${o.status === 'OUT_FOR_DELIVERY' ? `<button class="btn btn-success btn-sm btn-block" onclick="riderUpdateStatus('${o.id}', 'DELIVERED')">🎉 ยืนยันจัดส่งสำเร็จ (ส่งมอบผ้า)</button>` : ''}
      </div>
    </div>
  `).join('');
}

window.riderUpdateStatus = async function (orderId, status) {
  const res = await API.updateStatus(orderId, status);
  if (res.success) {
    showToast(res.message);
    if (res.data) {
      const idx = (state.orders || []).findIndex(o => o.id === orderId || o.rawId === orderId);
      if (idx !== -1) state.orders[idx] = res.data;
    }
    await loadRiderView();
    // ถ้าหน้าจอลูกค้าเปิดดูออเดอร์นี้อยู่ ให้รีเฟรชทันที
    const searchInput = document.getElementById('tracking-search-input');
    if (searchInput && searchInput.value.trim().toUpperCase() === String(orderId).toUpperCase()) {
      renderTrackingDetails(orderId);
    }
  }
};

// ==========================================
// Laundry Staff View
// ==========================================
async function loadStaffView() {
  const res = await API.getOrders();
  if (!res.success) return;
  state.orders = res.data;

  const colWait = state.orders.filter(o => ['ORDER_PLACED', 'RIDER_ASSIGNED', 'PICKED_UP', 'WAIT_PRICE_CONFIRM'].includes(o.status));
  const colWash = state.orders.filter(o => o.status === 'IN_WASHING');
  const colReady = state.orders.filter(o => o.status === 'WASHED_READY');
  const colDone = state.orders.filter(o => ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status));

  document.getElementById('staff-kanban-board').innerHTML = `
    <div class="kanban-col">
      <div class="kanban-header"><span>📥 คิวรอซัก / ตรวจรับผ้า</span> <span>(${colWait.length})</span></div>
      ${colWait.map(o => `
        <div class="kanban-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${o.id}</strong>
            <span class="status-badge ${STATUS_CONFIG[o.status]?.cls || ''}" style="font-size:0.7rem; padding:2px 6px;">${STATUS_CONFIG[o.status]?.label || o.status}</span>
          </div>
          <div style="font-size:0.85rem; font-weight:600; margin-top:2px;">${o.customer?.name || '-'}</div>
          <div style="font-size:0.78rem; color:#64748b; margin:0.3rem 0;">${(o.items || []).map(i => `${i.serviceName} (${i.quantity} ${i.unit || 'กก.'})`).join(', ')}</div>
          ${o.status === 'WAIT_PRICE_CONFIRM' ? `
            <div style="background:#fff7ed; border:1px solid #fed7aa; color:#c2410c; padding:0.4rem; border-radius:6px; font-size:0.75rem; text-align:center; margin-bottom:0.4rem; font-weight:600;">
              ⏳ ชั่งผ้าแล้ว รอลูกค้ายืนยันราคา ฿${(o.totalAmount || 0).toLocaleString()}
            </div>
            <button class="btn btn-secondary btn-sm btn-block" style="font-size:0.75rem;" onclick="openAdminAdjustModal('${o.id}')">⚖️ แก้ไขราคาอีกครั้ง</button>
          ` : `
            <div style="display:flex; gap:0.35rem; margin-top:0.4rem;">
              <button class="btn btn-sm" style="flex:1; background:#f97316; color:white; font-size:0.75rem; font-weight:700; border:none; border-radius:6px;" onclick="openAdminAdjustModal('${o.id}')">⚖️ ชั่งผ้า/ปรับราคา</button>
              <button class="btn btn-primary btn-sm" style="flex:1; font-size:0.75rem;" onclick="staffAdvance('${o.id}', 'IN_WASHING')">🧼 เริ่มซัก</button>
            </div>
          `}
        </div>
      `).join('')}
    </div>

    <div class="kanban-col">
      <div class="kanban-header"><span>🫧 กำลังซัก/รีด</span> <span>(${colWash.length})</span></div>
      ${colWash.map(o => `
        <div class="kanban-card">
          <strong>${o.id}</strong> - ${o.customer.name}
          <div style="font-size:0.78rem; color:#64748b; margin:0.3rem 0;">${o.preferences.detergent}</div>
          ${o.preferences?.specialNote ? `<div style="font-size:0.75rem; color:#b45309; background:#fef3c7; padding:0.25rem 0.45rem; border-radius:6px; margin-bottom:0.4rem; font-weight:600;">📝 พิเศษ: ${o.preferences.specialNote}</div>` : ''}
          <button class="btn btn-primary btn-sm btn-block" style="background:#f59e0b;" onclick="staffAdvance('${o.id}', 'WASHED_READY')">✨ QC & พร้อมส่ง</button>
        </div>
      `).join('')}
    </div>

    <div class="kanban-col">
      <div class="kanban-header"><span>📦 รอไรเดอร์</span> <span>(${colReady.length})</span></div>
      ${colReady.map(o => `
        <div class="kanban-card">
          <strong>${o.id}</strong> - ${o.customer.name}
          <div style="font-size:0.75rem; color:#059669; text-align:center; padding:0.2rem; background:#dcfce7; border-radius:4px; margin-top:0.3rem;">พร้อมจัดส่ง</div>
        </div>
      `).join('')}
    </div>

    <div class="kanban-col">
      <div class="kanban-header"><span>✅ ส่งมอบแล้ว</span> <span>(${colDone.length})</span></div>
      ${colDone.slice(0, 5).map(o => `
        <div class="kanban-card">
          <strong>${o.id}</strong> - ${o.customer.name}
          <div style="font-size:0.75rem; color:#64748b;">${STATUS_CONFIG[o.status].label}</div>
        </div>
      `).join('')}
    </div>
  `;
}

window.staffAdvance = async function (orderId, status) {
  const res = await API.updateStatus(orderId, status);
  if (res.success) {
    showToast(res.message);
    if (res.data) {
      const idx = (state.orders || []).findIndex(o => o.id === orderId || o.rawId === orderId);
      if (idx !== -1) state.orders[idx] = res.data;
    }
    await loadStaffView();
    // ถ้าหน้าจอลูกค้าเปิดดูออเดอร์นี้อยู่ ให้รีเฟรชทันที
    const searchInput = document.getElementById('tracking-search-input');
    if (searchInput && searchInput.value.trim().toUpperCase() === String(orderId).toUpperCase()) {
      renderTrackingDetails(orderId);
    }
  }
};

// ==========================================
// Admin View
// ==========================================
window.adminTabState = 'active';

async function loadAdminView() {
  const [statsRes, ordersRes] = await Promise.all([API.getStats(), API.getOrders()]);
  if (statsRes.success) {
    const s = statsRes.data;
    document.getElementById('admin-stats-grid').innerHTML = `
      <div class="stat-box-modern">
        <div class="stat-number">฿${s.totalRevenue.toLocaleString()}</div>
        <div class="stat-text">ยอดขายรวมทั้งหมด (Total Revenue)</div>
      </div>
      <div class="stat-box-modern">
        <div class="stat-number">${s.totalOrders}</div>
        <div class="stat-text">จำนวนออเดอร์ทั้งหมด (Orders)</div>
      </div>
      <div class="stat-box-modern">
        <div class="stat-number">${s.activeOrders}</div>
        <div class="stat-text">กำลังดำเนินการ (Active)</div>
      </div>
      <div class="stat-box-modern">
        <div class="stat-number">${s.completedOrders}</div>
        <div class="stat-text">จัดส่งสำเร็จ/ลูกค้ายืนยันแล้ว (Completed)</div>
      </div>
    `;
  }
  if (ordersRes.success) {
    state.orders = ordersRes.data || [];

    // Calculate Counts for Admin Tabs
    const activeCount = state.orders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length;
    const completedCount = state.orders.filter(o => o.status === 'COMPLETED').length;
    const allCount = state.orders.length;

    const elActive = document.getElementById('admin-active-count');
    const elCompleted = document.getElementById('admin-completed-count');
    const elAll = document.getElementById('admin-all-count');
    if (elActive) elActive.innerText = activeCount;
    if (elCompleted) elCompleted.innerText = completedCount;
    if (elAll) elAll.innerText = allCount;

    filterAdminTable();
  }
}

window.switchAdminOrderTab = function (tab) {
  window.adminTabState = tab;
  const tabActive = document.getElementById('tab-admin-active');
  const tabCompleted = document.getElementById('tab-admin-completed');
  const tabAll = document.getElementById('tab-admin-all');

  if (tabActive) {
    tabActive.className = `btn btn-sm ${tab === 'active' ? 'btn-primary' : 'btn-secondary'}`;
  }
  if (tabCompleted) {
    tabCompleted.className = `btn btn-sm ${tab === 'completed' ? 'btn-primary' : 'btn-secondary'}`;
  }
  if (tabAll) {
    tabAll.className = `btn btn-sm ${tab === 'all' ? 'btn-primary' : 'btn-secondary'}`;
  }

  filterAdminTable();
};

function renderAdminTable(orders) {
  const tbody = document.getElementById('admin-orders-tbody');
  if (!tbody) return;

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:3rem 1.5rem; color:#64748b;">
          ${window.adminTabState === 'completed' 
            ? '🏆 ยังไม่มีรายการที่ลูกค้ายืนยันรับผ้าเรียบร้อยแล้ว' 
            : '🎉 ไม่มีรายการคำสั่งซื้อค้างตามเงื่อนไขที่เลือก'}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(o => `
    <tr>
      <td>
        <strong>${o.id}</strong>
        ${o.oldAmount && o.oldAmount !== o.totalAmount ? `<br><small style="color:#64748b;">เดิม: <s>฿${o.oldAmount}</s></small>` : ''}
      </td>
      <td>
        <strong>${o.customer?.name || '-'}</strong>
        <br><small style="color:#64748b;">📞 ${o.customer?.phone || '-'}</small>
      </td>
      <td>
        ${(o.items || []).map(i => `<span style="display:inline-block; background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:0.75rem; margin:1px 0;">${i.serviceName} (${i.quantity} ${i.unit || 'กก.'})</span>`).join('<br>')}
        ${(o.priceAdjustmentNote || o.priceAdjustNote) ? `<div style="font-size:0.72rem; color:#c2410c; margin-top:3px; background:#fff7ed; padding:2px 4px; border-radius:3px; word-break:break-word;">📝 ${o.priceAdjustmentNote || o.priceAdjustNote}</div>` : ''}
      </td>
      <td>
        <strong style="color:#0284c7; font-size:1rem;">฿${(o.totalAmount || 0).toLocaleString()}</strong>
      </td>
      <td>
        <span class="status-badge ${STATUS_CONFIG[o.status]?.cls || ''}">${STATUS_CONFIG[o.status]?.label || o.status}</span>
        ${o.status === 'WAIT_PRICE_CONFIRM' ? `<div style="font-size:0.7rem; color:#ea580c; font-weight:700; margin-top:2px;">⏳ รอลูกค้ากดยืนยัน</div>` : ''}
        ${o.status === 'COMPLETED' ? `<div style="font-size:0.7rem; color:#15803d; font-weight:700; margin-top:2px;">✓ ลูกค้ายืนยันรับแล้ว</div>` : ''}
      </td>
      <td>${o.assignedRider ? o.assignedRider.name : '-'}</td>
      <td>
        <div style="display:flex; flex-direction:column; gap:0.35rem;">
          <select class="form-select" style="font-size:0.75rem; padding:0.25rem;" onchange="adminUpdateStatus('${o.id}', this.value)">
            ${Object.entries(STATUS_CONFIG).map(([k, v]) => `
              <option value="${k}" ${k === o.status ? 'selected' : ''}>${v.label}</option>
            `).join('')}
          </select>
          <div style="display:flex; gap:0.3rem;">
            <button class="btn btn-sm" style="flex:1; background:#0284c7; color:white; font-size:0.75rem; padding:0.25rem 0.4rem; border-radius:6px; font-weight:700; border:none; cursor:pointer;" onclick="openAdminEditOrderModal('${o.id}')" title="แก้ไขข้อมูลคำสั่งซื้อ">
              ✏️ แก้ไข
            </button>
            <button class="btn btn-sm" style="flex:1; background:${o.status === 'PICKED_UP' ? '#ea580c' : '#f97316'}; color:white; font-size:0.75rem; padding:0.25rem 0.4rem; border-radius:6px; font-weight:700; border:none; cursor:pointer;" onclick="openAdminAdjustModal('${o.id}')" title="ชั่งน้ำหนักและปรับราคา">
              ⚖️ ชั่งผ้า
            </button>
          </div>
        </div>
      </td>
    </tr>
  `).join('');
}

window.adminUpdateStatus = async function (orderId, status) {
  const res = await API.updateStatus(orderId, status);
  if (res.success) {
    showToast(`อัปเดต ${orderId} สำเร็จ`);
    loadAdminView();
  }
};

window.filterAdminTable = function () {
  const searchInput = document.getElementById('admin-search-input');
  const statusFilter = document.getElementById('admin-filter-status');
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const st = statusFilter ? statusFilter.value : 'ALL';

  let list = state.orders || [];

  // Filter 1: Admin Tab (Active vs Completed vs All)
  if (window.adminTabState === 'active') {
    list = list.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
  } else if (window.adminTabState === 'completed') {
    list = list.filter(o => o.status === 'COMPLETED');
  }

  // Filter 2: Status Dropdown
  if (st !== 'ALL') {
    list = list.filter(o => o.status === st);
  }

  // Filter 3: Search text
  if (q) {
    list = list.filter(o => 
      o.id.toLowerCase().includes(q) || 
      (o.customer?.name || '').toLowerCase().includes(q) ||
      (o.customer?.phone || '').toLowerCase().includes(q)
    );
  }

  renderAdminTable(list);
};

// ==========================================
// Admin Weigh & Adjust Order Modal Logic
// ==========================================
let currentAdjustOrderId = null;
let currentAdjustOrder = null;
let adjustItemsState = [];

window.openAdminAdjustModal = function (orderId) {
  const order = (state.orders || []).find(o => String(o.id) === String(orderId) || String(o.rawId) === String(orderId));
  if (!order) {
    showToast('ไม่พบข้อมูลคำสั่งซื้อ', 'error');
    return;
  }

  currentAdjustOrderId = order.id;
  currentAdjustOrder = order;

  document.getElementById('adjust-order-id').innerText = order.id;
  document.getElementById('adjust-customer-name').innerText = `ลูกค้า: ${order.customer?.name || '-'} (📞 ${order.customer?.phone || '-'})`;
  document.getElementById('adjust-old-total-badge').innerText = `฿${(order.totalAmount || 0).toLocaleString()}`;
  
  const statusBadge = document.getElementById('adjust-current-status');
  if (statusBadge) {
    const st = STATUS_CONFIG[order.status] || { label: order.status, cls: '' };
    statusBadge.className = `status-badge ${st.cls}`;
    statusBadge.innerText = st.label;
  }

  // Clone items from order
  adjustItemsState = (order.items || []).map(it => ({
    serviceId: it.serviceId,
    serviceName: it.serviceName,
    pricePerUnit: Number(it.pricePerUnit) || 50,
    quantity: Number(it.quantity) || 1,
    unit: it.unit || 'กก.'
  }));

  if (adjustItemsState.length === 0) {
    adjustItemsState.push({
      serviceId: 1,
      serviceName: 'ซัก อบ พับ (Wash & Fold)',
      pricePerUnit: 60,
      quantity: 1,
      unit: 'กก.'
    });
  }

  renderAdjustItemsList();
  calculateAdjustTotal();

  document.getElementById('adjust-note-input').value = order.priceAdjustNote || order.specialNotes || '';

  const modal = document.getElementById('admin-adjust-modal');
  if (modal) modal.classList.add('active');
};

window.closeAdminAdjustModal = function () {
  const modal = document.getElementById('admin-adjust-modal');
  if (modal) modal.classList.remove('active');
  currentAdjustOrderId = null;
  currentAdjustOrder = null;
};

window.renderAdjustItemsList = function () {
  const container = document.getElementById('adjust-items-container');
  if (!container) return;

  container.innerHTML = adjustItemsState.map((item, idx) => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:white; border:1px solid #cbd5e1; border-radius:8px; padding:0.6rem 0.85rem; gap:0.75rem; flex-wrap:wrap;">
      <div style="flex:1; min-width:160px;">
        <strong style="font-size:0.9rem; color:#0f172a;">${item.serviceName}</strong>
        <div style="font-size:0.75rem; color:#64748b;">ราคาต่อหน่วย: ฿${item.pricePerUnit} / ${item.unit}</div>
      </div>
      <div style="display:flex; align-items:center; gap:0.4rem;">
        <label style="font-size:0.8rem; color:#475569; font-weight:700;">ชั่งจริง:</label>
        <input type="number" step="0.1" min="0.1" max="100" class="form-control" style="width:85px; padding:0.3rem 0.5rem; text-align:center; font-weight:800; color:#0f172a;" value="${item.quantity}" oninput="updateAdjustItemQty(${idx}, this.value)">
        <span style="font-size:0.85rem; color:#475569; font-weight:600;">${item.unit}</span>
      </div>
      <div style="text-align:right; min-width:75px;">
        <strong style="font-size:1rem; color:#0284c7;">฿${Math.round(item.quantity * item.pricePerUnit).toLocaleString()}</strong>
      </div>
    </div>
  `).join('');
};

window.updateAdjustItemQty = function (idx, val) {
  const qty = Math.max(0.1, parseFloat(val) || 1);
  adjustItemsState[idx].quantity = qty;
  renderAdjustItemsList();
  calculateAdjustTotal();
};

window.calculateAdjustTotal = function () {
  let subtotal = 0;
  adjustItemsState.forEach(it => {
    subtotal += (it.quantity * it.pricePerUnit);
  });
  subtotal = Math.round(subtotal);

  const deliveryFee = 40;
  const discount = subtotal >= 500 ? 50 : 0;
  const total = subtotal + deliveryFee - discount;

  const subtotalEl = document.getElementById('adjust-subtotal-text');
  const deliveryEl = document.getElementById('adjust-delivery-text');
  const discountEl = document.getElementById('adjust-discount-text');
  const totalEl = document.getElementById('adjust-total-text');

  if (subtotalEl) subtotalEl.innerText = `฿${subtotal.toLocaleString()}`;
  if (deliveryEl) deliveryEl.innerText = `฿${deliveryFee}`;
  if (discountEl) discountEl.innerText = discount > 0 ? `-฿${discount}` : '฿0';
  if (totalEl) totalEl.innerText = `฿${total.toLocaleString()}`;

  return { subtotal, deliveryFee, discount, total };
};

window.submitAdminAdjustOrder = async function (e) {
  e.preventDefault();
  if (!currentAdjustOrderId) return;

  const note = document.getElementById('adjust-note-input').value.trim();
  if (!note) {
    showToast('กรุณากรอกหมายเหตุการปรับราคา เพื่อแจ้งให้ลูกค้าทราบ', 'error');
    return;
  }

  const { subtotal, deliveryFee, discount, total } = calculateAdjustTotal();

  const payload = {
    items: adjustItemsState.map(it => ({
      ...it,
      subtotal: Math.round(it.quantity * it.pricePerUnit)
    })),
    totalAmount: total,
    deliveryFee,
    discount,
    note
  };

  const res = await API.adjustOrderPrice(currentAdjustOrderId, payload);
  if (res.success) {
    showToast(`⚖️ บันทึกการชั่งผ้าและปรับราคาออเดอร์ ${currentAdjustOrderId} เป็น ฿${total.toLocaleString()} เรียบร้อยแล้ว (รอลูกค้ายืนยันราคา)`);
    closeAdminAdjustModal();
    await loadAdminView();
  } else {
    showToast(res.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'error');
  }
};

// ==========================================
// Admin Order Edit Modal Logic (แก้ไขข้อมูลออเดอร์ของลูกค้า)
// ==========================================
let currentAdminEditOrderId = null;
let adminEditOrderItems = [];

window.openAdminEditOrderModal = function (orderId) {
  const order = (state.orders || []).find(o => String(o.id) === String(orderId) || String(o.rawId) === String(orderId));
  if (!order) {
    showToast('ไม่พบข้อมูลคำสั่งซื้อ', 'error');
    return;
  }

  currentAdminEditOrderId = order.id;

  document.getElementById('edit-order-id').value = order.id;
  document.getElementById('edit-order-display-id').innerText = order.id;
  document.getElementById('edit-order-status').value = order.status || 'ORDER_PLACED';

  // Customer Contact Info
  document.getElementById('edit-order-cust-name').value = order.customer?.name || '';
  document.getElementById('edit-order-cust-phone').value = order.customer?.phone || '';
  document.getElementById('edit-order-cust-address').value = order.deliveryAddress || order.customer?.address || '';
  document.getElementById('edit-order-cust-email').value = order.customer?.email || '';
  document.getElementById('edit-order-cust-note').value = order.notes || order.specialNotes || '';

  // Schedules & Preferences
  document.getElementById('edit-order-pickup').value = order.pickupSchedule || '';
  document.getElementById('edit-order-return').value = order.returnSchedule || '';
  document.getElementById('edit-order-pref-detergent').value = order.preferences?.detergent || '';
  document.getElementById('edit-order-pref-softener').value = order.preferences?.softener || '';
  document.getElementById('edit-order-pref-packaging').value = order.preferences?.packaging || '';

  // Rider info
  document.getElementById('edit-order-rider-name').value = order.assignedRider?.name || '';
  document.getElementById('edit-order-rider-phone').value = order.assignedRider?.phone || '';

  // Items
  adminEditOrderItems = (order.items && order.items.length > 0) ? order.items.map(it => ({
    serviceId: it.serviceId || 1,
    serviceName: it.serviceName || 'ซัก อบ พับ (Wash & Fold)',
    pricePerUnit: Number(it.pricePerUnit) || 50,
    quantity: Number(it.quantity) || 1,
    unit: it.unit || 'กก.'
  })) : [{
    serviceId: 1,
    serviceName: 'ซัก อบ พับ (Wash & Fold)',
    pricePerUnit: 60,
    quantity: 1,
    unit: 'กก.'
  }];

  renderAdminEditOrderItems();
  recalcAdminEditOrderTotals(false);

  // Set custom total amount and adjustment note
  const customTotalInput = document.getElementById('edit-order-custom-total');
  if (customTotalInput) {
    customTotalInput.value = (order.totalAmount !== undefined) ? order.totalAmount : 0;
  }
  const priceNoteInput = document.getElementById('edit-order-price-note');
  if (priceNoteInput) {
    priceNoteInput.value = order.priceAdjustmentNote || order.priceAdjustNote || '';
  }

  const modal = document.getElementById('admin-edit-order-modal');
  if (modal) modal.classList.add('active');
};

window.closeAdminEditOrderModal = function () {
  const modal = document.getElementById('admin-edit-order-modal');
  if (modal) modal.classList.remove('active');
  currentAdminEditOrderId = null;
};

window.renderAdminEditOrderItems = function () {
  const container = document.getElementById('edit-order-items-list');
  if (!container) return;

  const services = (state.services && state.services.length > 0) ? state.services : [
    { id: 1, name: 'ซัก อบ พับ (Wash & Fold)', basePrice: 60, unit: 'กก.' },
    { id: 2, name: 'ซัก อบ รีด (Wash & Iron)', basePrice: 80, unit: 'กก.' },
    { id: 3, name: 'ซักแห้ง (Dry Clean)', basePrice: 120, unit: 'ชิ้น' },
    { id: 4, name: 'ซักผ้านวม / เครื่องนอน (Bedding)', basePrice: 150, unit: 'ผืน' }
  ];

  container.innerHTML = adminEditOrderItems.map((item, idx) => `
    <div style="display:flex; align-items:center; gap:0.5rem; background:white; border:1px solid #cbd5e1; border-radius:8px; padding:0.5rem 0.75rem; flex-wrap:wrap;">
      <select class="form-select" style="flex:2; min-width:180px; font-size:0.85rem;" onchange="onAdminEditServiceChange(${idx}, this.value)">
        ${services.map(s => {
          const prc = Number(s.pricePerUnit || s.basePrice || s.price || 0);
          return `
            <option value="${s.id}" ${String(s.id) === String(item.serviceId) ? 'selected' : ''}>
              ${s.name} (฿${prc}/${s.unit || 'กก.'})
            </option>
          `;
        }).join('')}
      </select>
      <div style="display:flex; align-items:center; gap:0.35rem;">
        <input type="number" step="0.1" min="0.1" max="100" class="form-control" style="width:75px; text-align:center; font-size:0.85rem; padding:0.3rem;" value="${item.quantity}" oninput="onAdminEditQtyChange(${idx}, this.value)">
        <span style="font-size:0.8rem; color:#64748b; min-width:30px;">${item.unit || 'กก.'}</span>
      </div>
      <div style="min-width:70px; text-align:right; font-weight:700; color:#0284c7; font-size:0.9rem;">
        ฿${Math.round(item.quantity * item.pricePerUnit).toLocaleString()}
      </div>
      <button type="button" class="btn btn-sm" style="background:#fee2e2; color:#ef4444; border:none; padding:0.25rem 0.5rem; border-radius:6px; cursor:pointer;" onclick="removeAdminEditOrderItemRow(${idx})" title="ลบรายการ">
        ✕
      </button>
    </div>
  `).join('');
};

window.onAdminEditServiceChange = function (idx, serviceId) {
  const services = (state.services && state.services.length > 0) ? state.services : [
    { id: 1, name: 'ซัก อบ พับ (Wash & Fold)', pricePerUnit: 60, unit: 'กก.' },
    { id: 2, name: 'ซัก อบ รีด (Wash & Iron)', pricePerUnit: 80, unit: 'กก.' },
    { id: 3, name: 'ซักแห้ง (Dry Clean)', pricePerUnit: 120, unit: 'ชิ้น' },
    { id: 4, name: 'ซักผ้านวม / เครื่องนอน (Bedding)', pricePerUnit: 150, unit: 'ผืน' }
  ];
  const s = services.find(x => String(x.id) === String(serviceId));
  if (s) {
    adminEditOrderItems[idx].serviceId = s.id;
    adminEditOrderItems[idx].serviceName = s.name;
    adminEditOrderItems[idx].pricePerUnit = Number(s.pricePerUnit || s.basePrice || s.price || 0);
    adminEditOrderItems[idx].unit = s.unit || 'กก.';
    renderAdminEditOrderItems();
    recalcAdminEditOrderTotals();
  }
};

window.onAdminEditQtyChange = function (idx, val) {
  const qty = Math.max(0.1, parseFloat(val) || 1);
  adminEditOrderItems[idx].quantity = qty;
  renderAdminEditOrderItems();
  recalcAdminEditOrderTotals();
};

window.addAdminEditOrderItemRow = function () {
  const defaultService = (state.services && state.services[0]) || { id: 1, name: 'ซัก อบ พับ (Wash & Fold)', pricePerUnit: 60, unit: 'กก.' };
  adminEditOrderItems.push({
    serviceId: defaultService.id,
    serviceName: defaultService.name,
    pricePerUnit: Number(defaultService.pricePerUnit || defaultService.basePrice || defaultService.price || 60),
    quantity: 1,
    unit: defaultService.unit || 'กก.'
  });
  renderAdminEditOrderItems();
  recalcAdminEditOrderTotals();
};

window.removeAdminEditOrderItemRow = function (idx) {
  if (adminEditOrderItems.length <= 1) {
    showToast('คำสั่งซื้อต้องมีรายการบริการอย่างน้อย 1 รายการ', 'info');
    return;
  }
  adminEditOrderItems.splice(idx, 1);
  renderAdminEditOrderItems();
  recalcAdminEditOrderTotals();
};

window.recalcAdminEditOrderTotals = function (autoSyncInput = false) {
  let subtotal = 0;
  adminEditOrderItems.forEach(it => {
    subtotal += (it.quantity * it.pricePerUnit);
  });
  subtotal = Math.round(subtotal);
  const deliveryFee = 0;
  const calculatedTotal = subtotal;

  const subtotalEl = document.getElementById('edit-order-subtotal');
  const totalEl = document.getElementById('edit-order-total');
  if (subtotalEl) subtotalEl.innerText = `฿${subtotal.toLocaleString()}`;
  if (totalEl) totalEl.innerText = `฿${calculatedTotal.toLocaleString()}`;

  const customTotalInput = document.getElementById('edit-order-custom-total');
  if (customTotalInput && autoSyncInput) {
    customTotalInput.value = calculatedTotal;
  }

  return { subtotal, deliveryFee, calculatedTotal };
};

window.resetAdminEditPriceToCalculated = function () {
  const { calculatedTotal } = recalcAdminEditOrderTotals(true);
  showToast(`รีเซ็ตราคาเป็น ฿${calculatedTotal.toLocaleString()} ตามรายการเรียบร้อย`, 'info');
};

window.setAdminPriceNote = function (text) {
  const input = document.getElementById('edit-order-price-note');
  if (input) {
    if (input.value.trim()) {
      input.value += ` | ${text}`;
    } else {
      input.value = text;
    }
    input.focus();
  }
};

window.submitAdminEditOrder = async function (e) {
  e.preventDefault();
  if (!currentAdminEditOrderId) return;

  const { calculatedTotal } = recalcAdminEditOrderTotals();
  const customTotalInput = document.getElementById('edit-order-custom-total');
  const priceNoteInput = document.getElementById('edit-order-price-note');

  const customTotal = customTotalInput ? Math.max(0, parseFloat(customTotalInput.value) || 0) : calculatedTotal;
  const priceAdjustmentNote = priceNoteInput ? priceNoteInput.value.trim() : '';

  const payload = {
    customerName: document.getElementById('edit-order-cust-name').value.trim(),
    customerPhone: document.getElementById('edit-order-cust-phone').value.trim(),
    customerEmail: document.getElementById('edit-order-cust-email').value.trim(),
    deliveryAddress: document.getElementById('edit-order-cust-address').value.trim(),
    notes: document.getElementById('edit-order-cust-note').value.trim(),
    pickupSchedule: document.getElementById('edit-order-pickup').value.trim(),
    returnSchedule: document.getElementById('edit-order-return').value.trim(),
    status: document.getElementById('edit-order-status').value,
    preferences: {
      detergent: document.getElementById('edit-order-pref-detergent').value.trim(),
      softener: document.getElementById('edit-order-pref-softener').value.trim(),
      packaging: document.getElementById('edit-order-pref-packaging').value.trim()
    },
    assignedRider: {
      name: document.getElementById('edit-order-rider-name').value.trim(),
      phone: document.getElementById('edit-order-rider-phone').value.trim()
    },
    items: adminEditOrderItems.map(it => ({
      ...it,
      subtotal: Math.round(it.quantity * it.pricePerUnit)
    })),
    totalAmount: customTotal,
    priceAdjustmentNote: priceAdjustmentNote
  };

  const btn = document.getElementById('edit-order-submit-btn');
  if (btn) btn.disabled = true;

  try {
    const res = await API.updateOrder(currentAdminEditOrderId, payload);
    if (res.success) {
      showToast(`✏️ บันทึกการแก้ไขออเดอร์ ${currentAdminEditOrderId} สำเร็จแล้ว!`);
      closeAdminEditOrderModal();
      await loadAdminView();
    } else {
      showToast(res.message || 'เกิดข้อผิดพลาดในการแก้ไขออเดอร์', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
};

// ==========================================
// Admin User Management Logic (จัดการบัญชีผู้ใช้ในระบบ)
// ==========================================
window.currentAdminSection = 'orders';
window.adminUsersList = [];

window.switchAdminSection = function (section) {
  window.currentAdminSection = section;
  const navOrders = document.getElementById('admin-nav-orders');
  const navUsers = document.getElementById('admin-nav-users');
  const secOrders = document.getElementById('admin-section-orders');
  const secUsers = document.getElementById('admin-section-users');

  if (navOrders) navOrders.className = `btn btn-sm ${section === 'orders' ? 'btn-primary' : 'btn-secondary'}`;
  if (navUsers) navUsers.className = `btn btn-sm ${section === 'users' ? 'btn-primary' : 'btn-secondary'}`;
  if (secOrders) secOrders.style.display = section === 'orders' ? 'block' : 'none';
  if (secUsers) secUsers.style.display = section === 'users' ? 'block' : 'none';

  if (section === 'users') {
    loadAdminUsers();
  } else {
    loadAdminView();
  }
};

window.loadAdminUsers = async function () {
  try {
    const res = await API.getUsers();
    if (res.success) {
      window.adminUsersList = res.data || [];
      const totalEl = document.getElementById('admin-user-total-count');
      if (totalEl) totalEl.innerText = window.adminUsersList.length;
      filterAdminUserTable();
    } else {
      showToast(res.message || 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการโหลดรายชื่อผู้ใช้', 'error');
  }
};

window.filterAdminUserTable = function () {
  const searchInput = document.getElementById('admin-user-search-input');
  const roleFilter = document.getElementById('admin-user-filter-role');
  const q = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const role = roleFilter ? roleFilter.value : 'ALL';

  let list = window.adminUsersList || [];

  if (role !== 'ALL') {
    list = list.filter(u => (u.role || 'customer').toLowerCase() === role.toLowerCase());
  }

  if (q) {
    list = list.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (String(u.id || '')).toLowerCase().includes(q)
    );
  }

  renderAdminUserTable(list);
};

const USER_ROLE_CONFIG = {
  customer: { label: '👤 ลูกค้า (Customer)', bg: '#f1f5f9', color: '#334155' },
  rider: { label: '🛵 ไรเดอร์ (Rider)', bg: '#e0f2fe', color: '#0369a1' },
  staff: { label: '🧼 เจ้าหน้าที่ซักรีด (Staff)', bg: '#fef3c7', color: '#b45309' },
  admin: { label: '🛡️ ผู้ดูแลระบบ (Admin)', bg: '#ede9fe', color: '#6d28d9' }
};

window.renderAdminUserTable = function (users) {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:3rem 1.5rem; color:#64748b;">
          🔍 ไม่พบบัญชีผู้ใช้งานตามเงื่อนไขที่ค้นหา
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users.map(u => {
    const roleCfg = USER_ROLE_CONFIG[u.role] || USER_ROLE_CONFIG.customer;
    const isSelf = state.currentUser && (String(state.currentUser.id) === String(u.id) || state.currentUser.username === u.username);

    return `
      <tr>
        <td><strong>#${u.id}</strong></td>
        <td>
          <span style="font-weight:700; color:#0f172a;">${u.username}</span>
          ${isSelf ? '<span style="font-size:0.7rem; background:#dcfce7; color:#15803d; padding:2px 6px; border-radius:4px; margin-left:4px; font-weight:700;">คุณ</span>' : ''}
        </td>
        <td>
          <span style="display:inline-block; font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:6px; background:${roleCfg.bg}; color:${roleCfg.color};">
            ${roleCfg.label}
          </span>
        </td>
        <td><strong>${u.name || '-'}</strong></td>
        <td>📞 ${u.phone || '-'}</td>
        <td style="font-size:0.85rem; color:#64748b;">${u.email || '-'}</td>
        <td style="font-size:0.8rem; color:#475569; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${u.address || ''}">
          ${u.address || '-'}
        </td>
        <td style="text-align:center;">
          <div style="display:inline-flex; gap:0.35rem;">
            <button class="btn btn-sm" style="background:#e0f2fe; color:#0369a1; border:none; padding:0.3rem 0.6rem; border-radius:6px; font-weight:700; cursor:pointer;" onclick="openAdminUserModal('${u.id}')" title="แก้ไขข้อมูลบัญชี">
              ✏️ แก้ไข
            </button>
            <button class="btn btn-sm" style="background:#fee2e2; color:#dc2626; border:none; padding:0.3rem 0.6rem; border-radius:6px; font-weight:700; cursor:pointer; opacity:${isSelf ? '0.4' : '1'};" ${isSelf ? 'disabled title="ไม่สามารถลบบัญชีของตัวเองที่กำลังใช้งานอยู่ได้"' : `onclick="deleteAdminUser('${u.id}', '${u.username}')" title="ลบบัญชี"`}>
              🗑️ ลบ
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

window.openAdminUserModal = function (userId = null) {
  const form = document.getElementById('admin-user-form');
  if (form) form.reset();

  const idInput = document.getElementById('admin-user-form-id');
  const titleEl = document.getElementById('admin-user-modal-title');
  const passHelp = document.getElementById('admin-user-password-help');
  const passLabel = document.getElementById('admin-user-password-label');
  const passInput = document.getElementById('admin-user-form-password');
  const submitBtn = document.getElementById('admin-user-submit-btn');

  if (userId) {
    const user = (window.adminUsersList || []).find(u => String(u.id) === String(userId));
    if (!user) {
      showToast('ไม่พบข้อมูลผู้ใช้งาน', 'error');
      return;
    }

    if (idInput) idInput.value = user.id;
    if (titleEl) titleEl.innerText = `✏️ แก้ไขข้อมูลบัญชี (#${user.id} - ${user.username})`;
    if (passHelp) passHelp.style.display = 'block';
    if (passLabel) passLabel.innerText = 'รหัสผ่านใหม่ (Password)';
    if (passInput) {
      passInput.required = false;
      passInput.placeholder = 'เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน';
    }
    if (submitBtn) submitBtn.innerText = '💾 บันทึกการแก้ไข';

    document.getElementById('admin-user-form-username').value = user.username || '';
    document.getElementById('admin-user-form-role').value = user.role || 'customer';
    document.getElementById('admin-user-form-name').value = user.name || '';
    document.getElementById('admin-user-form-phone').value = user.phone || '';
    document.getElementById('admin-user-form-email').value = user.email || '';
    document.getElementById('admin-user-form-address').value = user.address || '';
  } else {
    if (idInput) idInput.value = '';
    if (titleEl) titleEl.innerText = '➕ เพิ่มผู้ใช้งานใหม่ในระบบ';
    if (passHelp) passHelp.style.display = 'none';
    if (passLabel) passLabel.innerText = 'รหัสผ่าน (Password) *';
    if (passInput) {
      passInput.required = true;
      passInput.placeholder = 'อย่างน้อย 6 ตัวอักษร';
    }
    if (submitBtn) submitBtn.innerText = '💾 สร้างบัญชีผู้ใช้';
  }

  const modal = document.getElementById('admin-user-modal');
  if (modal) modal.classList.add('active');
};

window.closeAdminUserModal = function () {
  const modal = document.getElementById('admin-user-modal');
  if (modal) modal.classList.remove('active');
};

window.submitAdminUserForm = async function (e) {
  e.preventDefault();
  const userId = document.getElementById('admin-user-form-id').value;
  const username = document.getElementById('admin-user-form-username').value.trim();
  const role = document.getElementById('admin-user-form-role').value;
  const password = document.getElementById('admin-user-form-password').value;
  const name = document.getElementById('admin-user-form-name').value.trim();
  const phone = document.getElementById('admin-user-form-phone').value.trim();
  const email = document.getElementById('admin-user-form-email').value.trim();
  const address = document.getElementById('admin-user-form-address').value.trim();

  const submitBtn = document.getElementById('admin-user-submit-btn');
  if (submitBtn) submitBtn.disabled = true;

  try {
    if (userId) {
      // Edit User
      const payload = { name, phone, email, address, role };
      if (password && password.trim().length > 0) {
        if (password.length < 6) {
          showToast('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'error');
          if (submitBtn) submitBtn.disabled = false;
          return;
        }
        payload.password = password;
      }

      const res = await API.updateProfile(userId, payload);
      if (res.success) {
        showToast(`✅ บันทึกข้อมูลของ ${name || username} เรียบร้อยแล้ว`);
        closeAdminUserModal();
        await loadAdminUsers();
      } else {
        showToast(res.message || 'ไม่สามารถแก้ไขข้อมูลผู้ใช้ได้', 'error');
      }
    } else {
      // Create User
      if (!password || password.length < 6) {
        showToast('กรุณาระบุรหัสผ่านอย่างน้อย 6 ตัวอักษร', 'error');
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      const payload = { username, password, name, phone, email, address, role };
      const res = await API.createUser(payload);
      if (res.success) {
        showToast(`🎉 เพิ่มผู้ใช้งาน ${username} (${role}) สำเร็จแล้ว!`);
        closeAdminUserModal();
        await loadAdminUsers();
      } else {
        showToast(res.message || 'ไม่สามารถสร้างผู้ใช้งานได้', 'error');
      }
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
};

window.deleteAdminUser = async function (userId, username) {
  if (state.currentUser && (String(state.currentUser.id) === String(userId) || state.currentUser.username === username)) {
    showToast('ไม่สามารถลบบัญชีที่กำลังล็อกอินอยู่ได้', 'error');
    return;
  }

  if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบบัญชีผู้ใช้ "${username}" (ID: ${userId}) ออกจากระบบอย่างถาวร?\nการกระทำนี้ไม่สามารถย้อนกลับได้!`)) {
    return;
  }

  try {
    const res = await API.deleteAccount(userId);
    if (res.success) {
      showToast(`🗑️ ลบบัญชีผู้ใช้ "${username}" เรียบร้อยแล้ว`);
      await loadAdminUsers();
    } else {
      showToast(res.message || 'เกิดข้อผิดพลาดในการลบบัญชีผู้ใช้', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error');
  }
};

window.customerApprovePrice = async function (orderId) {
  if (!confirm(`คุณต้องการยืนยันและอนุมัติราคาใหม่ของออเดอร์ ${orderId} ใช่หรือไม่?`)) return;

  const res = await API.approveOrderPrice(orderId, 'approve');
  if (res.success) {
    showToast('🎉 คุณได้ยืนยันราคาเรียบร้อยแล้ว! ทางร้านเริ่มดำเนินการซัก อบ รีด ให้ทันทีครับ', 'success');
    await loadTrackingView(orderId);
  } else {
    showToast(res.message || 'เกิดข้อผิดพลาด', 'error');
  }
};

window.customerRejectPrice = async function (orderId) {
  const reason = prompt('กรุณาระบุเหตุผลที่ต้องการยกเลิกคำสั่งซื้อ:');
  if (reason === null) return;

  const res = await API.approveOrderPrice(orderId, 'reject', reason);
  if (res.success) {
    showToast('ยกเลิกคำสั่งซื้อเรียบร้อยแล้ว', 'info');
    await loadTrackingView(orderId);
  } else {
    showToast(res.message || 'เกิดข้อผิดพลาด', 'error');
  }
};

window.customerConfirmDelivery = async function (orderId) {
  if (!confirm(`คุณต้องการยืนยันว่าได้รับผ้าของคำสั่งซื้อ ${orderId} เรียบร้อยแล้วใช่หรือไม่?`)) return;

  try {
    const res = await API.confirmDelivery(orderId);
    if (res.success) {
      showToast('🎉 ยืนยันการรับผ้าเรียบร้อยแล้ว! คำสั่งซื้อถูกย้ายไปยังประวัติที่สำเร็จแล้ว', 'success');
      window.customerOrderTab = 'history';
      await loadTrackingView(orderId);
    } else {
      showToast(res.message || 'เกิดข้อผิดพลาดในการยืนยันการรับผ้า', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
  }
};

// ==========================================
// Customer Profile View & Account Management
// ==========================================
function loadProfileView() {
  if (!state.currentUser) {
    switchAppView('landing');
    openAuthModal('login');
    return;
  }

  const u = state.currentUser;
  const nameDisplay = document.getElementById('profile-display-name');
  const usernameDisplay = document.getElementById('profile-display-username');
  const idDisplay = document.getElementById('profile-display-id');
  const roleDisplay = document.getElementById('profile-display-role');

  if (nameDisplay) nameDisplay.innerText = u.name || u.username;
  if (usernameDisplay) usernameDisplay.innerText = `@${u.username}`;
  if (idDisplay) idDisplay.innerText = `CUST-${String(u.id || u.customerID || '1').padStart(3, '0')}`;

  if (roleDisplay) {
    const roleLabels = {
      customer: 'นิสิต / ลูกค้าทั่วไป',
      rider: 'พนักงานจัดส่ง (Rider)',
      staff: 'โรงงานซักรีด (Staff)',
      admin: 'ผู้ดูแลระบบ (Admin)'
    };
    roleDisplay.innerText = roleLabels[u.role] || u.role;
  }

  // Populate form fields with current user information
  const usernameInput = document.getElementById('profile-username-input');
  const nameInput = document.getElementById('profile-name-input');
  const phoneInput = document.getElementById('profile-phone-input');
  const emailInput = document.getElementById('profile-email-input');
  const addrInput = document.getElementById('profile-address-input');
  const passInput = document.getElementById('profile-password-input');
  const passConfirmInput = document.getElementById('profile-confirm-password-input');

  if (usernameInput) usernameInput.value = u.username || '';
  if (nameInput) nameInput.value = u.name || '';
  if (phoneInput) phoneInput.value = u.phone || '';
  if (emailInput) emailInput.value = u.email || '';
  if (addrInput) addrInput.value = u.address || '';
  if (passInput) passInput.value = '';
  if (passConfirmInput) passConfirmInput.value = '';
}

window.submitProfileUpdate = async function (e) {
  if (e) e.preventDefault();
  if (!state.currentUser) return;

  const name = document.getElementById('profile-name-input').value.trim();
  const phone = document.getElementById('profile-phone-input').value.trim();
  const email = document.getElementById('profile-email-input').value.trim();
  const address = document.getElementById('profile-address-input').value.trim();
  const password = document.getElementById('profile-password-input').value;
  const confirmPassword = document.getElementById('profile-confirm-password-input').value;

  if (!name || !phone || !email) {
    showToast('กรุณากรอกชื่อ, เบอร์โทร และอีเมลให้ครบถ้วน', 'error');
    return;
  }

  if (password && password.length < 6) {
    showToast('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'error');
    return;
  }

  if (password && password !== confirmPassword) {
    showToast('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง', 'error');
    return;
  }

  const btn = document.getElementById('btn-save-profile');
  if (btn) {
    btn.disabled = true;
    btn.innerText = 'กำลังบันทึกข้อมูล...';
  }

  try {
    const res = await API.updateProfile(state.currentUser.id, {
      name,
      phone,
      email,
      address,
      password: password && password.trim().length >= 6 ? password.trim() : undefined
    });

    if (res.success) {
      showToast('🎉 บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว!', 'success');
      // Merge updated fields into state.currentUser
      state.currentUser = {
        ...state.currentUser,
        name: res.data.name,
        phone: res.data.phone,
        email: res.data.email,
        address: res.data.address
      };
      localStorage.setItem('dekdry_user', JSON.stringify(state.currentUser));
      renderAuthNavbar();
      loadProfileView();
      prefillCustomerForms();
    } else {
      showToast(res.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  } catch (err) {
    console.error('Update profile error:', err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerText = '💾 บันทึกการเปลี่ยนแปลงข้อมูล';
    }
  }
};

window.deleteCustomerAccount = async function () {
  if (!state.currentUser) return;

  const currentName = state.currentUser.name || state.currentUser.username;
  const currentUsername = state.currentUser.username;
  const currentUserId = state.currentUser.id;

  const step1 = confirm(`⚠️ คำเตือน: คุณต้องการลบบัญชีผู้ใช้งาน "${currentName}" (@${currentUsername}) ใช่หรือไม่?\n\nหากลบแล้ว บัญชีและข้อมูลส่วนตัวรวมถึงประวัติคำสั่งซื้อทั้งหมดจะถูกลบออกจากระบบอย่างถาวร`);
  if (!step1) return;

  const step2 = prompt(`เพื่อความปลอดภัยสูงสุด กรุณาพิมพ์คำว่า "DELETE" หรือพิมพ์ชื่อผู้ใช้ของคุณ (${currentUsername}) เพื่อยืนยันการลบบัญชี:`);
  if (step2 === null) return;

  const cleanInput = step2.trim();
  if (cleanInput.toUpperCase() !== 'DELETE' && cleanInput.toLowerCase() !== currentUsername.toLowerCase()) {
    showToast('การยืนยันไม่ถูกต้อง ระบบยกเลิกการลบบัญชี', 'info');
    return;
  }

  try {
    const res = await API.deleteAccount(currentUserId);
    if (res.success) {
      alert('บัญชีผู้ใช้งานของคุณถูกลบออกจากระบบ DekDry เรียบร้อยแล้ว');
      logoutUser();
      switchAppView('landing');
    } else {
      showToast(res.message || 'ไม่สามารถลบบัญชีได้', 'error');
    }
  } catch (err) {
    console.error('Delete account error:', err);
    showToast('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
  }
};

// ==========================================
// Live Real-Time Polling for Order Updates (ซิงค์สถานะออเดอร์แบบเรียลไทม์)
// ==========================================
let trackingPollTimer = null;
const lastKnownStatusMap = {};

function startLiveTrackingPoll() {
  if (trackingPollTimer) return;
  trackingPollTimer = setInterval(async () => {
    const activeView = state.currentAppView;
    if (!['tracking', 'rider', 'staff', 'admin'].includes(activeView)) return;

    try {
      const res = await API.getOrders();
      if (!res.success || !Array.isArray(res.data)) return;

      state.orders = res.data;

      // ตรวจสอบการเปลี่ยนสถานะของแต่ละออเดอร์
      res.data.forEach(ord => {
        const prevStatus = lastKnownStatusMap[ord.id];
        if (prevStatus && prevStatus !== ord.status) {
          const cfg = STATUS_CONFIG[ord.status] || { label: ord.status, icon: '🔔' };

          const isUserOrder = state.currentUser && (
            ['admin', 'rider', 'staff'].includes(state.currentUser.role) ||
            String(ord.userId) === String(state.currentUser.id) ||
            (state.currentUser.phone && ord.customer?.phone && ord.customer.phone.replace(/\D/g, '') === state.currentUser.phone.replace(/\D/g, ''))
          );

          if (isUserOrder) {
            showToast(`🔔 ออเดอร์ ${ord.id} อัปเดตสถานะเป็น: "${cfg.label}" ${cfg.icon}`, 'info');
          }
        }
        lastKnownStatusMap[ord.id] = ord.status;
      });

      // ถ้าลูกค้ากำลังเปิดหน้าติดตามสถานะผ้าอยู่ ให้อัปเดตข้อมูลบนหน้าจอทันทีแบบเรียลไทม์
      if (activeView === 'tracking') {
        const searchInput = document.getElementById('tracking-search-input');
        const currentActiveId = searchInput?.value?.trim()?.toUpperCase();
        if (currentActiveId) {
          const curOrder = state.orders.find(o => o.id.toUpperCase() === currentActiveId);
          if (curOrder) {
            renderTrackingDetails(currentActiveId);
          }
        }
      }
    } catch (e) {
      // quiet catch network blip
    }
  }, 3000);
}


