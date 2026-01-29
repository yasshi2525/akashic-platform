ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci -w @yasshi2525/akashic-storage \
  && npm run build:all -w @yasshi2525/akashic-storage

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
