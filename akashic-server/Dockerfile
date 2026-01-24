ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci -w @yasshi2525/akashic-server \
  && npm run build:all -w @yasshi2525/akashic-server

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
RUN chown -R node:node .
EXPOSE ${PORT}
USER node
CMD ["npm", "run", "run", "-w", "@yasshi2525/akashic-server"]
