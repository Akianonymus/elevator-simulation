FROM node:alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production
RUN npm run build
COPY . .

CMD ["node", "dist/index.js"]
