const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let mysql = null;
try {
  mysql = require('mysql2/promise');
} catch (e) {
  // โหลด mysql2 ถ้ามีในระบบ
}

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// จัดการการเชื่อมต่อฐานข้อมูล MySQL
let pool = null;
let useMySQL = false;

async function initMySQL() {
  if (!mysql) return false;
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'laundry_db',
      port: Number(process.env.DB_PORT) || 3306,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    useMySQL = true;
    console.log('✅ MySQL Database connected successfully to', process.env.DB_NAME || 'laundry_db');
    return true;
  } catch (err) {
    console.log('⚠️ MySQL not connected, fallback to JSON database:', err.message);
    useMySQL = false;
    return false;
  }
}

function isMySQLActive() {
  return useMySQL && pool !== null;
}

function getPool() {
  return pool;
}

// ฟังก์ชันอ่านและบันทึกไฟล์ JSON (กรณีไม่ได้เปิด MySQL)
function getJSONDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: [], services: [], orders: [], riders: [] };
  }
}

function saveJSONDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving db.json:', err);
    return false;
  }
}

// ค้นหาผู้ใช้จาก username หรือ email (ตาราง Customer ใน MySQL)
async function findUserByUsernameOrEmail(identifier) {
  const cleanId = String(identifier).trim().toLowerCase();
  if (isMySQLActive()) {
    try {
      const [rows] = await pool.execute(
        'SELECT customerID AS id, customerID, username, password, name, phone, address, email, role, createdAt FROM Customer WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
        [cleanId, cleanId]
      );
      if (rows && rows.length > 0) {
        return rows[0];
      }
    } catch (err) {
      console.error('MySQL findUser error:', err.message);
    }
  }

  // fallback เป็น JSON
  const db = getJSONDB();
  return (db.users || []).find(u => 
    u.username.toLowerCase() === cleanId || 
    u.email.toLowerCase() === cleanId
  ) || null;
}

// ค้นหาผู้ใช้จาก ID
async function findUserById(id) {
  if (isMySQLActive()) {
    try {
      const [rows] = await pool.execute(
        'SELECT customerID AS id, customerID, username, name, phone, address, email, role, createdAt FROM Customer WHERE customerID = ?',
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      console.error('MySQL findUserById error:', err.message);
    }
  }

  const db = getJSONDB();
  const u = (db.users || []).find(x => x.id === Number(id));
  if (!u) return null;
  const { password, ...safeUser } = u;
  return safeUser;
}

// สร้างผู้ใช้ใหม่พร้อมเข้ารหัสผ่าน (bcrypt)
async function createUser({ username, email, password, name, phone, address, role = 'customer' }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date();

  if (isMySQLActive()) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO Customer (username, email, password, name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username.trim(), email.trim(), hashedPassword, name.trim(), phone.trim(), address ? address.trim() : '', role]
      );
      return {
        id: result.insertId,
        customerID: result.insertId,
        username,
        email,
        name,
        phone,
        address,
        role,
        createdAt: now.toISOString()
      };
    } catch (err) {
      console.error('MySQL createUser error:', err.message);
      throw err;
    }
  }

  // fallback บันทึกลง JSON
  const db = getJSONDB();
  if (!db.users) db.users = [];
  
  const newId = db.users.length > 0 ? Math.max(...db.users.map(u => u.id)) + 1 : 1;
  const newUser = {
    id: newId,
    username: username.trim(),
    email: email.trim(),
    password: hashedPassword,
    name: name.trim(),
    phone: phone.trim(),
    address: address ? address.trim() : '',
    role,
    createdAt: now.toISOString()
  };

  db.users.push(newUser);
  saveJSONDB(db);

  const { password: _, ...safeUser } = newUser;
  return safeUser;
}

// ตรวจสอบรหัสผ่านที่ hash ไว้
async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

