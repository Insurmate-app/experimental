"use strict";

require("dotenv").config();
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const Groq = require("groq-sdk");
const $rdf = require('rdflib');
const documentOntology = require('./ontologyRules');

const app = express();
const PORT = 3004;

// Load Groq API Key from environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("Error: GROQ_API_KEY is not defined in environment variables.");
  process.exit(1);
}

const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

const upload = multer({ dest: "uploads/" });

app.post("/verify-expiration", upload.single("pdf"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const pdfBuffer = req.file.buffer || require("fs").readFileSync(req.file.path);
    const pdfData = await pdfParse(pdfBuffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(404).json({ error: "No text found in the PDF." });
    }

    // Apply ontology rules for initial document analysis
    const documentType = documentOntology.classifyDocument(extractedText);
    const extractedDate = documentOntology.rules.extractExpirationDate(extractedText);
    const initialConfidence = documentOntology.rules.calculateConfidence(extractedText, extractedDate);

    // Create RDF store for semantic data
    const store = $rdf.graph();
    const DOC = $rdf.Namespace('http://example.org/doc/');
    const SCHEMA = $rdf.Namespace('http://schema.org/');

    // Add document metadata to RDF store
    const documentSubject = store.sym(DOC('currentDocument'));

    console.log(documentSubject);

    store.add(documentSubject, SCHEMA('type'), store.sym(documentType));
    if (extractedDate) {
        store.add(documentSubject, SCHEMA('expires'), $rdf.lit(extractedDate));
    }
    // Create semantic validation rules
    const semanticRules = {
      insuranceFields: {
        policyNumber: /policy\s*(?:number|#|no)[:.]?\s*([A-Z0-9-]+)/i,
        coverageAmount: /(?:coverage|insured)\s*(?:amount|sum|value)[:.]?\s*[$€£]?\s*([\d,]+)/i,
        insuranceType: /(?:type|class)\s*(?:of)?\s*(?:insurance|coverage)[:.]?\s*([A-Za-z\s]+)/i
      }
    };

    const prompt = `Analyze this insurance document and extract structured data. Respond in JSON format following these semantic rules:
    {
      "documentType": "${documentType}",
      "metadata": {
        "policyNumber": "string or null",
        "coverageAmount": "number or null",
        "insuranceType": "string or null",
        "coveragePeriod": {
          "startDate": "YYYY-MM-DD or null",
          "endDate": "YYYY-MM-DD or null"
        }
      },
      "parties": {
        "insurer": {
          "name": "string or null",
          "identifier": "string or null"
        },
        "insured": {
          "name": "string or null",
          "identifier": "string or null"
        }
      },
      "validation": {
        "isValid": boolean,
        "confidence": 0-1,
        "expirationStatus": "active|expired|pending",
        "verificationMethod": "string"
      }
    }

    Document text:

    ${extractedText}`;

    const groqResponse = await groq.chat.completions.create({
      model: "llama-3.2-3b-preview",
      messages: [
        {
          role: "system",
          content: "You are a semantic document analyzer. Respond only in JSON format.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
    });

    let analysis = groqResponse.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error("Groq API did not return a valid response.");
    }

    analysis = analysis.replace(/```json|```/g, "").trim();
    const parsedAnalysis = JSON.parse(analysis);

    // Enhance analysis with ontology-based validation
    const enhancedAnalysis = {
      ...parsedAnalysis,
      ontologyValidation: {
        documentClass: documentType,
        initialConfidence: initialConfidence,
        rdfTriples: store.statements.length
      }
    };

    // Add semantic validation to the enhanced analysis
    const semanticAnalysis = {
      ...parsedAnalysis,
      ontologyValidation: {
        documentClass: documentType,
        initialConfidence: initialConfidence,
        rdfTriples: store.statements.length,
        semanticMatches: {}
      }
    };

    // Apply semantic rules to extracted text
    Object.entries(semanticRules.insuranceFields).forEach(([field, pattern]) => {
      const match = extractedText.match(pattern);
      if (match) {
        store.add(documentSubject, SCHEMA(field), $rdf.lit(match[1].trim()));
        semanticAnalysis.ontologyValidation.semanticMatches[field] = match[1].trim();
      }
    });

    // After adding all triples to the store
        console.log('RDF Triples created:');
        store.statements.forEach(triple => {
            console.log(`Subject: ${triple.subject.value}`);
            console.log(`Predicate: ${triple.predicate.value}`);
            console.log(`Object: ${triple.object.value}`);
            console.log('---');
        });
    res.json({ analysis: semanticAnalysis });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});