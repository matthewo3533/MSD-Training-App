# Setup Instructions

## Quick Start

1. **Install all dependencies** (already done):
   ```bash
   npm run install:all
   ```

2. **Set up the database**:
   ```bash
   cd backend
   npm run prisma:generate
   npm run prisma:migrate
   npm run prisma:seed
   ```

3. **Create environment file**:
   Create a `.env` file in the `backend/` directory:
   ```
   PORT=3001
   JWT_SECRET=your-secret-key-change-this-in-production
   DATABASE_URL="file:./dev.db"
   NODE_ENV=development
   ```

4. **Start the development servers**:
   ```bash
   cd ..
   npm run dev
   ```

   This will start:
   - Backend on http://localhost:3001
   - Frontend on http://localhost:3000

5. **Login** with one of these accounts:
   - Admin: `admin` / `admin123`
   - Manager: `manager` / `manager123`
   - Trainer: `trainer` / `trainer123`
   - Trainee: `trainee1` / `trainee123`

## Troubleshooting

### `concurrently` not recognized
If you get this error, run:
```bash
npm install
```

### Database errors
If you get database errors, make sure you've run:
```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

### Port already in use
If ports 3000 or 3001 are already in use, you can change them:
- Backend: Edit `backend/.env` and change `PORT=3001` to a different port
- Frontend: Edit `frontend/vite.config.ts` and change the server port

