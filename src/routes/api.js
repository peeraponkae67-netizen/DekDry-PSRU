const express = require('express');
const router = express.Router();
const { 
  getDB, 
  saveDB, 
  findUserByUsernameOrEmail, 
  findUserById, 
  createUser, 
  updateUser,
  deleteUser,
  verifyPassword,
  getServicesList,
  getOrdersList,
  isMySQLActive,
  getPool
} = require('../db');

// รายการสถานะออเดอร์
const STATUS_FLOW = {
  ORDER_PLACED: { label: 'สั่งออเดอร์แล้ว', step: 1, color: '#3b82f6' },
  RIDER_ASSIGNED: { label: 'จัดสรรไรเดอร์แล้ว', step: 2, color: '#6366f1' },
  PICKED_UP: { label: 'รับผ้าแล้ว (เข้าร้าน)', step: 3, color: '#8b5cf6' },
  WAIT_PRICE_CONFIRM: { label: 'รอลูกค้ายืนยันราคาใหม่', step: 3.5, color: '#ea580c' },
  IN_WASHING: { label: 'กำลังซัก / อบ / รีด', step: 4, color: '#ec4899' },
  WASHED_READY: { label: 'ซักเสร็จ พร้อมจัดส่ง', step: 5, color: '#f59e0b' },
  OUT_FOR_DELIVERY: { label: 'กำลังนำส่งลูกค้า', step: 6, color: '#10b981' },
  DELIVERED: { label: 'จัดส่งสำเร็จ (รอตรวจรับ)', step: 7, color: '#059669' },
  COMPLETED: { label: 'เสร็จสิ้น (ลูกค้ายืนยันรับผ้าแล้ว)', step: 8, color: '#16a34a' },
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

// แก้ไขข้อมูลโปรไฟล์ผู้ใช้
router.put('/auth/profile/:id', async (req, res) => {
  try {
    const targetId = req.params.id;
    const { name, phone, address, email, password, role } = req.body;

    if (!name || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลที่จำเป็น (ชื่อ-นามสกุล, เบอร์โทร, อีเมล)'
      });
    }

    if (password && password.trim().length > 0 && password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร'
      });
    }

    const updatedUser = await updateUser(targetId, {
      name,
      phone,
      address,
      email,
      role: role || null,
      password: password && password.trim().length >= 6 ? password.trim() : null
    });

    res.json({
      success: true,
      message: 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว',
      data: updatedUser
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(400).json({
      success: false,
      message: err.message || 'ไม่สามารถอัปเดตข้อมูลได้'
    });
  }
});

// ลบบัญชีผู้ใช้ (Delete Account)
router.delete('/auth/profile/:id', async (req, res) => {
  try {
    const targetId = req.params.id;
    const result = await deleteUser(targetId);
    res.json({
      success: true,
      message: 'ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว ขอบคุณที่เคยใช้บริการ DekDry'
    });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการลบบัญชี'
    });
  }
});

// ดึงรายชื่อผู้ใช้ทั้งหมด (สำหรับ Admin)
router.get('/auth/users', async (req, res) => {
  if (isMySQLActive()) {
    try {
      const pool = getPool();
      const [rows] = await pool.query('SELECT customerID AS id, customerID, username, email, name, phone, address, role, createdAt FROM Customer');
      return res.json({ success: true, data: rows });
    } catch (err) {
      console.error('Error fetching users from MySQL:', err.message);
    }
  }

  const db = getDB();
  const safeUsers = (db.users || []).map(u => {
    const { password, ...safe } = u;
    return safe;
  });
  res.json({ success: true, data: safeUsers });
});

