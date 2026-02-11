# Multimedia Management Backend (Express.js)

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Setup Environment Variables:
   - Copy `.env` and fill in `DATABASE_URL` (PostgreSQL).
3. Initialize Database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. Run Development Server:
   ```bash
   npm run dev
   ```

## API Endpoints
- **POST /api/auth/register**: Register new user.
- **POST /api/auth/login**: Login and get Access Token.
- **POST /api/users/grant-permission**: Admin grant permission to member.

## Privileges
- `TASK_VERIFIER`: Can approve tasks.
- `INVENTORY_MANAGER`: Can manage assets.
