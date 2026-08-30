const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const apiRoutes = require('./routes/api');
const { initMySQL } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ตั้งค่า middleware พื้นฐาน
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// เรียกใช้งานไฟล์ static frontend
app.use(express.static(path.join(__dirname, 'public')));

// เส้นทาง API
app.use('/api', apiRoutes);

// รองรับ Single Page Application routing
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// เริ่มต้นรันเซิร์ฟเวอร์
app.listen(PORT, async () => {
  console.log(`Server started on http://localhost:${PORT}`);
  // ตรวจสอบการเชื่อมต่อฐานข้อมูล
  await initMySQL();
});
