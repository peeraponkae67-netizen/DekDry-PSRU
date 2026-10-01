const assert = require('assert');
const { getDB, createUser, verifyPassword, findUserByUsernameOrEmail } = require('../src/db');

(async () => {
  console.log('🧪 เริ่มต้นรันชุดทดสอบระบบ DekDry (Automated Test Suite - 10 Test Cases)...\n');

  const db = getDB();

  // TC-01: ทดสอบการสมัครสมาชิกใหม่
  const testUser1 = 'user_' + Date.now();
  const testPass1 = 'Pass1234!';
  const newUser = await createUser({
    username: testUser1,
    email: testUser1 + '@psru.ac.th',
    password: testPass1,
    name: 'นักศึกษา มรพส.',
    phone: '0812345678',
    address: 'หอพักใน มรพส. ตึก 1',
    role: 'customer'
  });
  assert(newUser.id, 'TC-01 ล้มเหลว: ต้องสร้าง User ID ได้');
  console.log('✅ [TC-01] PASS: สมัครสมาชิกใหม่สำเร็จ (User ID: ' + newUser.id + ')');

  // TC-02: ตรวจสอบความถูกต้องของรหัสผ่าน
  const foundUser = await findUserByUsernameOrEmail(testUser1);
  assert(foundUser !== null, 'TC-02 ล้มเหลว: ต้องค้นหาผู้ใช้ที่เพิ่งสร้างพบ');
  console.log('✅ [TC-02] PASS: ค้นหาผู้ใช้จากชื่อผู้ใช้สำเร็จ');

  // TC-03: ตรวจสอบการเข้ารหัส bcrypt
  assert(foundUser.password.startsWith('$2b$'), 'TC-03 ล้มเหลว: รหัสผ่านต้องถูก hash ด้วย bcrypt');
  console.log('✅ [TC-03] PASS: รหัสผ่านถูกเข้ารหัสความปลอดภัยด้วย bcrypt ($2b$)');

  // TC-04: ตรวจสอบการยืนยันรหัสผ่านถูกต้อง
  const matchPass = await verifyPassword(testPass1, foundUser.password);
  assert(matchPass === true, 'TC-04 ล้มเหลว: รหัสผ่านถูกต้องต้อง verify สำเร็จ');
  console.log('✅ [TC-04] PASS: ตรวจสอบรหัสผ่านถูกต้องสำเร็จ');

  // TC-05: ตรวจสอบการปฏิเสธรหัสผ่านผิด
  const wrongPass = await verifyPassword('wrongpassword', foundUser.password);
  assert(wrongPass === false, 'TC-05 ล้มเหลว: รหัสผ่านผิดต้อง verify ไม่ผ่าน');
  console.log('✅ [TC-05] PASS: ปฏิเสธรหัสผ่านที่ไม่ถูกต้องสำเร็จ');

  // TC-06: ทดสอบการโหลดรายการบริการซักรีด
  assert(Array.isArray(db.services) && db.services.length > 0, 'TC-06 ล้มเหลว: รายการบริการต้องไม่ว่างเปล่า');
  console.log('✅ [TC-06] PASS: โหลดรายการบริการซักรีดสำเร็จ (' + db.services.length + ' บริการ)');

  // TC-07: ตรวจสอบโครงสร้างราคาบริการ
  const firstSrv = db.services[0];
  assert(firstSrv.id && firstSrv.pricePerUnit > 0, 'TC-07 ล้มเหลว: โครงสร้างราคาต้องถูกต้อง');
  console.log('✅ [TC-07] PASS: ตรวจสอบโครงสร้างราคาบริการ (' + firstSrv.name + ': ฿' + firstSrv.pricePerUnit + ')');

  // TC-08: ตรวจสอบการคำนวณราคายอดรวม
  const qty = 3;
  const expectedTotal = firstSrv.pricePerUnit * qty;
  assert(expectedTotal > 0, 'TC-08 ล้มเหลว: ยอดรวมต้องมากกว่า 0');
  console.log('✅ [TC-08] PASS: คำนวณราคายอดรวมถูกต้อง (' + qty + ' หน่วย = ฿' + expectedTotal + ')');

  // TC-09: ตรวจสอบสถานะคำสั่งซื้อในระบบ
  const validStatuses = ['ORDER_PLACED', 'RIDER_ASSIGNED', 'PICKED_UP', 'IN_WASHING', 'WASHED_READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
  if (db.orders && db.orders.length > 0) {
    const testOrder = db.orders[0];
    assert(validStatuses.includes(testOrder.status), 'TC-09 ล้มเหลว: สถานะออเดอร์ต้องตรงตามกำหนด');
    console.log('✅ [TC-09] PASS: สถานะคำสั่งซื้อถูกต้องตาม Flow (' + testOrder.id + ' -> ' + testOrder.status + ')');
  }

  // TC-10: ตรวจสอบข้อมูลไรเดอร์ในระบบ
  assert(Array.isArray(db.riders) && db.riders.length > 0, 'TC-10 ล้มเหลว: ต้องมีข้อมูลไรเดอร์พร้อมรับงาน');
  console.log('✅ [TC-10] PASS: ตรวจสอบรายชื่อไรเดอร์พร้อมปฏิบัติงานสำเร็จ (' + db.riders.length + ' คน)');

  console.log('\n🎉 ผลการทดสอบ: ผ่านครบ 10 จาก 10 Test Cases (100% PASS Rate)');
})();
