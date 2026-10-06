import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Sparkles, 
  Send, 
  Volume2, 
  VolumeX, 
  FileText, 
  AlertTriangle, 
  Globe, 
  RotateCcw, 
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Mic,
  MicOff
} from 'lucide-react';
import { api } from '../../services/api';
import { useTranslation, languages } from '../../context/LanguageContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { Button, Card, Badge, Alert } from '../../components/ui';

export const CopilotPage = () => {
  const [searchParams] = useSearchParams();
  const { currentLang, changeLanguage, t } = useTranslation();
  const { voiceAssistance } = useAccessibility();

  const [inputQuery, setInputQuery] = useState(searchParams.get('q') || '');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'copilot',
      text: 'Hello, I am your Health Copilot. I can help search, explain, compare, and translate your uploaded laboratory reports, prescriptions, and health records into plain language.',
      sources: [],
      safetyDisclaimer: 'Health Copilot provides informational explanations of your verified medical data only and does not diagnose illnesses. Always consult your physician.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryToSend) => {
    const text = (queryToSend || inputQuery).trim();
    if (!text || isLoading) return;

    const userMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await api.post('/copilot/ask', {
        query: text,
        language: currentLang,
      });

      const copilotMessage = {
        id: `bot_${Date.now()}`,
        sender: 'copilot',
        text: res.response,
        sources: res.sources || [],
        safetyDisclaimer: res.safetyDisclaimer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, copilotMessage]);

      // If voice assistance enabled, auto read out summary
      if (voiceAssistance && window.speechSynthesis) {
        speakText(res.response);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'copilot',
          text: `I couldn't complete the analysis: ${err.message || 'Please verify network connection.'}`,
          sources: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Text-To-Speech (Phase 21 requirement)
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.lang = currentLang === 'ta' ? 'ta-IN' : currentLang === 'hi' ? 'hi-IN' : currentLang === 'te' ? 'te-IN' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Speech-To-Text Voice Input
  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your query.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = currentLang === 'ta' ? 'ta-IN' : currentLang === 'hi' ? 'hi-IN' : currentLang === 'te' ? 'te-IN' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputQuery(transcript);
      setIsListening(false);
      handleSend(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // Quick prompt chips
  const promptSuggestions = [
    { label: 'Explain latest blood report', q: 'Explain my latest blood test report and HbA1c values.' },
    { label: 'Today\'s medicines', q: 'What medicines am I taking today and what are their instructions?' },
    { label: 'When was my last checkup?', q: 'When was my last doctor checkup and who was the doctor?' },
    { label: 'What to ask my doctor?', q: 'What questions should I ask my doctor about my diabetes and blood pressure?' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Health Copilot
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                Non-Diagnostic AI
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Plain-language interpretations of your verified records and lab trends.
            </p>
          </div>
        </div>

        {/* Language selector in Copilot */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-xs text-xs">
          <Globe className="w-3.5 h-3.5 text-teal-600 ml-1.5" />
          <select
            value={currentLang}
            onChange={(e) => changeLanguage(e.target.value)}
            className="text-xs bg-transparent border-none text-slate-700 font-semibold focus:ring-0 py-1 pl-1 pr-6"
            aria-label="Change Copilot Response Language"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`
                  max-w-2xl rounded-2xl p-4 sm:p-5 shadow-xs transition-all
                  ${isUser
                    ? 'bg-teal-600 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'}
                `}
              >
                {/* Copilot Header */}
                {!isUser && (
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      Healthify Copilot
                    </span>

                    <button
                      type="button"
                      onClick={() => speakText(msg.text)}
                      className="p-1 rounded text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                      title={isSpeaking ? 'Stop voice' : 'Listen with voice'}
                    >
                      {isSpeaking ? <VolumeX className="w-4 h-4 text-teal-600" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                )}

                {/* Message Body */}
                <div className="text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                  {msg.text}
                </div>

                {/* Sources Citation Pill (Phase 23 requirement) */}
                {msg.sources?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Verified Clinical Sources
                    </span>
                    <div className="space-y-1">
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                            <span className="font-semibold truncate">{src.title}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 ml-2">{src.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safety Disclaimer (Phase 22 requirement) */}
                {msg.safetyDisclaimer && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 leading-snug flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <span>{msg.safetyDisclaimer}</span>
                  </div>
                )}

                <span className={`block text-[10px] mt-2 ${isUser ? 'text-teal-200 text-right' : 'text-slate-400'}`}>
                  {msg.timestamp}
                </span>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 max-w-md animate-pulse">
            <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
            <span>Analyzing health records in {currentLang.toUpperCase()}...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-shrink-0">
        {promptSuggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(s.q)}
            className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-700 text-xs font-medium whitespace-nowrap transition-colors shadow-xs"
          >
            "{s.label}"
          </button>
        ))}
      </div>

      {/* Input Field with Voice & Send */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-300 shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 flex-shrink-0"
      >
        <button
          type="button"
          onClick={toggleListening}
          className={`p-2.5 rounded-xl transition-colors ${
            isListening ? 'bg-rose-600 text-white animate-pulse' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          title="Voice input"
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask Copilot about your medications, test reports, or doctor visits..."
          className="flex-1 text-xs sm:text-sm bg-transparent border-none outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400 px-2"
        />

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!inputQuery.trim() || isLoading}
          className="rounded-xl px-4"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};

export default CopilotPage;
