require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});
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

app.get("/", (req, res) => {
  res.send("AI Server is running 🚀");
});


app.post("/api/sensor", (req, res) => {
  latestData = req.body;
  io.emit("sensorData", latestData); // 🔥 real-time push
  res.send("OK");
});

// app.post("/chat", async (req, res) => {
//   try {
//     const { userMessage, aqiData } = req.body;

//     const prompt = `
// You are an environmental AI assistant.

// AQI Data:
// ${JSON.stringify(aqiData, null, 2)}

// User Question:
// ${userMessage}

// Give short, clear health advice.
// `;

//     const response = await axios.post(
//       "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
//       {
//         contents: [
//           {
//             parts: [{ text: prompt }]
//           }
//         ]
//       },
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "X-goog-api-key": process.env.GEMINI_API_KEY
//         }
//       }
//     );

//     const text =
//       response.data.candidates[0].content.parts[0].text;

//     res.json({ reply: text });

//   } catch (error) {
//     console.log("FULL ERROR:", error.response?.data || error.message);
//     res.status(500).json({
//       error: error.response?.data || error.message
//     });
//   }
// });


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

// chatbot feature

// app.post("/chat", async (req, res) => {
//   try {
//     const { userMessage, aqiData } = req.body;

//     const prompt = `
// You are an environmental AI assistant.

// Current AQI Data:
// ${JSON.stringify(aqiData, null, 2)}

// User Question:
// ${userMessage}

// Give a short, clear health-focused answer.
// `;

//     const model = genAI.getGenerativeModel({
//       model: "gemini-1.5-flash-latest"
//     });

//     const result = await model.generateContent(prompt);
//     const response = await result.response;

//     res.json({ reply: response.text() });

//   } catch (error) {
//     console.error("FULL ERROR:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

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
    console.log("FULL ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});

server.listen(5000, () => {
  console.log("Backend running on port 5000");
});
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
