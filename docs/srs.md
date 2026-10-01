# Software Requirements Specification (SRS) & System Design
**วิชา:** COMP252 วิศวกรรมซอฟต์แวร์ (Software Engineering)  
**โปรเจกต์:** DekDry Laundry Delivery System @ PSRU (ระบบบริการซักอบรีดออนไลน์)

---

## 1. ผังการทำงานของระบบ (Process Flowchart)

```mermaid
flowchart TD
    Start([เริ่มต้น / Start]) --> Login[ลูกค้าเข้าสู่ระบบ หรือ สมัครสมาชิก]
    Login --> SelectService[เลือกบริการซักรีดและแพ็กเกจ]
    SelectService --> Slot[เลือกวันและเวลารับ-ส่งผ้า]
    Slot --> Preferences[เลือกปรับแต่งการซักและระบุที่อยู่]
    Preferences --> Confirm[ยืนยันคำสั่งซื้อ]
    Confirm --> Payment[ชำระเงิน PromptPay QR หรือ เก็บเงินปลายทาง]
    Payment --> RiderPickup[ไรเดอร์เข้ารับผ้าจากลูกค้า]
    RiderPickup --> WashProcess[โรงงานซัก อบ รีด และตรวจสอบ QC]
    WashProcess --> RiderDelivery[ไรเดอร์นำส่งผ้าสะอาดคืนลูกค้า]
    RiderDelivery --> EndNode([สิ้นสุด / End])
```

---

## 2. Use Case Diagram

```mermaid
graph LR
    subgraph System["DekDry Laundry System"]
        UC1(สมัคร/เข้าสู่ระบบ)
        UC2(เลือกบริการและแพ็กเกจ)
        UC3(นัดเวลารับ-ส่งผ้า)
        UC4(สร้างคำสั่งซื้อ)
        UC5(ชำระเงิน)
        
        UC6(รับงานรับผ้าและส่งผ้า)
        UC7(อัปเดตสถานะการรับ-ส่ง)
        
        UC8(รับคิวผ้าเข้าโรงซัก)
        UC9(ดำเนินการซัก/อบ/รีด)
        UC10(ตรวจสอบ QC พร้อมส่ง)
        
        UC11(จัดการข้อมูลบริการและราคา)
        UC12(ดูรายงานยอดขายและคำสั่งซื้อ)
    end

    Customer((ลูกค้า)) --> UC1
    Customer --> UC2
    Customer --> UC3
    Customer --> UC4
    Customer --> UC5

    Rider((พนักงานจัดส่ง)) --> UC6
    Rider --> UC7

    Staff((พนักงานโรงซัก)) --> UC8
    Staff --> UC9
    Staff --> UC10

    Admin((ผู้ดูแลระบบ)) --> UC11
    Admin --> UC12
```

---

## 3. Class Diagram & Data Architecture

```mermaid
classDiagram
    class Customer {
        -int customerID
        -string username
        -string password
        -string name
        -string phone
        -string address
        +register()
        +login()
        +createOrder()
    }

    class Service {
        -int serviceID
        -string serviceName
        -decimal price
        -string unit
        +calculatePrice()
    }

    class Order {
        -int orderID
        -int customerID
        -datetime orderDate
        -string status
        -decimal totalPrice
        +createOrder()
        +calculatePrice()
        +updateStatus()
    }

    class OrderItem {
        -int orderItemID
        -int orderID
        -int serviceID
        -int quantity
        -decimal subtotal
    }

    class Payment {
        -int paymentID
        -int orderID
        -decimal amount
        -string paymentMethod
        -string status
        +processPayment()
    }

    class Delivery {
        -int deliveryID
        -int orderID
        -int riderID
        -string pickupAddress
        -string status
        +updateDeliveryStatus()
    }

    Customer "1" --> "0..*" Order : places
    Order "1" --> "1..*" OrderItem : contains
    Service "1" --> "0..*" OrderItem : categorized in
    Order "1" --> "1" Payment : paid by
    Order "1" --> "0..1" Delivery : fulfilled by
```