// แอดมินสร้างบัญชีผู้ใช้งานใหม่ในระบบ
router.post('/auth/users', async (req, res) => {
  try {
    const { username, email, password, name, phone, address, role } = req.body;
    if (!username || !email || !password || !name || !phone) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
    }
    const existing = await findUserByUsernameOrEmail(username);
    if (existing) {
      return res.status(400).json({ success: false, message: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว' });
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
    res.status(201).json({ success: true, message: 'สร้างบัญชีผู้ใช้ใหม่สำเร็จ', data: newUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'เกิดข้อผิดพลาดในการสร้างบัญชี' });
  }
});

// ดึงรายการบริการทั้งหมด (จาก MySQL Service หรือ JSON)
router.get('/services', async (req, res) => {
  try {
    const services = await getServicesList();
    res.json({ success: true, data: services });
  } catch (err) {
    console.error('Error fetching services:', err);
    res.status(500).json({ success: false, message: 'ไม่สามารถดึงข้อมูลบริการได้' });
  }
});

// ดึงรายชื่อไรเดอร์
router.get('/riders', (req, res) => {
  const db = getDB();
  res.json({ success: true, data: db.riders || [] });
});

// ดึงรายการคำสั่งซื้อ (รองรับ filter ตามสถานะ, ไรเดอร์, ผู้ใช้, คำค้นหา)
router.get('/orders', async (req, res) => {
  try {
    let orders = await getOrdersList();
    const { status, search, riderId, userId } = req.query;

    if (status && status !== 'ALL') {
      orders = orders.filter(o => o.status === status);
    }

    if (riderId) {
      orders = orders.filter(o => o.assignedRider && (o.assignedRider.id === riderId || o.assignedRider.name === riderId));
    }

    if (userId) {
      orders = orders.filter(o => String(o.userId) === String(userId));
    }

    if (search) {
      const q = search.toLowerCase().trim();
      orders = orders.filter(o => 
        String(o.id).toLowerCase().includes(q) ||
        (o.customer && o.customer.name && o.customer.name.toLowerCase().includes(q)) ||
        (o.customer && o.customer.phone && o.customer.phone.includes(q))
      );
    }

    // เรียงลำดับจากล่าสุดไปเก่าสุด
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    console.error('Error in get orders:', err);
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงรายการคำสั่งซื้อ' });
  }
});

// ดึงข้อมูลคำสั่งซื้อตาม ID
router.get('/orders/:id', async (req, res) => {
  try {
    const orders = await getOrdersList();
    const targetId = String(req.params.id);
    const order = orders.find(o => String(o.id) === targetId || String(o.rawId) === targetId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการออเดอร์นี้' });
    }
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการค้นหาคำสั่งซื้อ' });
  }
});

// แอดมินแก้ไขข้อมูลคำสั่งซื้อของลูกค้า (Full Order Edit: ข้อมูลติดต่อ, สถานที่, ตัวเลือกซัก, รายการผ้า, ไรเดอร์)
router.put('/orders/:id', async (req, res) => {
  try {
    const targetId = String(req.params.id);
    const { 
      customer, 
      customerName, 
      customerPhone, 
      customerEmail, 
      deliveryAddress, 
      customerAddress, 
      notes, 
      items, 
      preferences, 
      pickupSchedule, 
      returnSchedule, 
      assignedRider, 
      status, 
      note 
    } = req.body;

    const orders = await getOrdersList();
    const existingOrder = orders.find(o => String(o.id) === targetId || String(o.rawId) === targetId);
    if (!existingOrder) {
      return res.status(404).json({ success: false, message: 'ไม่พบรายการคำสั่งซื้อนี้' });
    }

    const rawId = existingOrder.rawId || Number(targetId.replace('ORD-', ''));

    const custObj = customer || {};
    const updatedCust = {
      name: (customerName || custObj.name || (existingOrder.customer && existingOrder.customer.name) || '').trim(),
      phone: (customerPhone || custObj.phone || (existingOrder.customer && existingOrder.customer.phone) || '').trim(),
      email: (customerEmail !== undefined ? customerEmail : (custObj.email !== undefined ? custObj.email : (existingOrder.customer && existingOrder.customer.email) || '')).trim(),
      address: (deliveryAddress || customerAddress || custObj.address || (existingOrder.customer && existingOrder.customer.address) || '').trim(),
      note: (notes !== undefined ? notes : (custObj.note !== undefined ? custObj.note : (note !== undefined ? note : (existingOrder.customer && existingOrder.customer.note) || ''))).trim()
    };

    const updatedPref = preferences || existingOrder.preferences || {};
    const updatedPickup = pickupSchedule !== undefined ? pickupSchedule : (existingOrder.pickupSchedule || '');
    const updatedReturn = returnSchedule !== undefined ? returnSchedule : (existingOrder.returnSchedule || '');
    const newStatus = status || existingOrder.status;

    let processedItems = existingOrder.items || [];
    let subtotal = 0;
    if (Array.isArray(items) && items.length > 0) {
      processedItems = items.map(it => {
        const qty = Number(it.quantity) || 1;
        const prc = Number(it.pricePerUnit) || 0;
        return {
          serviceId: it.serviceId,
          serviceName: it.serviceName || 'บริการซักรีด',
          quantity: qty,
          unit: it.unit || 'กก.',
          pricePerUnit: prc,
          subtotal: qty * prc
        };
      });
      subtotal = processedItems.reduce((sum, it) => sum + it.subtotal, 0);
    } else {
      subtotal = processedItems.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0);
    }

    const deliveryFee = 0;
    const discount = subtotal >= 500 ? 50 : 0;
    let totalAmount = Math.max(0, subtotal + deliveryFee - discount);
    if (req.body.totalAmount !== undefined && !isNaN(Number(req.body.totalAmount))) {
      totalAmount = Math.max(0, Number(req.body.totalAmount));
    }

    const priceAdjustmentNote = (req.body.priceAdjustmentNote || req.body.priceNote || '').trim();

    const riderName = (assignedRider && assignedRider.name) ? assignedRider.name : (existingOrder.assignedRider?.name || 'นายพงษ์อนันต์ ชนะสแบง');
    const riderPhone = (assignedRider && assignedRider.phone) ? assignedRider.phone : (existingOrder.assignedRider?.phone || '671-223-1091');

    const orderMeta = {
      name: updatedCust.name,
      phone: updatedCust.phone,
      email: updatedCust.email,
      address: updatedCust.address,
      note: updatedCust.note,
      preferences: updatedPref,
      pickupSchedule: updatedPickup,
      returnSchedule: updatedReturn,
      priceAdjustmentNote: priceAdjustmentNote || existingOrder.priceAdjustmentNote || ''
    };
    const notePayload = JSON.stringify(orderMeta);

    // บันทึกลง MySQL
    if (isMySQLActive() && !isNaN(rawId)) {
      const pool = getPool();
      await pool.query(
        'UPDATE `Order` SET status = ?, totalPrice = ?, note = ? WHERE orderID = ?',
        [newStatus, totalAmount, notePayload, rawId]
      );

      await pool.query(
        'UPDATE Delivery SET address = ?, riderName = ?, riderPhone = ? WHERE orderID = ?',
        [updatedCust.address, riderName, riderPhone, rawId]
      );

      await pool.query(
        'UPDATE Payment SET amount = ? WHERE orderID = ?',
        [totalAmount, rawId]
      );

      if (Array.isArray(items) && items.length > 0) {
        await pool.query('DELETE FROM OrderItem WHERE orderID = ?', [rawId]);
        for (const it of processedItems) {
          let sId = Number(it.serviceId);
          if (isNaN(sId)) sId = 1;
          await pool.query(
            'INSERT INTO OrderItem (orderID, serviceID, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
            [rawId, sId, it.quantity, it.pricePerUnit, it.subtotal]
          );
        }
      }
    }

    // บันทึกลง JSON
    const db = getDB();
    const jsonOrder = (db.orders || []).find(o => String(o.id) === targetId || String(o.rawId) === targetId);
    if (jsonOrder) {
      jsonOrder.customer = updatedCust;
      jsonOrder.items = processedItems;
      jsonOrder.preferences = updatedPref;
      jsonOrder.pickupSchedule = updatedPickup;
      jsonOrder.returnSchedule = updatedReturn;
      jsonOrder.status = newStatus;
      jsonOrder.subtotal = subtotal;
      jsonOrder.totalAmount = totalAmount;
      if (priceAdjustmentNote) {
        jsonOrder.priceAdjustmentNote = priceAdjustmentNote;
      }
      jsonOrder.assignedRider = {
        name: riderName,
        phone: riderPhone,
        vehicle: jsonOrder.assignedRider?.vehicle || 'ฮอนด้า เวฟ 125 ทะเบียน 1กข-8899'
      };
      saveDB(db);
    }

    const refreshedOrders = await getOrdersList();
    const resultOrder = refreshedOrders.find(o => String(o.id) === targetId || String(o.rawId) === targetId);

    res.json({
      success: true,
      message: `บันทึกการแก้ไขข้อมูลคำสั่งซื้อ ${targetId} เรียบร้อยแล้ว`,
      data: resultOrder
    });
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ success: false, message: err.message || 'เกิดข้อผิดพลาดในการแก้ไขคำสั่งซื้อ' });
  }
});

