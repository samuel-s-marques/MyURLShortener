FROM node:alpine

# Create app directory
WORKDIR /usr/app

# Install app dependencies
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .


EXPOSE 8080
CMD ["node", "app.js"]