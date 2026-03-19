FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY . .

RUN npm ci --include=dev
RUN npm run build -w @receituario/web

EXPOSE 3000

CMD ["npm", "run", "start", "-w", "@receituario/web"]
