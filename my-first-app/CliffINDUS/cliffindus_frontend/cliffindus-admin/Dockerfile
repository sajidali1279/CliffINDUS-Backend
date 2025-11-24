# --------------------------------------------------------
# ✅ FRONTEND DOCKERFILE — Node 20 for Vite + React
# --------------------------------------------------------
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy everything else
COPY . .

# Expose Vite default dev port
EXPOSE 5173

# Run Vite dev server
CMD ["npm", "run", "dev", "--", "--host"]
