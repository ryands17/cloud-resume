FROM node:20.17.0 AS builder

# set working directory add `/app/node_modules/.bin` to $PATH
WORKDIR /app
ENV PATH="/app/node_modules/.bin:$PATH"

# enable PNPM
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# install app dependencies
COPY package.json .
COPY pnpm-lock.yaml .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store corepack enable && pnpm install --frozen-lockfile

# copy source code
COPY . .

RUN pnpm run check && pnpm astro telemetry disable && pnpm build

FROM caddy:2.7.6-alpine

COPY Caddyfile /etc/caddy/Caddyfile

COPY --from=builder /app/dist /usr/share/caddy

EXPOSE 80
EXPOSE 443