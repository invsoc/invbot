# run with:
# docker build -t sauravyash/invsoc-discord-bot .
# docker run -t -p 80:80 sauravyash/invsoc-discord-bot
FROM node:latest

# set a directory for the app
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# copy all the files to the container
COPY package*.json ./
COPY . .

# install dependencies
RUN npm install

# define the port number the container should expose
EXPOSE 80

# run the command
CMD ["node", "index.js"]