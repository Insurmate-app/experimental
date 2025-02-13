"use strict";

require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");

const app = express();
const PORT = 3002;

// Load Groq API Key from environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("Error: GROQ_API_KEY is not defined in environment variables.");
  process.exit(1);
}

// Initialize Groq SDK
const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

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

    // Use Groq SDK to analyze the extracted text
    const groqResponse = await groq.chat.completions.create({
      model: "llama-3.2-3b-preview",
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
      temperature: 0.1,
    });

    // Extract and clean the response from Groq API
    let analysis = groqResponse.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error("Groq API did not return a valid response.");
    }

    // Remove Markdown-style formatting if present
    analysis = analysis.replace(/```json|```/g, "").trim();

    // Parse the cleaned JSON
    const parsedAnalysis = JSON.parse(analysis);
    res.json({ analysis: parsedAnalysis });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: error.message });
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
