import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingCart, X, Plus, Minus, Utensils, CheckCircle,
  Clock, ChevronLeft, Zap, Star
} from "lucide-react";
import { BeamsBackground } from "@/components/ui/beams-background";
import "./index.css";

// ── TYPES ────────────────────────────────────────────────
interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  emoji: string;
  available: boolean;
  kcal?: number;
  protein?: number;
}
interface CartItem { item: MenuItem; qty: number; }
interface Cart { [id: number]: CartItem; }
type Screen = "menu" | "checkout" | "payment" | "success";

interface OrderResult {
  token: string;
  items: string;
  cutlery: boolean;
  student_name: string;
  total: number;
}

const CATEGORIES = ["All", "Meal", "Snacks", "Drinks", "Extras", "Healthy"];

// ── HELPER ───────────────────────────────────────────────
const cartTotal = (cart: Cart) =>
  Object.values(cart).reduce((s, v) => s + v.item.price * v.qty, 0);
const cartCount = (cart: Cart) =>
  Object.values(cart).reduce((s, v) => s + v.qty, 0);

// ── UPI QR SVG (deterministic pattern) ───────────────────
function UpiQR() {
  return (
    <div className="mx-auto w-48 h-48 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
      <svg width="148" height="148" viewBox="0 0 148 148">
        <rect fill="#fff" width="148" height="148" />
        <rect fill="#000" x="4" y="4" width="44" height="44" rx="4" />
        <rect fill="#fff" x="10" y="10" width="32" height="32" rx="2" />
        <rect fill="#000" x="16" y="16" width="20" height="20" rx="1" />
        <rect fill="#000" x="100" y="4" width="44" height="44" rx="4" />
        <rect fill="#fff" x="106" y="10" width="32" height="32" rx="2" />
        <rect fill="#000" x="112" y="16" width="20" height="20" rx="1" />
        <rect fill="#000" x="4" y="100" width="44" height="44" rx="4" />
        <rect fill="#fff" x="10" y="106" width="32" height="32" rx="2" />
        <rect fill="#000" x="16" y="112" width="20" height="20" rx="1" />
        <rect fill="#000" x="56" y="4" width="8" height="8" />
        <rect fill="#000" x="68" y="4" width="8" height="8" />
        <rect fill="#000" x="80" y="4" width="8" height="8" />
        <rect fill="#000" x="56" y="16" width="8" height="8" />
        <rect fill="#000" x="80" y="16" width="16" height="8" />
        <rect fill="#000" x="56" y="28" width="16" height="8" />
        <rect fill="#000" x="4" y="56" width="8" height="8" />
        <rect fill="#000" x="4" y="68" width="8" height="8" />
        <rect fill="#000" x="4" y="80" width="16" height="8" />
        <rect fill="#000" x="56" y="56" width="20" height="20" />
        <rect fill="#000" x="80" y="56" width="8" height="8" />
        <rect fill="#000" x="92" y="56" width="8" height="8" />
        <rect fill="#000" x="104" y="56" width="40" height="8" />
        <rect fill="#000" x="56" y="80" width="8" height="20" />
        <rect fill="#000" x="68" y="88" width="8" height="8" />
        <rect fill="#000" x="80" y="80" width="20" height="8" />
        <rect fill="#000" x="80" y="92" width="8" height="8" />
        <rect fill="#000" x="92" y="92" width="24" height="8" />
        <rect fill="#000" x="116" y="80" width="8" height="8" />
        <rect fill="#000" x="128" y="80" width="16" height="8" />
        <rect fill="#000" x="56" y="104" width="8" height="40" />
        <rect fill="#000" x="68" y="104" width="8" height="8" />
        <rect fill="#000" x="80" y="104" width="16" height="8" />
        <rect fill="#000" x="100" y="104" width="8" height="8" />
        <rect fill="#000" x="112" y="104" width="32" height="8" />
        <rect fill="#000" x="68" y="116" width="24" height="8" />
        <rect fill="#000" x="96" y="116" width="8" height="8" />
        <rect fill="#000" x="108" y="116" width="8" height="8" />
        <rect fill="#000" x="80" y="128" width="8" height="8" />
        <rect fill="#000" x="92" y="128" width="8" height="8" />
        <rect fill="#000" x="104" y="128" width="8" height="8" />
        <rect fill="#000" x="116" y="128" width="8" height="8" />
        <rect fill="#000" x="128" y="116" width="16" height="8" />
        <rect fill="#000" x="136" y="128" width="8" height="8" />
      </svg>
    </div>
  );
}

