# Complete Supabase + Vercel Setup Guide

## 🎯 Quick Start (Recommended: Supabase Cloud)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `microcement-studio`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

### Step 2: Get Your Supabase Credentials
1. Go to **Settings** > **API**
2. Copy these values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: `your-supabase-anon-key`

### Step 3: Configure Authentication
1. Go to **Authentication** > **Settings**
2. Set **Site URL**: `https://your-app.vercel.app`
3. Add **Redirect URLs**:
   - `https://your-app.vercel.app/auth/callback`
   - `https://your-app.vercel.app/login`
   - `http://localhost:3000/auth/callback` (for development)

### Step 4: Set Up Email (Optional)
1. Go to **Authentication** > **Settings** > **SMTP Settings**
2. Configure your email provider:
   - **Gmail**: Use App Password
   - **SendGrid**: Use API Key
   - **Mailgun**: Use API credentials

## 🚀 Deploy to Vercel

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Set Environment Variables
Go to Vercel Dashboard > Your Project > Settings > Environment Variables

**Required Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_NAME=Microcement Studio
```

**Optional Variables (for custom email):**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_ADMIN_EMAIL=your-email@gmail.com
SMTP_SENDER_NAME=Microcement Studio
```

### Step 4: Deploy
```bash
# Run the deployment script
./scripts/deploy-vercel.sh

# Or deploy manually
vercel --prod
```

## 🔧 Local Development Setup

### Step 1: Create Environment File
Create `.env.local` in your project root:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Microcement Studio
```

### Step 2: Start Local Supabase
```bash
docker compose up -d
```

### Step 3: Start Development Server
```bash
npm run dev
```

## 📧 Email Configuration Options

### Option 1: Supabase Built-in Email (Easiest)
- Uses Supabase's email service
- No additional configuration needed
- Limited customization

### Option 2: Gmail SMTP
1. Enable 2-factor authentication on Gmail
2. Generate App Password
3. Use these settings:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   ```

### Option 3: SendGrid
1. Create SendGrid account
2. Generate API Key
3. Use these settings:
   ```bash
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key
   ```

## 🔍 Testing Your Setup

### Local Testing
1. Start local Supabase: `docker compose up -d`
2. Start Next.js: `npm run dev`
3. Go to `http://localhost:3000`
4. Test sign-up/sign-in flow
5. Check emails in MailHog: `http://localhost:8025`

### Production Testing
1. Deploy to Vercel
2. Test authentication flow
3. Check email delivery
4. Monitor logs in Vercel dashboard

## 🚨 Troubleshooting

### Common Issues

**1. "Invalid redirect URL"**
- Check Supabase redirect URLs match your domain
- Ensure `NEXT_PUBLIC_SITE_URL` is correct

**2. "Missing environment variables"**
- Verify all variables are set in Vercel dashboard
- Check variable names match exactly

**3. "Email not received"**
- Check spam folder
- Verify SMTP settings
- Check Supabase email logs

**4. "Authentication failed"**
- Check Supabase project status
- Verify API keys are correct
- Check browser console for errors

### Debug Steps
1. Check browser console for errors
2. Verify environment variables: `console.log(process.env)`
3. Test Supabase connection
4. Check Vercel function logs
5. Monitor Supabase logs

## 📊 Monitoring

### Vercel Dashboard
- Function logs
- Build logs
- Performance metrics

### Supabase Dashboard
- Authentication logs
- Database logs
- Email delivery logs

## 🔐 Security Best Practices

1. **Never commit `.env` files**
2. **Use strong passwords**
3. **Enable 2FA on all accounts**
4. **Regularly rotate API keys**
5. **Monitor access logs**
6. **Use HTTPS in production**

## 📈 Scaling Considerations

### Supabase Cloud Limits
- **Free tier**: 50,000 monthly active users
- **Pro tier**: 100,000 monthly active users
- **Team tier**: 500,000 monthly active users

### Vercel Limits
- **Hobby**: 100GB bandwidth
- **Pro**: 1TB bandwidth
- **Enterprise**: Custom limits

## 🎉 Success Checklist

- [ ] Supabase project created
- [ ] Environment variables set
- [ ] Authentication configured
- [ ] Redirect URLs added
- [ ] Email provider configured
- [ ] Deployed to Vercel
- [ ] Authentication flow tested
- [ ] Email delivery verified
- [ ] Production monitoring set up
