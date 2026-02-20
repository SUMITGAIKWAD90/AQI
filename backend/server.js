require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});
const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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


app.post("/api/sensor", (req, res) => {
  console.log("📥 Data received from ESP8266:");
  console.log(req.body);

  latestData = req.body;
  io.emit("sensorData", latestData);

  res.send("OK");
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

//     const prompt = `
// You are an environmental AI assistant.

// AQI Data:
// ${JSON.stringify(aqiData, null, 2)}

// User Question:
// ${userMessage}

// Give short clear health advice.
// `;

const prompt = `
You are an environmental health intelligence system.

Analyze the following air quality data carefully and provide a structured scientific response.

AQI DATA:
${JSON.stringify(aqiData, null, 2)}

USER QUESTION:
${userMessage}

Instructions:
1. Start with a short summary of today's air quality.
2. Provide a Health Risk Score from 1–10 (10 = extremely hazardous).
3. Explain health impact for:
   - General public
   - Children
   - Elderly
   - People with respiratory issues
4. Give 3 practical recommendations.
5. Provide a confidence level (Low / Medium / High) based on data completeness.
6. Keep tone professional, like an environmental scientist.
7. Keep response under 200 words.
`;

    const completion = await openai.chat.completions.create({
  model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: 'You are an environmental scientist and air quality analyst.Speak in a professional, data-driven tone.Avoid casual language.Use structured bullet points.'},
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