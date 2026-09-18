const express = require('express');
const router = express.Router();
const { 
  getDB, 
  saveDB, 
  findUserByUsernameOrEmail, 
  findUserById, 
  createUser, 
  verifyPassword 
} = require('../db');

// รายการสถานะออเดอร์
const STATUS_FLOW = {
  ORDER_PLACED: { label: 'สั่งออเดอร์แล้ว', step: 1, color: '#3b82f6' },
  RIDER_ASSIGNED: { label: 'จัดสรรไรเดอร์แล้ว', step: 2, color: '#6366f1' },
  PICKED_UP: { label: 'รับผ้าแล้ว (เข้าร้าน)', step: 3, color: '#8b5cf6' },
  IN_WASHING: { label: 'กำลังซัก / อบ / รีด', step: 4, color: '#ec4899' },
  WASHED_READY: { label: 'ซักเสร็จ พร้อมจัดส่ง', step: 5, color: '#f59e0b' },
  OUT_FOR_DELIVERY: { label: 'กำลังนำส่งลูกค้า', step: 6, color: '#10b981' },
  DELIVERED: { label: 'จัดส่งสำเร็จ', step: 7, color: '#059669' },
  CANCELLED: { label: 'ยกเลิกออเดอร์', step: 0, color: '#ef4444' }
};

// สมัครสมาชิก
router.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password, name, phone, address, role } = req.body;

    if (!username || !email || !password || !name || !phone) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (Username, Email, Password, ชื่อ, เบอร์โทร)' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' 
      });
    }

    // ตรวจสอบ username ซ้ำ
    const existingUser = await findUserByUsernameOrEmail(username);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'ชื่อผู้ใช้ (Username) นี้ถูกใช้งานแล้ว' 
      });
    }

    // ตรวจสอบ email ซ้ำ
    const existingEmail = await findUserByUsernameOrEmail(email);
    if (existingEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'อีเมล (Email) นี้ถูกใช้งานแล้ว' 
      });
    }

    const newUser = await createUser({
      username,
      email,
      password,
      name,
      phone,
      address: address || '',
      role: role || 'customer'
    });

    res.status(201).json({
      success: true,
      message: 'สมัครสมาชิกสำเร็จเรียบร้อย',
      data: newUser
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสมัครสมาชิก' });
  }
});

// เข้าสู่ระบบ
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'กรุณากรอกชื่อผู้ใช้/อีเมล และรหัสผ่าน' 
      });
    }

    const user = await findUserByUsernameOrEmail(username);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'ไม่พบบัญชีผู้ใช้นี้ หรือรหัสผ่านไม่ถูกต้อง' 
      });
    }

    // ตรวจสอบรหัสผ่าน
    const isMatch = await verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'รหัสผ่านไม่ถูกต้อง' 
      });
    }

    const { password: _, ...safeUser } = user;

    res.json({
      success: true,
      message: `เข้าสู่ระบบสำเร็จ`,
      data: {
        user: safeUser,
        token: `token_${safeUser.id}_${Date.now()}`
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' });
  }
});

// ดึงรายชื่อผู้ใช้ทั้งหมด (สำหรับ Admin)
router.get('/auth/users', (req, res) => {
  const db = getDB();
  const safeUsers = (db.users || []).map(u => {
    const { password, ...safe } = u;
    return safe;
  });
  res.json({ success: true, data: safeUsers });
});

// ดึงรายการบริการทั้งหมด
router.get('/services', (req, res) => {
  const db = getDB();
  res.json({ success: true, data: db.services || [] });
});

// ดึงรายชื่อไรเดอร์
router.get('/riders', (req, res) => {
  const db = getDB();
  res.json({ success: true, data: db.riders || [] });
});

