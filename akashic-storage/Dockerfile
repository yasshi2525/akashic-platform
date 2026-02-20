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
COPY manager-server/package.json manager-server/package.json
RUN npm ci -w @yasshi2525/akashic-storage

COPY . .
RUN npm run build:all -w @yasshi2525/akashic-storage

FROM node:${NODE_VERSION}-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PUBLIC_PORT=3031
ENV ADMIN_PORT=3033
COPY --from=build --parents /app/schema/amflow/common/package.json /app/schema/amflow/common/dist /
COPY --from=build --parents /app/schema/amflow/server/package.json /app/schema/amflow/server/dist /
COPY --from=build --parents /app/akashic-storage/package.json /app/akashic-storage/dist /
COPY --from=build --parents /app/package.json /app/node_modules /
RUN chown -R node:node .
EXPOSE ${PUBLIC_PORT}
EXPOSE ${ADMIN_PORT}
USER node
CMD ["npm", "run", "run", "-w", "@yasshi2525/akashic-storage"]
