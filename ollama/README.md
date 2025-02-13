# Ollama PDF Verification App

This application processes PDF files, extracts relevant text, and uses the Ollama API to analyze and verify expiration dates for validity and potential fraud.

## Features

- Extracts text from PDF files.
- Sends the text to the Ollama API for analysis.
- Verifies if an expiration date is valid or fraudulent.
- Outputs the analysis in JSON format.

## Prerequisites

- Node.js (version 18 or higher)
- Ollama installed and running locally
- PDF files for testing

## Installation

### 1. Install Dependencies

Run the following command to install the necessary packages:

```bash
npm install express multer pdf-parse axios dotenv
```

The application uses the following Node.js packages:

- `express`: For setting up the server
- `body-parser`: For parsing incoming request bodies
- `fs`: For reading files
- `pdf-parse`: For extracting text from PDFs
- `axios`: For sending HTTP requests to the Ollama API

### 2. Install and Set Up Ollama

#### Download Ollama

- Visit the [Ollama website](https://ollama.ai/) and download the installer for your platform (Mac or Windows).

#### Install Ollama

- Run the installer and follow the instructions.

#### Start Ollama Server

Once installed, start the Ollama server on your machine:

```bash
ollama serve
```

This command launches the Ollama API on `http://127.0.0.1:11434` by default.

### 3. Download the Required Model

Download the `llama3.1` model for the application by running:

```bash
ollama pull llama3.2
```

## Usage

### 1. Start the Server

Run the following command to start the application:

```bash
node ollama.js
```

The server will start on `http://localhost:3000`.

### 2. Test the Endpoint

Send a POST request to `/verify-expiration` with the path to a PDF file:

#### Example Request

Using `curl`:

```bash
curl -X POST -F "pdf=@/path/to/your/document.pdf" http://localhost:3002/verify-expiration
```

Using a REST client like Postman:

- Set the method to POST.
- Set the URL to `http://localhost:3000/verify-expiration`.
- Add a JSON body with the `pdfPath` key and the file path as the value.

#### Example Response

```json
{
  "analysis": {
    "expirationDate": "2025-12-31",
    "valid": true,
    "fraudulent": false,
    "reason": "Expiration date is valid and falls in the future."
  }
}
```

## Troubleshooting

### Invalid Response from Ollama

- Ensure that the Ollama server is running and accessible at `http://127.0.0.1:11434`.
- Verify that the `llama3.1` model is downloaded and loaded correctly.

### PDF Not Found

- Ensure the `pdfPath` in the request points to an existing file.
- Provide the full path to the PDF file.

### Port Conflicts

If port `3000` or `11434` is in use, modify the port in `app.js` or restart the conflicting application.

## Notes

- The application assumes the Ollama server is running locally. Adjust the API URL in `app.js` if using a remote server.
- For advanced customization, refer to the Ollama documentation.
