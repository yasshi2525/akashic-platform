ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci -w @yasshi2525/amflow-server-event-schema \
  && npm run prepare -w @yasshi2525/amflow-server-event-schema \
  && npm ci -w @yasshi2525/akashic-storage \
  && npm run prepare -w @yasshi2525/akashic-storage \
  && npm run build -w @yasshi2525/akashic-storage

FROM node:${NODE_VERSION}-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3031
COPY --from=build --parents /app/schema/amflow/common/package.json /app/schema/amflow/common/dist /
COPY --from=build --parents /app/schema/amflow/server/package.json /app/schema/amflow/server/dist /
COPY --from=build --parents /app/akashic-storage/package.json /app/akashic-storage/dist /
COPY --from=build --parents /app/package.json /app/node_modules /
RUN chown -R node:node .
EXPOSE ${PORT}
USER node
CMD ["npm", "run", "run", "-w", "@yasshi2525/akashic-storage"]
