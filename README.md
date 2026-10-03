# The Copper Leaf — Multi-Restaurant Enterprise Operating System & PWA

**The Copper Leaf** is a production-grade multi-restaurant management platform and installable Progressive Web Application (PWA). Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Firebase (Authentication, Firestore, and Realtime Database)**, **Razorpay**, **ImgBB**, and **Gmail SMTP**.

---

## 🌟 Key Application Surfaces & URL Structure

### 1. Public Customer Experience (Light Mode Only)
- `/`: Brand discovery, multi-branch selector, and reservations CTA.
- `/r/[restaurantSlug]`: Branch-specific landing page, address, and culinary story.
- `/r/[restaurantSlug]/menu`: Interactive menu catalog with categories, variants, and customizations.
- `/r/[restaurantSlug]/categories`: Category overview.
- `/r/[restaurantSlug]/offers`: Live promotional discount banners.
- `/r/[restaurantSlug]/gallery`: Visual dish gallery with lightbox.
- `/r/[restaurantSlug]/booking`: Same-day table reservation with real-time RTDB table hold.
- `/r/[restaurantSlug]/order`: QR table scanner (`?tableId=...`) with 10-minute hold lock.
- `/r/[restaurantSlug]/cart`: Local cart with multi-restaurant safety check.
- `/r/[restaurantSlug]/checkout`: Authoritative server pricing, Razorpay, cash at table, and loyalty redemption.
- `/r/[restaurantSlug]/orders/[orderId]`: Real-time order progress timeline and Call Waiter button.
- `/r/[restaurantSlug]/bookings/[bookingId]`: Real-time table booking status and countdown.

### 2. Customer Account
- `/account`: Account profile overview and anonymous account linking.
- `/account/orders`: Past order history with instant re-order reconstructed from active menu prices.
- `/account/bookings`: Dining reservation history.
- `/account/points`: Loyalty points ledger and multiplier breakdowns.
- `/account/membership`: VIP tier subscription and Razorpay checkout.
- `/account/reviews`: Verified dining feedback and ratings on completed orders.
- `/account/settings`: Dietary lifestyle, spiciness tolerance, allergens, and profile photo upload.

### 3. Authentication
- `/auth/sign-in`: Email/Password and Google sign-in.
- `/auth/sign-up`: Account creation with verification email trigger.
- `/auth/confirm-email`: Email verification instructions.
- `/auth/forgot-password`: Firebase password reset flow.

### 4. Admin Management (Light + Dark Mode)
- `/n/admin/dashboard`: Live revenue, pending/in-progress orders, occupancy, top dishes, and sales charts.
- `/n/admin/setup`: 10-step initial restaurant setup wizard.
- `/n/admin/restaurants`: Multi-location branch creator, editor, and active status toggles.
- `/n/admin/orders`: Live incoming orders board with status progression and cancellation reasons.
- `/n/admin/tables`: Floor tables management with real-time status cards and floor plan canvas.
- `/n/admin/kitchen`: Kitchen live queue display.
- `/n/admin/menu`: Menu categories and dish creator with variants, modifiers, dietary tags, and ImgBB images.
- `/n/admin/bookings`: Table reservation host list with check-in verification.
- `/n/admin/customers`: Customer profiles directory with Firestore prefix search.
- `/n/admin/staff`: Role delegation (`ADMIN`, `WAITER`, `KITCHEN`), branch assignments, and force logout.
- `/n/admin/memberships`: VIP club tiers builder and perk configuration.
- `/n/admin/loyalty`: Points earning rules and manual ledger adjustments.
- `/n/admin/coupons`: Promotional discount coupons with minimum spend caps.
- `/n/admin/offers`: Public website promotional banners.
- `/n/admin/reviews`: Moderation of verified dining reviews.
- `/n/admin/sales`: Date-filtered sales ledger with dish breakdown and Excel export.
- `/n/admin/analytics`: Trend graphs, channel distribution, and performance metrics.
- `/n/admin/inventory`: Menu item stock levels, low-stock threshold alerts, and purchase logs.
- `/n/admin/inventory/recipes`: Chef preparation recipe builder matching reference image with costings.
- `/n/admin/inventory/purchases`: Supply restock logger with automatic inventory increment.
- `/n/admin/inventory/stock`: Direct item stock adjustments.
- `/n/admin/expenses`: Operational expenditure records.
- `/n/admin/attendance`: Staff shift logs.
- `/n/admin/commissions`: Waitstaff sales commission rates and earnings ledger.
- `/n/admin/reports`: Data export to Excel (.xlsx) and PDF statements.
- `/n/admin/taxes`: Dynamic tax percentage rules (e.g. GST 5%).
- `/n/admin/charges`: Configurable service charges and packaging fees.
- `/n/admin/settings`: CMS content, brand story, opening hours, and contact details.

