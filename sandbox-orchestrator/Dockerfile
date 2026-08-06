FROM node:22-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=dev

COPY tsconfig.json ./
COPY src/ ./src/

# We'll use ts-node for this microservice, or build it.
# Building is safer. We'll install devDependencies just for build.
RUN npm install typescript @types/express @types/dockerode @types/node @types/tar-stream --save-dev
RUN npx tsc

CMD ["node", "dist/index.js"]
