"use strict";

const documentOntology = {
  // Document types
  documentTypes: {
    HEALTHINSURANCE: "http://schema.org/HealthInsuranceCard",
    LIFEINSURANCE: "http://schema.org/InsurancePolicy",
    CARINSURANCE: "http://schema.org/AutoInsurancePolicy",
    PROPERTYINSURANCE: "http://schema.org/HomeInsurancePolicy",
    GENERALINSURANCE: "http://schema.org/InsurancePolicy",
    GENERAL: "http://schema.org/Document",
  },

  // Document properties
  properties: {
    expirationDate: "http://schema.org/expires",
    issueDate: "http://schema.org/dateIssued",
    validFrom: "http://schema.org/validFrom",
    validUntil: "http://schema.org/validUntil",
    issuer: "http://schema.org/issuedBy",
    holder: "http://schema.org/recipient",
  },

  // Validation rules
  rules: {
    isValidDocument: (documentData) => {
      const currentDate = new Date();
      const expirationDate = new Date(documentData.expirationDate);
      return expirationDate > currentDate;
    },

    extractExpirationDate: (text) => {
      // Common date patterns in documents
      const datePatterns = [
        /(?:expir\w+|valid until|valid through).*?(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
        /(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}).*?(?:expiration|expiry)/i,
        /(?:exp|valid)(?:ires|iration)?:?\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
      return null;
    },

    calculateConfidence: (text, extractedDate) => {
      let confidence = 0.3; // Lower base confidence
      let factors = {
        datePresent: 0.2,
        insuranceTerms: 0.15,
        policyDetails: 0.15,
        documentStructure: 0.2
      };

      // Date validation
      if (extractedDate) {
        confidence += factors.datePresent;
        // Validate date format
        if (/\d{4}[-/]\d{2}[-/]\d{2}/.test(extractedDate)) {
          confidence += 0.05;
        }
      }

      // Insurance-specific terminology
      const insuranceTerms = [
        /policy\s*(?:number|#|no)/i,
        /coverage/i,
        /premium/i,
        /insur(?:ed|ance|er)/i,
        /beneficiary/i
      ];
      
      let termMatches = insuranceTerms.filter(term => term.test(text)).length;
      confidence += (termMatches / insuranceTerms.length) * factors.insuranceTerms;

      // Policy details validation
      const policyElements = [
        /\$\s*[\d,]+/,          // Currency amounts
        /\d{5,}/,               // Policy numbers
        /(valid|effective)\s*(from|until|through)/i,
        /terms?\s*(?:and|&)\s*conditions?/i
      ];

      let policyMatches = policyElements.filter(elem => elem.test(text)).length;
      confidence += (policyMatches / policyElements.length) * factors.policyDetails;

      // Document structure assessment
      const structureElements = [
        /(?:page|section|part)\s*\d/i,
        /signature/i,
        /date[d:]|issued/i,
        /contact|phone|email/i
      ];

      let structureMatches = structureElements.filter(elem => elem.test(text)).length;
      confidence += (structureMatches / structureElements.length) * factors.documentStructure;

      return {
        score: Math.min(confidence, 1.0),
        factors: {
          dateValidation: extractedDate ? factors.datePresent : 0,
          terminologyScore: (termMatches / insuranceTerms.length) * factors.insuranceTerms,
          policyScore: (policyMatches / policyElements.length) * factors.policyDetails,
          structureScore: (structureMatches / structureElements.length) * factors.documentStructure
        }
      };
    },
  },

  // Document classification
  classifyDocument: (text) => {
    const classifications = {
      healthInsurance: /health insurance|medical coverage|health plan/i,
      lifeInsurance: /life insurance|life coverage|death benefit/i,
      carInsurance: /car insurance|auto insurance|vehicle coverage|motor insurance/i,
      propertyInsurance: /property insurance|home insurance|homeowner('s)? insurance/i,
      generalInsurance: /insurance policy|coverage|insurance certificate/i
    };

    for (const [type, pattern] of Object.entries(classifications)) {
      if (pattern.test(text)) {
        return documentOntology.documentTypes[type.toUpperCase()];
      }
    }

    return documentOntology.documentTypes.GENERAL;
  },
};

module.exports = documentOntology;
