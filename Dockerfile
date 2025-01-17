FROM node:18-alpine as frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV VITE_API_URL=http://localhost:3001/api
RUN npm run build

FROM nginx:alpine
COPY --from=frontend-builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"] 