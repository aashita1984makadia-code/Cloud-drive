const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// DATABASE SETUP
// =====================================================

// Render may not have the data folder.
// Create it before opening SQLite.
const dataDir = path.join(__dirname, "data");

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "smartmart.db");

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");


// =====================================================
// DATABASE TABLES
// =====================================================

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

    FOREIGN KEY (sale_id)
        REFERENCES sales(id),

    FOREIGN KEY (product_id)
        REFERENCES products(id)
);


CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,

    phone TEXT,

    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);


// =====================================================
// SAMPLE PRODUCTS
// =====================================================

const productCount = db
    .prepare("SELECT COUNT(*) AS count FROM products")
    .get()
    .count;


if (productCount === 0) {

    const insertProduct = db.prepare(`
        INSERT INTO products
        (
            name,
            barcode,
            sku,
            price,
            gst,
            stock,
            category
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);


    const sampleProducts = [

        [
            "Tata Salt 1kg",
            "8901030895512",
            "TS1",
            28,
            5,
            100,
            "Grocery"
        ],

        [
            "Amul Milk 1L",
            "8901262130012",
            "AM1",
            60,
            5,
            80,
            "Dairy"
        ],

        [
            "Dove Soap 100g",
            "8901030896502",
            "DS1",
            55,
            18,
            50,
            "Personal Care"
        ],

        [
            "Aashirvaad Atta 5kg",
            "8901200100011",
            "AA5",
            310,
            5,
            40,
            "Grocery"
        ],

        [
            "Parle-G Biscuits",
            "8901719110012",
            "PG1",
            10,
            5,
            150,
            "Snacks"
        ]

    ];


    const insertProducts = db.transaction(() => {

        for (const product of sampleProducts) {

            insertProduct.run(...product);

        }

    });


    insertProducts();
}


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


// =====================================================
// PRODUCT API
// =====================================================


// GET ALL PRODUCTS / SEARCH PRODUCTS

app.get("/api/products", (req, res) => {

    const search = String(
        req.query.q || ""
    ).trim();


    let products;


    if (search) {

        products = db.prepare(`
            SELECT *
            FROM products

            WHERE
                name LIKE ?
                OR barcode LIKE ?
                OR sku LIKE ?
                OR category LIKE ?

            ORDER BY id DESC
        `).all(
            `%${search}%`,
            `%${search}%`,
            `%${search}%`,
            `%${search}%`
        );

    } else {

        products = db.prepare(`
            SELECT *
            FROM products
            ORDER BY id DESC
        `).all();

    }


    res.json(products);

});


// GET PRODUCT BY BARCODE

app.get(
    "/api/products/barcode/:barcode",
    (req, res) => {

        const barcode =
            req.params.barcode;


        const product = db.prepare(`
            SELECT *
            FROM products
            WHERE barcode = ?
        `).get(barcode);


        if (!product) {

            return res.status(404).json({
                error: "Product not found"
            });

        }


        res.json(product);

    }
);


// ADD PRODUCT

app.post("/api/products", (req, res) => {

    const {
        name,
        barcode = "",
        sku = "",
        price = 0,
        gst = 0,
        stock = 0,
        category = "General"
    } = req.body;


    if (!name) {

        return res.status(400).json({
            error: "Product name is required"
        });

    }


    try {

        const result = db.prepare(`
            INSERT INTO products
            (
                name,
                barcode,
                sku,
                price,
                gst,
                stock,
                category
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            name,
            barcode || null,
            sku,
            Number(price),
            Number(gst),
            Number(stock),
            category
        );


        res.json({
            success: true,
            id: result.lastInsertRowid
        });

    } catch (error) {

        res.status(400).json({
            error:
                "Barcode already exists or product data is invalid"
        });

    }

});


// UPDATE PRODUCT

app.put("/api/products/:id", (req, res) => {

    const {
        name,
        barcode = "",
        sku = "",
        price = 0,
        gst = 0,
        stock = 0,
        category = "General"
    } = req.body;


    try {

        db.prepare(`
            UPDATE products

            SET
                name = ?,
                barcode = ?,
                sku = ?,
                price = ?,
                gst = ?,
                stock = ?,
                category = ?

            WHERE id = ?
        `).run(
            name,
            barcode || null,
            sku,
            Number(price),
            Number(gst),
            Number(stock),
            category,
            req.params.id
        );


        res.json({
            success: true
        });

    } catch (error) {

        res.status(400).json({
            error: "Could not update product"
        });

    }

});


// DELETE PRODUCT

app.delete("/api/products/:id", (req, res) => {

    db.prepare(`
        DELETE FROM products
        WHERE id = ?
    `).run(req.params.id);


    res.json({
        success: true
    });

});


