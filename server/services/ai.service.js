import { geminiService, formatDocumentsDetails, formatLabMetricsDetails } from './gemini.service.js';
import { sarvamService } from './sarvam/index.js';
import { ragService } from './rag.service.js';

class AIService {
  /**
   * Medical Document OCR & Intelligent Entity Extraction
   */
  async extractDocumentEntities(document, customText = '') {
    return await geminiService.extractDocumentEntities({
      filePath: document.filePath,
      mimeType: document.fileType === 'pdf' ? 'application/pdf' : `image/${document.fileType || 'jpeg'}`,
      originalName: document.originalName,
      category: document.category,
    });
  }

  /**
   * Health Copilot Intelligence
   * Powered by Sarvam AI (when configured) or Gemini / Plain-Language Clinical Engine.
   * Grounded in user's existing medical documents via RAG (Sections 1 to 18).
   * Strict Safety: Non-diagnostic, plain everyday language, source citations, zero hallucination.
   */
  async processCopilotQuery({ query, userContext, language = 'en' }) {
    const { medications = [], labMetrics = [], records = [], doctors = [], user = {}, documents = [] } = userContext;

    // 1. RAG RETRIEVAL (Section 1: User's existing medical document -> RAG retrieval -> relevant report chunks)
    // The retrieval strictly depends on the user's question.
    const ragResult = ragService.retrieveRelevantChunks({
      query,
      documents,
      labMetrics,
      medications,
      records,
      doctors,
      user,
    });

    // 2. RETRIEVAL FAILURE GUARDRAIL (Zero Hallucination)
    if (ragResult.retrievalStatus === 'NOT_FOUND') {
      const missingName = ragResult.missingEntity || 'Information';
      let notFoundMsg = ragResult.notFoundMessage || '';

      if (!notFoundMsg) {
        if (language === 'ta') {
          notFoundMsg = `தற்போது கிடைக்கக்கூடிய உங்கள் மருத்துவ ஆவணங்களில் ${missingName} தொடர்பான விவரங்கள் எதுவும் காணப்படவில்லை.`;
        } else if (language === 'hi') {
          notFoundMsg = `उपलब्ध मेडिकल दस्तावेजों में ${missingName} का कोई रिकॉर्ड नहीं मिला।`;
        } else if (language === 'te') {
          notFoundMsg = `ప్రస్తుతం అందుబాటులో ఉన్న మీ వైద్య పత్రాలలో ${missingName} వివరాలు కనుగొనబడలేదు.`;
        } else {
          if (missingName.toLowerCase().includes('prescription') || missingName.toLowerCase().includes('medication') || missingName.toLowerCase().includes('medicine')) {
            notFoundMsg = "I couldn't find medication information in your uploaded records.";
          } else if (missingName.toLowerCase().includes('doctor')) {
            notFoundMsg = "I couldn't find doctor information in your uploaded records.";
          } else {
            notFoundMsg = `I couldn't find a ${missingName.toLowerCase()} result in the medical documents currently available to me. I don't want to guess.`;
          }
        }
      }

      return {
        response: notFoundMsg,
        sources: [],
        safetyDisclaimer: geminiService.getSafetyDisclaimer(language),
        language,
        provider: 'rag_grounded_engine',
      };
    }

    const ragContext = ragService.formatContextForLLM(ragResult);
    const sources = ragResult.sources && ragResult.sources.length > 0
      ? ragResult.sources
      : geminiService.buildSourcesFromContext(userContext, query);

    // 3. If Sarvam AI is configured, query Sarvam Chat with RAG-aware plain-language system prompt (Section 16)
    if (sarvamService.isAvailable()) {
      try {
        const langNameMap = {
          ta: 'Tamil (தமிழ்)',
          hi: 'Hindi (हिन्दी)',
          te: 'Telugu (తెలుగు)',
          en: 'English',
        };
        const targetLanguage = langNameMap[language] || 'English';

        const systemPrompt = `You are "Personal Health Copilot", a compassionate, non-diagnostic AI health intelligence companion.

RAG-AWARE MEDICAL DOCUMENT EXPLANATION RULES (MANDATORY):
1. When answering questions about a user's existing medical documents, use the retrieved RAG context as the primary source for report-specific facts.
2. Never invent medical values, reference ranges, dates, diagnoses, medications, or other information that is not supported by the retrieved document context.
3. Preserve exact values, units, dates, test names, and reference ranges from the retrieved context.
4. Use general medical knowledge only to explain retrieved information in understandable language.
5. Clearly distinguish between:
   - information found in the user's document,
   - general medical explanation,
   - cautious interpretation.
6. When the retrieved context is insufficient or a test is not found, say that the information could not be found rather than guessing.
7. Do not diagnose a medical condition from a single abnormal result.
8. When explaining medical information, use simple everyday language suitable for a person without medical training.
9. Explain important medical terminology immediately in plain language:
   - Hemoglobin: protein in red blood cells that helps carry oxygen around your body.
   - HbA1c: blood test that gives an idea of your average blood sugar level over the past 2–3 months.
   - Creatinine: waste product that healthy kidneys filter out of your blood; shows how kidneys are working.
   - Platelets: tiny parts of blood that help stop bleeding and form clots when injured.
   - WBC: white blood cells that help your immune system fight infections.
10. If a result is outside the reference range shown in the retrieved report, explain that fact without automatically describing it as dangerous or diagnosing the user.
11. Explain relevant normal results as well as abnormal results.
12. If the retrieved context contains conflicting values from different reports, preserve the distinction between documents and dates.
13. If the retrieved context is unclear, incomplete, or unreliable, explicitly state the limitation.
14. The goal is to explain the user's actual medical document, not merely reproduce it and not generate a diagnosis.
15. Answer completely in ${targetLanguage}. For Tamil, Hindi, and Telugu, use natural, everyday phrasing suitable for Indian users.`;

        const userPrompt = `PATIENT PROFILE:
Name: ${user.name || 'User'}
Allergies: ${user.criticalAllergies?.join(', ') || 'None reported'}
Chronic Conditions: ${user.criticalConditions?.join(', ') || 'None reported'}

${ragContext}

USER INQUIRY:
"${query}"

Explain in ${targetLanguage} in plain, everyday language based strictly on the retrieved medical document context above. Preserve exact values and reference ranges. Do not diagnose.`;

        const reply = await sarvamService.generateChatCompletion({
          messages: [{ role: 'user', content: userPrompt }],
          systemPrompt,
        });

        if (reply && reply.trim()) {
          const cleanReply = reply.trim()
            .replace(/<<<UNTRUSTED_DOCUMENT_CONTENT_START>>>/g, '')
            .replace(/<<<UNTRUSTED_DOCUMENT_CONTENT_END>>>/g, '')
            .replace(/Confidence:\s*100%/gi, 'Based on your uploaded records')
            .replace(/Confidence:\s*\d+%/gi, 'Based on your uploaded records');

          return {
            response: cleanReply,
            sources,
            safetyDisclaimer: geminiService.getSafetyDisclaimer(language),
            language,
            provider: 'sarvam',
          };
        }
      } catch (err) {
        console.warn('[AIService] Sarvam query notice, falling back to clinical engine:', err.message);
      }
    }

    // 4. Fallback to Gemini Service or Plain-Language Clinical Engine (Sections 1, 16)
    return await geminiService.generateHealthCopilotResponse({
      query,
      userContext,
      language,
      ragResult,
    });
  }
}

export const aiService = new AIService();
export default aiService;
