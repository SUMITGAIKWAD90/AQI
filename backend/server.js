// ==========================
// LOAD ENV FIRST (CRITICAL)
// ==========================
require("dotenv").config({ path: __dirname + "/.env" });

console.log("GROQ KEY LOADED:", process.env.GROQ_API_KEY ? "YES" : "NO");

const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

// =================  =========
// VALIDATE ENV VARIABLES
// ==========================
if (!process.env.GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY is missing in .env");
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY) {
  console.warn("⚠️ GEMINI_API_KEY not found (Gemini routes will fail)");
}

// ==========================
// INIT APP
// ==========================
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==========================
// INIT AI CLIENTS
// ==========================
const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ==========================
// SENSOR STATE
// ==========================
let latestReading = null;
const streamClients = new Set();

// ==========================
// HELPERS
// ==========================
const extractReading = (body) => {
  const payload = body && typeof body === "object" ? body : {};

  if (typeof payload.pm25 === "number" || typeof payload.aqi === "number") {
    return {
      pm25: payload.pm25 ?? null,
      aqi: payload.aqi ?? null,
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

// ==========================
// ROUTES
// ==========================

app.get("/", (_req, res) => {
  res.send("AI Server is running 🚀");
});

// SSE stream
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

// // Receive sensor data
// app.post("/api/sensor-data", (req, res) => {
//   const parsed = extractReading(req.body);

//   latestReading = {
//     ...parsed,
//     timestamp: new Date().toISOString(),
//     raw: req.body,
//   };

//   io.emit("sensorData", latestReading);
//   broadcastReading(latestReading);

//   res.send("Data received");
// });

// app.get("/api/sensor-data", (_req, res) => {
//   res.json(latestReading || { pm25: null, aqi: null, sensorData: null });
// });


// Receive sensor data
app.post("/api/sensor-data", (req, res) => {

  console.log("\n📥 Incoming Sensor Data RAW:", req.body);

  const parsed = extractReading(req.body);

  latestReading = {
    ...parsed,
    timestamp: new Date().toISOString(),
    raw: req.body,
  };

  console.log(`
🔵 LIVE SENSOR UPDATE
PM2.5 : ${latestReading.pm25}
AQI   : ${latestReading.aqi}
Time  : ${latestReading.timestamp}
`);

  io.emit("sensorData", latestReading);
  broadcastReading(latestReading);

  res.send("Data received");
});


// ==========================
// CHAT ROUTE (GROQ)
// ==========================
app.post("/chat", async (req, res) => {
  try {
    const { userMessage, aqiData } = req.body;

    const prompt = `
You are an environmental AI assistant.

AQI Data:
${JSON.stringify(aqiData, null, 2)}

User Question:
${userMessage}

Give short clear health advice.
`;

    const completion = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "You are an environmental AI assistant." },
        { role: "user", content: prompt }
      ]
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("CHAT ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});


// ==========================
// AQI DATA ANALYIZE (GROQ)
// ==========================

app.post("/area-analysis", async (req, res) => {
  try {
    const { locationName, lat, lon, aqi } = req.body;

//     const prompt = `
// You are an environmental policy and pollution analysis expert.

// Location: ${locationName}
// Coordinates: ${lat}, ${lon}
// Current AQI: ${aqi}

// Analyze and return STRICT JSON only in this format:

// {
//   "main_causes": ["", "", ""],
//   "contributing_sectors": ["", "", ""],
//   "government_solutions": ["", "", ""],
//   "citizen_actions": ["", "", ""],
//   "confidence": "Low | Medium | High"
// }

// Rules:
// - Do not explain.
// - Do not add extra text.
// - Return valid JSON only.
// - Keep each array item short.
// `;

const prompt = `
You are a regional environmental intelligence analyst.

Analyze pollution patterns SPECIFICALLY for the given location using geographic reasoning.

Location Details:
- Name: ${locationName}
- Coordinates: ${lat}, ${lon}
- Current AQI: ${aqi}

Instructions:
1. Consider regional geography (coastal, inland, industrial belt, traffic hub, agricultural area, etc.)
2. Consider typical economic activities of the region.
3. Consider possible seasonal effects (winter smog, summer dust, crop burning, sea breeze, etc.)
4. Avoid generic answers like "traffic and industry" unless strongly justified.
5. Make causes DIFFERENT for different cities.

Return STRICT JSON only in this format:

{
  "main_causes": ["", "", ""],
  "contributing_sectors": ["", "", ""],
  "government_solutions": ["", "", ""],
  "citizen_actions": ["", "", ""],
  "confidence": "Low | Medium | High"
}

Rules:
- No explanation.
- No markdown.
- No text outside JSON.
- Each item short and specific.
- Make analysis geographically unique.
`;
    const completion = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "Return only structured JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.4
    });

    const text = completion.choices[0].message.content;

    res.json({ analysis: JSON.parse(text) });

  } catch (error) {
    console.log("AI ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});







// ==========================
// START SERVER (ONLY ONCE)
// ==========================
server.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});