"""One-shot SQLite migration: add product-wise / period-wise columns to supply_risks."""
import sqlite3

DB_PATH = "optichain.db"

NEW_COLS = [
    ("product_name",       "TEXT DEFAULT ''"),
    ("category_name",      "TEXT DEFAULT ''"),
    ("supplier_name",      "TEXT DEFAULT ''"),
    ("year",               "INTEGER"),
    ("month",              "INTEGER"),
    ("expected_delay_days","INTEGER DEFAULT 0"),
    ("shipping_mode",      "TEXT DEFAULT ''"),
    ("order_region",       "TEXT DEFAULT ''"),
    ("risk_score",         "REAL"),
    ("trust_score",        "REAL"),
]

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()
cur.execute("PRAGMA table_info(supply_risks)")
existing = {row[1] for row in cur.fetchall()}
print("Existing columns:", existing)

for col, col_type in NEW_COLS:
    if col not in existing:
        cur.execute(f"ALTER TABLE supply_risks ADD COLUMN {col} {col_type}")
        print(f"  + Added: {col}")
    else:
        print(f"  ~ Skipped (exists): {col}")

conn.commit()
conn.close()
print("Migration complete.")
