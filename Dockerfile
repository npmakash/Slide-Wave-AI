# Production Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy root dependencies and install
COPY package*.json ./
RUN npm install --production=false

# Copy client dependencies and build React app
COPY client/package*.json ./client/
RUN cd client && npm install --legacy-peer-deps

COPY . .
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npm", "start"]
