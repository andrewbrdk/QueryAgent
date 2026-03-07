FROM node:25-alpine AS frontend
WORKDIR /app
COPY tsconfig.json app.ts index.html style.css ./
RUN npm install typescript
RUN npx tsc
RUN cp index.html style.css dist/

FROM golang:1.26 AS backend
RUN apt-get update && apt-get install -y pgformatter
RUN mkdir -p /app/context
RUN mkdir -p /app/logs
COPY main.go go.mod /app/
COPY --from=frontend /app/dist /app/dist
WORKDIR /app
RUN go get queryagent
RUN go build
RUN rm -r main.go go.mod ./dist

EXPOSE 8080
ENTRYPOINT ["/app/queryagent"]