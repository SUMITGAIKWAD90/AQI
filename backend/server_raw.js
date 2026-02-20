    const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.post("/api/sensor-data", (req, res) => {
  console.log("Sensor Reading:", req.body);
  res.send("Data received");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});