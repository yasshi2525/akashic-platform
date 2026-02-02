ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY schema/amflow/common/package.json schema/amflow/common/package.json
COPY schema/amflow/client/package.json schema/amflow/client/package.json
COPY schema/amflow/server/package.json schema/amflow/server/package.json
COPY schema/http/package.json schema/http/package.json
COPY schema/persist/package.json schema/persist/package.json
COPY playlogClient-like/package.json playlogClient-like/package.json
COPY agvw-like/package.json agvw-like/package.json
COPY akashic-server/package.json akashic-server/package.json
COPY akashic-storage/package.json akashic-storage/package.json
COPY webapp/package.json webapp/package.json
RUN npm ci -w @yasshi2525/webapp

COPY . .
RUN npm run setup -w @yasshi2525/webapp \
  && npm run build -w @yasshi2525/webapp

FROM node:${NODE_VERSION}-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/webapp/.next/standalone .
COPY --from=build /app/webapp/public webapp/public
COPY --from=build /app/webapp/.next/static webapp/.next/static
COPY *.pem ./
RUN chown -R node:node .
EXPOSE ${PORT}
USER node
CMD ["node", "webapp/server.js"]
