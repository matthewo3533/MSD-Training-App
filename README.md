# Trainee Tool - Employee Training Tracker

A comprehensive web application for tracking employee training progress with role-based access control, skill assessments, and detailed analytics.

## Features

- **Authentication & Authorization**: Role-based access control (Admin, Manager, Trainer, Trainee)
- **Intake Management**: Create and manage training intakes with trainee assignments
- **Skill Groups & Skills**: Organize skills into groups, import/export via CSV
- **Training Sessions**: Record per-skill ratings (0-10) with comments and adjustable dates
- **Daily Summaries**: Rich-text summaries with TinyMCE editor, exportable to PDF
- **Progress Tracking**: Individual skill progress charts with sparklines
- **Exporting**: Excel exports (per-trainee and intake-wide) with color-coding and charts
- **Audit Logging**: Track all changes with full audit trail

## Tech Stack

### Backend
- Node.js + Express + TypeScript
- Prisma + SQLite
- JWT authentication
- Excel/PDF export libraries

### Frontend
- React + TypeScript
- TailwindCSS
- Recharts for charts
- TinyMCE for rich text editing
- React Router for navigation

## Prerequisites

- Node.js 18+ and npm
- Git

## Installation

1. Clone the repository:
```bash
cd "Trainee tool"
```

2. Install dependencies:
```bash
npm run install:all
```

3. Set up the database:
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

4. Create environment file:
```bash
cd backend
cp .env.example .env
# Edit .env and set your JWT_SECRET
```

5. Start the development servers:
```bash
cd ..
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Default Credentials

After seeding, use these credentials to login:

- **Admin**: `admin` / `admin123`
- **Manager**: `manager` / `manager123`
- **Trainer**: `trainer` / `trainer123`
- **Trainee**: `trainee1` / `trainee123`

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth & error handling
│   │   ├── utils/          # Database connection
│   │   └── prisma/         # Seed data
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/          # React pages
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # Auth context
│   │   └── services/       # API client
│   └── package.json
└── package.json            # Root package.json
```

## API Endpoints

- `/api/auth/*` - Authentication (login, change password)
- `/api/intakes/*` - Intake management
- `/api/skills/*` - Skill groups and skills
- `/api/sessions/*` - Training sessions
- `/api/users/*` - User management (Admin only)
- `/api/exports/*` - Excel/PDF exports
- `/api/audit/*` - Audit logs (Admin only)

## Role Permissions

### Admin
- Full CRUD on all data
- Manage roles and users
- View all intakes and trainees
- Access audit logs

### Manager
- Create and manage their intakes
- Assign trainees to intakes
- Manage skill groups for their intakes
- View/export trainee progress

### Trainer
- Create/modify training sessions
- Enter skill ratings for assigned trainees
- View trainee progress in assigned intakes

### Trainee
- View only their own progress
- Write daily summaries
- Export their own data

## Database Schema

The application uses Prisma with SQLite. Key models:
- `User` - Users with roles
- `Intake` - Training intakes
- `IntakeMember` - Trainee assignments
- `SkillGroup` - Groups of skills
- `Skill` - Individual skills
- `TrainingSession` - Training sessions
- `SkillRating` - Per-skill ratings (0-10)
- `DailySummary` - Rich-text summaries
- `AuditLog` - Audit trail

## Development

### Backend
```bash
cd backend
npm run dev        # Start dev server with hot reload
npm run build      # Build for production
npm run db:reset   # Reset and reseed database
```

### Frontend
```bash
cd frontend
npm run dev        # Start dev server
npm run build      # Build for production
```

## Production Deployment

1. Build both backend and frontend:
```bash
npm run build
```

2. Set production environment variables in `backend/.env`

3. Start backend:
```bash
cd backend
npm start
```

4. Serve frontend build files (static hosting recommended)

## License

MIT

