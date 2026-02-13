# Budget Planner

A full-stack personal finance tracker built with React, Node.js/Express, and PostgreSQL.

## Features

- **Dashboard** with summary cards (income, expenses, balance) and interactive charts
- **Transaction Management** - full CRUD with category filtering and date range picker
- **Recurring Transactions** - create templates that auto-generate transactions on schedule
- **CSV Import** - drag-and-drop upload with column mapping preview
- **Charts** - spending by category (pie), monthly income vs expenses (bar), balance trend (area)
- **Responsive** sidebar layout that adapts to mobile

## Tech Stack

- **Frontend**: React, React Router, Recharts, Axios, Vite
- **Backend**: Node.js, Express, pg (PostgreSQL driver), csv-parse, multer
- **Database**: PostgreSQL 16 (via Docker)

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) & Docker Compose

### 1. Start the database

```bash
cp .env.example .env
docker compose up -d
```

### 2. Set up the backend

```bash
cd server
npm install
npm run migrate   # Creates tables and seeds categories
npm run dev       # Starts API on http://localhost:5000
```

### 3. Set up the frontend

```bash
cd client
npm install
npm run dev       # Starts UI on http://localhost:5173
```

### 4. Open the app

Navigate to [http://localhost:5173](http://localhost:5173)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions` | List transactions (supports `category_id`, `type`, `start_date`, `end_date` query params) |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/transactions/summary` | Aggregated data for charts |
| GET | `/api/categories` | List all categories |
| GET | `/api/recurring` | List recurring templates |
| POST | `/api/recurring` | Create recurring template |
| PUT | `/api/recurring/:id` | Update recurring template |
| DELETE | `/api/recurring/:id` | Delete recurring template |
| POST | `/api/recurring/process` | Generate due recurring transactions |
| POST | `/api/import/csv/preview` | Preview CSV columns (multipart file upload) |
| POST | `/api/import/csv` | Import CSV with column mapping |

## Project Structure

```
budgetPlanner/
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── api/          # Axios API client
│   │   ├── pages/        # Dashboard, Transactions, Recurring, Import
│   │   └── App.jsx       # Router & layout
│   └── package.json
├── server/               # Node.js/Express backend
│   ├── src/
│   │   ├── routes/       # API route handlers
│   │   ├── db/           # Pool config & migration script
│   │   └── index.js      # Express app entry point
│   └── package.json
├── docker-compose.yml    # PostgreSQL container
├── .env.example          # Environment variable template
└── README.md
```

## Sample CSV Format

```csv
date,amount,description,category
2025-01-15,3500.00,Monthly salary,Salary
2025-01-16,-45.00,Grocery store,Food & Dining
2025-01-17,-120.00,Electric bill,Utilities
```

Negative amounts are treated as expenses, positive as income. Category names are matched against existing categories (case-insensitive).
