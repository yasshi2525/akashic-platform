ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY schema/amflow/common/package.json schema/amflow/common/package.json
COPY schema/amflow/client/package.json schema/amflow/client/package.json
COPY schema/amflow/server/package.json schema/amflow/server/package.json
COPY schema/runner-ipc/package.json schema/runner-ipc/package.json
COPY schema/http/package.json schema/http/package.json
COPY schema/persist/package.json schema/persist/package.json
COPY playlogClient-like/package.json playlogClient-like/package.json
COPY agvw-like/package.json agvw-like/package.json
COPY akashic-server/package.json akashic-server/package.json
COPY akashic-runner/package.json akashic-runner/package.json
COPY akashic-storage/package.json akashic-storage/package.json
COPY webapp/package.json webapp/package.json
COPY manager-server/package.json manager-server/package.json
RUN npm ci -w @yasshi2525/akashic-runner

COPY . .
RUN npm run build:all -w @yasshi2525/akashic-runner

FROM node:${NODE_VERSION}-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3034
COPY --from=build --parents /app/schema/amflow/common/package.json /app/schema/amflow/common/dist /
COPY --from=build --parents /app/schema/amflow/client/package.json /app/schema/amflow/client/dist /
COPY --from=build --parents /app/schema/runner-ipc/package.json /app/schema/runner-ipc/dist /
COPY --from=build --parents /app/playlogClient-like/package.json /app/playlogClient-like/dist /
COPY --from=build --parents /app/akashic-runner/package.json /app/akashic-runner/dist /
COPY --from=build --parents /app/package.json /app/node_modules /
RUN chown -R node:node .
EXPOSE ${PORT}
USER node
CMD ["npm", "run", "run", "-w", "@yasshi2525/akashic-runner"]
