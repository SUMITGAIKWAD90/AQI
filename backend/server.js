const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let latestData = {};

io.on("connection", (socket) => {
  console.log("React connected");

  // send latest data immediately
  socket.emit("sensorData", latestData);
});

app.post("/api/sensor", (req, res) => {
  latestData = req.body;
  io.emit("sensorData", latestData); // 🔥 real-time push
  res.send("OK");
});

app.post("/api/sensor", (req, res) => {
  console.log("📥 Data received from ESP8266:");
  console.log(req.body);

  latestData = req.body;
  io.emit("sensorData", latestData);

  res.send("OK");
});

server.listen(5000, () => {
  console.log("Backend running on port 5000");
});