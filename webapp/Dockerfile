ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY . .
RUN npm ci -w @yasshi2525/persist-schema \
    && npm run prepare -w @yasshi2525/persist-schema \
    && npm ci -w @yasshi2525/amflow-client-event-schema \
    && npm run prepare -w @yasshi2525/amflow-client-event-schema \
    && npm ci -w @yasshi2525/playlog-client-like \
    && npm run prepare -w @yasshi2525/playlog-client-like \
    && npm ci -w @yasshi2525/webapp \
    && npm run prepare -w @yasshi2525/webapp \
    && npm run build -w @yasshi2525/webapp

FROM node:${NODE_VERSION}-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/webapp/.next/standalone .
COPY --from=build /app/webapp/public webapp/public
COPY --from=build /app/webapp/.next/static webapp/.next/static
RUN chown -R node:node .
EXPOSE ${PORT}
USER node
CMD ["node", "webapp/server.js"]
