# Tangguh Fuel Supply Monitoring — Application Guide & System Documentation

## 1. Executive Summary & System Overview

**Tangguh Fuel Supply Monitoring** is a real-time marine bunkering, inventory reconciliation, and dual-storage fuel forecasting web application built for marine & industrial fuel supply operations in **Tangguh LNG (Bintuni Bay, Papua Barat, Indonesia)**.

The platform manages liquid fuel logistics across two primary storage facilities:
1. **Floating Storage Vessel (`SPOB TRANS BILGIT`)**: Main offshore bunkering vessel with a default nominal capacity of `5,000,000 L`, servicing offshore contractor vessels, tugboats, crew boats, and marine construction fleets.
2. **Onshore Storage (`SHORE TANK COMBO`)**: Onshore bulk storage facility tracked with cumulative carry-over running balance projections.

All operations are synchronized to **Eastern Indonesia Time (WIT / UTC+9)**.

---

## 2. System Architecture (`frontend/`, `backend/`, `api/`)

To ensure enterprise scalability and clean separation of concerns, the codebase is organized into three modular layers:

```text
TANGGUH FUEL SUPPLY MONITOR/
├── backend/                  # Core Domain Logic, Calculation Engine, Models & Persistence
│   ├── src/
│   │   ├── models/           # TypeScript interfaces & domain schemas (Client, Inventory, User, Storage)
│   │   ├── services/         # Business logic (CalculationEngine, ClientService, ForecastService, AuthService)
│   │   └── db/               # Persistent JSON file database adapter & clean initial state seeder
│   ├── package.json
│   └── tsconfig.json
│
├── api/                      # REST API Controllers & RBAC Middleware Layer
│   ├── src/
│   │   ├── controllers/      # Route handlers for Auth, Clients, Inventory, Forecast, Storage
│   │   ├── middlewares/      # Role-Based Access Control (RBAC) enforcement & error handling
│   │   └── index.ts          # Unified API router exports
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Next.js App Router Client Application (UI, Charts, Exports)
│   ├── src/
│   │   ├── app/              # Next.js App Router pages & /api/* route bindings
│   │   ├── components/       # Modular UI components (Dashboard, Forecast, Dispatch, Sounding, Topup, Clients)
│   │   ├── store/            # Centralized Zustand state management with API + LocalStorage sync
│   │   ├── hooks/            # Custom hooks (Live WIT Clock, RBAC Permissions)
│   │   └── lib/              # Client utilities (Excel SheetJS & PDF export generators)
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── APPLICATION_GUIDE.md      # Complete system guide & functional documentation
└── package.json              # Root workspace scripts (npm run dev, npm run build, npm start)
```

---

## 3. Centralized Dynamic Client Management System (Admin CRUD)

### 3.1 Clean Initial State
- The application starts with a **clean empty array (`[]`)** for client master data—no hardcoded contractor names exist by default.
- When no clients exist, all modules (Sidebar, Dashboard Contractor Share, Floating Storage Forecast Matrix, and Distribution Entry Modals) display a clean empty-state prompt:
  > *"No clients available. Click 'Add Client' to create one."*

### 3.2 Admin Full CRUD Operations
Administrators can open the **Manage Clients** modal from the Top Header, Sidebar, Forecast View, Distribution Modal, or Settings View to:
- **Add Client**: Create a new client record with a unique name and customizable color badge.
- **Edit Client**: Rename any existing client in-place. Renaming a client automatically cascades across all historical bunker dispatches and scheduled forecast distributions so data integrity is preserved.
- **Delete Client**: Remove a client with a confirmation prompt.

### 3.3 Single Source of Truth Synchronization
Every change to the client master list immediately updates:
1. **Floating Storage Forecast Matrix (`SPOB TRANS BILGIT`)**: Renders each client vertically as a dedicated matrix row across the 10, 14, 30, 60, or 90-day timeline.
2. **Client Selection Dropdowns**: Dynamically populates the client selector in the **Daily Bunker Dispatch Modal**, **Forecast Distribution Modal**, and **Dispatch Log Filter**.
3. **Monitoring Dashboards & Reports**: Dynamically updates the **Sidebar Client Summary**, **Dashboard Contractor Distribution Doughnut Chart & Legend**, **Excel (.xlsx) Export**, and **PDF Executive Report**.

---

## 4. Core Operational Modules & Mathematical Formulas