### 5. Waiter Operations (Light + Dark Mode)
- `/management/manage/dashboard`: Operational floor stats, urgent table call alerts, and incoming orders.
- `/management/manage/tables`: Live table states, walk-in guest seating, and table merging.
- `/management/manage/pos`: High-speed 2-pane POS terminal with instant kitchen dispatch.
- `/management/manage/orders`: Active orders list with table service action.
- `/management/manage/billing`: Table checks, cash collection at table, and downloadable PDF invoice.
- `/management/manage/requests`: Real-time patron table calls (assistance, water, bill) with attend buttons.
- `/management/manage/attendance`: Staff clock in and clock out.

### 6. Kitchen Display System (KDS)
- `/management/kitchen`: High-contrast 3-lane queue (`CONFIRMED` -> `PREPARING` -> `READY`) with elapsed timers, audio chime, and manager issue reporting.

---

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript (strict, zero `any`)
- **Styling**: Tailwind CSS & Vanilla CSS design tokens
- **Database & Auth**:
  - Firebase Authentication (Email/Password, Google Sign-in, Anonymous Auth)
  - Cloud Firestore (Authoritative durable storage)
  - Firebase Realtime Database (Atomic 10-minute temporary table holds)
- **Serverless Backend**: Next.js API Route Handlers on Vercel (`/api/*`)
- **Image Storage**: ImgBB API
- **Payments**: Razorpay (authoritative server-verified checkout & webhooks)
- **Emails**: Nodemailer with Gmail SMTP
- **PWA**: Installable web manifest (`manifest.json`) and service worker (`sw.js`)
- **Export Engines**: `xlsx` (Excel export), `jspdf` & `jspdf-autotable` (PDF invoices & statements)
- **Charts**: `recharts`

---

## 🚀 Setup & Installation Guide

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-repo/the-copper-leaf.git
cd the-copper-leaf
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your real service credentials:
```env
# Public Client Firebase
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-app-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abcdef"
NEXT_PUBLIC_FIREBASE_DATABASE_URL="https://your-app-default-rtdb.firebaseio.com"

# Server-Side Firebase Admin
FIREBASE_PROJECT_ID="your-app-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-app-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# ImgBB Image Upload
IMGBB_API_KEY="your_imgbb_api_key"

# Razorpay Payments
RAZORPAY_KEY_ID="rzp_test_your_key_id"
RAZORPAY_KEY_SECRET="your_razorpay_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_razorpay_webhook_secret"

# Gmail SMTP Email Notifications
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your_gmail_app_password"
MAIL_FROM="The Copper Leaf <your-email@gmail.com>"
```

### 3. Deploy Firebase Security Rules & Indexes
Deploy Firestore and RTDB security rules using the Firebase CLI:
```bash
firebase deploy --only firestore:rules,firestore:indexes,database
```

### 4. Initial Admin Account Bootstrapping
1. Navigate to `/auth/sign-up` and create an account using your email.
2. Go to the [Firebase Console](https://console.firebase.google.com/) -> **Firestore Database** -> `users` collection.
3. Locate your user document and edit the `role` field from `"CUSTOMER"` to `"ADMIN"`.
4. Sign in at `/auth/sign-in`. You now have complete access to the Admin suite.

### 5. Launch Initial Restaurant Setup Wizard
When you first access `/n/admin`, if no restaurant is configured, you will be guided through the **Initial Setup Wizard** at `/n/admin/setup`:
- **Step 1**: Brand identity & URL slug
- **Step 2**: Physical address, phone, and contact
- **Step 3**: Operating opening & closing hours
- **Step 4**: Table reservation durations & no-show thresholds
- **Step 5**: Taxes & charges
- **Step 6**: Initial table generation
- **Step 7**: Starter menu category & dish
- **Step 8**: VIP Membership tier
- **Step 9**: Payment acceptance methods
- **Step 10**: Launch!

---

## 🔒 Security Principles

- **No Client-Calculated Prices**: Prices, discounts, coupons, taxes, and loyalty balances sent from browser state are **never trusted**. Authoritative recalculation occurs inside server route handlers (`/api/payments/razorpay/*`).
- **No Mock or Fabricated Content**: The system starts with an empty database. All statistics, KPIs, menu items, orders, and reviews stream strictly from real Firestore documents.
- **Atomic Table Holds**: Realtime Database atomic transactions prevent race conditions when two customers attempt to hold or book the same table simultaneously.
- **PWA No-Offline Guarantee**: If connection drops, critical financial and ordering operations are disabled to prevent stale or fake offline writes.

---

## 📄 License
All rights reserved © The Copper Leaf.
