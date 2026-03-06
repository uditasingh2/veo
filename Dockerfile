# Use the official Playwright image which has all browser dependencies
FROM mcr.microsoft.com/playwright:v1.50.0-focal

# Create app directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Ensure downloads directory exists
RUN mkdir -p downloads

# Command to run the script
CMD ["node", "guest_video_gen.js"]
