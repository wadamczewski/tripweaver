FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3210

CMD ["npm", "run", "dev", "--", "--port", "3210", "--hostname", "0.0.0.0"]
