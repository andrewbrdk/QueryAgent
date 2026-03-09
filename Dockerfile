FROM node:25-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json tsconfig.json app.ts index.html style.css ./
RUN npm ci
RUN npm run build

FROM golang:1.26 AS backend
RUN apt-get update && apt-get install -y pgformatter
RUN mkdir -p /app/context
RUN mkdir -p /app/logs
COPY main.go go.mod /app/
COPY --from=frontend /app/dist /app/dist
WORKDIR /app
RUN go get dagents
RUN go build
RUN rm -r main.go go.mod ./dist

EXPOSE 8080
ENTRYPOINT ["/app/dagents"]