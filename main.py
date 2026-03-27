from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
import datetime
import os
import random

# ─────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────
app = FastAPI(title="CampusBite - College Canteen Ordering")
templates = Jinja2Templates(directory="templates")

# Allow Vite dev server (port 5173) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
os.makedirs("static", exist_ok=True)
os.makedirs("templates", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# ─────────────────────────────────────────────
# ADMIN CONFIG  (change these to demo different states)
# ─────────────────────────────────────────────
MOCK_TIME_OVERRIDE: Optional[str] = None  # Set to "11:30" to simulate pre-cutoff, "12:30" to simulate post-cutoff
ORDER_CUTOFF_HOUR = 12
ORDER_CUTOFF_MINUTE = 0

# ─────────────────────────────────────────────
# DATABASE SETUP
# ─────────────────────────────────────────────
DB_PATH = "canteen.db"

MENU_ITEMS = [
    # Snacks
    {"id": 1, "name": "Poha / Sambar (Single)", "price": 30, "category": "Snacks", "emoji": "🍛", "description": "Classic Maharashtrian snack", "kcal": 130, "protein": 2.5, "available": True},
    {"id": 2, "name": "Poha / Sambar (Special)", "price": 40, "category": "Snacks", "emoji": "🍛", "description": "Poha served with hot sambar", "kcal": 130, "protein": 2.5, "available": True},
    {"id": 3, "name": "Upma", "price": 30, "category": "Snacks", "emoji": "🥣", "description": "Savory semolina porridge", "kcal": 150, "protein": 3, "available": True},
    {"id": 4, "name": "Sabudana Khichadi", "price": 45, "category": "Snacks", "emoji": "🍲", "description": "Sago pearls with peanuts", "kcal": 180, "protein": 1.5, "available": True},
    {"id": 5, "name": "Sabudana Wada", "price": 40, "category": "Snacks", "emoji": "🧆", "description": "Crispy fried sago patties", "kcal": 250, "protein": 2, "available": True},
    {"id": 6, "name": "Idli Sambar", "price": 40, "category": "Snacks", "emoji": "🥟", "description": "Soft steamed rice cakes with sambar", "kcal": 120, "protein": 4, "available": True},
    {"id": 7, "name": "Gol Bhaji", "price": 30, "category": "Snacks", "emoji": "🧆", "description": "Crispy round fritters", "kcal": 300, "protein": 5, "available": True},
    {"id": 8, "name": "Kanda Bhaji", "price": 35, "category": "Snacks", "emoji": "🧅", "description": "Crispy onion fritters", "kcal": 280, "protein": 4, "available": True},
    {"id": 9, "name": "Batata Wada Sambar", "price": 30, "category": "Snacks", "emoji": "🥔", "description": "Potato fritters with sambar", "kcal": 220, "protein": 4, "available": True},
    {"id": 10, "name": "Wadapav", "price": 20, "category": "Snacks", "emoji": "🍔", "description": "Mumbai's favorite street food", "kcal": 290, "protein": 6, "available": True},
    {"id": 11, "name": "Bread Pattie", "price": 30, "category": "Snacks", "emoji": "🥪", "description": "Deep-fried stuffed bread", "kcal": 260, "protein": 6, "available": True},
    {"id": 12, "name": "Samosa", "price": 20, "category": "Snacks", "emoji": "🥟", "description": "Crispy pastry with spiced potato", "kcal": 260, "protein": 5, "available": True},
    {"id": 13, "name": "Samosa Pav", "price": 25, "category": "Snacks", "emoji": "🍔", "description": "Samosa served in a soft bun", "kcal": 300, "protein": 7, "available": True},
    {"id": 14, "name": "Dahi Samosa", "price": 40, "category": "Snacks", "emoji": "🥣", "description": "Samosa topped with sweet curd and chutneys", "kcal": 200, "protein": 6, "available": True},
    {"id": 15, "name": "Gulabjamun (2 pcs)", "price": 30, "category": "Snacks", "emoji": "🍮", "description": "Sweet milk-solid balls in syrup", "kcal": 300, "protein": 4, "available": True},

    # Cold Beverages
    {"id": 16, "name": "Cold Coffee", "price": 50, "category": "Drinks", "emoji": "🥤", "description": "Chilled milk coffee", "kcal": 90, "protein": 3, "available": True},
    {"id": 17, "name": "Lassi", "price": 40, "category": "Drinks", "emoji": "🥛", "description": "Sweet yogurt drink", "kcal": 120, "protein": 4, "available": True},
    {"id": 18, "name": "Mango Lassi", "price": 60, "category": "Drinks", "emoji": "🥭", "description": "Sweet yogurt drink with mango", "kcal": 150, "protein": 4, "available": True},
    {"id": 19, "name": "Cold Drinks", "price": 25, "category": "Drinks", "emoji": "🥤", "description": "Assorted aerated beverages", "kcal": 40, "protein": 0, "available": True},
    {"id": 20, "name": "Fresh Lime Water", "price": 25, "category": "Drinks", "emoji": "🍋", "description": "Refreshing sweet & salty lime water", "kcal": 25, "protein": 0, "available": True},
    {"id": 21, "name": "Masala Butter Milk", "price": 25, "category": "Drinks", "emoji": "🥛", "description": "Spiced buttermilk", "kcal": 40, "protein": 2, "available": True},

    # Maggie
    {"id": 22, "name": "Plain Maggie", "price": 50, "category": "Snacks", "emoji": "🍜", "description": "Classic instant noodles", "kcal": 470, "protein": 9, "available": True},
    {"id": 23, "name": "Veg Masala Maggie", "price": 60, "category": "Snacks", "emoji": "🍜", "description": "Spicy noodles with vegetables", "kcal": 500, "protein": 10, "available": True},
    {"id": 24, "name": "Cheese Maggie", "price": 70, "category": "Snacks", "emoji": "🧀", "description": "Instant noodles loaded with cheese", "kcal": 550, "protein": 14, "available": True},

    # Sandwiches
    {"id": 25, "name": "Bread Butter / Jam (Butter)", "price": 40, "category": "Snacks", "emoji": "🍞", "description": "Classic bread & butter", "kcal": 330, "protein": 6, "available": True},
    {"id": 26, "name": "Bread Butter / Jam (Jam)", "price": 45, "category": "Snacks", "emoji": "🍞", "description": "Sweet fruit jam on bread", "kcal": 280, "protein": 5, "available": True},
    {"id": 27, "name": "Toast Butter / Jam (Butter)", "price": 45, "category": "Snacks", "emoji": "🥪", "description": "Toasted bread & butter", "kcal": 350, "protein": 6, "available": True},
    {"id": 28, "name": "Toast Butter / Jam (Jam)", "price": 50, "category": "Snacks", "emoji": "🥪", "description": "Toasted bread with fruit jam", "kcal": 300, "protein": 5, "available": True},
    {"id": 29, "name": "Veg Sandwich (Plain)", "price": 55, "category": "Snacks", "emoji": "🥪", "description": "Fresh vegetable sandwich", "kcal": 250, "protein": 8, "available": True},
    {"id": 30, "name": "Veg Sandwich (Grilled)", "price": 60, "category": "Snacks", "emoji": "🥪", "description": "Grilled vegetable sandwich", "kcal": 300, "protein": 9, "available": True},
    {"id": 31, "name": "Veg Cheese Sandwich (Plain)", "price": 65, "category": "Snacks", "emoji": "🥪", "description": "Vegetables & cheese sandwich", "kcal": 320, "protein": 11, "available": True},
    {"id": 32, "name": "Veg Cheese Sandwich (Grilled)", "price": 70, "category": "Snacks", "emoji": "🥪", "description": "Grilled veggies & cheese", "kcal": 350, "protein": 12, "available": True},
    {"id": 33, "name": "Cheese Sandwich (Plain)", "price": 70, "category": "Snacks", "emoji": "🧀", "description": "Classic cheese sandwich", "kcal": 350, "protein": 12, "available": True},
    {"id": 34, "name": "Cheese Sandwich (Grilled)", "price": 75, "category": "Snacks", "emoji": "🧀", "description": "Grilled cheese sandwich", "kcal": 380, "protein": 13, "available": True},

    # Lunch ("Meal")
    {"id": 35, "name": "Aloo Paratha", "price": 70, "category": "Meal", "emoji": "🫓", "description": "Stuffed potato flatbread", "kcal": 260, "protein": 6, "available": True},
    {"id": 36, "name": "Paneer Paratha", "price": 85, "category": "Meal", "emoji": "🫓", "description": "Stuffed cottage cheese flatbread", "kcal": 300, "protein": 10, "available": True},
    {"id": 37, "name": "Chole Bhature", "price": 90, "category": "Meal", "emoji": "🍛", "description": "Spicy chickpea curry with fried bread", "kcal": 320, "protein": 9, "available": True},
    {"id": 38, "name": "Puri Bhaji", "price": 70, "category": "Meal", "emoji": "🍽️", "description": "Fried bread with potato curry", "kcal": 300, "protein": 6, "available": True},
    {"id": 39, "name": "Dal Rice", "price": 60, "category": "Meal", "emoji": "🍛", "description": "Comforting lentil soup with rice", "kcal": 180, "protein": 6, "available": True},
    {"id": 40, "name": "Rajma / Chole Rice", "price": 70, "category": "Meal", "emoji": "🍛", "description": "Kidney beans or chickpeas with rice", "kcal": 200, "protein": 7, "available": True},
    {"id": 41, "name": "Bhaji Chapati", "price": 65, "category": "Meal", "emoji": "🫓", "description": "Vegetable curry with flatbread", "kcal": 220, "protein": 6, "available": True},
    {"id": 42, "name": "Paneer Chapati", "price": 75, "category": "Meal", "emoji": "🫓", "description": "Paneer curry with flatbread", "kcal": 260, "protein": 10, "available": True},
    {"id": 43, "name": "Veg Thali", "price": 100, "category": "Meal", "emoji": "🍽️", "description": "Complete veg meal platter", "kcal": 180, "protein": 7, "available": True},
    {"id": 44, "name": "Paneer Thali", "price": 120, "category": "Meal", "emoji": "🍽️", "description": "Premium meal platter with paneer", "kcal": 220, "protein": 11, "available": True},

    # Chinese ("Meal")
    {"id": 45, "name": "Veg Fried Rice (Half)", "price": 80, "category": "Meal", "emoji": "🍚", "description": "Classic vegetable fried rice", "kcal": 180, "protein": 5, "available": True},
    {"id": 46, "name": "Veg Fried Rice (Full)", "price": 90, "category": "Meal", "emoji": "🍚", "description": "Classic vegetable fried rice", "kcal": 180, "protein": 5, "available": True},
    {"id": 47, "name": "Veg Hakka Noodles (Half)", "price": 80, "category": "Meal", "emoji": "🍜", "description": "Stir-fried noodles with vegetables", "kcal": 190, "protein": 5, "available": True},
    {"id": 48, "name": "Veg Hakka Noodles (Full)", "price": 90, "category": "Meal", "emoji": "🍜", "description": "Stir-fried noodles with vegetables", "kcal": 190, "protein": 5, "available": True},
    {"id": 49, "name": "Veg Shezwan Fried Rice (Half)", "price": 90, "category": "Meal", "emoji": "🍚", "description": "Spicy szechuan style fried rice", "kcal": 200, "protein": 5, "available": True},
    {"id": 50, "name": "Veg Shezwan Fried Rice (Full)", "price": 100, "category": "Meal", "emoji": "🍚", "description": "Spicy szechuan style fried rice", "kcal": 200, "protein": 5, "available": True},
    {"id": 51, "name": "Veg Shezwan Hakka Noodles (Half)", "price": 90, "category": "Meal", "emoji": "🍜", "description": "Spicy szechuan style noodles", "kcal": 210, "protein": 6, "available": True},
    {"id": 52, "name": "Veg Shezwan Hakka Noodles (Full)", "price": 100, "category": "Meal", "emoji": "🍜", "description": "Spicy szechuan style noodles", "kcal": 210, "protein": 6, "available": True},

    # Beverages ("Drinks")
    {"id": 53, "name": "Tea", "price": 13, "category": "Drinks", "emoji": "☕", "description": "Hot Indian masala tea", "kcal": 30, "protein": 1, "available": True},
    {"id": 54, "name": "Tea Parcel", "price": 15, "category": "Drinks", "emoji": "☕", "description": "Tea packed for parcel", "kcal": 30, "protein": 1, "available": True},
    {"id": 55, "name": "Spl. Tea", "price": 20, "category": "Drinks", "emoji": "☕", "description": "Special rich hot tea", "kcal": 50, "protein": 2, "available": True},
    {"id": 56, "name": "Coffee", "price": 25, "category": "Drinks", "emoji": "☕", "description": "Hot instant coffee", "kcal": 60, "protein": 2, "available": True},

    # Extras ("Extras")
    {"id": 57, "name": "Sabji", "price": 40, "category": "Extras", "emoji": "🍲", "description": "Extra portion of vegetable curry", "kcal": 120, "protein": 3, "available": True},
    {"id": 58, "name": "Sambar", "price": 10, "category": "Extras", "emoji": "🥣", "description": "Extra portion of sambar", "kcal": 80, "protein": 3, "available": True},
    {"id": 59, "name": "Chattni", "price": 10, "category": "Extras", "emoji": "🥣", "description": "Extra green chutney", "kcal": 100, "protein": 2, "available": True},
    {"id": 60, "name": "Shezwan Sauce", "price": 15, "category": "Extras", "emoji": "🌶️", "description": "Spicy szechuan dip", "kcal": 150, "protein": 2, "available": True},
    {"id": 61, "name": "Rice", "price": 40, "category": "Extras", "emoji": "🍚", "description": "Extra portion of plain rice", "kcal": 130, "protein": 2.5, "available": True},
    {"id": 62, "name": "Dal", "price": 30, "category": "Extras", "emoji": "🥣", "description": "Extra portion of lentils", "kcal": 120, "protein": 6, "available": True},
    {"id": 63, "name": "Pav", "price": 5, "category": "Extras", "emoji": "🍞", "description": "Extra soft bread roll", "kcal": 260, "protein": 8, "available": True},
    {"id": 64, "name": "Curd", "price": 15, "category": "Extras", "emoji": "🥣", "description": "Plain yogurt bowl", "kcal": 60, "protein": 3.5, "available": True},
]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            token       TEXT    NOT NULL UNIQUE,
            roll_number TEXT    NOT NULL,
            student_name TEXT   NOT NULL,
            items       TEXT    NOT NULL,
            total_price INTEGER NOT NULL,
            cutlery     INTEGER NOT NULL DEFAULT 0,
            status      TEXT    NOT NULL DEFAULT 'pending',
            created_at  TEXT    NOT NULL
        )
    """)
    conn.commit()
    conn.close()


init_db()


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def get_current_time() -> datetime.time:
    if MOCK_TIME_OVERRIDE:
        h, m = MOCK_TIME_OVERRIDE.split(":")
        return datetime.time(int(h), int(m))
    return datetime.datetime.now().time()


def is_ordering_open() -> bool:
    now = get_current_time()
    cutoff = datetime.time(ORDER_CUTOFF_HOUR, ORDER_CUTOFF_MINUTE)
    return now < cutoff


def generate_token() -> str:
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as cnt FROM orders")
    count = cur.fetchone()["cnt"]
    conn.close()
    token_num = 100 + count + 1
    return str(token_num)


def menu_item_by_id(item_id: int):
    for item in MENU_ITEMS:
        if item["id"] == item_id:
            return item
    return None


# ─────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────
class OrderItem(BaseModel):
    item_id: int
    quantity: int


class PlaceOrderRequest(BaseModel):
    roll_number: str
    student_name: str
    items: List[OrderItem]
    cutlery: bool = False


# ─────────────────────────────────────────────
# PAGE ROUTES
# ─────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
async def homepage(request: Request):
    return templates.TemplateResponse("index.html", {
        "request": request,
        "menu_items": MENU_ITEMS,
        "ordering_open": is_ordering_open(),
    })


@app.get("/vendor", response_class=HTMLResponse)
async def vendor_page(request: Request):
    return templates.TemplateResponse("vendor.html", {"request": request})


@app.get("/now-serving", response_class=HTMLResponse)
async def now_serving_page(request: Request):
    return templates.TemplateResponse("now_serving.html", {"request": request})


# ─────────────────────────────────────────────
# API ROUTES
# ─────────────────────────────────────────────
@app.get("/api/status")
def api_status():
    now = get_current_time()
    return {
        "ordering_open": is_ordering_open(),
        "current_time": now.strftime("%H:%M"),
        "cutoff": f"{ORDER_CUTOFF_HOUR:02d}:{ORDER_CUTOFF_MINUTE:02d}",
        "mock_time": MOCK_TIME_OVERRIDE,
    }


@app.get("/api/menu")
def get_menu():
    return {"items": MENU_ITEMS}


@app.post("/api/order")
def place_order(order: PlaceOrderRequest):
    if not is_ordering_open():
        raise HTTPException(
            status_code=403,
            detail="Orders are closed. Ordering window is until 12:00 PM only."
        )

    # Validate roll number: 8 digit number
    import re
    if not re.match(r"^\d{8}$", order.roll_number.strip()):
        raise HTTPException(status_code=422, detail="Roll number must be exactly 8 digits.")

    if not order.items:
        raise HTTPException(status_code=422, detail="Cart cannot be empty.")

    # Build order summary + calculate total
    line_items = []
    total = 0
    for oi in order.items:
        item = menu_item_by_id(oi.item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"Menu item {oi.item_id} not found.")
        if oi.quantity < 1:
            continue
        line_items.append(f"{item['name']} x{oi.quantity}")
        total += item["price"] * oi.quantity

    if order.cutlery:
        total += 10

    if not line_items:
        raise HTTPException(status_code=422, detail="No valid items found.")

    token = generate_token()
    items_str = ", ".join(line_items)
    now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO orders (token, roll_number, student_name, items, total_price, cutlery, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'paid', ?)
    """, (token, order.roll_number.strip(), order.student_name.strip(), items_str, total, int(order.cutlery), now_str))
    conn.commit()
    order_id = cur.lastrowid
    conn.close()

    return {
        "success": True,
        "token": token,
        "order_id": order_id,
        "items": items_str,
        "total": total,
        "cutlery": order.cutlery,
        "student_name": order.student_name,
        "message": f"Order placed! Your token is #{token}. Collect at the canteen after 12:45 PM."
    }


