# Environment Variables Setup Guide

## Local Development (.env.local)

Create a `.env.local` file in your project root with:

```bash
# Supabase Configuration (Local Development)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUPABASE_ANON_KEY_PLACEHOLDER

# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Microcement Studio
```

## Production Environment Variables for Vercel

Add these to your Vercel project dashboard:

### Option 1: Supabase Cloud (Recommended)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=Microcement Studio
```

### Option 2: Self-Hosted Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=Microcement Studio

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_ADMIN_EMAIL=your-email@gmail.com
SMTP_SENDER_NAME=Microcement Studio

# Database Configuration
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRY=3600

# Email Settings
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false
```

## Supabase Configuration

### Authentication Settings
1. Go to Supabase Dashboard > Authentication > Settings
2. Set **Site URL** to your production domain
3. Add **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/login`
   - `http://localhost:3000/auth/callback` (for development)

### Email Templates
1. Go to Authentication > Email Templates
2. Customize confirmation and reset password emails
3. Use `{{ .SiteURL }}` for dynamic URLs

## Vercel Deployment Steps

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Set Environment Variables**:
   - Go to Vercel Dashboard > Your Project > Settings > Environment Variables
   - Add all production variables
   - Redeploy after adding variables

## Testing Authentication

1. **Local Development**:
   - Start Supabase: `docker compose up -d`
   - Start Next.js: `npm run dev`
   - Test at `http://localhost:3000`

2. **Production**:
   - Deploy to Vercel
   - Test authentication flow
   - Check email delivery

## Troubleshooting

### Common Issues:
1. **Redirect URL Mismatch**: Ensure Supabase redirect URLs match your domain
2. **Environment Variables**: Check Vercel dashboard for correct values
3. **Email Delivery**: Verify SMTP settings in Supabase dashboard
4. **CORS Issues**: Check Supabase CORS settings

### Debug Steps:
1. Check browser console for errors
2. Verify environment variables are loaded
3. Test Supabase connection
4. Check Vercel function logs
