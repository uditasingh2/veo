# Use a modern Playwright image as base
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json (now allowed by .gitignore)
COPY package*.json ./

# Install dependencies
RUN npm install

# Install the browsers to match the package version
RUN npx playwright install --with-deps chromium

# Copy the rest of the application code
COPY . .

# Ensure downloads directory exists
RUN mkdir -p downloads

# Command to run the script
CMD ["npm", "start"]
