# Building layer
FROM node:18-alpine as development

# Optional NPM automation (auth) token build argument
# ARG NPM_TOKEN

# Optionally authenticate NPM registry
# RUN npm set //registry.npmjs.org/:_authToken ${NPM_TOKEN}

WORKDIR /var/www/chatbot-back

# Copy configuration files
COPY .env ./
COPY tsconfig*.json ./
COPY package*.json ./

# Install dependencies from package-lock.json, see https://docs.npmjs.com/cli/v7/commands/npm-ci
RUN npm ci

# Copy application sources (.ts, .tsx, js)
COPY . .

# Build application (produces dist/ folder)
RUN npm run build
RUN npm run copy

# Runtime (production) layer
FROM node:18-alpine as production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Optional NPM automation (auth) token build argument
# ARG NPM_TOKEN

# Optionally authenticate NPM registry
# RUN npm set //registry.npmjs.org/:_authToken ${NPM_TOKEN}

WORKDIR /var/www/chatbot-back

# Copy dependencies files
COPY package*.json ./

# Install runtime dependecies (without dev/test dependecies)
RUN npm ci --omit=dev

COPY . .
# Copy production build
COPY --from=development /var/www/chatbot-back/dist/ ./dist/

# Expose application port
EXPOSE 3000

# Start application
CMD [ "node", "dist/main.js" ]
