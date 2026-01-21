ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci -w @yasshi2525/persist-schema \
    && npm run prepare -w @yasshi2525/persist-schema

FROM node:${NODE_VERSION}-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --parents \
     /app/schema/persist/package.json \
     /app/schema/persist/prisma.config.ts \
     /app/schema/persist/dist \
     /app/schema/persist/prisma \
     /
COPY --from=build --parents /app/package.json /app/node_modules /
RUN chown -R node:node .
USER node
CMD ["npm", "run", "init", "-w", "@yasshi2525/persist-schema"]
