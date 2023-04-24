# Install dependencies only when needed
FROM node:16-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

FROM node:16-alpine AS builder
ARG ENV=dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN \
  if [ "$ENV" = "prod" ]; then \
    echo -en "NEXT_PUBLIC_RPC_URL=https://mainnet.tezos.marigold.dev/\nNEXT_PUBLIC_API_URL=https://api.tzkt.io\nNEXT_PUBLIC_NETWORK_TYPE=mainnet" > .env.local; \
  else \
    echo -en "NEXT_PUBLIC_RPC_URL=https://ghostnet.tezos.marigold.dev/\nNEXT_PUBLIC_API_URL=https://api.ghostnet.tzkt.io\nNEXT_PUBLIC_NETWORK_TYPE=ghostnet" > .env.local; \
  fi

RUN npm run build

EXPOSE 80

CMD ["npm", "start"]