// =====================================================
// SALES / BILLING API
// =====================================================

app.post("/api/sales", (req, res) => {

    const {
        items = [],
        discount = 0,
        payment_method = "Cash"
    } = req.body;


    if (!items.length) {

        return res.status(400).json({
            error: "Bill is empty"
        });

    }


    const getProduct = db.prepare(`
        SELECT *
        FROM products
        WHERE id = ?
    `);


    let subtotal = 0;

    const normalizedItems = [];


    // Check every product

    for (const item of items) {

        const product =
            getProduct.get(item.product_id);


        const qty =
            Number(item.qty);


        if (!product) {

            return res.status(400).json({
                error: "Product not found"
            });

        }


        if (
            !Number.isInteger(qty) ||
            qty < 1
        ) {

            return res.status(400).json({
                error: "Invalid quantity"
            });

        }


        if (product.stock < qty) {

            return res.status(400).json({
                error:
                    `Not enough stock: ${product.name}`
            });

        }


        const lineTotal =
            product.price * qty;


        subtotal += lineTotal;


        normalizedItems.push({
            product,
            qty,
            lineTotal
        });

    }


    // Discount

    const discountValue =
        Math.max(
            0,
            Number(discount) || 0
        );


    const taxableAmount =
        Math.max(
            0,
            subtotal - discountValue
        );


    // GST

    let gst = 0;


    for (const item of normalizedItems) {

        const proportionalTaxable =
            subtotal > 0
                ? (
                    item.lineTotal /
                    subtotal
                ) * taxableAmount
                : 0;


        gst +=
            proportionalTaxable *
            item.product.gst /
            100;

    }


    // Final amount

    const total =
        taxableAmount + gst;


    // Generate bill number

    const billNo =
        "SM-" +
        Date.now()
            .toString()
            .slice(-8);


    // Save complete sale

    const createSale =
        db.transaction(() => {

            const sale =
                db.prepare(`
                    INSERT INTO sales
                    (
                        bill_no,
                        subtotal,
                        discount,
                        gst,
                        total,
                        payment_method
                    )

                    VALUES (?, ?, ?, ?, ?, ?)
                `).run(
                    billNo,
                    subtotal,
                    discountValue,
                    gst,
                    total,
                    payment_method
                );


            const insertItem =
                db.prepare(`
                    INSERT INTO sale_items
                    (
                        sale_id,
                        product_id,
                        name,
                        qty,
                        price,
                        gst,
                        total
                    )

                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);


            const updateStock =
                db.prepare(`
                    UPDATE products

                    SET stock =
                        stock - ?

                    WHERE id = ?
                `);


            for (
                const item
                of normalizedItems
            ) {

                insertItem.run(
                    sale.lastInsertRowid,
                    item.product.id,
                    item.product.name,
                    item.qty,
                    item.product.price,
                    item.product.gst,
                    item.lineTotal
                );


                updateStock.run(
                    item.qty,
                    item.product.id
                );

            }


            return sale.lastInsertRowid;

        });


    const saleId =
        createSale();


    res.json({

        success: true,

        saleId,

        billNo,

        subtotal:
            subtotal.toFixed(2),

        discount:
            discountValue.toFixed(2),

        gst:
            gst.toFixed(2),

        total:
            total.toFixed(2)

    });

});


// =====================================================
// SALES HISTORY
// =====================================================

app.get("/api/sales", (req, res) => {

    const sales =
        db.prepare(`
            SELECT *
            FROM sales
            ORDER BY id DESC
            LIMIT 100
        `).all();


    res.json(sales);

});


// =====================================================
// DASHBOARD
// =====================================================

app.get("/api/dashboard", (req, res) => {

    const products =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM products
        `).get().count;


    const stock =
        db.prepare(`
            SELECT
                COALESCE(
                    SUM(stock),
                    0
                ) AS count
            FROM products
        `).get().count;


    const sales =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM sales
        `).get().count;


    const revenue =
        db.prepare(`
            SELECT
                COALESCE(
                    SUM(total),
                    0
                ) AS total
            FROM sales
        `).get().total;


    const lowStock =
        db.prepare(`
            SELECT COUNT(*) AS count
            FROM products
            WHERE stock <= 10
        `).get().count;


    res.json({

        products,

        stock,

        sales,

        revenue,

        lowStock

    });

});


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (req, res) => {

    res.json({

        success: true,

        application:
            "SmartMart POS",

        database:
            "SQLite",

        status:
            "running"

    });

});


// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `SmartMart POS running on port ${PORT}`
    );

});
