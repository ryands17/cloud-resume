FROM oven/bun:debian AS builder

WORKDIR /app

# install app dependencies
COPY package.json .
COPY bun.lock .

RUN bun install --frozen-lockfile

# copy source code
COPY . .

RUN bun run check && bun astro telemetry disable && bun run build

FROM caddy:2.10.0-alpine

COPY Caddyfile /etc/caddy/Caddyfile

COPY --from=builder /app/dist /usr/share/caddy

EXPOSE 80