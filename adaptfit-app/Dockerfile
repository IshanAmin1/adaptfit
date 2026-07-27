FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./

COPY adaptfit-app/package.json adaptfit-app/package.json

RUN npm ci --workspace=adaptfit-app --include-workspace-root

COPY . .

WORKDIR /app/adaptfit-app

RUN npm run build

FROM nginx:1.30.4-alpine

COPY --from=build /app/adaptfit-app/dist /usr/share/nginx/html
COPY adaptfit-app/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
