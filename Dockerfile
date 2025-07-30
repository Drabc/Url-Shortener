ARG NODE_ENV=production

###############################################################################
#                           dependencies stage                                #
###############################################################################
FROM node:24.4.0-alpine3.22 AS deps

WORKDIR /deps

COPY package.json package-lock.json tsconfig.json ./

RUN if [ "$NODE_ENV" = "production" ]; then \
      npm ci --only=production; \
    else \
      npm i; \
    fi

###############################################################################
#                               dev stage                                     #
###############################################################################
FROM deps AS dev

# install bash, git, and the completion/prompt packages
RUN apk add --no-cache \
      bash \
      git \
      bash-completion \
      git-bash-completion \
      git-prompt \
      openssh-client

# switch root’s shell from ash → bash
RUN sed -i 's#/bin/ash#/bin/bash#' /etc/passwd

COPY .devcontainer/.bashrc /root/.bashrc

WORKDIR /var/www/app

###############################################################################
#                              Build stage                                    #
###############################################################################

FROM deps AS builder

WORKDIR /build

COPY src ./src

RUN npm run build

###############################################################################
#                               Prod stage                                    #
###############################################################################
FROM node:24.4.0-alpine3.22 AS prod

WORKDIR /var/www/app

# Copy built files
COPY --from=builder /build/package*.json ./
COPY --from=builder /build/node_modules ./node_modules
COPY --from=builder /build/dist ./dist

CMD ["npm", "start"]
