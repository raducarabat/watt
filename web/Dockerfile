FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# If you rely on runtime env vars, you can also set them here, e.g.:
# ENV NEXT_PUBLIC_API_BASE=https://api.example.com

COPY --from=builder /app/.next/standalone ./          
COPY --from=builder /app/.next/static ./.next/static  
COPY --from=builder /app/public ./public              

EXPOSE 3000
CMD ["node", "server.js"]