// ── MAIN APP ─────────────────────────────────────────────
export default function App() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Cart>({});
  const [category, setCategory] = useState("All");
  const [screen, setScreen] = useState<Screen>("menu");
  const [cartOpen, setCartOpen] = useState(false);
  const [orderingOpen, setOrderingOpen] = useState(true);
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [rollErr, setRollErr] = useState(false);
  const [cutlery, setCutlery] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payErr, setPayErr] = useState("");
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [healthMode, setHealthMode] = useState(false);

  // Load menu + status
  useEffect(() => {
    fetch("/api/menu").then(r => r.json()).then(d => setMenu(d.items));
    fetch("/api/status").then(r => r.json()).then(d => setOrderingOpen(d.ordering_open));
    const t = setInterval(() =>
      fetch("/api/status").then(r => r.json()).then(d => setOrderingOpen(d.ordering_open))
    , 60000);
    return () => clearInterval(t);
  }, []);

  const filtered = category === "All" ? menu : menu.filter(i => i.category === category);

  // Cart ops
  const addItem = useCallback((item: MenuItem) => {
    setCart(c => ({ ...c, [item.id]: { item, qty: (c[item.id]?.qty || 0) + 1 } }));
  }, []);
  const changeQty = useCallback((id: number, delta: number) => {
    setCart(c => {
      const cur = c[id];
      if (!cur) return c;
      const newQty = cur.qty + delta;
      if (newQty <= 0) { const next = { ...c }; delete next[id]; return next; }
      return { ...c, [id]: { ...cur, qty: newQty } };
    });
  }, []);

  const go = (s: Screen) => { setScreen(s); window.scrollTo(0, 0); };

  const proceedCheckout = () => {
    if (!orderingOpen) return;
    setCartOpen(false);
    go("checkout");
  };

  const proceedPayment = () => {
    if (!name.trim()) { alert("Please enter your name."); return; }
    if (!/^\d{8}$/.test(roll.trim())) { setRollErr(true); return; }
    setRollErr(false);
    go("payment");
  };

  const confirmPayment = async () => {
    setPayLoading(true);
    setPayErr("");
    const items = Object.values(cart).map(({ item, qty }) => ({ item_id: item.id, quantity: qty }));
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roll_number: roll.trim(), student_name: name.trim(), items, cutlery }),
      });
      const data = await res.json();
      if (!res.ok) { setPayErr(data.detail || "Order failed."); setPayLoading(false); return; }
      setOrder(data);
      setCart({});
      go("success");
    } catch {
      setPayErr("Network error. Try again.");
    }
    setPayLoading(false);
  };

  const baseTotal = cartTotal(cart);
  const total = baseTotal + (cutlery ? 10 : 0);
  const count = cartCount(cart);

  // ── RENDER ──────────────────────────────────────────────
  return (
    <BeamsBackground intensity="strong" className="min-h-screen">
      {/* NAV */}
      <nav className="sticky top-0 z-50 glass border-b border-white/5 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => go("menu")} className="flex items-center gap-2 transition-transform active:scale-95 text-left">
            <span className="text-2xl">🍽️</span>
            <span className="font-bold text-lg tracking-tight leading-none" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
              Campus<span style={{ color: "var(--secondary)" }}>Bite</span>
            </span>
          </button>

          <div className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full inline-block pulse-dot ${orderingOpen ? "bg-green-400" : "bg-red-400"}`} />
            <span className={orderingOpen ? "text-green-400 font-medium" : "text-red-400 font-medium"}>
              {orderingOpen ? "Orders Open" : "Orders Closed"}
            </span>
          </div>

          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm transition-all active:scale-95"
            style={{ background: "var(--secondary)", color: "#4a2c00" }}
          >
            <ShoppingCart size={16} />
            Cart
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {count}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* CLOSED BANNER */}
      {!orderingOpen && (
        <div className="bg-red-950/50 border-b border-red-500/20 text-center py-3 px-4">
          <p className="text-red-300 font-semibold text-sm">⏰ Ordering closed after 12:00 PM. Collect during 12:45–1:45 PM break.</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ══ SCREEN: MENU ══════════════════════════════════ */}
        {screen === "menu" && (
          <motion.div
            key="menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-6xl mx-auto px-4 py-10"
          >
            {/* Hero */}
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4 glass border border-cyan-400/20 text-cyan-400">
                  <Zap size={12} />
                  Skip the queue · Zero waiting time
                </div>
                <h1
                  className="text-5xl md:text-7xl font-bold mb-4 tracking-tighter"
                  style={{ fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.03em" }}
                >
                  Order before{" "}
                  <span className="relative">
                    <span
                      className="relative z-10"
                      style={{
                        background: "linear-gradient(135deg, #c084fc, #3b82f6)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      12 PM
                    </span>
                  </span>
                </h1>
                <p className="text-lg text-white/50 max-w-md mx-auto">
                  Eat during your 12:45–1:45 break. No queue. No stress.
                </p>
              </motion.div>

              {/* Stats row */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center gap-6 mt-8"
              >
                {[
                  { icon: <Clock size={14} />, label: "Ready by 12:45" },
                  { icon: <Star size={14} />, label: "10+ menu items" },
                  { icon: <CheckCircle size={14} />, label: "Token collection" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-white/40 font-medium">
                    <span className="text-cyan-400">{s.icon}</span>
                    {s.label}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Health Mode Toggle & Categories */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <div className="flex gap-2 overflow-x-auto pb-2 w-full sm:w-auto scrollbar-hide">
                {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={
                    category === cat
                      ? { background: "var(--primary-glow)", color: "#003d4d", fontWeight: 700 }
                      : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }
                  }
                >
                  {cat}
                </button>
              ))}
              </div>
              <button
                onClick={() => setHealthMode(!healthMode)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                  healthMode 
                    ? "bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]" 
                    : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>💪</span> {healthMode ? "Health Mode ON" : "Health Mode"}
              </button>
            </div>

            {/* Menu grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((item, idx) => {
                const inCart = cart[item.id]?.qty || 0;
                return (
                  <motion.div
                    key={item.id}
                    className="glass-card rounded-2xl p-5 flex flex-col"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-4xl">{item.emoji}</span>
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{
                          background: "rgba(114,220,255,0.1)",
                          color: "var(--primary)",
                          border: "1px solid rgba(114,220,255,0.15)",
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-base mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                      {item.name}
                    </h3>
                    <p className="text-white/40 text-sm flex-1 mb-4 leading-relaxed">{item.description}</p>
                    
                    {healthMode && item.kcal && item.protein && (
                      <div className="flex gap-2 mb-4 mt-auto">
                         <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20">
                           {item.kcal} kcal
                         </span>
                         <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-md bg-blue-500/10 text-cyan-400 border border-blue-500/20">
                           {item.protein}g protein
                         </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg" style={{ color: "var(--secondary)" }}>
                        ₹{item.price}
                      </span>
                      {inCart > 0 ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => changeQty(item.id, -1)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="font-bold w-5 text-center">{inCart}</span>
                          <button
                            onClick={() => addItem(item)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                            style={{ background: "var(--secondary)", color: "#4a2c00" }}
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addItem(item)}
                          disabled={!orderingOpen}
                          className="px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
                          style={{ background: "var(--secondary)", color: "#4a2c00" }}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══ SCREEN: CHECKOUT ══════════════════════════════ */}
        {screen === "checkout" && (
          <motion.div
            key="checkout"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-lg mx-auto px-4 py-8"
          >
            <button onClick={() => go("menu")} className="flex items-center gap-1 text-white/40 hover:text-white text-sm mb-6 transition-colors">
              <ChevronLeft size={16} /> Back to Menu
            </button>
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Your Order 🧾</h2>

            {/* Items */}
            <div className="glass-card rounded-2xl p-4 mb-4">
              <h3 className="text-xs uppercase tracking-widest text-white/30 mb-3">Items</h3>
              <div className="space-y-2">
                {Object.values(cart).map(({ item, qty }) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-white/70">{item.emoji} {item.name} × {qty}</span>
                    <span className="font-semibold">₹{item.price * qty}</span>
                  </div>
                ))}
                {cutlery && (
                  <div className="flex justify-between text-sm text-cyan-400 mt-2">
                    <span className="flex items-center gap-1"><Utensils size={14}/> Cutlery Fee</span>
                    <span className="font-semibold">₹10</span>
                  </div>
                )}
              </div>
              <div className="border-t border-white/5 mt-3 pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span style={{ color: "var(--secondary)" }}>₹{total}</span>
              </div>
            </div>

            {/* Cutlery toggle */}
            <div className="glass-card rounded-2xl p-4 mb-4">
              <label className="flex items-center gap-4 cursor-pointer">
                <div className="relative flex-shrink-0">
                  <input type="checkbox" className="sr-only" id="cutlery" checked={cutlery} onChange={e => setCutlery(e.target.checked)} />
                  <div
                    className="w-11 h-6 rounded-full transition-colors"
                    style={{ background: cutlery ? "var(--primary-glow)" : "rgba(255,255,255,0.1)" }}
                  />
                  <div
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow"
                    style={{ transform: cutlery ? "translateX(20px)" : "translateX(0)" }}
                  />
                </div>
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    Include Cutlery <Utensils size={14} className="text-cyan-400" />
                  </p>
                  <p className="text-white/40 text-sm">Plates, spoons & napkins</p>
                </div>
              </label>
            </div>

            {/* Student Details */}
            <div className="glass-card rounded-2xl p-4 mb-6">
              <h3 className="text-xs uppercase tracking-widest text-white/30 mb-3">Your Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-white/40 mb-1 block">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors text-white placeholder:text-white/20"
                    style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                </div>
                <div>
                  <label className="text-sm text-white/40 mb-1 block">
                    Roll Number <span style={{ color: "var(--secondary)" }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={roll}
                    onChange={e => { setRoll(e.target.value); setRollErr(false); }}
                    placeholder="8 digits e.g. 22CS0001"
                    maxLength={8}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors text-white placeholder:text-white/20 font-mono tracking-widest"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: `1px solid ${rollErr ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  />
                  {rollErr && <p className="text-red-400 text-xs mt-1">Must be exactly 8 digits.</p>}
                </div>
              </div>
            </div>

            <button
              onClick={proceedPayment}
              className="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 hover:opacity-90"
              style={{ background: "var(--secondary)", color: "#4a2c00" }}
            >
              Proceed to Payment →
            </button>
          </motion.div>
        )}

        {/* ══ SCREEN: PAYMENT ═══════════════════════════════ */}
        {screen === "payment" && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="max-w-md mx-auto px-4 py-8 text-center"
          >
            <button onClick={() => go("checkout")} className="flex items-center gap-1 text-white/40 hover:text-white text-sm mb-6 transition-colors">
              <ChevronLeft size={16} /> Back
            </button>

            <div className="glass-card rounded-3xl p-6">
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Pay Now 💳</h2>
              <p className="text-white/40 text-sm mb-6">Scan the UPI QR code to complete payment</p>

              <UpiQR />

              <div className="mt-5 space-y-3">
                <div className="flex justify-between items-center px-4 py-3 rounded-xl" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <span className="text-white/40 text-sm">UPI ID</span>
                  <span className="font-mono font-semibold text-cyan-400 text-sm">canteen@upi</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 rounded-xl" style={{ background: "rgba(0,0,0,0.3)" }}>
                  <span className="text-white/40 text-sm">Amount</span>
                  <span className="font-bold text-2xl" style={{ color: "var(--secondary)" }}>₹{total}</span>
                </div>
              </div>

              <p className="text-white/30 text-xs my-4">After completing payment, click the button below.</p>

              <button
                onClick={confirmPayment}
                disabled={payLoading}
                className="w-full py-4 rounded-2xl font-bold text-lg transition-all active:scale-95 disabled:opacity-60"
                style={{ background: "rgb(34,197,94)", color: "white" }}
              >
                {payLoading ? "⏳ Placing Order..." : "✅  I Have Paid"}
              </button>
              {payErr && <p className="text-red-400 text-sm mt-3">{payErr}</p>}
            </div>
          </motion.div>
        )}

        {/* ══ SCREEN: SUCCESS ═══════════════════════════════ */}
        {screen === "success" && order && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto px-4 py-14 text-center"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
                Order Placed, {order.student_name.split(" ")[0]}!
              </h2>
              <p className="text-white/40 mb-8">Collect at the canteen after 12:45 PM.</p>

              {/* Token */}
              <motion.div
                className="glass-card rounded-3xl p-8 mb-6 token-glow"
                animate={{ boxShadow: ["0 0 40px rgba(251,191,36,0.3)", "0 0 70px rgba(251,191,36,0.6)", "0 0 40px rgba(251,191,36,0.3)"] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Your Token Number</p>
                <div
                  className="text-8xl font-extrabold mb-2"
                  style={{ color: "#fbbf24", fontFamily: "Space Grotesk, sans-serif" }}
                >
                  #{order.token}
                </div>
                <p className="text-white/30 text-sm">Show this at the canteen counter</p>
              </motion.div>

              {/* Order summary */}
              <div className="glass-card rounded-2xl p-4 text-left mb-6">
                <p className="text-white/30 text-xs uppercase tracking-widest mb-2">Summary</p>
                <p className="text-sm text-white/70">{order.items}</p>
                {order.cutlery && (
                  <p className="text-cyan-400 text-xs mt-1 flex items-center gap-1">
                    <Utensils size={11} /> +₹10 Cutlery included
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href="http://localhost:8000/now-serving"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-2xl font-bold text-center transition-all active:scale-95 hover:opacity-90 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
                  style={{ background: "var(--secondary)", color: "#000" }}
                >
                  Track Order !
                </a>
                <button
                  onClick={() => { go("menu"); }}
                  className="w-full py-3 rounded-2xl font-semibold text-sm transition-colors"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  ← Order Something Else
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CART OVERLAY + SIDEBAR ───────────────────────── */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={() => setCartOpen(false)}
            />
            <motion.div
              key="sidebar"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col p-5"
              style={{ background: "#111010", borderLeft: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold" style={{ fontFamily: "Space Grotesk, sans-serif" }}>Your Cart 🛒</h3>
                <button onClick={() => setCartOpen(false)} className="text-white/40 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {count === 0 ? (
                  <div className="text-center text-white/30 py-16">
                    <p className="text-4xl mb-3">🍽️</p>
                    <p className="text-sm">Your cart is empty</p>
                  </div>
                ) : (
                  Object.values(cart).map(({ item, qty }) => (
                    <div key={item.id} className="glass-card rounded-xl px-3 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.emoji}</span>
                        <div>
                          <p className="text-sm font-medium leading-none">{item.name}</p>
                          <p className="text-xs text-white/30 mt-0.5">₹{item.price} × {qty}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => changeQty(item.id, -1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <Minus size={12} />
                        </button>
                        <span className="text-sm font-bold w-4 text-center">{qty}</span>
                        <button onClick={() => addItem(item)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "var(--secondary)", color: "#4a2c00" }}>
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-white/5 pt-4 mt-4">
                <div className="flex justify-between font-bold text-base mb-4">
                  <span>Total</span>
                  <span style={{ color: "var(--secondary)" }}>₹{total}</span>
                </div>
                <button
                  onClick={proceedCheckout}
                  disabled={count === 0 || !orderingOpen}
                  className="w-full py-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: "var(--secondary)", color: "#4a2c00" }}
                >
                  {!orderingOpen ? "Orders Closed" : "Checkout →"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FLOATING CART (MOBILE) */}
      <AnimatePresence>
        {count > 0 && screen === "menu" && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.5)] flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            style={{ background: "var(--secondary)", color: "#4a2c00" }}
          >
            <ShoppingCart size={24} />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
              {count}
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </BeamsBackground>
  );
}
