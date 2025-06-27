# Anxiety Disorder Expert System - Backend

Backend API untuk sistem pakar deteksi gangguan kecemasan menggunakan Hapi.js, Prisma, dan PostgreSQL.

## Tech Stack

- **Framework**: Hapi.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Validation**: Joi
- **Export**: ExcelJS

## Setup

1. Install dependencies:
\`\`\`bash
npm install
\`\`\`

2. Setup database:
\`\`\`bash
npm run db:generate
npm run db:push
npm run db:seed
\`\`\`

3. Start development server:
\`\`\`bash
npm run dev
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `GET /api/auth/verify` - Verify token

### Diagnosis (Public)
- `GET /api/diagnosis/gejala` - Get symptoms list
- `POST /api/diagnosis/start` - Start diagnosis
- `POST /api/diagnosis/submit` - Submit symptoms

### Dashboard (Admin)
- `GET /api/dashboard/stats` - Get dashboard statistics

### User Management (Admin)
- `GET /api/pengecekan-user` - Get all diagnoses
- `GET /api/pengecekan-user/{id}` - Get diagnosis detail
- `DELETE /api/pengecekan-user/{id}` - Delete diagnosis
- `GET /api/pengecekan-user/export/excel` - Export to Excel

### Expert Data (Admin)
- `GET /api/data-pakar/gejala` -
