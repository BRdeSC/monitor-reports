# Estágio 1: Instalação e Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./
RUN npm install

# Copia o restante do código e faz o build
COPY . .
RUN npm run build

# Estágio 2: Execução
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copia apenas o necessário do estágio de build
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "start"]