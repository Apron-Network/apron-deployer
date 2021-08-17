FROM node:14-alpine

WORKDIR /app
COPY package*.json /app
COPY yarn.lock /app
RUN yarn install --frozen-lockfile --production=true

COPY . .

# Copy config-compose.json to config.json and config2.json. config.json is used
# by deploy.js while config2.json is used by webserver.js and submit.js
COPY config-compose.json config.json
COPY config-compose.json config2.json

EXPOSE 4000
ENTRYPOINT ["/bin/sh"]
CMD ["/app/entrypoint.sh"]
