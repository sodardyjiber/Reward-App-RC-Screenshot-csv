import { GoogleGenAI } from "@google/genai";
import { ExtractedData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const extractDataFromImage = async (
  base64Image: string, 
  existingHeaders: string[] = []
): Promise<ExtractedData> => {
  
  const model = "gemini-2.5-flash-image";

  let prompt = `
    Analyze the provided image. It contains data such as a receipt, invoice, business card, or a table.
    Extract the key information into a flat JSON object (key-value pairs).
    
    Rules:
    1. Keys should be clean, readable headers.
    2. Values should be the extracted text.
    3. Format dates as YYYY-MM-DD if possible.
    4. Format currency as simple numbers (e.g., 10.50) where possible, or keep the symbol if ambiguous.
    5. CRITICAL: Remove the string "RC", "RewardCash", "$", "HKD" or any currency codes from numeric values. Return only the number.
    6. Return ONLY the raw JSON object. Do not include Markdown formatting or conversational text.
  `;

  if (existingHeaders.length > 0) {
    prompt += `
    
    CRITICAL: The user has already established a table with the following headers:
    ${JSON.stringify(existingHeaders)}
    
    You MUST map the extracted data to these EXACT keys.
    Do NOT create new keys.
    If a specific category is not found in the image, set the value to null or empty string.
    `;
  }

  // Increased maxRetries to 5 to handle persistent rate limits
  const maxRetries = 5;
  let attempt = 0;

  while (true) {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            },
            {
              text: prompt
            }
          ]
        }
      });

      let text = response.text;
      if (!text) throw new Error("No data returned from AI");

      // Clean up Markdown code blocks if present (e.g., ```json ... ```)
      text = text.trim();
      if (text.startsWith("```")) {
        text = text.replace(/^```(json)?/, "").replace(/```$/, "").trim();
      }

      // Parse the JSON
      const data = JSON.parse(text);
      
      // Ensure it's a flat object
      if (Array.isArray(data)) {
          return data[0] || {};
      }
      return data;

    } catch (error: any) {
      // Check for 429 Resource Exhausted or specific error codes
      const isRateLimit = 
        error.status === 429 || 
        error.code === 429 || 
        (error.message && error.message.includes("429"));

      if (isRateLimit && attempt < maxRetries) {
        attempt++;
        // Aggressive Backoff: 4s, 8s, 16s, 32s, 64s
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await wait(delay);
        continue;
      }

      console.error("Gemini Extraction Error:", error);
      if (error instanceof SyntaxError) {
        throw new Error("Failed to parse the AI response as valid JSON. Please try again.");
      }
      throw error;
    }
  }
};

export { extractDataFromImage };