// สร้างคำสั่งซื้อใหม่
router.post('/orders', async (req, res) => {
  const db = getDB();
  const { customer, items, preferences, paymentMethod, userId } = req.body;

  if (!customer || !customer.name || !customer.phone || !customer.address) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลลูกค้าและที่อยู่ให้ครบถ้วน' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'กรุณาเลือกบริการซักรีดอย่างน้อย 1 รายการ' });
  }

  const allServices = await getServicesList();

  // คำนวณยอดรวม
  let subtotal = 0;
  const processedItems = items.map(item => {
    const srv = allServices.find(s => String(s.id) === String(item.serviceId) || s.name === item.serviceName);
    const price = srv ? srv.pricePerUnit : (item.pricePerUnit || 50);
    const qty = Math.max(1, Number(item.quantity) || 1);
    const lineTotal = price * qty;
    subtotal += lineTotal;
    return {
      serviceId: srv ? srv.id : item.serviceId,
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

  // บันทึกลง MySQL ถ้าต่อ MySQL อยู่
  let savedMySQLOrderId = null;
  if (isMySQLActive()) {
    try {
      const pool = getPool();
      let actualCustomerId = userId;

      // ตรวจสอบว่า customerID มีอยู่จริงหรือไม่ หรือหา customer โดยเบอร์/ชื่อ
      if (!actualCustomerId) {
        const [custRows] = await pool.query('SELECT customerID FROM Customer WHERE phone = ? LIMIT 1', [customer.phone.trim()]);
        if (custRows.length > 0) {
          actualCustomerId = custRows[0].customerID;
        } else {
          // สุ่มสร้าง customer แบบ guest
          const guestUser = `guest_${Date.now()}`;
          const [ins] = await pool.query(
            'INSERT INTO Customer (username, password, name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?)',
            [guestUser, 'guest_pass', customer.name, customer.phone, customer.address, 'customer']
          );
          actualCustomerId = ins.insertId;
        }
      }

      // 1. เพิ่มเข้า Order (บันทึกข้อมูลติดต่อ สถานที่จัดส่ง และตัวเลือกที่ลูกค้ากรอกไว้ก่อนส่ง)
      const orderMeta = {
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address,
        note: customer.note || '',
        preferences: preferences || {},
        pickupSchedule: req.body.pickupSchedule || '',
        returnSchedule: req.body.returnSchedule || ''
      };
      const notePayload = JSON.stringify(orderMeta);

      const [orderRes] = await pool.query(
        'INSERT INTO `Order` (customerID, orderDate, status, totalPrice, note) VALUES (?, ?, ?, ?, ?)',
        [actualCustomerId, now, 'RIDER_ASSIGNED', totalAmount, notePayload]
      );
      savedMySQLOrderId = orderRes.insertId;

      // ซิงค์ชื่อ เบอร์ และที่อยู่ล่าสุดกลับเข้าโปรไฟล์ลูกค้า
      if (actualCustomerId) {
        try {
          await pool.query('UPDATE Customer SET name = ?, phone = ?, address = ? WHERE customerID = ?', [
            customer.name,
            customer.phone,
            customer.address,
            actualCustomerId
          ]);
        } catch (uErr) {
          console.error('Customer profile sync error:', uErr.message);
        }
      }

      // 2. เพิ่มเข้า OrderItem
      for (const it of processedItems) {
        let servId = Number(it.serviceId);
        if (isNaN(servId)) servId = 1;
        await pool.query(
          'INSERT INTO OrderItem (orderID, serviceID, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
          [savedMySQLOrderId, servId, it.quantity, it.pricePerUnit, it.subtotal]
        );
      }

      // 3. เพิ่มเข้า Delivery
      await pool.query(
        'INSERT INTO Delivery (orderID, address, status, riderName, riderPhone) VALUES (?, ?, ?, ?, ?)',
        [
          savedMySQLOrderId,
          customer.address,
          'RIDER_ASSIGNED',
          assignedRider ? assignedRider.name : 'นายพงษ์อนันต์ ชนะสแบง',
          assignedRider ? assignedRider.phone : '671-223-1091'
        ]
      );

      // 4. เพิ่มเข้า Payment
      await pool.query(
        'INSERT INTO Payment (orderID, amount, paymentMethod, status) VALUES (?, ?, ?, ?)',
        [
          savedMySQLOrderId,
          totalAmount,
          paymentMethod || 'PROMPTPAY',
          paymentMethod === 'COD' ? 'PENDING' : 'PAID'
        ]
      );
      console.log(`Saved Order #${savedMySQLOrderId} into MySQL successfully!`);
    } catch (dbErr) {
      console.error('MySQL insert order failed, fallback to json:', dbErr.message);
    }
  }

  const orderId = savedMySQLOrderId ? `ORD-${savedMySQLOrderId}` : `ORD-${now.getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`;
  const estHours = items.some(i => i.serviceId === 'srv_express' || i.serviceId === 6) ? 6 : 24;
  const estDate = new Date(now.getTime() + estHours * 60 * 60 * 1000);

  const newOrder = {
    id: orderId,
    rawId: savedMySQLOrderId,
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
    status: 'RIDER_ASSIGNED',
    timeline: [
      {
        status: 'ORDER_PLACED',
        title: 'สั่งออเดอร์สำเร็จ',
        description: 'ระบบบันทึกรายการคำสั่งซื้อเรียบร้อยแล้ว',
        timestamp: now.toISOString()
      },
      {
        status: 'RIDER_ASSIGNED',
        title: 'จัดสรรไรเดอร์รับส่งผ้า',
        description: `ไรเดอร์ ${assignedRider ? assignedRider.name : 'นายพงษ์อนันต์ ชนะสแบง'} กำลังเตรียมตัวเข้ารับผ้า`,
        timestamp: new Date(now.getTime() + 1000).toISOString()
      }
    ],
    assignedRider: assignedRider ? {
      id: assignedRider.id,
      name: assignedRider.name,
      phone: assignedRider.phone,
      vehicle: assignedRider.vehicle
    } : { name: 'นายพงษ์อนันต์ ชนะสแบง', phone: '671-223-1091' },
    estimatedDelivery: estDate.toISOString()
  };

  db.orders = db.orders || [];
  db.orders.unshift(newOrder);
  saveDB(db);

  res.status(201).json({
    success: true,
    message: 'สร้างคำสั่งซื้อสำเร็จ',
    data: newOrder
  });
});

// อัปเดตสถานะคำสั่งซื้อ
router.patch('/orders/:id/status', async (req, res) => {
  const db = getDB();
  const targetId = String(req.params.id);
  const order = (db.orders || []).find(o => String(o.id) === targetId || String(o.rawId) === targetId);

  const { status, note } = req.body;
  if (!status || !STATUS_FLOW[status]) {
    return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
  }

  // อัปเดตใน MySQL ถ้าเชื่อมต่ออยู่
  if (isMySQLActive()) {
    try {
      const pool = getPool();
      const rawId = order && order.rawId ? order.rawId : Number(targetId.replace('ORD-', ''));
      if (!isNaN(rawId)) {
        await pool.query('UPDATE `Order` SET status = ? WHERE orderID = ?', [status, rawId]);
        await pool.query('UPDATE Delivery SET status = ? WHERE orderID = ?', [status, rawId]);
      }
    } catch (err) {
      console.error('MySQL update status error:', err.message);
    }
  }

  if (order) {
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

    if (!order.timeline) order.timeline = [];
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
    return res.json({ success: true, message: `อัปเดตสถานะเป็น "${STATUS_FLOW[status].label}" เรียบร้อย`, data: order });
  }

  if (isMySQLActive()) {
    try {
      const orders = await getOrdersList();
      const updatedOrder = orders.find(o => String(o.id) === targetId || String(o.rawId) === targetId);
      if (updatedOrder) {
        return res.json({ success: true, message: `อัปเดตสถานะเป็น "${STATUS_FLOW[status].label}" เรียบร้อย`, data: updatedOrder });
      }
    } catch (e) {
      console.error('MySQL fetch updated order error:', e.message);
    }
  }

  res.json({ success: true, message: `อัปเดตสถานะเป็น "${STATUS_FLOW[status].label}" เรียบร้อย` });
});

// แอดมินชั่งน้ำหนักและปรับราคาออเดอร์ใหม่ (Weigh & Adjust Price)
router.patch('/orders/:id/adjust-price', async (req, res) => {
  const db = getDB();
  const targetId = String(req.params.id);
  const order = (db.orders || []).find(o => String(o.id) === targetId || String(o.rawId) === targetId);
  const { items, totalAmount, note, deliveryFee, discount } = req.body;

  const now = new Date().toISOString();
  const oldAmount = order ? order.totalAmount : 0;
  const newAmount = Number(totalAmount) || oldAmount;

  // บันทึกลง MySQL
  if (isMySQLActive()) {
    try {
      const pool = getPool();
      const rawId = order && order.rawId ? order.rawId : Number(targetId.replace('ORD-', ''));
      if (!isNaN(rawId)) {
        await pool.query(
          'UPDATE `Order` SET totalPrice = ?, note = ?, status = ? WHERE orderID = ?',
          [newAmount, note || '', 'WAIT_PRICE_CONFIRM', rawId]
        );
        await pool.query(
          'UPDATE Payment SET amount = ? WHERE orderID = ?',
          [newAmount, rawId]
        );

        if (Array.isArray(items) && items.length > 0) {
          for (const it of items) {
            let sId = Number(it.serviceId) || 1;
            let qty = Number(it.quantity) || 1;
            let prc = Number(it.pricePerUnit) || 0;
            let sub = prc * qty;
            await pool.query(
              'UPDATE OrderItem SET quantity = ?, price = ?, subtotal = ? WHERE orderID = ? AND serviceID = ?',
              [qty, prc, sub, rawId, sId]
            );
          }
        }
      }
    } catch (err) {
      console.error('MySQL adjust price error:', err.message);
    }
  }

  if (order) {
    if (Array.isArray(items)) order.items = items;
    order.oldAmount = oldAmount;
    order.totalAmount = newAmount;
    order.priceAdjustNote = note || '';
    order.status = 'WAIT_PRICE_CONFIRM';
    if (deliveryFee !== undefined) order.deliveryFee = deliveryFee;
    if (discount !== undefined) order.discount = discount;

    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      status: 'WAIT_PRICE_CONFIRM',
      title: 'ชั่งน้ำหนักผ้าและปรับปรุงราคา',
      description: `ทางร้านชั่งน้ำหนักจริง ปรับราคาจาก ฿${oldAmount} เป็น ฿${newAmount} (หมายเหตุ: ${note || 'รอลูกค้ายืนยันราคา'})`,
      timestamp: now
    });

    saveDB(db);
  }

  res.json({
    success: true,
    message: 'ปรับปรุงน้ำหนักและราคาเรียบร้อย ส่งให้ลูกค้ายืนยันแล้ว',
    data: order || { id: targetId, totalAmount: newAmount, status: 'WAIT_PRICE_CONFIRM' }
  });
});