// ดึงรายการบริการทั้งหมด (จากตาราง Service ใน MySQL หรือ JSON)
async function getServicesList() {
  if (isMySQLActive()) {
    try {
      const [rows] = await pool.query('SELECT * FROM Service ORDER BY serviceID ASC');
      if (rows && rows.length > 0) {
        return rows.map(s => ({
          id: s.serviceID,
          serviceId: s.serviceID,
          name: s.serviceName,
          pricePerUnit: Number(s.price),
          unit: s.unit || 'กก.',
          description: s.description || '',
          icon: s.icon || '👕',
          category: s.category || 'regular',
          popular: s.serviceID === 1
        }));
      }
    } catch (err) {
      console.error('MySQL getServices error:', err.message);
    }
  }

  const db = getJSONDB();
  return db.services || [];
}

// ดึงรายการคำสั่งซื้อทั้งหมด (จากตาราง Order หรือ JSON)
async function getOrdersList() {
  if (isMySQLActive()) {
    try {
      const [orders] = await pool.query(`
        SELECT 
          o.orderID,
          o.orderID AS id,
          o.customerID AS userId,
          o.orderDate AS createdAt,
          o.status,
          o.totalPrice AS totalAmount,
          o.note AS specialNotes,
          c.name AS customerName,
          c.phone AS customerPhone,
          c.address AS customerAddress,
          d.status AS deliveryStatus,
          d.address AS deliveryAddress,
          d.riderName,
          d.riderPhone,
          d.deliveryDate,
          p.status AS paymentStatus,
          p.paymentMethod
        FROM \`Order\` o
        LEFT JOIN Customer c ON o.customerID = c.customerID
        LEFT JOIN Delivery d ON o.orderID = d.orderID
        LEFT JOIN Payment p ON o.orderID = p.orderID
        ORDER BY o.orderID DESC
      `);

      const [items] = await pool.query(`
        SELECT 
          oi.orderID,
          oi.serviceID,
          oi.quantity,
          oi.price AS pricePerUnit,
          oi.subtotal,
          s.serviceName,
          s.unit
        FROM OrderItem oi
        LEFT JOIN Service s ON oi.serviceID = s.serviceID
      `);

      return orders.map(ord => {
        const orderItems = items.filter(it => it.orderID === ord.orderID).map(it => ({
          serviceId: it.serviceID,
          serviceName: it.serviceName,
          quantity: it.quantity,
          pricePerUnit: Number(it.pricePerUnit),
          unit: it.unit,
          subtotal: Number(it.subtotal)
        }));

        let meta = null;
        if (ord.specialNotes && typeof ord.specialNotes === 'string' && ord.specialNotes.trim().startsWith('{')) {
          try {
            meta = JSON.parse(ord.specialNotes);
          } catch (e) {
            meta = null;
          }
        }

        const name = (meta && meta.name) || ord.customerName || 'ลูกค้า DekDry';
        const phone = (meta && meta.phone) || ord.customerPhone || '';
        const email = (meta && meta.email) || '';
        // Prioritize: 1) address from order metadata, 2) deliveryAddress from Delivery table, 3) profile address
        const address = (meta && meta.address) || ord.deliveryAddress || ord.customerAddress || '';
        const note = (meta && meta.note !== undefined) ? meta.note : (ord.specialNotes || '');
        const preferences = (meta && meta.preferences) || {
          detergent: 'มาตรฐาน DekDry',
          softener: 'กลิ่นอ่อนโยน',
          packaging: 'พับมาตรฐาน',
          temperature: '30°C',
          drying: 'เครื่องอบ'
        };

        return {
          id: `ORD-${ord.orderID}`,
          rawId: ord.orderID,
          userId: ord.userId,
          createdAt: ord.createdAt,
          status: ord.status || 'ORDER_PLACED',
          totalAmount: Number(ord.totalAmount) || 0,
          customer: {
            name,
            phone,
            email,
            address,
            note
          },
          deliveryAddress: address,
          notes: note,
          customerName: name,
          customerPhone: phone,
          customerAddress: address,
          items: orderItems,
          preferences,
          pickupSchedule: meta?.pickupSchedule || '',
          returnSchedule: meta?.returnSchedule || '',
          assignedRider: ord.riderName ? {
            name: ord.riderName,
            phone: ord.riderPhone || '671-223-1091'
          } : null,
          paymentStatus: ord.paymentStatus || 'UNPAID',
          paymentMethod: ord.paymentMethod || 'PROMPTPAY',
          specialNotes: note
        };
      });
    } catch (err) {
      console.error('MySQL getOrders error:', err.message);
    }
  }

  const db = getJSONDB();
  return db.orders || [];
}

