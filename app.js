const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const axios = require("axios");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Endpoint to process the PDF
app.post("/verify-expiration", async (req, res) => {
  try {
    const { pdfPath } = req.body;

    if (!pdfPath) {
      return res.status(400).json({ error: "PDF path is required." });
    }

    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = pdfData.text;

    const prompt = `
      Analyze the following text and extract the expiration date if available. Then verify if the expiration date is valid (not expired) or potentially fraudulent:
      ---
      ${pdfText}
      ---
      Respond in JSON format with keys: "expirationDate", "valid", "fraudulent", and a reason for your response.
    `;

    const ollamaResponse = await axios.post(
      "http://127.0.0.1:11434/api/chat",
      {
        model: "llama3.1",
        messages: [
          {
            role: "system",
            content: "Respond only in JSON format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        format: "json",
        stream: false,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const analysis = ollamaResponse.data?.message?.content;

    if (!analysis) {
      throw new Error("Ollama did not return a valid response.");
    }

    res.json({ analysis: JSON.parse(analysis) });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
