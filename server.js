const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, "data", "smartmart.db"));

db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  barcode TEXT UNIQUE,
  sku TEXT,
  price REAL NOT NULL DEFAULT 0,
  gst REAL NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  category TEXT DEFAULT 'General',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_no TEXT UNIQUE NOT NULL,
  subtotal REAL NOT NULL,
  discount REAL NOT NULL DEFAULT 0,
  gst REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  price REAL NOT NULL,
  gst REAL NOT NULL,
  total REAL NOT NULL,
  FOREIGN KEY(sale_id) REFERENCES sales(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

const count = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
if (!count) {
  const add = db.prepare(`INSERT INTO products(name,barcode,sku,price,gst,stock,category) VALUES(?,?,?,?,?,?,?)`);
  const seed = db.transaction(() => {
    [
      ["Tata Salt 1kg","8901030895512","TS1",28,5,100,"Grocery"],
      ["Amul Milk 1L","8901262130012","AM1",60,5,80,"Dairy"],
      ["Dove Soap 100g","8901030896502","DS1",55,18,50,"Personal Care"],
      ["Aashirvaad Atta 5kg","8901200100011","AA5",310,5,40,"Grocery"],
      ["Parle-G Biscuits","8901719110012","PG1",10,5,150,"Snacks"]
    ].forEach(x => add.run(...x));
  });
  seed();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function productRow(p) {
  return {...p, price: Number(p.price), gst: Number(p.gst), stock: Number(p.stock)};
}

app.get("/api/products", (req,res) => {
  const q = String(req.query.q || "").trim();
  let rows;
  if (q) {
    rows = db.prepare(`SELECT * FROM products
      WHERE name LIKE ? OR barcode LIKE ? OR sku LIKE ? OR category LIKE ?
      ORDER BY id DESC`).all(`%${q}%`,`%${q}%`,`%${q}%`,`%${q}%`);
  } else rows = db.prepare("SELECT * FROM products ORDER BY id DESC").all();
  res.json(rows.map(productRow));
});

app.get("/api/products/barcode/:barcode", (req,res) => {
  const p = db.prepare("SELECT * FROM products WHERE barcode = ?").get(req.params.barcode);
  if (!p) return res.status(404).json({error:"Product not found"});
  res.json(productRow(p));
});

app.post("/api/products", (req,res) => {
  const {name, barcode="", sku="", price=0, gst=0, stock=0, category="General"} = req.body;
  if (!name) return res.status(400).json({error:"Product name is required"});
  try {
    const r = db.prepare(`INSERT INTO products(name,barcode,sku,price,gst,stock,category)
      VALUES(?,?,?,?,?,?,?)`).run(name, barcode || null, sku, Number(price), Number(gst), Number(stock), category);
    res.json({id:r.lastInsertRowid});
  } catch(e) { res.status(400).json({error:"Barcode already exists or product data is invalid"}); }
});

app.put("/api/products/:id", (req,res) => {
  const {name, barcode="", sku="", price=0, gst=0, stock=0, category="General"} = req.body;
  try {
    db.prepare(`UPDATE products SET name=?, barcode=?, sku=?, price=?, gst=?, stock=?, category=? WHERE id=?`)
      .run(name, barcode || null, sku, Number(price), Number(gst), Number(stock), category, req.params.id);
    res.json({ok:true});
  } catch(e) { res.status(400).json({error:"Could not update product"}); }
});

app.delete("/api/products/:id", (req,res) => {
  db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
  res.json({ok:true});
});

app.post("/api/sales", (req,res) => {
  const {items=[], discount=0, payment_method="Cash"} = req.body;
  if (!items.length) return res.status(400).json({error:"Bill is empty"});
  const get = db.prepare("SELECT * FROM products WHERE id=?");
  let subtotal = 0, gstTotal = 0, normalized = [];
  for (const item of items) {
    const p = get.get(item.product_id);
    const qty = Number(item.qty);
    if (!p || !Number.isInteger(qty) || qty < 1) return res.status(400).json({error:"Invalid product or quantity"});
    if (p.stock < qty) return res.status(400).json({error:`Not enough stock: ${p.name}`});
    const line = p.price * qty;
    subtotal += line;
    gstTotal += line * p.gst / 100;
    normalized.push({p, qty, line});
  }
  const disc = Math.max(0, Number(discount) || 0);
  const taxable = Math.max(0, subtotal - disc);
  const gst = normalized.reduce((s,x) => s + (x.line * x.p.gst / 100) * (taxable / subtotal || 1), 0);
  const total = taxable + gst;
  const billNo = "SM-" + Date.now().toString().slice(-8);

  const save = db.transaction(() => {
    const sale = db.prepare(`INSERT INTO sales(bill_no,subtotal,discount,gst,total,payment_method)
      VALUES(?,?,?,?,?,?)`).run(billNo, subtotal, disc, gst, total, payment_method);
    const itemStmt = db.prepare(`INSERT INTO sale_items(sale_id,product_id,name,qty,price,gst,total)
      VALUES(?,?,?,?,?,?,?)`);
    const stockStmt = db.prepare("UPDATE products SET stock=stock-? WHERE id=?");
    for (const x of normalized) {
      itemStmt.run(sale.lastInsertRowid, x.p.id, x.p.name, x.qty, x.p.price, x.p.gst, x.line);
      stockStmt.run(x.qty, x.p.id);
    }
    return sale.lastInsertRowid;
  });
  const saleId = save();
  res.json({saleId,billNo,subtotal:subtotal.toFixed(2),discount:disc.toFixed(2),gst:gst.toFixed(2),total:total.toFixed(2)});
});

app.get("/api/sales", (req,res) => {
  res.json(db.prepare("SELECT * FROM sales ORDER BY id DESC LIMIT 100").all());
});

app.get("/api/dashboard", (req,res) => {
  const products = db.prepare("SELECT COUNT(*) n FROM products").get().n;
  const stock = db.prepare("SELECT COALESCE(SUM(stock),0) n FROM products").get().n;
  const sales = db.prepare("SELECT COUNT(*) n FROM sales").get().n;
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) n FROM sales").get().n;
  const lowStock = db.prepare("SELECT COUNT(*) n FROM products WHERE stock <= 10").get().n;
  res.json({products,stock,sales,revenue,lowStock});
});

app.get("/api/health", (_,res)=>res.json({ok:true, app:"SmartMart POS"}));

app.listen(PORT, () => console.log(`SmartMart POS running at http://localhost:${PORT}`));