# Install dependencies only when needed
FROM node:18-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm i; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM node:18-alpine AS builder
ARG ENV=dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

COPY . .

ARG PUBLIC_RPC_URL="https://rpc.tzkt.io/mainnet/"
ARG PUBLIC_API_URL="https://api.tzkt.io"
ARG PUBLIC_NETWORK_TYPE="mainnet"

RUN echo -en "NEXT_PUBLIC_RPC_URL=$PUBLIC_RPC_URL/\nNEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL\NEXT_PUBLIC_NETWORK_TYPE=$PUBLIC_NETWORK_TYPE" > .env.local;

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/out/ /usr/share/nginx/html

EXPOSE 80