// ดึงรายการคำสั่งซื้อ (รองรับ filter ตามสถานะ, ไรเดอร์, ผู้ใช้, คำค้นหา)
router.get('/orders', (req, res) => {
  const db = getDB();
  let orders = db.orders || [];

  const { status, search, riderId, userId } = req.query;

  if (status && status !== 'ALL') {
    orders = orders.filter(o => o.status === status);
  }

  if (riderId) {
    orders = orders.filter(o => o.assignedRider && o.assignedRider.id === riderId);
  }

  if (userId) {
    orders = orders.filter(o => o.userId === Number(userId));
  }

  if (search) {
    const q = search.toLowerCase().trim();
    orders = orders.filter(o => 
      o.id.toLowerCase().includes(q) ||
      (o.customer && o.customer.name && o.customer.name.toLowerCase().includes(q)) ||
      (o.customer && o.customer.phone && o.customer.phone.includes(q))
    );
  }

  // เรียงลำดับจากล่าสุดไปเก่าสุด
  orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, count: orders.length, data: orders });
});

// ดึงข้อมูลคำสั่งซื้อตาม ID
router.get('/orders/:id', (req, res) => {
  const db = getDB();
  const order = (db.orders || []).find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: 'ไม่พบรายการออเดอร์นี้' });
  }
  res.json({ success: true, data: order });
});

