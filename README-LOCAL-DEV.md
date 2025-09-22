# Microcement - 3D Scene Application

## 🔐 Security Note

**IMPORTANT**: The following files contain sensitive keys and are excluded from git:
- `scripts/create-users-properly.js` (contains service key)
- `scripts/test-login.js` (contains anon key)
- `scripts/create-test-users.js` (contains service key)
- `scripts/verify-users.js` (contains anon key)

Use the secure versions instead:
- `scripts/create-users-secure.js` (uses environment variables)
- `scripts/test-login-secure.js` (uses environment variables)

## 🚀 Quick Start Options

### Before You Start
Create your root env file from the example (used by Docker Compose):
```bash
cp env.example .env
# Then edit .env and set SUPABASE_ACCESS_TOKEN
```

### Option 1: Quick Reset (Fastest - If you get errors)
```bash
./scripts/quick-reset.sh
```

### Option 2: Complete Reset (If you get Liquibase errors)
```bash
./scripts/reset-liquibase.sh
```

### Option 3: Fix Migrations (If you get policy errors)
```bash
./scripts/fix-migrations.sh
```

### Option 4: Fixed Complete Setup (Recommended)
```bash
./scripts/start-dev-fixed.sh
```

### Option 5: Manual Step-by-Step
```bash
# Start Supabase
cd supabase && docker compose up -d

# Run migrations (fixed command)
docker compose run --rm liquibase liquibase update

# Start app
cd .. && docker compose --profile dev up
```

### Option 6: Original One-Liner (Has Issues)
```bash
cd supabase && docker compose up -d && docker compose exec liquibase liquibase update && cd .. && docker compose --profile dev up
```

## 📋 What This Does

1. **Starts Supabase** (database, API, auth) in background
2. **Runs database migrations** (creates `user_scene_configs` table)
3. **Starts the Next.js app** in development mode

## 🌐 Access Points

- **App**: http://localhost:3000
- **Supabase Dashboard**: http://localhost:8000
- **MailHog (Email Testing)**: http://localhost:8025

## 🛠️ Alternative Commands

### Start Supabase Only
```bash
cd supabase && docker compose up -d
```

### Start App Only
```bash
docker compose --profile dev up
```

### Reset Everything
```bash
./scripts/reset-everything.sh
```

### Stop All Services
```bash
docker compose down && cd supabase && docker compose down
```

## 📁 Project Structure

```
microcement/
├── supabase/           # Supabase local development
├── app/                # Next.js application
├── components/         # React components
├── lib/               # Utilities and services
└── scripts/           # Helper scripts
```

## 🔧 Development

The app includes:
- **3D Scene** with Three.js
- **User Authentication** with Supabase
- **Scene Configuration** management
- **Multi-language** support (EN/ES/SR)
- **Responsive Design** with Tailwind CSS

## 🐛 Troubleshooting

**Port conflicts**: Make sure ports 3000, 8000, and 8025 are available
**Docker issues**: Ensure Docker Desktop is running
**Migration errors**: Run `./scripts/reset-everything.sh` for clean start
