# Budget Planner

Personal finance tracker with CSV import, transaction management, recurring templates, and charts.

![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

## Stack

- **Frontend** — React + Vite, Recharts
- **Backend** — Express.js
- **Database** — PostgreSQL (Docker)

## Running

```bash
./start.sh
```

Opens at [http://localhost:3001](http://localhost:3001). Requires Docker Desktop.

On first run, set up the database:

```bash
cd server && node src/db/migrate.js
```

## CSV Import

Supports German bank exports (Sparkasse, HVB, etc.):

- Semicolon or comma delimited
- German date formats: `DD.MM.YY`, `DD.MM.YYYY`
- German amounts: `-4,86`, `-1.234,56`
- `.CSV` and `.csv` file extensions
- Auto-detects column mapping 
- Unknown categories are created automatically
- Duplicate rows (same date + amount + description) are skipped

## Features

- **Transactions** — add, edit, delete individual transactions or delete all
- **Import** — 3-step CSV wizard with column mapping and preview
- **Recurring** — manage recurring transaction templates
- **Dashboard** — income/expense charts with 1M / 3M / 6M / 1Y / All time filters
