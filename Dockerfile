FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

COPY package.json package-lock.json ./
COPY scripts ./scripts
RUN npm ci --omit=dev --ignore-scripts

COPY server ./server
COPY public ./public
RUN node scripts/copy-fonts.js \
 && test -f public/fonts/noto-sans-latin-400-normal.woff2 \
 && test -f public/fonts/noto-sans-telugu-telugu-400-normal.woff2 \
 && test -f public/fonts/noto-sans-devanagari-devanagari-400-normal.woff2 \
 && test -f public/fonts/noto-sans-tamil-tamil-400-normal.woff2 \
 && mkdir -p /app/data \
 && chown -R node:node /app/data

USER node
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz').then((r) => { if (!r.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]
