# PDF Expiration Date Verification with Groq

This application processes PDF files, extracts relevant text, and uses the Groq API to analyze and verify expiration dates for validity and potential fraud.

## Features

- Extracts text from PDF files
- Analyzes text using Groq's LLM API
- Verifies expiration dates with confidence scoring
- Outputs analysis in JSON format

## Prerequisites

- Node.js (version 18 or higher)
- Groq API key
- PDF files for testing

## Installation

### 1. Install Dependencies

Run the following command to install the necessary packages:

```bash
npm install express multer pdf-parse groq-sdk dotenv
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory and add your Groq API key:

```plaintext
GROQ_API_KEY=your_api_key_here
```

<a href="Guide_to_Logging_into_Groq_and_Creating_an_API_Key.pdf" target="_blank">
    Guide to Logging into Groq and Creating an API Key
</a>

## Usage

### Starting the Server

1. Run the application:

```bash
node gorq.js
```

2. The server will start on port 3000 by default. Access the application at `http://localhost:3002`

### API Endpoints

#### POST /analyze

Upload a PDF file for analysis:

```bash
curl -X POST -F "file=@path/to/your.pdf" http://localhost:3000/analyze
```

## Response Format

The API returns JSON responses in the following format:

```json
{
  "success": true,
  "analysis": {
    "expirationDate": "2025-12-31",
    "confidence": 0.95,
    "isValid": true,
    "warnings": []
  }
}
```

## Error Handling

The API returns appropriate error messages when:

- Invalid file format is uploaded
- PDF parsing fails
- API rate limits are exceeded
- Server encounters internal errors

