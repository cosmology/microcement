# Fix JWT Signature Error

## Error Message
```
JWSError JWSInvalidSignature
```

## Cause
The service role key in your `.env` file doesn't match the JWT secret configured in your local Supabase instance.

## Solution

### Option 1: Get Keys from Supabase Studio (Recommended)

1. **Access Supabase Studio**:
   - Local: http://localhost:8000
   - Network: http://192.168.1.9:8000 (or your IP)

2. **Login**:
   - Username: `supabase` (default)
   - Password: Check `supabase/.env` for `DASHBOARD_PASSWORD`

3. **Get API Keys**:
   - Navigate to: **Settings** → **API**
   - Copy the following keys:
     - **anon public**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - **service_role secret**: `SERVICE_ROLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`

4. **Update your `.env` file**:
   ```bash
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-studio>
   SERVICE_ROLE_KEY=<service-role-key-from-studio>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-studio>
   ```

5. **Restart the app**:
   ```bash
   docker compose restart app-dev
   ```

### Option 2: Use Supabase CLI to Generate Keys

If you have Supabase CLI installed:

```bash
# Get JWT secret from Supabase
cd supabase
docker compose exec db psql -U postgres -c "SELECT current_setting('app.settings.jwt_secret', true);"

# Generate tokens (requires Supabase CLI)
supabase status
```

### Option 3: Check supabase/.env File

The keys might already be in `supabase/.env`:

```bash
# Check if supabase/.env exists
cat supabase/.env | grep -E "ANON_KEY|SERVICE_ROLE_KEY|JWT_SECRET"
```

Then copy those values to your root `.env` file.

## Verification

After updating, verify the keys work:

```bash
# Check environment variables in container
docker compose exec app-dev env | grep -E "SERVICE_ROLE_KEY|SUPABASE.*KEY"
```

## Common Issues

1. **Keys from demo/example**: The demo keys in `env.example` won't work - they're signed with a different JWT secret.

2. **Multiple Supabase instances**: Make sure you're using keys from the same Supabase instance that's running.

3. **Keys regenerated**: If you regenerated JWT_SECRET in Supabase, all old keys become invalid.

## Prevention

Always get keys from the running Supabase instance, never hardcode demo keys in production code.
