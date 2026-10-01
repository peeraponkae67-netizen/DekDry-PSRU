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
  getStats: () => fetch('/api/stats').then(r => r.json()),
  getRiders: () => fetch('/api/riders').then(r => r.json())
};

// รายละเอียดและสีของแต่ละสถานะ
const STATUS_CONFIG = {
  ORDER_PLACED: { label: 'สั่งออเดอร์แล้ว', icon: '📝', cls: 'status-ORDER_PLACED' },
  RIDER_ASSIGNED: { label: 'จัดสรรไรเดอร์แล้ว', icon: '🛵', cls: 'status-RIDER_ASSIGNED' },
  PICKED_UP: { label: 'รับผ้าแล้ว (เข้าร้าน)', icon: '🧺', cls: 'status-PICKED_UP' },
  IN_WASHING: { label: 'กำลังซัก / อบ / รีด', icon: '🧼', cls: 'status-IN_WASHING' },
  WASHED_READY: { label: 'ซักเสร็จ พร้อมจัดส่ง', icon: '✨', cls: 'status-WASHED_READY' },
  OUT_FOR_DELIVERY: { label: 'กำลังนำส่งลูกค้า', icon: '🚚', cls: 'status-OUT_FOR_DELIVERY' },
  DELIVERED: { label: 'จัดส่งสำเร็จ', icon: '🎉', cls: 'status-DELIVERED' },
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
  updateOrderFlowTotals();
});

