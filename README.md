# 🍽️ CampusBite: The Ultimate College Canteen Pre-ordering System

## 🎯 The Aim
To solve the daily canteen rush during the crucial 12:45 PM – 1:45 PM break. 
CampusBite allows students to pre-order food directly from their classrooms before the 12:00 PM cutoff, eliminating massive queues and empowering students to eat immediately during their break.

## 🚀 Execution & Innovation
Built entirely within a 3-hour hackathon timeframe, the system prioritizes speed and reliability. It features a robust Python/FastAPI backend driving a real-time React application. We architected a mobile-first, high-performance UI ("Neon Pulse" aesthetic) designed for fast, accessible ordering. 

We split the experience into a cohesive ecosystem:
1. **Student Ordering App:** A sleek React-based Web App.
2. **Canteen Staff Dashboard:** A server-rendered management portal to handle high-volume orders instantly.
3. **Public TV Board:** A live auto-refreshing "Now Serving" display for the collection counter.

## 🛠️ The Tech Stack
*   **Frontend:** Vite, React, TypeScript, Tailwind CSS (v4), Framer Motion (Animations).
*   **Backend:** FastAPI (Python), Jinja2 (Templates).
*   **Database:** SQLite (Lightweight, 0ms latency on local networks).

## ✨ Key Features
*   **Strict Time Management:** Hard API-level blocks reject orders after 12:00 PM.
*   **Health Mode Toggle:** Empowers students with nutritional transparency (Calories & Protein per 100g on every item).
*   **Smart Cart & Cutlery:** Persistent floating mobile cart and integrated +₹10 cutlery fees.
*   **Automated Token System:** Secure 3-digit verification tokens generated upon mock payment.
*   **Immersive Design:** Deep purple/blue midnight aesthetic with glassmorphism components.

## 🌍 The Impact
*   **Zero Wait Times:** Students reclaim 20-30 minutes of their break previously wasted standing in line.
*   **Operational Efficiency:** Canteen staff receive a clean, compiled list of pending orders *before* the lunch rush hits, standardizing food prep.
*   **Healthier Choices:** The built-in Health Mode encourages students to be mindful of their macros on campus.
