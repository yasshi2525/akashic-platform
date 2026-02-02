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
RUN npm ci -w @yasshi2525/akashic-server

COPY . .
RUN npm run build:all -w @yasshi2525/akashic-server

FROM node:${NODE_VERSION}-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3032
COPY --from=build --parents /app/schema/persist/package.json /app/schema/persist/dist /
COPY --from=build --parents /app/schema/amflow/common/package.json /app/schema/amflow/common/dist /
COPY --from=build --parents /app/schema/amflow/client/package.json /app/schema/amflow/client/dist /
COPY --from=build --parents /app/playlogClient-like/package.json /app/playlogClient-like/dist /
COPY --from=build --parents /app/akashic-server/package.json /app/akashic-server/dist /
COPY --from=build --parents /app/package.json /app/node_modules /
COPY *.pem ./
RUN chown -R node:node .
EXPOSE ${PORT}
USER node
CMD ["npm", "run", "run", "-w", "@yasshi2525/akashic-server"]
