FROM node:24-bookworm-slim AS build
WORKDIR /game
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate && pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build && pnpm test && pnpm prune --prod

FROM node:24-bookworm-slim
WORKDIR /game
ENV APP_ENV=production HOST=0.0.0.0 PORT=3000 STORAGE=sqlite DATA_DIR=/game/data
COPY --from=build /game/node_modules ./node_modules
COPY --from=build /game/dist ./dist
COPY --from=build /game/package.json ./package.json
COPY public ./public
COPY scripts/backup-world.mjs ./scripts/backup-world.mjs
RUN mkdir /game/data && chown node:node /game/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