// ลูกค้าอนุมัติหรือปฏิเสธราคาใหม่หลังชั่งผ้า (Customer Approve Price)
router.patch('/orders/:id/approve-price', async (req, res) => {
  const db = getDB();
  const targetId = String(req.params.id);
  const order = (db.orders || []).find(o => String(o.id) === targetId || String(o.rawId) === targetId);
  const { action, reason } = req.body; // action: 'approve' or 'reject'

  const nextStatus = action === 'reject' ? 'CANCELLED' : 'IN_WASHING';
  const now = new Date().toISOString();

  if (isMySQLActive()) {
    try {
      const pool = getPool();
      const rawId = order && order.rawId ? order.rawId : Number(targetId.replace('ORD-', ''));
      if (!isNaN(rawId)) {
        await pool.query('UPDATE `Order` SET status = ? WHERE orderID = ?', [nextStatus, rawId]);
      }
    } catch (err) {
      console.error('MySQL approve price error:', err.message);
    }
  }

  if (order) {
    order.status = nextStatus;
    if (!order.timeline) order.timeline = [];
    
    if (action === 'reject') {
      order.timeline.push({
        status: 'CANCELLED',
        title: 'ลูกค้ายกเลิกคำสั่งซื้อ',
        description: `ลูกค้าไม่ยินยอมรับการปรับราคา (${reason || 'ลูกค้ายกเลิกออเดอร์'})`,
        timestamp: now
      });
    } else {
      order.customerApprovedAt = now;
      order.timeline.push({
        status: 'IN_WASHING',
        title: 'ลูกค้ายืนยันราคาเรียบร้อย',
        description: `ลูกค้ายืนยันราคา ฿${order.totalAmount} เรียบร้อยแล้ว ร้านเริ่มดำเนินการซัก อบ รีด ทันที`,
        timestamp: now
      });
    }

    saveDB(db);
  }

  res.json({
    success: true,
    message: action === 'reject' ? 'ยกเลิกคำสั่งซื้อเรียบร้อย' : 'ยืนยันราคาเรียบร้อยแล้ว ร้านเริ่มดำเนินการซักทันที!',
    data: order || { id: targetId, status: nextStatus }
  });
});