// ฟังก์ชันสลับหน้า (Landing, Order, Pricing, Tracking, Rider, Staff, Admin)
window.switchAppView = function (viewName) {
  if ((viewName === 'order' || viewName === 'tracking') && !state.currentUser) {
    window.pendingAppView = viewName;
    showToast(`กรุณาเข้าสู่ระบบก่อน${viewName === 'order' ? 'สั่งจองบริการ' : 'ตรวจสอบสถานะผ้า'} 🔐`, 'info');
    openAuthModal('login');
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

  if (viewName === 'order') prefillCustomerForms();
  else if (viewName === 'tracking') loadTrackingView();
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

// Campus Switcher on Pricing Page (PSRU ทะเลแก้ว / วังจันทน์)
window.setPricingCity = function (campus) {
  const isTk = campus === 'psru_tk';
  const tkBtn = document.getElementById('btn-city-bkk');
  const wcBtn = document.getElementById('btn-city-cnx');
  if (tkBtn) tkBtn.classList.toggle('active', isTk);
  if (wcBtn) wcBtn.classList.toggle('active', !isTk);

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

// Booking Modal
window.openBookingModal = function (tier = null) {
  if (!state.currentUser) {
    window.pendingBookingModalTier = tier;
    showToast('กรุณาเข้าสู่ระบบก่อนสั่งจองบริการ 🔐', 'info');
    openAuthModal('login');
    return;
  }

  if (tier && state.services.length > 0) {
    state.cart = {};
    if (tier === 'economy') {
      state.cart['srv_wash_fold'] = 5;
    } else if (tier === 'standard') {
      state.cart['srv_wash_iron'] = 4;
    } else if (tier === 'express') {
      state.cart['srv_wash_fold'] = 5;
      state.cart['srv_express'] = 1;
    }
  }

  document.getElementById('booking-modal').classList.add('active');
  prefillCustomerForms();
  renderServicesGrid();
  updateCartSummary();
};

// เติมข้อมูลลูกค้าอัตโนมัติเมื่อเข้าสู่ระบบ
function prefillCustomerForms() {
  if (!state.currentUser) return;
  const u = state.currentUser;

  const orderName = document.getElementById('order-cust-name');
  const orderPhone = document.getElementById('order-cust-phone');
  const orderEmail = document.getElementById('order-cust-email');
  const orderAddr = document.getElementById('order-cust-address');
  if (orderName && (!orderName.value || orderName.value === '')) orderName.value = u.name || '';
  if (orderPhone && (!orderPhone.value || orderPhone.value === '')) orderPhone.value = u.phone || '';
  if (orderEmail && (!orderEmail.value || orderEmail.value === '')) orderEmail.value = u.email || '';
  if (orderAddr && (!orderAddr.value || orderAddr.value === '')) orderAddr.value = u.address || '';

  const custName = document.getElementById('cust-name');
  const custPhone = document.getElementById('cust-phone');
  const custAddr = document.getElementById('cust-address');
  if (custName && (!custName.value || custName.value === '')) custName.value = u.name || '';
  if (custPhone && (!custPhone.value || custPhone.value === '')) custPhone.value = u.phone || '';
  if (custAddr && (!custAddr.value || custAddr.value === '')) custAddr.value = u.address || '';
}

window.closeBookingModal = function () {
  document.getElementById('booking-modal').classList.remove('active');
};

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
    addr.value = 'หอพักนักศึกษาชาย อาคาร 1 ห้อง 205 มหาวิทยาลัยราชภัฏพิบูลสงคราม (วังจันทน์)';
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
// ========================================================
const orderFlow = {
  region: 'psru_tk',
  plan: 'standard', // 'economy' | 'standard' | 'express'
  rates: {
    psru_tk: { economy: 35, standard: 49, express: 69 },
    psru_wc: { economy: 35, standard: 49, express: 69 }
  },
  pickupDate: 'ศ. 2 ต.ค.',
  pickupSlot: '10:00 — 12:00',
  returnDate: 'ส. 3 ต.ค.',
  returnSlot: '10:00 — 12:00',
  weight: 1,
  ironing: { label: 'พับผ้า', price: 0 },
  softener: { label: 'กลิ่นอ่อนโยน', pricePerKg: 0 },
  temp: { label: 'น้ำเย็น — 30°C', pricePerKg: 0 },
  drying: { label: 'เครื่องอบผ้า (อุณหภูมิต่ำ)', pricePerKg: 0 },
  hasBedding: false,
  minCharge: 80
};

window.setOrderRegion = function (region) {
  orderFlow.region = region;
  const isTk = region === 'psru_tk';
  const tkBtn = document.getElementById('order-city-bkk');
  const wcBtn = document.getElementById('order-city-cnx');
  if (tkBtn) tkBtn.classList.toggle('active', isTk);
  if (wcBtn) wcBtn.classList.toggle('active', !isTk);

  // Update rates display in plan cards
  const rates = orderFlow.rates[region] || orderFlow.rates.psru_tk;
  const ecoEl = document.querySelector('#plan-opt-economy .price-num');
  const stdEl = document.querySelector('#plan-opt-standard .price-num');
  const expEl = document.querySelector('#plan-opt-express .price-num');
  if (ecoEl) ecoEl.innerText = `฿${rates.economy}`;
  if (stdEl) stdEl.innerText = `฿${rates.standard}`;
  if (expEl) expEl.innerText = `฿${rates.express}`;

  updateOrderFlowTotals();
};

window.selectOrderPlan = function (planKey) {
  orderFlow.plan = planKey;
  ['economy', 'standard', 'express'].forEach(k => {
    const card = document.getElementById(`plan-opt-${k}`);
    if (card) card.classList.toggle('selected', k === planKey);
  });
  updateOrderFlowTotals();
};

window.selectPickupDate = function (el) {
  document.querySelectorAll('.date-tab-btn').forEach(btn => btn.classList.remove('selected'));
  el.classList.add('selected');
  const dayName = el.querySelector('.day-name')?.innerText || '';
  const dayNum = el.querySelector('.day-num')?.innerText || '';
  orderFlow.pickupDate = `${dayName} ${dayNum} ต.ค.`;
  updateOrderFlowTotals();
};

window.selectTimeSlot = function (el, type) {
  const container = el.parentElement;
  if (!container) return;

  // Deselect siblings of same group
  const selector = type === 'pickup' ? '.time-slot-option:not([data-return])' : '.time-slot-option[data-return]';
  el.closest('.step-section-card').querySelectorAll('.time-slot-option').forEach(slot => {
    // Check if this slot belongs to pickup or return
    if (type === 'pickup' && slot.onclick && slot.onclick.toString().includes("'pickup'")) {
      slot.classList.remove('selected');
      const check = slot.querySelector('span:last-child');
      if (check && check.innerText === '✓') check.innerText = '';
    } else if (type === 'return' && slot.onclick && slot.onclick.toString().includes("'return'")) {
      slot.classList.remove('selected');
      const check = slot.querySelector('span:last-child');
      if (check && check.innerText === '✓') check.innerText = '';
    }
  });

  el.classList.add('selected');
  const checkSpan = el.querySelector('span:last-child');
  if (checkSpan && !checkSpan.innerText.includes('bonus')) {
    checkSpan.innerText = '✓';
    checkSpan.style.color = '#0284c7';
    checkSpan.style.fontWeight = '800';
  }

  const timeText = el.querySelector('span:first-child')?.innerText || '';
  if (type === 'pickup') orderFlow.pickupSlot = timeText;
  else orderFlow.returnSlot = timeText;
};

window.selectPrefPill = function (el, category) {
  const container = el.parentElement;
  if (container) {
    container.querySelectorAll('.pref-option-pill').forEach(p => p.classList.remove('selected'));
  }
  el.classList.add('selected');

  const text = el.querySelector('span:first-child')?.innerText || '';
  const priceText = el.querySelector('span:last-child')?.innerText || '';

  if (category === 'iron') {
    let extra = 0;
    if (priceText.includes('39')) extra = 39;
    if (priceText.includes('49')) extra = 49;
    orderFlow.ironing = { label: text, price: extra };
  } else if (category === 'softener') {
    let extraPerKg = 0;
    if (priceText.includes('15')) extraPerKg = 15;
    orderFlow.softener = { label: text, pricePerKg: extraPerKg };
  } else if (category === 'temp') {
    let extraPerKg = 0;
    if (priceText.includes('10')) extraPerKg = 10;
    if (priceText.includes('20')) extraPerKg = 20;
    orderFlow.temp = { label: text, pricePerKg: extraPerKg };
  } else if (category === 'dry') {
    let extraPerKg = 0;
    if (priceText.includes('20')) extraPerKg = 20;
    orderFlow.drying = { label: text, pricePerKg: extraPerKg };
  }

  updateOrderFlowTotals();
};

window.updateOrderFlowTotals = function () {
  const weightInput = document.getElementById('order-weight-input');
  const weight = Math.max(1, Number(weightInput ? weightInput.value : 1) || 1);
  orderFlow.weight = weight;

  const rates = orderFlow.rates[orderFlow.region] || orderFlow.rates.bkk;
  const baseRate = rates[orderFlow.plan] || rates.standard;

  const extraPerKg = (orderFlow.softener.pricePerKg || 0) +
    (orderFlow.temp.pricePerKg || 0) +
    (orderFlow.drying.pricePerKg || 0);

  const rawServicePrice = (baseRate + extraPerKg) * weight + (orderFlow.ironing.price || 0);
  const totalAmount = Math.max(orderFlow.minCharge, rawServicePrice);

  // Update Summary DOM
  const pickupEl = document.getElementById('summary-flow-pickup');
  const returnEl = document.getElementById('summary-flow-return');
  const weightEl = document.getElementById('summary-flow-weight');
  const priceEl = document.getElementById('summary-flow-service-price');
  const totalEl = document.getElementById('summary-flow-total');

  if (pickupEl) pickupEl.innerText = `พรุ่งนี้ · ${orderFlow.pickupDate}`;
  if (returnEl) returnEl.innerText = `${orderFlow.returnDate}`;
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
    const note = document.getElementById('order-cust-note').value.trim();

    const paymentMethodEl = document.querySelector('input[name="order-payment-method"]:checked');
    const paymentMethod = paymentMethodEl ? paymentMethodEl.value : 'PROMPTPAY';

    const handoverEl = document.querySelector('input[name="pickup-handover"]:checked');
    const handoverText = handoverEl ? handoverEl.parentElement.innerText.trim() : 'รับโดยตรงกับลูกค้า';

    const beddingChecked = document.getElementById('chk-bedding')?.checked || false;

    const rates = orderFlow.rates[orderFlow.region] || orderFlow.rates.psru_tk;
    const baseRate = rates[orderFlow.plan] || rates.standard;
    const planNames = {
      economy: 'แบบประหยัด (2 วัน)',
      standard: 'แบบมาตรฐาน (วันถัดไป)',
      express: 'แบบเร่งด่วน (ด่วน 4-6 ชม.)'
    };
    const campusLabel = orderFlow.region === 'psru_tk' ? 'มรพส. ทะเลแก้ว' : 'มรพส. วังจันทน์';

    const orderData = {
      userId: state.currentUser ? state.currentUser.id : null,
      customer: {
        name,
        phone,
        email,
        address,
        note: `[วิทยาเขต: ${campusLabel}] [จุดรับผ้า: ${handoverText}] ${note ? ' | ' + note : ''}`
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
        bedding: beddingChecked ? 'มีผ้านวม/เครื่องนอน' : 'ไม่มี'
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
  if (!container) return;

  if (state.currentUser) {
    let roleLabel = 'ลูกค้า';
    let portalItem = '';
    if (state.currentUser.role === 'rider') {
      roleLabel = 'พนักงานจัดส่ง (Rider)';
      portalItem = `<button class="account-menu-item" onclick="switchAppView('rider')">🛵 งานไรเดอร์</button>`;
    } else if (state.currentUser.role === 'staff') {
      roleLabel = 'โรงงานซักรีด (Staff)';
      portalItem = `<button class="account-menu-item" onclick="switchAppView('staff')">🧼 งานซักรีด</button>`;
    } else if (state.currentUser.role === 'admin') {
      roleLabel = 'ผู้ดูแลระบบ (Admin)';
      portalItem = `<button class="account-menu-item" onclick="switchAppView('admin')">📊 แดชบอร์ดร้าน</button>`;
    }

    container.innerHTML = `
      <div class="account-dropdown">
        <button class="account-dropdown-btn" type="button">
          <span>บัญชีของฉัน</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="account-dropdown-menu">
          <div class="account-menu-header">
            <div class="account-menu-name">👤 ${state.currentUser.name}</div>
            <div class="account-menu-role">${roleLabel}</div>
          </div>
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
const TRACKING_STEPS_FLOW = [
  { key: 'ORDER_PLACED', stepNum: 1, title: 'รับคำสั่งซื้อ', icon: '📝', desc: 'ระบบบันทึกคำสั่งซื้อของคุณเรียบร้อยแล้ว' },
  { key: 'RIDER_ASSIGNED', stepNum: 2, title: 'จัดสรรไรเดอร์', icon: '🛵', desc: 'ไรเดอร์ได้รับมอบหมายงานและกำลังเดินทางไปรับผ้า' },
  { key: 'PICKED_UP', stepNum: 3, title: 'รับผ้าเข้าร้าน', icon: '🧺', desc: 'ไรเดอร์รับผ้าจากคุณเรียบร้อย กำลังนำส่งเข้าโรงซัก มรพส.' },
  { key: 'IN_WASHING', stepNum: 4, title: 'กำลังซัก/อบ/รีด', icon: '🧼', desc: 'ผ้ากำลังอยู่ในกระบวนการซัก อบ และรีดตามโปรแกรมที่คุณเลือก' },
  { key: 'WASHED_READY', stepNum: 5, title: 'ซักเสร็จพร้อมส่ง', icon: '✨', desc: 'ผ้าผ่านการซักรีดและตรวจสอบคุณภาพ (QC) พร้อมนำส่ง' },
  { key: 'OUT_FOR_DELIVERY', stepNum: 6, title: 'กำลังนำส่ง', icon: '🚚', desc: 'ไรเดอร์กำลังนำส่งผ้าสะอาดกลับไปยังจุดนัดพบ/หอพัก' },
  { key: 'DELIVERED', stepNum: 7, title: 'จัดส่งสำเร็จ', icon: '🎉', desc: 'ผ้าสะอาดส่งถึงมือคุณเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ DekDry' }
];

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

    // Filter orders belonging to the logged-in user
    const isSpecialRole = ['admin', 'rider', 'staff'].includes(state.currentUser.role);
    const userOrders = isSpecialRole
      ? state.orders
      : state.orders.filter(o => 
          o.userId === state.currentUser.id || 
          (o.customer && (o.customer.phone === state.currentUser.phone || o.customer.name === state.currentUser.name))
        );

    let activeOrderId = targetOrderId;
    if (!activeOrderId && searchInput && searchInput.value.trim()) {
      activeOrderId = searchInput.value.trim().toUpperCase();
    }
    if (!activeOrderId && userOrders.length > 0) {
      activeOrderId = userOrders[0].id;
    }

    // Render Quick Chips for user orders
    if (quickContainer && quickChips) {
      if (userOrders.length > 0) {
        quickContainer.style.display = 'block';
        quickChips.innerHTML = userOrders.map(o => {
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
        quickContainer.style.display = 'none';
      }
    }

    if (activeOrderId) {
      if (searchInput) searchInput.value = activeOrderId;
      renderTrackingDetails(activeOrderId);
    } else {
      if (searchInput) searchInput.value = '';
      contentEl.innerHTML = `
        <div class="card" style="text-align:center; padding:3.5rem 1.5rem; background:white; border-radius:16px;">
          <div style="font-size:3.5rem; margin-bottom:1rem;">🧺</div>
          <h3 style="font-weight:800; font-size:1.3rem; color:#0f172a; margin-bottom:0.5rem;">ยังไม่มีประวัติคำสั่งซื้อของคุณ (${state.currentUser.name})</h3>
          <p style="color:#64748b; font-size:0.95rem; margin-bottom:1.5rem;">สั่งบริการซักอบรีด DekDry ตอนนี้ เพื่อเริ่มติดตามสถานะผ้าแบบเรียลไทม์ได้ทันที</p>
          <button class="btn btn-primary" onclick="switchAppView('order')">🚀 สั่งจองบริการซักผ้าตอนนี้ &rsaquo;</button>
        </div>
      `;
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

window.selectTrackingOrder = function (orderId) {
  const searchInput = document.getElementById('tracking-search-input');
  if (searchInput) searchInput.value = orderId;

  document.querySelectorAll('.order-chip-btn').forEach(btn => {
    btn.classList.toggle('active', btn.innerText.includes(orderId));
  });

  renderTrackingDetails(orderId);
};

function renderTrackingDetails(orderId) {
  const contentEl = document.getElementById('tracking-content');
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

  // Security Check: Customer can only check their own orders
  const isSpecialRole = state.currentUser && ['admin', 'rider', 'staff'].includes(state.currentUser.role);
  const isOwner = state.currentUser && (
    order.userId === state.currentUser.id || 
    (order.customer && (order.customer.phone === state.currentUser.phone || order.customer.name === state.currentUser.name))
  );

  if (!isSpecialRole && !isOwner) {
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
  const currentStepIndex = stepKeys.indexOf(currentStatus);
  const effectiveIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  const currentStepObj = TRACKING_STEPS_FLOW[effectiveIndex] || TRACKING_STEPS_FLOW[0];

  const stepperHtml = TRACKING_STEPS_FLOW.map((step, idx) => {
    let stateClass = 'upcoming';
    let iconContent = step.icon;

    if (idx < effectiveIndex) {
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
            <span class="value" style="max-width:180px;">${order.customer.address || '-'}</span>
          </div>
          ${order.customer.note ? `
          <div class="tracking-info-row">
            <span class="label">หมายเหตุเพิ่มเติม:</span>
            <span class="value" style="max-width:180px; color:#64748b;">${order.customer.note}</span>
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

  const tasks = state.orders.filter(o => ['RIDER_ASSIGNED', 'PICKED_UP', 'WASHED_READY', 'OUT_FOR_DELIVERY'].includes(o.status));
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
      <div style="display:flex; gap:0.5rem;">
        ${o.status === 'RIDER_ASSIGNED' ? `<button class="btn btn-primary btn-sm btn-block" onclick="riderUpdateStatus('${o.id}', 'PICKED_UP')">🧺 รับผ้าจากลูกค้าแล้ว (นำเข้าร้าน)</button>` : ''}
        ${o.status === 'WASHED_READY' ? `<button class="btn btn-primary btn-sm btn-block" onclick="riderUpdateStatus('${o.id}', 'OUT_FOR_DELIVERY')">🚚 รับผ้าไปส่งลูกค้า</button>` : ''}
        ${o.status === 'OUT_FOR_DELIVERY' ? `<button class="btn btn-success btn-sm btn-block" onclick="riderUpdateStatus('${o.id}', 'DELIVERED')">🎉 ส่งมอบสำเร็จ</button>` : ''}
      </div>
    </div>
  `).join('');
}

window.riderUpdateStatus = async function (orderId, status) {
  const res = await API.updateStatus(orderId, status);
  if (res.success) {
    showToast(res.message);
    loadRiderView();
  }
};

// ==========================================
// Laundry Staff View
// ==========================================
async function loadStaffView() {
  const res = await API.getOrders();
  if (!res.success) return;
  state.orders = res.data;

  const colWait = state.orders.filter(o => ['ORDER_PLACED', 'RIDER_ASSIGNED', 'PICKED_UP'].includes(o.status));
  const colWash = state.orders.filter(o => o.status === 'IN_WASHING');
  const colReady = state.orders.filter(o => o.status === 'WASHED_READY');
  const colDone = state.orders.filter(o => ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(o.status));

  document.getElementById('staff-kanban-board').innerHTML = `
    <div class="kanban-col">
      <div class="kanban-header"><span>📥 คิวรอซัก</span> <span>(${colWait.length})</span></div>
      ${colWait.map(o => `
        <div class="kanban-card">
          <strong>${o.id}</strong> - ${o.customer.name}
          <div style="font-size:0.78rem; color:#64748b; margin:0.3rem 0;">${o.items.map(i => i.serviceName).join(', ')}</div>
          <button class="btn btn-primary btn-sm btn-block" onclick="staffAdvance('${o.id}', 'IN_WASHING')">🧼 เริ่มซัก-อบ</button>
        </div>
      `).join('')}
    </div>

    <div class="kanban-col">
      <div class="kanban-header"><span>🫧 กำลังซัก/รีด</span> <span>(${colWash.length})</span></div>
      ${colWash.map(o => `
        <div class="kanban-card">
          <strong>${o.id}</strong> - ${o.customer.name}
          <div style="font-size:0.78rem; color:#64748b; margin:0.3rem 0;">${o.preferences.detergent}</div>
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
    loadStaffView();
  }
};

// ==========================================
// Admin View
// ==========================================
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
        <div class="stat-text">จัดส่งสำเร็จ (Completed)</div>
      </div>
    `;
  }
  if (ordersRes.success) {
    state.orders = ordersRes.data;
    renderAdminTable(state.orders);
  }
}

function renderAdminTable(orders) {
  document.getElementById('admin-orders-tbody').innerHTML = orders.map(o => `
    <tr>
      <td><strong>${o.id}</strong></td>
      <td>${o.customer.name}<br><small style="color:#64748b;">${o.customer.phone}</small></td>
      <td>${o.items.map(i => `${i.serviceName} (${i.quantity})`).join(', ')}</td>
      <td><strong>฿${o.totalAmount}</strong></td>
      <td><span class="status-badge ${STATUS_CONFIG[o.status].cls}">${STATUS_CONFIG[o.status].label}</span></td>
      <td>${o.assignedRider ? o.assignedRider.name : '-'}</td>
      <td>
        <select class="form-select" style="font-size:0.75rem; padding:0.2rem;" onchange="adminUpdateStatus('${o.id}', this.value)">
          ${Object.entries(STATUS_CONFIG).map(([k, v]) => `
            <option value="${k}" ${k === o.status ? 'selected' : ''}>${v.label}</option>
          `).join('')}
        </select>
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
  const q = document.getElementById('admin-search-input').value.toLowerCase();
  const st = document.getElementById('admin-filter-status').value;
  let list = state.orders;
  if (st !== 'ALL') list = list.filter(o => o.status === st);
  if (q) list = list.filter(o => o.id.toLowerCase().includes(q) || o.customer.name.toLowerCase().includes(q));
  renderAdminTable(list);
};
