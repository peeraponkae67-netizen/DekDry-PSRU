# DekDry - Laundry Delivery System @ PSRU (ระบบบริการซักอบรีดออนไลน์)

**วิชา:** COMP342 วิศวกรรมซอฟต์แวร์เบื้องต้น (Software Engineering)  
**ใบงานที่ 4:** Implementation + Git

---

## 📌 เกี่ยวกับโปรเจกต์ (Project Overview)
**DekDry (เด็กดราย)** เป็นเว็บแอปพลิเคชันสำหรับบริการซักอบรีดออนไลน์สำหรับชาวมหาวิทยาลัยราชภัฏพิบูลสงคราม (มรพส.) พัฒนาด้วย **Node.js + Express** และรองรับฐานข้อมูล **MySQL / JSON Database** ช่วยอำนวยความสะดวกให้นักศึกษาและบุคลากรสามารถสั่งจองบริการซักอบรีด เลือกประเภทบริการ นัดวันเวลารับ-ส่ง ชำระเงิน พร้อมกระดานบริหารงานสำหรับไรเดอร์ พนักงานโรงซัก และแดชบอร์ดสำหรับผู้ดูแลระบบ

---

## 👥 สมาชิกในทีมและบทบาทหน้าที่ (Team Members & Roles)

| ลำดับ | ชื่อ-นามสกุล | บทบาทหน้าที่ (Role) | รายละเอียดความรับผิดชอบ (Responsibilities) |
|:---:|:---|:---|:---|
| 1 | **พีรพล แก้วพูลสุข** | **Database & System Architecture** | รับผิดชอบการออกแบบและจัดการฐานข้อมูล (Database Schema/MySQL/JSON Engine), ออกแบบระบบพื้นฐาน และจัดการ Data Access Layer ของโปรเจกต์ |
| 2 | **ธิเบศ พรมมา** | **Core Developer & Debugger** | รับผิดชอบการพัฒนาระบบหลังบ้าน (Backend API), ตรวจสอบแก้ไขบั๊ก (Bug Fixes), เก็บรายละเอียดการทำงานของระบบ และพัฒนาฟังก์ชันหลัก |
| 3 | **พงษ์อนันต์ ชนะสแบง** | **QA Tester & Documentation** | รับผิดชอบการทดสอบระบบ (Software Testing / Test Cases), บันทึก Defect Report, จัดทำเอกสารประกอบโครงงาน และเตรียมสไลด์นำเสนอ |

---

## 🚀 ฟีเจอร์หลักของระบบ (Key Features)

1. **🛒 ระบบสั่งจองบริการสำหรับลูกค้า (Customer Booking Flow)**
   - บริการสำหรับชาว มรพส. ทะเลแก้ว (มอนอก) พร้อมแพ็กเกจราคา (ประหยัด, มาตรฐาน, เร่งด่วน)
   - นัดวันและช่วงเวลาเข้ารับผ้า และวันส่งคืนผ้า
   - ปรับแต่งการดูแลผ้า: น้ำยาปรับผ้านุ่ม, อุณหภูมิน้ำ, การอบผ้า และตัวเลือกชุดเครื่องนอน
   - คำนวณราคาและส่วนลดอัตโนมัติ พร้อมระบบชำระเงินผ่าน PromptPay QR หรือเก็บเงินปลายทาง

2. **🔐 ระบบความปลอดภัยและการจัดการสมาชิก (Authentication & Roles)**
   - สมัครสมาชิกและเข้าสู่ระบบด้วยการเข้ารหัสรหัสผ่าน (bcrypt hash)
   - รองรับการสลับมุมมองตามบทบาทผู้ใช้งาน (ลูกค้า, พนักงานจัดส่ง, พนักงานซักรีด, ผู้ดูแลระบบ)

3. **🛵 ระบบสำหรับพนักงานจัดส่ง (Rider Portal)**
   - ตรวจสอบรายการงานรับผ้าและส่งผ้าตามคิว
   - อัปเดตสถานะการรับผ้าจากลูกค้า และการนำส่งผ้าสะอาดคืน

