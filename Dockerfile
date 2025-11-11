# Use the official Node.js runtime as the base image (Debian-based for Playwright compatibility)
FROM node:20-slim AS base

# Install dependencies only when needed
FROM base AS deps
# Install Playwright browser dependencies using apt-get
# These are required for Chromium, Firefox, and WebKit to run properly
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libgtk-4-1 \
    libnspr4 \
    libnss3 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    # WebKit dependencies will be installed via 'playwright install-deps webkit'
    # This ensures we get the exact packages needed for the installed WebKit version
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile

# Install Playwright browsers during Docker build (so they're available from the start)
# Install chromium, firefox, and webkit (all work on Debian)
RUN echo "Installing Playwright browsers..." && \
    pnpm exec playwright install chromium firefox webkit && \
    echo "✅ Playwright browsers installed" && \
    echo "Installing WebKit system dependencies..." && \
    pnpm exec playwright install-deps webkit && \
    echo "✅ WebKit dependencies installed"

# Verify browsers are installed and accessible
RUN CHROMIUM_DIR=$(ls -d /root/.cache/ms-playwright/chromium-* 2>/dev/null | head -1) && \
    if [ -n "$CHROMIUM_DIR" ] && [ -f "$CHROMIUM_DIR/chrome-linux/chrome" ]; then \
        echo "✅ Chromium verified: $CHROMIUM_DIR"; \
    else \
        echo "❌ Chromium installation failed"; \
        exit 1; \
    fi
RUN FIREFOX_DIR=$(ls -d /root/.cache/ms-playwright/firefox-* 2>/dev/null | head -1) && \
    if [ -n "$FIREFOX_DIR" ]; then \
        echo "✅ Firefox verified: $FIREFOX_DIR"; \
    else \
        echo "❌ Firefox installation failed"; \
        exit 1; \
    fi
RUN WEBKIT_DIR=$(ls -d /root/.cache/ms-playwright/webkit-* 2>/dev/null | head -1) && \
    if [ -n "$WEBKIT_DIR" ]; then \
        echo "✅ WebKit verified: $WEBKIT_DIR"; \
    else \
        echo "❌ WebKit installation failed"; \
        exit 1; \
    fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

# Type check before build
RUN pnpm typecheck

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
# Uncomment the following line in case you want to disable telemetry during runtime.
ENV NEXT_TELEMETRY_DISABLED 1

RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
# set hostname to localhost
ENV HOSTNAME "0.0.0.0"

# server.js is created by next build from the standalone output
# https://nextjs.org/docs/pages/api-reference/next-config-js/output
CMD ["node", "server.js"] 