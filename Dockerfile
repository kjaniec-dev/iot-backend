FROM node:18-bullseye-slim

WORKDIR /app

COPY /build/ package*.json /.env ./

RUN npm install --omit=dev

EXPOSE 8000

CMD [ "node", "index.js" ]