4. **🧼 ระบบสำหรับโรงงานซักรีด (Laundry Staff Workstation)**
   - กระดาน Kanban Board แบ่งขั้นตอน: คิวรอซัก, กำลังซัก/รีด, ตรวจสอบ QC พร้อมส่ง, และส่งมอบสำเร็จ

5. **📊 แดชบอร์ดผู้ดูแลระบบ (Admin Console)**
   - สรุปยอดขายรวม (Total Revenue), จำนวนออเดอร์ทั้งหมด และสถานะออเดอร์
   - ตารางจัดการออเดอร์ทั้งหมด ค้นหา กรองสถานะ และปรับเปลี่ยนข้อมูล

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

* **Backend Runtime & Framework:** Node.js, Express.js
* **Security & Auth:** bcryptjs (Password Hashing)
* **Database:** MySQL (phpMyAdmin) / JSON Database Engine (`data/db.json`)
* **Frontend:** HTML5, Modern Vanilla CSS (Design System & Glassmorphism), Vanilla JavaScript ES6
* **Typography:** Google Fonts (Prompt & Inter)

---

## 📁 โครงสร้างโฟลเดอร์โปรเจกต์ (Directory Structure)

```text
COMP252--/
├── data/
│   ├── db.json             # ข้อมูลจำลองสำหรับระบบ (Mock Database)
│   └── schema.sql          # สคริปต์สร้างฐานข้อมูล MySQL (Database Schema)
├── docs/
│   └── srs.md              # เอกสาร Software Requirements Specification & Diagrams
├── src/
│   ├── server.js           # จุดเริ่มต้นรัน Express Web Server
│   ├── db.js               # Data Access Layer เชื่อมต่อฐานข้อมูล
│   ├── routes/
│   │   └── api.js          # RESTful API Endpoints
│   └── public/             # หน้าจอเว็บไซต์ (Frontend Assets)
│       ├── index.html      # หน้าจอเว็บแอปพลิเคชัน (Single Page Application)
│       ├── css/
│       │   ├── styles.css  # ดีไซน์และธีมหลักของระบบ
│       │   └── booking.css # สไตล์ระบบสั่งจองบริการ 6 ขั้นตอน
│       └── js/
│           └── app.js      # Logic การทำงานและการเชื่อมต่อ API
├── tests/
│   └── test_api.js         # Automated Unit Tests
├── package.json            # รายการ Dependencies และ Scripts
└── README.md               # เอกสารแนะนำและคู่มือการใช้งานโปรเจกต์
```

---

## 📝 ประวัติการพัฒนาและ Commit History (3 Commits)

| Commit Step | Commit Message | รายละเอียดการพัฒนา |
|:---:|:---|:---|
| **Commit 1** | `เริ่มต้นสร้างโปรเจกต์ ตั้งค่า Express Server และโครงสร้างฐานข้อมูล` | สร้างโครงสร้างโฟลเดอร์, ตั้งค่า Express Server, ฐานข้อมูล MySQL/JSON Schema |
| **Commit 2** | `พัฒนาระบบสั่งจองซักรีด หน้าแสดงอัตราค่าบริการ และ UI หน้าเว็บหลัก` | พัฒนาระบบสั่งจองบริการ 6 ขั้นตอน, หน้าอัตราค่าบริการ, ระบบคำนวณราคา |
| **Commit 3** | `เพิ่มระบบสมัครสมาชิก เข้าสู่ระบบด้วย bcrypt และสรุปเอกสารระบบ` | เพิ่มระบบ Authentication (bcrypt), สิทธิ์ผู้ใช้งานตามบทบาท และเอกสารประกอบโปรเจกต์ |

---

## ⚙️ ขั้นตอนการติดตั้งและรันโปรเจกต์ (Getting Started)

1. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```

2. ทดสอบระบบ (Run Unit Test):
   ```bash
   node tests/test_api.js
   ```

3. เริ่มต้นรันเซิร์ฟเวอร์:
   ```bash
   npm start
   ```

4. เปิดใช้งานผ่านเบราว์เซอร์:
   ```
   http://localhost:3000
   ```
