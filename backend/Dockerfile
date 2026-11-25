FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY .sequelizerc ./
COPY src ./src
COPY sql ./sql

ENV NODE_ENV=production
EXPOSE 3000

# Ejecutar como usuario no root (principio de mínimo privilegio)
USER node

CMD ["node", "src/index.js"]
