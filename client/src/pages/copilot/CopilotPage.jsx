import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
  MicOff,
  Paperclip,
  Camera,
  UploadCloud,
  X,
  Square,
  Check,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { useTranslation, languages } from '../../context/LanguageContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { Button, Card, Badge, Alert } from '../../components/ui';

// Internal marker and confidence sanitizer (Bugs 1 & 2)
const sanitizeCopilotText = (str) => {
  if (!str) return '';
  return str
    .replace(/<<<UNTRUSTED_DOCUMENT_CONTENT_START>>>/gi, '')
    .replace(/<<<UNTRUSTED_DOCUMENT_CONTENT_END>>>/gi, '')
    .replace(/Confidence:\s*100%/gi, 'Based on your uploaded records')
    .replace(/Confidence:\s*94%/gi, 'Based on your uploaded records')
    .replace(/Confidence:\s*\d+%/gi, 'Based on your uploaded records')
    .replace(/\b(100%|94%)\s*(confidence|certainty)/gi, 'Based on your uploaded records')
    .replace(/\[INTERNAL_[^\]]+\]/gi, '')
    .replace(/\[RAG_[^\]]+\]/gi, '')
    .replace(/retrieval_strategy:\s*[A-Za-z0-9_]+/gi, '')
    .replace(/--- CHUNK #\d+.*?---/gs, '')
    .replace(/=== RETRIEVED USER MEDICAL CONTEXT.*?===/gs, '')
    .trim();
};

