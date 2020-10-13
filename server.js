const express = require("express");
const http = require("http");
const enforce = require("express-sslify");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);
const username = require("username-generator");
const path = require("path");
const { AwakeHeroku } = require("awake-heroku");
const _ = require("lodash");

AwakeHeroku.add({
  url: "https://smishy.herokuapp.com",
});

app.use(enforce.HTTPS({ trustProtoHeader: true }));

app.use(express.static("./client/build"));

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
});

let users = [];
let queue = [];

io.on("connection", (socket) => {
  if (!_.includes(users, socket.id)) {
    users.push(socket.id);
  }
  socket.emit("yourID", socket.id);
  io.sockets.emit("allUsers", users);

  socket.on("disconnect", () => {
    _.pull(users, socket.id)
  });

  socket.on("leaveQueue", () => {
    _.pull(queue, socket.id)
  });

  socket.on("findPartner", (data) => {
    console.log(users);
    console.log(queue);
    if (!queue.length) {
      queue.push(socket.id);
    } else {
      queue = [];
      socket.emit("chatInit");
    }
    console.log(users);
    console.log(queue);
  });

  socket.on("chatInit", (data) => {
    io.to(queue[0]).emit("chatOffer", {
      signal: data.signalData,
      from: data.from,
    });
  });

  socket.on("chatAccepted", (data) => {
    io.to(data.to).emit("chatAccepted", {
      signal: data.signal,
      from: socket.id,
    });
  });

  socket.on("close", (data) => {
    io.to(data.to).emit("close");
  });

  socket.on("rejected", (data) => {
    io.to(data.to).emit("rejected");
  });
});

const port = process.env.PORT || 8000;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