// อัปเดตข้อมูลผู้ใช้
async function updateUser(id, { name, phone, address, email, password, role }) {
  const cleanId = Number(id);

  if (isMySQLActive()) {
    try {
      // ตรวจสอบว่า email ซ้ำกับคนอื่นหรือไม่
      if (email) {
        const [existing] = await pool.query(
          'SELECT customerID FROM Customer WHERE email = ? AND customerID != ?',
          [email.trim(), cleanId]
        );
        if (existing.length > 0) {
          throw new Error('อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว');
        }
      }

      if (password && password.trim().length >= 6) {
        const hashedPassword = await bcrypt.hash(password.trim(), 10);
        await pool.query(
          'UPDATE Customer SET name = ?, phone = ?, address = ?, email = ?, password = ?, role = COALESCE(?, role) WHERE customerID = ?',
          [name.trim(), phone.trim(), address ? address.trim() : '', email.trim(), hashedPassword, role || null, cleanId]
        );
      } else {
        await pool.query(
          'UPDATE Customer SET name = ?, phone = ?, address = ?, email = ?, role = COALESCE(?, role) WHERE customerID = ?',
          [name.trim(), phone.trim(), address ? address.trim() : '', email.trim(), role || null, cleanId]
        );
      }

      const [updated] = await pool.query(
        'SELECT customerID AS id, customerID, username, email, name, phone, address, role, createdAt FROM Customer WHERE customerID = ?',
        [cleanId]
      );
      if (updated.length > 0) return updated[0];
    } catch (err) {
      console.error('MySQL updateUser error:', err.message);
      throw err;
    }
  }

  // fallback JSON
  const db = getJSONDB();
  if (!db.users) db.users = [];
  const idx = db.users.findIndex(u => u.id === cleanId);
  if (idx === -1) throw new Error('ไม่พบข้อมูลผู้ใช้');

  if (email && email.trim()) {
    const isDup = db.users.some(u => u.id !== cleanId && u.email.toLowerCase() === email.trim().toLowerCase());
    if (isDup) throw new Error('อีเมลนี้ถูกใช้งานโดยบัญชีอื่นแล้ว');
  }

  db.users[idx].name = name.trim();
  db.users[idx].phone = phone.trim();
  db.users[idx].address = address ? address.trim() : '';
  if (role) db.users[idx].role = role;
  if (email) db.users[idx].email = email.trim();
  if (password && password.trim().length >= 6) {
    db.users[idx].password = await bcrypt.hash(password.trim(), 10);
  }
  saveJSONDB(db);

  const { password: _, ...safeUser } = db.users[idx];
  return safeUser;
}

// ลบบัญชีผู้ใช้
async function deleteUser(id) {
  const cleanId = Number(id);

  if (isMySQLActive()) {
    try {
      await pool.query('DELETE FROM Customer WHERE customerID = ?', [cleanId]);
      return { success: true, message: 'ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว' };
    } catch (err) {
      console.error('MySQL deleteUser error:', err.message);
      throw err;
    }
  }

  // fallback JSON
  const db = getJSONDB();
  if (db.users) {
    db.users = db.users.filter(u => u.id !== cleanId);
  }
  saveJSONDB(db);
  return { success: true, message: 'ลบบัญชีผู้ใช้งานเรียบร้อยแล้ว' };
}

module.exports = {
  initMySQL,
  isMySQLActive,
  getPool,
  getDB: getJSONDB,
  saveDB: saveJSONDB,
  findUserByUsernameOrEmail,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
  verifyPassword,
  getServicesList,
  getOrdersList,
  DB_PATH
};

