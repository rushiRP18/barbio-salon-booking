
# Barbio – Salon Preorder Booking System 💈

Barbio is a **full-stack, location-aware salon booking platform** designed to digitize and streamline salon appointment management. The application allows users to discover nearby salons, view ratings and reviews, and book appointments based on real-time slot availability. At the same time, salon owners are provided with a dedicated dashboard to manage bookings, schedules, and orders efficiently.

The platform focuses on **reducing waiting time**, **preventing slot conflicts**, and **improving customer experience** through transparent reviews, secure payments, and intelligent review insights.

---

## 📖 Problem Statement

Traditional salon booking systems often rely on walk-ins or phone-based appointments, leading to:

* Long waiting times
* Double bookings and scheduling conflicts
* Poor visibility of salon quality and customer feedback
* Inefficient manual management for salon owners

**Barbio solves these problems** by providing a centralized, real-time, and user-friendly booking system for both customers and salon owners.

---

## 🚀 Features

### 👤 User Features

* Discover salons based on **nearby location**
* View detailed salon profiles with **ratings and customer reviews**
* Book appointments using **real-time slot availability**
* Secure online payments through **Razorpay**
* Access **smart review summaries** (1–2 line insights generated from user reviews)
* Map-based navigation for easy salon discovery and directions

### 🧑‍💼 Salon Owner Features

* Dedicated **dashboard** for managing appointments and orders
* Real-time control over available slots and schedules
* View customer bookings and service requests
* Manage salon listings and operational details

---

## 🧠 Smart Review Summarization

Barbio includes an **intelligent review summarization feature** that analyzes user reviews and generates concise summaries.
This helps users quickly understand overall salon quality without reading multiple reviews.

---

## 🏗️ System Architecture

The application follows a **Model–View (MV) architecture**, ensuring:

* Clear separation between data logic and presentation
* Improved maintainability and scalability
* Structured backend and frontend development

**High-level flow:**

1. User searches for salons using location APIs
2. Available slots are fetched in real time
3. Booking and payment are processed securely
4. Salon owners manage bookings via dashboards

---

## 🛠️ Tech Stack

### Frontend

* HTML
* CSS
* Tailwind CSS

### Backend

* Node.js
* Express.js

### Database

* MongoDB

### Integrations

* Razorpay Payment Gateway
* Location & Maps APIs

### Architecture Pattern

* Model–View (MV)

---

## 📂 Project Structure (High-Level)

```
Barbio/
├── models/        # Database schemas
├── routes/        # API routes
├── controllers/   # Business logic
├── views/         # UI templates
├── public/        # Static assets (CSS, images)
├── config/        # Configuration files
├── app.js         # Application entry point
└── package.json
```

---

## 🔐 Security & Reliability

* Secure payment handling via Razorpay
* Structured API routes for maintainability
* Input validation and controlled booking workflows
* Real-time slot updates to prevent conflicts

---

## 📌 Use Cases

* Customers booking salon appointments in advance
* Salon owners managing schedules digitally
* Reducing waiting time and improving service efficiency
* Providing transparent and summarized customer feedback

---

## 🚧 Future Enhancements

* User and owner notifications (SMS / Email)
* Mobile application version
* Advanced analytics for salon owners
* Recommendation system based on user preferences
* Admin panel for platform-level management

---


## 📄 Project Status

* ✔ Core booking system implemented
* ✔ Real-time slot management working
* ✔ Secure payments integrated
* ✔ Review and rating system completed
* 🚀 Open for further enhancements

---

