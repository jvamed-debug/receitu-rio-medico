FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY . .

RUN npm ci --include=dev
RUN npm run prisma:generate -w @receituario/api
RUN npm run build -w @receituario/api

EXPOSE 3001

CMD ["sh", "-c", "npm run db:push -w @receituario/api && node apps/api/dist/apps/api/src/main.js"]
