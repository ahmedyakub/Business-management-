# Business & Inventory Management System

An all-in-one MERN (MongoDB, Express, React, Node.js) application for managing inventory, sales, expenses, customers, suppliers and financial performance. Built for retail shops, supermarkets, pharmacies, wholesalers, warehouses, electronics and clothing stores, building material suppliers and other SMEs.

## Features

| Module | What it does |
| --- | --- |
| 📦 **Inventory** | Products with SKU/barcode, categories, units, purchase & selling prices, stock quantities, minimum stock levels, manual stock adjustments |
| 🛒 **Point of Sale** | Search or scan products (Enter on SKU/barcode), cart with editable prices, discount, tax, change calculation, sell on credit to customers |
| 🧾 **Invoices** | Professional invoices viewable in the browser, printable, and downloadable as PDF; void sales (stock is restored automatically) |
| 🚚 **Purchases** | Record stock received from suppliers — increases stock, optionally updates cost prices, tracks amounts owed |
| 💸 **Expenses** | Rent, utilities, salaries etc. with categories, date filtering and payment method |
| 👥 **Customers & Suppliers** | Contact details, outstanding balances, invoice/purchase history, payment history; record payments (applied to oldest open documents first) |
| 📊 **Reports** | Profit & Loss statement, sales summary (daily chart, top products, payment methods), expense report, inventory valuation (cost & retail) — with CSV export and print |
| 🔔 **Low-stock alerts** | Notifications created automatically when a product reaches its minimum level and cleared when restocked; bell badge, dashboard widget, low-stock filter |
| 🔐 **Users & Roles** | Admin, Manager, Cashier and Inventory roles enforced on both the API and UI |
| ⚙️ **Settings** | Business name, address, tax ID, currency and default tax rate printed on invoices |
| 🌐 **Languages** | English and Somali (Af-Soomaali), switched with the **EN / SO** button in the top bar or on the login page |

### Roles

| Role | Access |
| --- | --- |
| **Admin** | Everything, including user management and business settings |
| **Manager** | All business operations and financial reports; can void sales; no user management |
| **Cashier** | POS, invoices, customers and customer payments; read-only products |
| **Inventory** | Products, categories, suppliers, purchases, supplier payments and inventory valuation |

Permissions are defined in [`server/src/config/permissions.js`](server/src/config/permissions.js).

## Languages / Luqadaha

The interface is available in **English** and **Somali (Af-Soomaali)**. Use the **EN | SO** switch in the top bar (or on the login page). The choice is saved in the browser; on first visit the app follows the browser language.

Translations live in [`client/src/i18n/en.js`](client/src/i18n/en.js) and [`client/src/i18n/so.js`](client/src/i18n/so.js); both files must have the same keys. To add a language, copy `en.js`, translate the values and register it in `client/src/context/LanguageContext.jsx`.

Not yet translated: error messages that come from the API and the downloadable PDF invoice (the on-screen invoice is translated).

## Tech stack

- **Backend:** Node.js, Express, Mongoose, JWT auth, bcrypt, PDFKit
- **Frontend:** React 18, React Router, Axios, Vite
- **Database:** MongoDB

## Getting started

### Prerequisites

- Node.js 18+
- MongoDB 6+ (local install, Atlas, or `docker compose up -d` using the included `docker-compose.yml`)

### Setup

```bash
# 1. Install dependencies (root, server and client)
npm install
npm run install:all

# 2. Configure the API
cp server/.env.example server/.env
#   then edit server/.env — set MONGO_URI and a long random JWT_SECRET

# 3. Create the default accounts and demo data
npm run seed            # add "-- --reset" to wipe the database first: npm run seed --prefix server -- --reset

# 4. Run API (http://localhost:5000) and client (http://localhost:5173) together
npm run dev
```

Seeded accounts (change these passwords after first login):

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@example.com | admin123 |
| Manager | manager@example.com | manager123 |
| Cashier | cashier@example.com | cashier123 |
| Inventory | inventory@example.com | inventory123 |

### Production

```bash
npm run build   # builds the React app into client/dist
npm start       # Express serves the API and the built client on PORT
```

## Project structure

```
server/
  src/
    config/        db connection, role permissions
    middleware/    JWT authentication, permission checks, error handling
    models/        User, Product, Category, Customer, Supplier, Sale, Purchase, Expense, Payment, Notification, Settings
    routes/        REST endpoints (see below)
    utils/         invoice PDF, stock alerts, sequence numbers, helpers
    seed.js        default users + demo data
client/
  src/
    api/           axios instance with auth token
    context/       auth/permissions, toasts
    components/    layout, modal, generic CRUD page, UI widgets
    pages/         dashboard, POS, invoices, products, reports, ...
```

## API overview

All endpoints are under `/api` and (except login) require `Authorization: Bearer <token>`.

| Endpoint | Description |
| --- | --- |
| `POST /auth/login`, `GET /auth/me`, `PUT /auth/password` | Authentication |
| `/users` | User CRUD (admin), `GET /users/roles` |
| `/products` | CRUD, `?search=&category=&lowStock=true`, `POST /products/:id/adjust` |
| `/categories`, `/customers`, `/suppliers`, `/expenses` | CRUD with `?search=` (expenses also `?from=&to=&category=`) |
| `/sales` | List/create, `GET /sales/:id/invoice.pdf`, `POST /sales/:id/void` |
| `/purchases` | List/create (increments stock) |
| `/payments` | Customer receipts and supplier payments against balances |
| `/reports/profit-loss`, `/reports/sales-summary`, `/reports/expenses`, `/reports/inventory-valuation` | Reports, `?from=YYYY-MM-DD&to=YYYY-MM-DD` |
| `/dashboard` | Role-aware summary metrics |
| `/notifications` | Low-stock alerts, `PUT /notifications/read-all` |
| `/settings` | Business details for invoices |

## Business rules

- Stock is decremented atomically per product when a sale is made; a sale can never take stock below zero.
- Each sale stores a snapshot of the product cost price, so profit reports stay accurate when prices change later.
- Walk-in sales must be fully paid; selecting a customer allows partial payment / credit, which is added to their balance.
- Voiding a sale restores stock and removes any unpaid amount from the customer's balance (cash already collected must be refunded manually).
- Products and parties with transaction history cannot be deleted (products are deactivated instead).
- Invoice (`INV-000001`) and purchase (`PO-000001`) numbers are sequential.
