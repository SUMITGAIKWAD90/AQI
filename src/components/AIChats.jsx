import React, { useState } from "react";
import axios from "axios";

function AIChat({ aqiData }) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  const sendMessage = async () => {
    const res = await axios.post("http://localhost:5000/chat", {
      userMessage: message,
      aqiData: aqiData,
    });

    setChat([...chat, 
      { role: "user", text: message },
      { role: "ai", text: res.data.reply }
    ]);

    setMessage("");
  };

  return (
    <div style={{ position: "fixed", bottom: 20, right: 20 }}>
      <div style={{ background: "white", width: 300, height: 400, overflow: "auto" }}>
        {chat.map((c, i) => (
          <div key={i}>
            <b>{c.role}:</b> {c.text}
          </div>
        ))}
      </div>
      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)} 
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default AIChat;
