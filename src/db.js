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
    console.log('MySQL Database connected');
    return true;
  } catch (err) {
    console.log('MySQL not connected, fallback to JSON database');
    useMySQL = false;
    return false;
  }
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

// ค้นหาผู้ใช้จาก username หรือ email
async function findUserByUsernameOrEmail(identifier) {
  const cleanId = String(identifier).trim().toLowerCase();
  if (useMySQL && pool) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
        [cleanId, cleanId]
      );
      return rows[0] || null;
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
  if (useMySQL && pool) {
    try {
      const [rows] = await pool.execute('SELECT id, username, email, name, phone, address, role, created_at FROM users WHERE id = ?', [id]);
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

  if (useMySQL && pool) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO users (username, email, password, name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [username.trim(), email.trim(), hashedPassword, name.trim(), phone.trim(), address ? address.trim() : '', role]
      );
      return {
        id: result.insertId,
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

module.exports = {
  initMySQL,
  getDB: getJSONDB,
  saveDB: saveJSONDB,
  findUserByUsernameOrEmail,
  findUserById,
  createUser,
  verifyPassword,
  DB_PATH
};