// ลูกค้ายืนยันได้รับผ้าเรียบร้อยแล้ว (Customer Confirm Received)
router.patch('/orders/:id/confirm-delivery', async (req, res) => {
  const db = getDB();
  const targetId = String(req.params.id);
  const order = (db.orders || []).find(o => String(o.id) === targetId || String(o.rawId) === targetId);

  const now = new Date().toISOString();

  if (isMySQLActive()) {
    try {
      const pool = getPool();
      const rawId = order && order.rawId ? order.rawId : Number(targetId.replace('ORD-', ''));
      if (!isNaN(rawId)) {
        await pool.query('UPDATE `Order` SET status = "COMPLETED" WHERE orderID = ?', [rawId]);
        await pool.query('UPDATE Delivery SET status = "DELIVERED", deliveryDate = ? WHERE orderID = ?', [now, rawId]);
      }
    } catch (err) {
      console.error('MySQL confirm delivery error:', err.message);
    }
  }

  if (order) {
    order.status = 'COMPLETED';
    order.customerConfirmedAt = now;
    if (!order.timeline) order.timeline = [];
    order.timeline.push({
      status: 'COMPLETED',
      title: 'ลูกค้ายืนยันรับผ้าเรียบร้อยแล้ว',
      description: 'ลูกค้ากดยืนยันได้รับผ้าสะอาดเรียบร้อย คำสั่งซื้อเสร็จสิ้นสมบูรณ์',
      timestamp: now
    });
    saveDB(db);
  }

  res.json({
    success: true,
    message: 'ขอบคุณที่ใช้บริการ DekDry! ยืนยันการรับผ้าเรียบร้อยแล้ว',
    data: order || { id: targetId, status: 'COMPLETED' }
  });
});