### 4.1 Real-Time Monitoring Dashboard
- **4 Core KPI Cards**:
  1. **Initial Opening ROB**: Baseline starting fuel stock in Liters (`L`).
  2. **Total Cargo Top-Up Received**: Sum of all `Completed` inbound tanker replenishment voyages.
  3. **Bunker Dispatched**: Total cumulative fuel distributed to client vessels, plus today's dispatch total (WIT).
  4. **Book ROB vs Physical Sounding & Variance**:
     $$\text{Book ROB} = (\text{Initial Opening ROB} + \text{Completed Top-Ups}) - \text{Total Dispatched}$$
     $$\text{Variance} = \text{Latest Physical Sounding} - \text{Book ROB}$$
- **Interactive Tanker Hull Visualizer**: Animated cross-section of `SPOB TRANS BILGIT` showing liquid fill percentage, deadstock floor, usable fuel volume, and Forward/Aft draft marks (`m`).
- **Contractor Distribution & Share**: Doughnut chart and percentage table broken down dynamically by registered clients.
- **14-Day Bunker Dispatch Trendline**: Stacked bar/line chart displaying daily fuel distribution per client over the past 14 days.

### 4.2 Fuel Supply & Top-Up Forecast Planning (Dual Storage)
- **Multi-Horizon DLAH (Days Look-Ahead Horizon) Cards**: Real-time projected ending ROB at **10, 14, 30, 60, and 90 days** with automated status alerts:
  - **Safe**: Projected ROB $> 300,000\text{ L}$ (Emerald badge)
  - **Warning**: Projected ROB $\le 300,000\text{ L}$ (Rose pulsing alert badge)
- **Storage 1 — Floating Storage Matrix (`SPOB TRANS BILGIT`)**:
  - Horizontal scrollable date matrix where each registered client renders vertically as a row.
  - Clicking any date header or cell opens the interactive forecast action chooser to add/edit a **Client Distribution** or **Inbound Top-Up**.
  - Includes a **Top-Up Inbound** row and a **Projected ROB (L)** summary row with automatic `Safe` / `Warning` indicators.
- **Storage 2 — Onshore Tank Projection (`SHORE TANK COMBO`)**:
  - Tracks onshore cumulative carry-over running balance:
    $$\text{Running ROB}_{\text{Day } N} = \text{Running ROB}_{\text{Day } N-1} + \text{Shore Top-Up}_{\text{Day } N}$$

### 4.3 Daily Bunker Dispatch Log
- Records actual fuel transfers to vessels with Date, Client/Contractor, Vessel Name, Dispatched Volume (`L`), Start Time, and End Time.
- **Automated Pumping Flow Rate**:
  $$\text{Flow Rate (L/Hr)} = \frac{\text{Volume (L)}}{\text{Duration (Minutes)} / 60}$$
- Supports bulk Excel (`.xlsx`) import, search by vessel name, and filter by dynamic client.

### 4.4 Closing ROB & Physical Sounding
- Tracks physical sounding measurements (Date, Time, Physical Sounding in Liters, Forward Draft `m`, Aft Draft `m`, Remarks, and optional Sounding Sheet attachment).
- Automatically computes and badges the variance (`Gain` / `Loss`) against the live Book ROB.

### 4.5 Cargo Top-Up Inbound Plan
- Manages supply tanker voyages with Performing Vessel, Planned Volume (`L`), Loading Port, Discharge Port, ETD/ETA, ATD/ATA, and Status (`Planned`, `Loading`, `In Transit`, `Discharging`, `Completed`).
- Only voyages marked `Completed` are added to the live Book ROB calculation.

---

## 5. Role-Based Access Control (RBAC) Credentials

| No | Role / Entity | Username | Password | Access Level (RBAC) |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Admin** | `admin` | `admin123` | **Full Access**: All menus, add/edit/delete records, manage clients (CRUD), configure floating storage & reset database |
| **2** | **Management** | `management` | `manage2026` | **View-Only**: Can view all dashboard & monitoring menus without add/edit/delete permissions |
| **3** | **Staff** | `staff` | `staff2026` | **Operational**: Can input & edit daily operational records; delete buttons and system reset are disabled |
| **4** | **JGC** | `jgc` | `jgc2026` | **View-Only**: Monitoring Dashboard, Sounding, Forecast, & Cargo Plan |
| **5** | **SAIPEM** | `saipem` | `sai2026` | **View-Only**: Monitoring Dashboard, Sounding, Forecast, & Cargo Plan |
| **6** | **PETROSEA** | `ptp` | `ptp2026` | **View-Only**: Monitoring Dashboard, Sounding, Forecast, & Cargo Plan |
| **7** | **BP Tangguh** | `bptangguh` | `bp2026` | **View-Only**: Monitoring Dashboard, Sounding, Forecast, & Cargo Plan |

---

## 6. How to Run the Application

```bash
# 1. Install dependencies
npm install

# 2. Start the Next.js development server (runs on http://localhost:3000)
npm run dev

# 3. Build for production
npm run build
npm start
```

