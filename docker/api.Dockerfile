# ---------- deps ----------
FROM node:20-alpine AS deps

WORKDIR /app

COPY apps/api/package*.json ./

RUN npm install


# ---------- build ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY apps/api .

RUN npm run build


# ---------- runner ----------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY apps/api/package*.json ./

EXPOSE 3001

CMD ["node", "dist/main.js"]