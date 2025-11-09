# Rate Limit Management in Cursor

## Understanding Rate Limits

Rate limits in Cursor occur when you've exceeded the allowed number of API requests to the AI provider (OpenAI, Anthropic, etc.) within a specific time window. This is a temporary restriction that protects both you and the service.

## Where to Track Rate Limits & Boundaries

### 1. **Cursor Settings**
- Open Cursor Settings: `Cmd + ,` (Mac) or `Ctrl + ,` (Windows/Linux)
- Navigate to: **Cursor Settings** → **Features** → **AI**
- Look for the "Model" dropdown to see your current model

### 2. **Model Selection Panel**
- Open the chat panel or inline chat
- Look at the top of the chat interface
- You'll see the current model displayed (e.g., "claude-sonnet-4.5", "gpt-4", "auto")
- Click on it to see available models

### 3. **Subscription Dashboard**
- Go to: https://cursor.sh/settings
- Sign in to your account
- Navigate to **Billing** or **Usage** section
- Here you can see:
  - Your current plan (Free, Pro, Business)
  - Request limits
  - Usage statistics
  - Remaining quota

### 4. **Plan Limits (as of 2024)**

#### Free Plan
- Limited requests per day
- Access to basic models
- Rate limits are stricter

#### Pro Plan (~$20/month)
- 500 premium requests/month (Claude Sonnet, GPT-4)
- Unlimited basic requests
- Higher rate limits
- Access to all models

#### Business Plan
- Higher limits
- Priority access
- Dedicated support

## Current Model Detection

To check which model you're currently using:

1. **In Chat Interface**
   - Look at the top bar of the chat panel
   - The model name is displayed (e.g., "claude-sonnet-4.5")

2. **In Settings**
   ```
   Cursor > Settings > Features > AI > Model
   ```

3. **Common Models Available**
   - `auto` - Automatically selects best model
   - `claude-sonnet-4.5` - Anthropic's latest (most powerful)
   - `claude-sonnet-3.5` - Anthropic's previous version
   - `gpt-4` - OpenAI's GPT-4
   - `gpt-4o` - OpenAI's optimized GPT-4
   - `gpt-3.5-turbo` - Faster, cheaper option

## How to Switch Models

### Method 1: From Chat Interface
1. Open Cursor Chat (`Cmd + L` or `Ctrl + L`)
2. Click on the **model name** at the top of the chat
3. Select from the dropdown:
   - `auto` (recommended to avoid rate limits)
   - `claude-sonnet-3.5`
   - `gpt-4o`
   - `gpt-3.5-turbo`
   - Other available models

### Method 2: From Settings
1. Open Settings: `Cmd + ,` (Mac) or `Ctrl + ,` (Windows/Linux)
2. Go to: **Cursor Settings** → **Features** → **AI**
3. Change the **Model** dropdown
4. Changes apply immediately

### Method 3: Keyboard Shortcut
1. Press `Cmd + Shift + P` (Mac) or `Ctrl + Shift + P` (Windows/Linux)
2. Type: "Cursor: Change AI Model"
3. Select from the list

## Rate Limit Bypass Strategies

### 1. **Switch to 'auto' Model** ⭐ RECOMMENDED
```
Model: auto
```
- Automatically routes to available models
- Bypasses rate limits by using alternative providers
- Maintains quality while avoiding blocks