// สร้างคำสั่งซื้อใหม่
router.post('/orders', (req, res) => {
  const db = getDB();
  const { customer, items, preferences, paymentMethod, userId } = req.body;

  if (!customer || !customer.name || !customer.phone || !customer.address) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลลูกค้าและที่อยู่ให้ครบถ้วน' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'กรุณาเลือกบริการซักรีดอย่างน้อย 1 รายการ' });
  }

  // คำนวณยอดรวม
  let subtotal = 0;
  const processedItems = items.map(item => {
    const srv = (db.services || []).find(s => s.id === item.serviceId);
    const price = srv ? srv.pricePerUnit : (item.pricePerUnit || 50);
    const qty = Math.max(1, Number(item.quantity) || 1);
    const lineTotal = price * qty;
    subtotal += lineTotal;
    return {
      serviceId: item.serviceId,
      serviceName: srv ? srv.name : item.serviceName,
      quantity: qty,
      unit: srv ? srv.unit : 'ชิ้น',
      pricePerUnit: price,
      subtotal: lineTotal
    };
  });

  const deliveryFee = 40;
  const discount = subtotal >= 500 ? 50 : 0;
  const totalAmount = subtotal + deliveryFee - discount;

  // กำหนดไรเดอร์ที่พร้อมรับงาน
  const riders = db.riders || [];
  const assignedRider = riders.length > 0 ? riders[Math.floor(Math.random() * riders.length)] : null;

  const now = new Date();
  const orderId = `ORD-${now.getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;

  // เวลาส่งผ้าโดยประมาณ
  const estHours = items.some(i => i.serviceId === 'srv_express') ? 6 : 24;
  const estDate = new Date(now.getTime() + estHours * 60 * 60 * 1000);

  const newOrder = {
    id: orderId,
    userId: userId || null,
    createdAt: now.toISOString(),
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address,
      note: customer.note || ''
    },
    items: processedItems,
    preferences: preferences || {
      detergent: 'สูตรมาตรฐานพรีเมียม',
      softener: 'กลิ่นบลอสซั่ม (Blossom Fresh)',
      packaging: 'พับใส่ถุงซีลสุญญากาศ'
    },
    subtotal,
    deliveryFee,
    discount,
    totalAmount,
    paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
    paymentMethod: paymentMethod || 'PROMPTPAY',
    paymentTime: paymentMethod === 'COD' ? null : now.toISOString(),
    status: 'ORDER_PLACED',
    timeline: [
      {
        status: 'ORDER_PLACED',
        title: 'สั่งออเดอร์สำเร็จ',
        description: 'ระบบบันทึกรายการคำสั่งซื้อเรียบร้อยแล้ว',
        timestamp: now.toISOString()
      },
      ...(assignedRider ? [{
        status: 'RIDER_ASSIGNED',
        title: 'จัดสรรไรเดอร์รับส่งผ้า',
        description: `ไรเดอร์ ${assignedRider.name} กำลังเตรียมตัวเข้ารับผ้า`,
        timestamp: new Date(now.getTime() + 1000).toISOString()
      }] : [])
    ],
    assignedRider: assignedRider ? {
      id: assignedRider.id,
      name: assignedRider.name,
      phone: assignedRider.phone,
      vehicle: assignedRider.vehicle
    } : null,
    estimatedDelivery: estDate.toISOString()
  };

  if (assignedRider) {
    newOrder.status = 'RIDER_ASSIGNED';
  }

  db.orders.unshift(newOrder);
  saveDB(db);

  res.status(201).json({
    success: true,
    message: 'สร้างคำสั่งซื้อสำเร็จ',
    data: newOrder
  });
});

// อัปเดตสถานะคำสั่งซื้อ
router.patch('/orders/:id/status', (req, res) => {
  const db = getDB();
  const order = (db.orders || []).find(o => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'ไม่พบคำสั่งซื้อ' });
  }

  const { status, note } = req.body;
  if (!status || !STATUS_FLOW[status]) {
    return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
  }

  order.status = status;
  const now = new Date().toISOString();

  let desc = note || '';
  if (!desc) {
    if (status === 'PICKED_UP') desc = 'ไรเดอร์เข้ารับผ้าจากลูกค้าและนำเข้าสู่ศูนย์ซักรีดเรียบร้อย';
    else if (status === 'IN_WASHING') desc = 'ผ้าอยู่ระหว่างการคัดแยก ซัก อบ และรีดตามมาตรฐาน';
    else if (status === 'WASHED_READY') desc = 'ซัก อบ รีด และตรวจสอบคุณภาพเรียบร้อย พร้อมส่งมอบ';
    else if (status === 'OUT_FOR_DELIVERY') desc = 'ไรเดอร์กำลังนำผ้าไปจัดส่งคืนลูกค้าตามที่อยู่';
    else if (status === 'DELIVERED') desc = 'ส่งมอบผ้าสะอาดให้ลูกค้าเรียบร้อยแล้ว';
    else if (status === 'CANCELLED') desc = 'รายการถูกยกเลิก';
  }

  order.timeline.push({
    status: status,
    title: STATUS_FLOW[status].label,
    description: desc,
    timestamp: now
  });

  if (status === 'DELIVERED') {
    order.paymentStatus = 'PAID';
    order.completedAt = now;
  }

  saveDB(db);
  res.json({ success: true, message: `อัปเดตสถานะเป็น "${STATUS_FLOW[status].label}" เรียบร้อย`, data: order });
});

// ยืนยันการชำระเงิน
router.post('/orders/:id/pay', (req, res) => {
  const db = getDB();
  const order = (db.orders || []).find(o => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'ไม่พบคำสั่งซื้อ' });
  }

  const { method } = req.body;
  order.paymentStatus = 'PAID';
  order.paymentMethod = method || 'PROMPTPAY';
  order.paymentTime = new Date().toISOString();

  saveDB(db);
  res.json({ success: true, message: 'ชำระเงินเรียบร้อยแล้ว', data: order });
});

// สถิติภาพรวมสำหรับแดชบอร์ด
router.get('/stats', (req, res) => {
  const db = getDB();
  const orders = db.orders || [];

  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  
  const activeOrders = orders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === 'DELIVERED').length;

  const statusCounts = {};
  Object.keys(STATUS_FLOW).forEach(key => {
    statusCounts[key] = orders.filter(o => o.status === key).length;
  });

  res.json({
    success: true,
    data: {
      totalOrders,
      totalRevenue,
      activeOrders,
      completedOrders,
      statusCounts
    }
  });
});

module.exports = router;
