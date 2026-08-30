-- DekDry Laundry Delivery System @ PSRU - Database Schema
-- วิชา COMP252 วิศวกรรมซอฟต์แวร์ (Software Engineering)

CREATE DATABASE IF NOT EXISTS `laundry_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `laundry_db`;

-- --------------------------------------------------------
-- 1. Table: Customer (และผู้ใช้งานระบบ User/Staff/Rider/Admin)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Customer` (
  `customerID` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL, -- bcrypt hash
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20) NOT NULL,
  `address` TEXT NOT NULL,
  `email` VARCHAR(100) UNIQUE,
  `role` ENUM('customer', 'rider', 'staff', 'admin') DEFAULT 'customer',
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 2. Table: Service (รายการบริการและราคา)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Service` (
  `serviceID` INT AUTO_INCREMENT PRIMARY KEY,
  `serviceName` VARCHAR(100) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `unit` VARCHAR(20) DEFAULT 'กก.',
  `description` TEXT,
  `category` VARCHAR(50) DEFAULT 'regular',
  `icon` VARCHAR(20) DEFAULT '👕'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3. Table: Order (คำสั่งซื้อ)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Order` (
  `orderID` INT AUTO_INCREMENT PRIMARY KEY,
  `customerID` INT NOT NULL,
  `orderDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(50) DEFAULT 'ORDER_PLACED', -- ORDER_PLACED, IN_WASHING, WASHED_READY, OUT_FOR_DELIVERY, DELIVERED, CANCELLED
  `totalPrice` DECIMAL(10,2) NOT NULL,
  `note` TEXT,
  FOREIGN KEY (`customerID`) REFERENCES `Customer`(`customerID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 3.1 Table: OrderItem (รายการย่อยของบริการในแต่ละคำสั่งซื้อ)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `OrderItem` (
  `orderItemID` INT AUTO_INCREMENT PRIMARY KEY,
  `orderID` INT NOT NULL,
  `serviceID` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `price` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`orderID`) REFERENCES `Order`(`orderID`) ON DELETE CASCADE,
  FOREIGN KEY (`serviceID`) REFERENCES `Service`(`serviceID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 4. Table: Payment (การชำระเงิน)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS `Payment` (
  `paymentID` INT AUTO_INCREMENT PRIMARY KEY,
  `orderID` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `paymentDate` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `status` VARCHAR(30) DEFAULT 'PAID', -- PENDING, PAID, REFUNDED
  `paymentMethod` VARCHAR(50) DEFAULT 'PROMPTPAY',
  FOREIGN KEY (`orderID`) REFERENCES `Order`(`orderID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- 5. Table: Delivery (การจัดส่งผ้า)
CREATE TABLE IF NOT EXISTS `Delivery` (
  `deliveryID` INT AUTO_INCREMENT PRIMARY KEY,
  `orderID` INT NOT NULL,
  `address` TEXT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'RIDER_ASSIGNED', -- RIDER_ASSIGNED, PICKED_UP, DELIVERING, DELIVERED
  `deliveryDate` DATETIME NULL,
  `riderName` VARCHAR(100) DEFAULT 'นายนที วิ่งไว',
  `riderPhone` VARCHAR(20) DEFAULT '089-999-1122',
  FOREIGN KEY (`orderID`) REFERENCES `Order`(`orderID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================
-- SEED DATA (ข้อมูลเริ่มต้นสำหรับทดสอบ)
-- รหัสผ่านเริ่มต้นทุกบัญชีคือ: password123
-- ========================================================

-- Customer / User Seed
INSERT INTO `Customer` (`customerID`, `username`, `password`, `name`, `phone`, `address`, `email`, `role`) VALUES
(1, 'customer1', '$2b$10$5ZP7T2K.a.Vim2oNoOkqNOO3mHTuCJBrN5xQ2EwCWyvkCRtc1FVYq', 'คุณสมศักดิ์ สุขใจ', '081-234-5678', '99/12 คอนโด ลุมพินี พาร์ค ชั้น 15 ถ.สุขุมวิท กทม.', 'customer@example.com', 'customer'),
(2, 'rider1', '$2b$10$5ZP7T2K.a.Vim2oNoOkqNOO3mHTuCJBrN5xQ2EwCWyvkCRtc1FVYq', 'นายนที วิ่งไว', '089-999-1122', 'ศูนย์กระจายสินค้าสุขุมวิท', 'rider@example.com', 'rider'),
(3, 'staff1', '$2b$10$5ZP7T2K.a.Vim2oNoOkqNOO3mHTuCJBrN5xQ2EwCWyvkCRtc1FVYq', 'สมศรี รีดเรียบ', '082-333-4455', 'โรงซักรีดสาขา 1', 'staff@example.com', 'staff'),
(4, 'admin', '$2b$10$5ZP7T2K.a.Vim2oNoOkqNOO3mHTuCJBrN5xQ2EwCWyvkCRtc1FVYq', 'ผู้ดูแลระบบสูงสุด', '099-888-7766', 'สำนักงานใหญ่', 'admin@example.com', 'admin')
ON DUPLICATE KEY UPDATE `username`=`username`;

-- Service Seed
INSERT INTO `Service` (`serviceID`, `serviceName`, `price`, `unit`, `description`, `icon`) VALUES
(1, 'ซัก อบ พับ (Wash & Fold)', 60.00, 'กก.', 'ซักสะอาด อบแห้ง และพับเรียบร้อย เหมาะสำหรับเสื้อผ้าใส่ประจำวัน', '👕'),
(2, 'ซัก อบ รีด (Wash, Dry & Iron)', 90.00, 'กก.', 'ซักอบพร้อมรีดเรียบเนียนระดับพรีเมียม เหมาะสำหรับชุดทำงานและเชิ้ต', '👔'),
(3, 'ซักแห้งพรีเมียม (Dry Cleaning)', 180.00, 'ชิ้น', 'ดูแลเนื้อผ้าพิเศษ สูท ชุดราตรี และผ้าไหม ด้วยน้ำยาซักแห้งมาตรฐานสากล', '✨'),
(4, 'ซักผ้านวม & เครื่องนอน (Bedding & Duvet)', 150.00, 'ชุด', 'ซักฆ่าเชื้อและอบร้อนผ้านวม ปลอกหมอน ผ้าปูที่นอน ไร้กลิ่นอับ', '🛏️'),
(5, 'สปารองเท้า & กระเป๋า (Shoes & Bags Spa)', 220.00, 'คู่/ใบ', 'ทำความสะอาดล้ำลึก ขจัดคราบฝังแน่น และบำรุงรักษาวัสดุหนัง/ผ้าใบ', '👟'),
(6, 'บริการด่วนพิเศษ 6 ชม. (Express Service)', 120.00, 'ครั้ง', 'บริการรับ ซัก อบ และส่งคืนภายใน 6 ชั่วโมง (สำหรับกรณีเร่งด่วน)', '⚡')
ON DUPLICATE KEY UPDATE `serviceID`=`serviceID`;
