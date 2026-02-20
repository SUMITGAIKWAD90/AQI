const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let latestReading = null;
const streamClients = new Set();

const extractReading = (body) => {
  const payload = body && typeof body === "object" ? body : {};

  // Supports payloads like:
  // { sensorData: "PM2.5: 5.92 ug/m3  | AQI: 20" }
  // or { pm25: 5.92, aqi: 20 }
  if (typeof payload.pm25 === "number" || typeof payload.aqi === "number") {
    return {
      pm25: typeof payload.pm25 === "number" ? payload.pm25 : null,
      aqi: typeof payload.aqi === "number" ? payload.aqi : null,
      sensorData: payload.sensorData ?? null,
    };
  }

  if (typeof payload.pm25 === "string" || typeof payload.aqi === "string") {
    const pm = Number(payload.pm25);
    const aqi = Number(payload.aqi);
    return {
      pm25: Number.isFinite(pm) ? pm : null,
      aqi: Number.isFinite(aqi) ? aqi : null,
      sensorData: payload.sensorData ?? null,
    };
  }

  if (typeof payload.sensorData === "string") {
    const pmMatch = payload.sensorData.match(/PM2\.5:\s*([-+]?\d*\.?\d+)/i);
    const aqiMatch = payload.sensorData.match(/AQI:\s*(\d+)/i);

    return {
      pm25: pmMatch ? Number(pmMatch[1]) : null,
      aqi: aqiMatch ? Number(aqiMatch[1]) : null,
      sensorData: payload.sensorData,
    };
  }

  return { pm25: null, aqi: null, sensorData: null };
};

const broadcastReading = (reading) => {
  const eventPayload = `data: ${JSON.stringify(reading)}\n\n`;
  streamClients.forEach((client) => {
    try {
      client.write(eventPayload);
    } catch {
      streamClients.delete(client);
    }
  });
};

app.get("/api/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  res.write("retry: 3000\n\n");

  streamClients.add(res);

  if (latestReading) {
    res.write(`data: ${JSON.stringify(latestReading)}\n\n`);
  }

  req.on("close", () => {
    streamClients.delete(res);
  });
});

app.get("/api/sensor-data", (_req, res) => {
  res.json(latestReading || { pm25: null, aqi: null, sensorData: null });
});

app.post("/api/sensor-data", (req, res) => {
  console.log("Sensor Reading:", req.body);

  const parsed = extractReading(req.body);
  latestReading = {
    ...parsed,
    timestamp: new Date().toISOString(),
    raw: req.body,
  };

  broadcastReading(latestReading);
  res.send("Data received");
});

// Optional compatibility for older sender code.
app.post("/api/sensor", (req, res) => {
  console.log("Sensor Reading:", req.body);

  const parsed = extractReading(req.body);
  latestReading = {
    ...parsed,
    timestamp: new Date().toISOString(),
    raw: req.body,
  };

  broadcastReading(latestReading);
  res.send("Data received");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});