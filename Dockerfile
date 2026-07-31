FROM node:18-alpine

WORKDIR /app

# Install dependencies first
COPY package*.json ./
RUN npm install

# Copy frontend codebase
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite in host listening mode
CMD ["npm", "run", "dev", "--", "--host"]