// ยืนยันการชำระเงิน
router.post('/orders/:id/pay', async (req, res) => {
  const db = getDB();
  const targetId = String(req.params.id);
  const order = (db.orders || []).find(o => String(o.id) === targetId || String(o.rawId) === targetId);

  const { method } = req.body;

  if (isMySQLActive()) {
    try {
      const pool = getPool();
      const rawId = order && order.rawId ? order.rawId : Number(targetId.replace('ORD-', ''));
      if (!isNaN(rawId)) {
        await pool.query('UPDATE Payment SET status = "PAID", method = ? WHERE orderID = ?', [method || 'PROMPTPAY', rawId]);
      }
    } catch (err) {
      console.error('MySQL pay error:', err.message);
    }
  }

  if (order) {
    order.paymentStatus = 'PAID';
    order.paymentMethod = method || 'PROMPTPAY';
    order.paymentTime = new Date().toISOString();
    saveDB(db);
  }

  res.json({ success: true, message: 'ชำระเงินเรียบร้อยแล้ว', data: order || { id: targetId } });
});

// สถิติภาพรวมสำหรับแดชบอร์ด
router.get('/stats', async (req, res) => {
  const orders = await getOrdersList();

  const totalOrders = orders.length;
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  
  const activeOrders = orders.filter(o => !['COMPLETED', 'CANCELLED'].includes(o.status)).length;
  const completedOrders = orders.filter(o => o.status === 'COMPLETED').length;

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

