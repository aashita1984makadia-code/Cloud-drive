# SmartMart POS

Lightweight supermarket billing/POS application.

## Stack
- HTML
- CSS
- Vanilla JavaScript
- Node.js
- Express
- SQLite (better-sqlite3)

## Features in v1
- Barcode/manual product lookup
- Billing cart
- Quantity management
- GST and discount calculation
- Cash / UPI / Card selection
- Bill generation
- Automatic stock reduction
- Product management
- Sales history
- Dashboard
- SQLite persistence

## Run
1. Install Node.js on the computer.
2. Open this folder in a terminal.
3. Run:
   npm install
4. Start:
   npm start
5. Open:
   http://localhost:3000

The SQLite database is created automatically at `data/smartmart.db`.

## Next production modules
- Login/authentication
- Receipt printing/PDF
- Returns/refunds
- Customers
- Suppliers/purchases
- User roles
- Reports/export
- Camera barcode scanning