### 2. **Switch to Alternative Models**
If Claude Sonnet is rate-limited:
- Try: `gpt-4o` (OpenAI's optimized model)
- Try: `gpt-3.5-turbo` (faster, higher limits)
- Try: `claude-sonnet-3.5` (older but still powerful)

### 3. **Wait Period**
- Most rate limits reset after:
  - **Per-minute limits**: 60 seconds
  - **Per-hour limits**: 1 hour
  - **Daily limits**: 24 hours

### 4. **Reduce Request Frequency**
- Batch your questions instead of multiple small requests
- Use more specific prompts to get answers in fewer turns
- Avoid regenerating responses unnecessarily

### 5. **Use Different Features**
If Chat is rate-limited:
- Try **Cmd + K** (inline edit) - uses different quota
- Try **Copilot++** (autocomplete) - separate limits
- Use terminal commands directly when possible

### 6. **Upgrade Your Plan**
- **Free Plan** → **Pro Plan** ($20/month)
  - 500 premium requests/month
  - Significantly higher rate limits
  - Access to all models
- Visit: https://cursor.sh/settings to upgrade

### 7. **Use Your Own API Key** 🔑
If you have your own OpenAI or Anthropic API key:

1. Go to: **Cursor Settings** → **Features** → **AI**
2. Enable: "Use Own API Key"
3. Enter your API key from:
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/

**Benefits:**
- Bypass Cursor's rate limits entirely
- Use your own quota
- Pay-as-you-go pricing

**Setup:**
```
1. Get API key from provider
2. Cursor Settings → Features → AI → API Keys
3. Enter: 
   - OpenAI API Key: sk-...
   - Anthropic API Key: sk-ant-...
4. Select which key to use for which model
```

### 8. **Clear Cache and Restart**
Sometimes helps with temporary issues:
```bash
# Close Cursor completely
# On Mac:
rm -rf ~/Library/Application\ Support/Cursor/Cache
# On Linux:
rm -rf ~/.config/Cursor/Cache
# On Windows:
# Delete: %APPDATA%\Cursor\Cache

# Restart Cursor
```

### 9. **Time-Based Strategy**
- Use Cursor during off-peak hours (late night/early morning in US timezones)
- Rate limits are often less strict during low-usage periods

### 10. **Multi-Account Strategy** ⚠️ (Use Responsibly)
- If working on multiple projects, consider separate Cursor accounts
- Each account has independent rate limits
- **Note**: Check Cursor's Terms of Service before doing this

## Quick Recovery Checklist

When you hit a rate limit:

- [ ] Switch model to `auto`
- [ ] Wait 60 seconds for per-minute limits
- [ ] Try `gpt-4o` or `gpt-3.5-turbo`
- [ ] Check your usage at https://cursor.sh/settings
- [ ] Consider upgrading to Pro plan
- [ ] Use your own API key if available
- [ ] Batch your requests to reduce frequency
- [ ] Use keyboard shortcuts for different features (Cmd+K vs Cmd+L)

## Monitoring Usage

### Check Your Current Usage:
1. Visit: https://cursor.sh/settings
2. Navigate to **Usage** or **Billing**
3. View:
   - Requests used this month
   - Remaining quota
   - Reset date

### Track Locally:
Keep a mental note or log of:
- How many large requests you've made
- Time of last request
- Which model you're using

## Best Practices to Avoid Rate Limits

1. **Use 'auto' model by default** - Let Cursor handle routing
2. **Be specific in prompts** - Get answers in fewer turns
3. **Batch related questions** - One comprehensive prompt vs multiple small ones
4. **Use search/grep first** - Don't ask AI for simple file lookups
5. **Cache context** - Include relevant code in first prompt
6. **Upgrade if you're a power user** - Pro plan is worth it
7. **Use own API keys** - Best solution for heavy usage

## Emergency Workarounds

If you absolutely need AI assistance NOW and are rate-limited:

1. **Use ChatGPT/Claude directly**
   - Visit: https://chat.openai.com or https://claude.ai
   - Copy/paste your code and questions
   - Free alternative while you wait

2. **Use GitHub Copilot** (if you have it)
   - Different service, different limits
   - Can help with code completion

3. **Use Local AI Models**
   - Ollama with CodeLlama
   - Runs locally, no rate limits
   - Installation: https://ollama.ai

4. **Community Forums**
   - Stack Overflow
   - GitHub Discussions
   - Reddit r/programming

## Contact Support

If you believe you're hitting rate limits unfairly:
- Email: support@cursor.sh
- Discord: https://discord.gg/cursor
- Forum: https://forum.cursor.sh

Include:
- Your account email
- Screenshot of error
- Timestamp of issue
- Current plan type

---

## TL;DR - Quick Fix

**Fastest Solution:**
1. Click model name at top of chat
2. Select `auto`
3. Wait 60 seconds
4. Try again

**Best Long-term Solution:**
1. Get your own Anthropic API key: https://console.anthropic.com/
2. Add it to Cursor Settings
3. Never worry about Cursor's limits again

---

**Last Updated**: October 2025
**Cursor Version**: Latest


