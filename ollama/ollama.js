"use strict";

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const axios = require("axios");

const app = express();
const PORT = 3000;

// Configure Multer to store uploaded files in the "uploads" directory
const upload = multer({ dest: "uploads/" });

// Endpoint to upload and process the PDF
app.post("/verify-expiration", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const pdfBuffer =
      req.file.buffer || require("fs").readFileSync(req.file.path);

    // Extract text using pdf-parse
    const pdfData = await pdfParse(pdfBuffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(404).json({ error: "No text found in the PDF." });
    }

    // Create the prompt for Groq API
    const prompt = `Analyze this document and respond strictly in raw JSON format without any additional formatting.
    {
      "expirationDate": "YYYY-MM-DD or null", 
      "valid": boolean,                       
      "confidenceScore": 0-1,                 
      "reason": "string"
    }

    Document text:

    ${extractedText}`;

    const ollamaResponse = await axios.post(
      "http://127.0.0.1:11434/api/chat",
      {
        model: "llama3.2",
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
      throw new Error("Ollama API did not return a valid response.");
    }

    // Parse the JSON response
    try {
      const parsedAnalysis = JSON.parse(analysis);
      res.json({ analysis: parsedAnalysis });
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      res
        .status(500)
        .json({ error: "Ollama API returned an invalid JSON response." });
    }
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