export const CopilotPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
  const audioPlayerRef = useRef(null);

  // Voice State Machine (Phases 5, 6, 17, 19)
  // IDLE | REQUESTING_PERMISSION | LISTENING | PROCESSING | CONFIRMING | ERROR
  const [voiceState, setVoiceState] = useState('IDLE');
  const [voiceError, setVoiceError] = useState('');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcribedText, setTranscribedText] = useState('');
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Document Upload State (Phases 14, 15, 16)
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, voiceState]);

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

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
    setVoiceState('IDLE');
    setTranscribedText('');
    setIsLoading(true);

    const historyPayload = messages.slice(-10).map(m => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    try {
      const activeDocId = searchParams.get('doc') || searchParams.get('document_id') || searchParams.get('docId') || null;
      const res = await api.post('/copilot/ask', {
        query: text,
        language: currentLang,
        history: historyPayload,
        document_id: activeDocId || undefined,
      });

      const cleanResponse = sanitizeCopilotText(res?.response || res?.answer || res?.text || '');

      const copilotMessage = {
        id: `bot_${Date.now()}`,
        sender: 'copilot',
        text: cleanResponse,
        sources: res.sources || [],
        safetyDisclaimer: res.safetyDisclaimer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, copilotMessage]);

      if (voiceAssistance) {
        speakText(cleanResponse);
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

  const speechRecognitionRef = useRef(null);
  const speechFallbackTranscriptRef = useRef('');

  // ==========================================
  // SARVAM SAARAS V4 VOICE INPUT (Phases 17-20)
  // ==========================================
  const startVoiceRecording = async () => {
    setVoiceError('');
    speechFallbackTranscriptRef.current = '';
    setVoiceState('REQUESTING_PERMISSION');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone recording is not supported in this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Determine mime type supported by browser
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Start browser SpeechRecognition in parallel as instant fallback
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.lang = currentLang === 'ta' ? 'ta-IN' : currentLang === 'hi' ? 'hi-IN' : currentLang === 'te' ? 'te-IN' : 'en-US';
          rec.continuous = true;
          rec.interimResults = false;
          rec.onresult = (e) => {
            let fullText = '';
            for (let i = 0; i < e.results.length; i++) {
              fullText += e.results[i][0].transcript + ' ';
            }
            if (fullText.trim()) {
              speechFallbackTranscriptRef.current = fullText.trim();
            }
          };
          rec.start();
          speechRecognitionRef.current = rec;
        } catch {
          speechRecognitionRef.current = null;
        }
      }

      mediaRecorder.onstop = async () => {
        // Stop audio tracks immediately (privacy)
        stream.getTracks().forEach((track) => track.stop());

        if (speechRecognitionRef.current) {
          try { speechRecognitionRef.current.stop(); } catch {}
          speechRecognitionRef.current = null;
        }

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = []; // Clear in-memory chunks

        // Give speech recognition a brief tick to finalize text
        setTimeout(async () => {
          await processVoiceWithSarvam(audioBlob, mimeType);
        }, 150);
      };

      mediaRecorder.start(250); // Slice every 250ms
      setVoiceState('LISTENING');
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          if (prev >= 60) {
            stopVoiceRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Microphone error:', err);
      let msg = 'Microphone access was denied. Please allow microphone permissions.';
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No microphone found on this device.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Microphone permission was denied. Please allow access in browser settings.';
      }
      setVoiceError(msg);
      setVoiceState('ERROR');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
    }
  };

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try { speechRecognitionRef.current.stop(); } catch {}
      speechRecognitionRef.current = null;
    }
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      }
    }
    audioChunksRef.current = [];
    speechFallbackTranscriptRef.current = '';
    setVoiceState('IDLE');
    setVoiceError('');
    setTranscribedText('');
  };

  const processVoiceWithSarvam = async (audioBlob, mimeType) => {
    setVoiceState('PROCESSING');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'speech_input.webm');
      formData.append('language', currentLang);

      const res = await api.upload('/copilot/voice-transcribe', formData);

      if (res && res.transcript && res.transcript.trim()) {
        setTranscribedText(res.transcript.trim());
        setVoiceState('CONFIRMING');
        return;
      }

      // Check if browser speech recognition captured the user's speech
      if (speechFallbackTranscriptRef.current && speechFallbackTranscriptRef.current.trim()) {
        setTranscribedText(speechFallbackTranscriptRef.current.trim());
        setVoiceState('CONFIRMING');
        return;
      }

      setVoiceError("I couldn't hear any speech clearly. Please try speaking again or type your question.");
      setVoiceState('ERROR');
    } catch {
      // Check if fallback captured the text
      if (speechFallbackTranscriptRef.current && speechFallbackTranscriptRef.current.trim()) {
        setTranscribedText(speechFallbackTranscriptRef.current.trim());
        setVoiceState('CONFIRMING');
        return;
      }

      // User-friendly error with zero backend/technical leaks
      setVoiceError("Voice recognition is temporarily unavailable. You can type your query in the box below.");
      setVoiceState('ERROR');
    }
  };

  // ==========================================
  // TEXT-TO-SPEECH (Sarvam Bulbul / WebSpeech)
  // ==========================================
  const speakText = async (text) => {
    if (isSpeaking) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);

    try {
      // 1. Try Sarvam TTS via backend
      const res = await api.post('/copilot/voice-speak', {
        text,
        language: currentLang,
        speaker: 'meera',
      });

      if (res.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${res.audioBase64}`);
        audioPlayerRef.current = audio;
        audio.onended = () => {
          setIsSpeaking(false);
          audioPlayerRef.current = null;
        };
        audio.onerror = () => {
          fallbackWebSpeech(text);
        };
        await audio.play();
        return;
      }
    } catch {
      // Fallback seamlessly to native browser speech synthesis
    }

    fallbackWebSpeech(text);
  };

  const fallbackWebSpeech = (text) => {
    if (!window.speechSynthesis) {
      setIsSpeaking(false);
      return;
    }
    const clean = text.replace(/[*#_~`]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;
    utterance.lang = currentLang === 'ta' ? 'ta-IN' : currentLang === 'hi' ? 'hi-IN' : currentLang === 'te' ? 'te-IN' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // ==========================================
  // COPILOT DOCUMENT / PHOTO UPLOAD (Phases 14, 15, 16)
  // ==========================================
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected if desired
    e.target.value = '';

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF document or JPG/PNG image.');
      return;
    }

    setIsUploadingDoc(true);

    // Add immediate user upload message to stream
    const userMsg = {
      id: `usr_doc_${Date.now()}`,
      sender: 'user',
      text: `Uploaded medical document: ${file.name}`,
      fileAttachment: {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        type: file.type.includes('image') ? 'image' : 'pdf',
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', file.name.toLowerCase().includes('prescription') ? 'prescription' : 'laboratory_report');
      formData.append('userPrompt', 'Uploaded via Health Copilot for analysis');

      const res = await api.upload('/copilot/upload-document', formData);

      const copilotMsg = {
        id: `bot_doc_${Date.now()}`,
        sender: 'copilot',
        text: res.copilotExplanation || `I have analyzed "${file.name}". The document is now safely stored in your Documents library and ready for verification in your Health Records.`,
        sources: [
          {
            title: res.document?.originalName || file.name,
            date: new Date().toLocaleDateString(),
            type: res.document?.category || 'Medical Document',
          }
        ],
        documentLink: res.document?._id,
        safetyDisclaimer: 'Extracted medical facts should be verified with your physician before clinical changes.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, copilotMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_doc_${Date.now()}`,
          sender: 'copilot',
          text: `Document upload failed: ${err.message || 'Please try again.'}`,
          sources: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsUploadingDoc(false);
    }
  };

  // Quick prompt chips
  const promptSuggestions = [
    { label: 'Explain latest blood report', q: 'Explain my latest blood test report and HbA1c values.' },
    { label: 'Today\'s medicines', q: 'What medicines am I taking today and what are their instructions?' },
    { label: 'When was my last checkup?', q: 'When was my last doctor checkup and who was the doctor?' },
    { label: 'What to ask my doctor?', q: 'What questions should I ask my doctor about my health condition?' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-3 flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Hidden File Inputs for Document & Camera */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/jpeg,image/png,image/jpg,application/pdf"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

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
              Plain-language interpretations of your verified records, lab trends, and uploaded reports.
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
                      Health Copilot
                    </span>

                    <button
                      type="button"
                      onClick={() => speakText(msg.text)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 transition-colors flex items-center gap-1 text-xs"
                      title={isSpeaking ? 'Stop voice reading' : 'Read response aloud'}
                      aria-label="Read response aloud"
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-4 h-4 text-teal-600" />
                          <span className="text-[11px] text-teal-700 font-medium">Stop</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span className="text-[11px] text-slate-500 font-medium">Read</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* File Attachment Card if user uploaded doc */}
                {msg.fileAttachment && (
                  <div className="mb-2 p-2.5 rounded-xl bg-teal-700/60 text-white border border-teal-500 flex items-center gap-2.5 text-xs">
                    <FileText className="w-4 h-4 text-teal-200 flex-shrink-0" />
                    <div className="flex-1 truncate">
                      <p className="font-semibold truncate">{msg.fileAttachment.name}</p>
                      <p className="text-[10px] text-teal-200">{msg.fileAttachment.size}</p>
                    </div>
                  </div>
                )}

                {/* Message Body */}
                <div className="text-xs sm:text-sm whitespace-pre-line leading-relaxed">
                  {msg.text}
                </div>

                {/* Direct Action Link if Document was Created */}
                {msg.documentLink && (
                  <div className="mt-3 pt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/documents')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold hover:bg-teal-100 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View in Documents & Verify Records
                    </button>
                  </div>
                )}

                {/* Sources Citation Pill */}
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

                {/* Safety Disclaimer */}
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

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-500 max-w-md animate-pulse">
            <Sparkles className="w-4 h-4 text-teal-600 animate-spin" />
            <span>Analyzing health records in {currentLang.toUpperCase()}...</span>
          </div>
        )}

        {/* Document Uploading Indicator */}
        {isUploadingDoc && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-800 max-w-md">
            <Loader2 className="w-4 h-4 text-teal-600 animate-spin" />
            <span>Uploading document and running AI extraction...</span>
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

      {/* VOICE RECORDING ACTIVE BANNER (Phases 5, 17, 19) */}
      {voiceState === 'LISTENING' && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm flex items-center justify-between animate-in fade-in flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-ping" />
            <div>
              <p className="text-xs font-bold text-rose-900 flex items-center gap-2">
                Listening... ({recordingDuration}s)
              </p>
              <p className="text-[11px] text-rose-700">
                Speak naturally in Tamil, Hindi, Telugu, or English. Raw voice is not saved.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={stopVoiceRecording}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop & Transcribe
            </button>
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Cancel recording"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* VOICE PROCESSING BANNER */}
      {voiceState === 'PROCESSING' && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm flex items-center gap-3 animate-pulse flex-shrink-0">
          <Loader2 className="w-4 h-4 text-amber-600 animate-spin flex-shrink-0" />
          <div className="text-xs text-amber-900">
            <span className="font-bold">Processing voice with Sarvam Saaras v4...</span>
            <span className="text-[11px] text-amber-700 block">Detecting language and health keyterms...</span>
          </div>
        </div>
      )}

      {/* VOICE TRANSCRIPTION CONFIRMATION CARD (Phase 17) */}
      {voiceState === 'CONFIRMING' && (
        <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-300 shadow-sm space-y-2 animate-in fade-in flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-teal-600" />
              Transcribed Voice Query:
            </span>
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs font-medium text-slate-800 bg-white p-2.5 rounded-xl border border-teal-100 italic">
            "{transcribedText}"
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSend(transcribedText)}
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Send to Copilot
            </button>
            <button
              type="button"
              onClick={() => {
                setInputQuery(transcribedText);
                setVoiceState('IDLE');
              }}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Edit in Text Box
            </button>
            <button
              type="button"
              onClick={cancelVoiceRecording}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* VOICE ERROR BANNER */}
      {voiceState === 'ERROR' && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{voiceError && !voiceError.includes('Sarvam') && !voiceError.includes('.env') && !voiceError.includes('configured') ? voiceError : 'Voice input is currently unavailable. You can type your question in the box below.'}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceState('IDLE')}
            className="text-xs font-semibold text-rose-700 underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input Field with Voice & Upload & Send */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-1.5 sm:gap-2 bg-white p-2 rounded-2xl border border-slate-300 shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 flex-shrink-0"
      >
        {/* Document Upload Button (Phases 14, 15) */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingDoc || isLoading}
          className="p-2.5 rounded-xl text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
          title="Upload medical report or prescription (PDF, JPG, PNG)"
          aria-label="Upload medical report or prescription"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Camera Snap Button */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isUploadingDoc || isLoading}
          className="p-2.5 rounded-xl text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition-colors hidden sm:flex"
          title="Take photo of prescription or lab report"
          aria-label="Take photo of prescription or lab report"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Voice Input Button (Sarvam Saaras v4) */}
        <button
          type="button"
          onClick={voiceState === 'LISTENING' ? stopVoiceRecording : startVoiceRecording}
          disabled={isLoading || isUploadingDoc}
          className={`p-2.5 rounded-xl transition-all ${
            voiceState === 'LISTENING'
              ? 'bg-rose-600 text-white animate-pulse'
              : 'text-slate-500 hover:text-teal-700 hover:bg-teal-50'
          }`}
          title={voiceState === 'LISTENING' ? 'Stop listening' : 'Speak to Health Copilot'}
          aria-label="Speak to Health Copilot"
        >
          {voiceState === 'LISTENING' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Query Input */}
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask Copilot about medications, test reports, or upload a document..."
          className="flex-1 text-xs sm:text-sm bg-transparent border-none outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400 px-2"
        />

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!inputQuery.trim() || isLoading}
          className="rounded-xl px-3.5 sm:px-4"
          aria-label="Send query"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
};

export default CopilotPage;
