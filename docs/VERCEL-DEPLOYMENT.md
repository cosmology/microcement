# Vercel Deployment Guide for Supabase Authentication

## Overview
This guide explains how to deploy your Supabase authentication system to Vercel with proper email functionality.

## Current Setup
- **Local Development**: Uses MailHog for email testing
- **Production**: Needs real SMTP service for email sending

## Vercel Deployment Options

### Option 1: Use Supabase Cloud (Recommended)
The easiest way is to use Supabase's hosted service:

1. **Create Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Get your project URL and API keys

2. **Update Environment Variables**:
   ```bash
   # In Vercel dashboard, add these environment variables:
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Configure Email in Supabase Dashboard**:
   - Go to Authentication > Settings
   - Configure SMTP settings (Gmail, SendGrid, etc.)
   - Set up email templates

### Option 2: Self-Hosted Supabase with Real SMTP

#### Step 1: Choose SMTP Provider
Popular options:
- **Gmail SMTP**: Free, easy setup
- **SendGrid**: Reliable, good free tier
- **Mailgun**: Developer-friendly
- **Amazon SES**: Cost-effective for high volume

#### Step 2: Configure Environment Variables
Add these to your Vercel project:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_ADMIN_EMAIL=your-email@gmail.com
SMTP_SENDER_NAME=Your App Name

# Supabase Configuration
DATABASE_URL=postgresql://user:pass@host:port/db
SITE_URL=https://your-app.vercel.app
JWT_SECRET=your-jwt-secret
JWT_EXPIRY=3600

# Email Settings
ENABLE_EMAIL_SIGNUP=true
ENABLE_EMAIL_AUTOCONFIRM=false  # Set to true for auto-confirmation
```

#### Step 3: Update Docker Compose for Production
Use the production configuration:

```bash
# For production deployment
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Option 3: Hybrid Approach (Recommended for Development)

#### Local Development:
- Use MailHog for email testing
- Full Docker setup with all services

#### Production:
- Use Supabase Cloud for authentication
- Keep your app on Vercel
- Configure email through Supabase dashboard

## Implementation Steps

### For Supabase Cloud (Easiest):

1. **Create Supabase Project**:
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login and create project
   supabase login
   supabase projects create your-project-name
   ```

2. **Update Your App**:
   ```typescript
   // lib/supabase.ts
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   
   export const supabase = createClient(supabaseUrl, supabaseAnonKey)
   ```

3. **Configure Email in Supabase Dashboard**:
   - Go to Authentication > Settings
   - Add SMTP configuration
   - Customize email templates

### For Self-Hosted with Real SMTP:

1. **Set up SMTP Provider**:
   ```bash
   # Example with Gmail
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password  # Use App Password, not regular password
   ```

2. **Deploy to Vercel**:
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Deploy
   vercel --prod
   ```

3. **Configure Environment Variables**:
   - Add all SMTP variables to Vercel dashboard
   - Set up database connection
   - Configure JWT secrets

## Email Configuration Examples

### Gmail SMTP:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_ADMIN_EMAIL=your-email@gmail.com
SMTP_SENDER_NAME=Your App
```

### SendGrid SMTP:
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
SMTP_ADMIN_EMAIL=noreply@yourdomain.com
SMTP_SENDER_NAME=Your App
```

## Testing Email in Production

1. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

2. **Test Signup**:
   - Go to your Vercel app URL
   - Try signing up with a real email
   - Check if confirmation email is received

3. **Monitor Logs**:
   - Check Vercel function logs
   - Monitor Supabase logs
   - Check SMTP provider logs

## Troubleshooting

### Common Issues:

1. **SMTP Authentication Failed**:
   - Check SMTP credentials
   - Ensure App Password is used (for Gmail)
   - Verify SMTP provider settings

2. **Email Not Received**:
   - Check spam folder
   - Verify SMTP configuration
   - Check SMTP provider limits

3. **Vercel Deployment Issues**:
   - Ensure all environment variables are set
   - Check build logs
   - Verify database connectivity

## Recommended Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Vercel App    │    │  Supabase Cloud  │    │   SMTP Provider │
│                 │    │                  │    │                 │
│ - Next.js App   │◄──►│ - Authentication │◄──►│ - Gmail/SendGrid │
│ - API Routes    │    │ - Database       │    │ - Mailgun       │
│ - Static Files  │    │ - Real-time      │    │ - Amazon SES    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

This approach gives you:
- ✅ Easy deployment to Vercel
- ✅ Managed authentication
- ✅ Reliable email delivery
- ✅ Scalable infrastructure
- ✅ Cost-effective solution