@app.get("/api/orders")
def get_all_orders(status: Optional[str] = None):
    conn = get_db()
    cur = conn.cursor()
    if status:
        cur.execute("SELECT * FROM orders WHERE status = ? ORDER BY id ASC", (status,))
    else:
        cur.execute("SELECT * FROM orders ORDER BY id ASC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return {"orders": rows}


@app.post("/api/orders/{order_id}/mark-ready")
def mark_order_ready(order_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Order not found.")
    cur.execute("UPDATE orders SET status = 'ready' WHERE id = ?", (order_id,))
    conn.commit()
    conn.close()
    return {"success": True, "order_id": order_id, "status": "ready"}


@app.get("/api/now-serving")
def now_serving():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT token FROM orders WHERE status = 'ready' ORDER BY id DESC LIMIT 20")
    tokens = [row["token"] for row in cur.fetchall()]
    conn.close()
    return {"tokens": tokens}


# ─────────────────────────────────────────────
# ADMIN ROUTES (for demo purposes)
# ─────────────────────────────────────────────
@app.post("/admin/set-time")
def set_mock_time(time_str: str):
    """Demo helper: set time to '11:30' or '12:30' to simulate ordering states."""
    global MOCK_TIME_OVERRIDE
    MOCK_TIME_OVERRIDE = time_str if time_str else None
    return {"mock_time": MOCK_TIME_OVERRIDE, "ordering_open": is_ordering_open()}


@app.delete("/admin/reset")
def reset_orders():
    """Wipe all orders for a fresh demo."""
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM orders")
    conn.commit()
    conn.close()
    return {"success": True, "message": "All orders cleared."}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
