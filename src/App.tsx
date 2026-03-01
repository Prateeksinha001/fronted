/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';

// --- Types ---

interface PIIField {
  label: string;
  value: string;
}

interface Report {
  id: string;
  msgId: number;
  type: 'PII' | 'RESPONSE';
  piiFields?: PIIField[];
  redactedText?: string;
  intent?: 'BENIGN' | 'MALICIOUS';
  format?: string;
  tokens?: number;
  latency?: string;
  lang?: string;
  complianceScore?: number;
  biasDetection?: number;
  toxicity?: number;
}

interface Message {
  id: number;
  role: 'user' | 'bot';
  text: string;
  timestamp: string;
  badges: string[];
}

// --- Constants & Regex ---

const PII_REGEX = {
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  PHONE: /(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/g,
  NAME_INTRO: /my name is ([A-Z][a-z]+ [A-Z][a-z]+)/gi,
};

const INITIAL_MESSAGES: Message[] = [
  { id: 1, role: 'bot', text: 'SYSTEM INITIALIZED. NEUROCHAT FRAMEWORK V0.1 ONLINE.', timestamp: '22:57:01', badges: ['FRAMEWORK'] },
  { id: 2, role: 'user', text: 'Hello, I need to test the PII detection system. My email is test@example.com.', timestamp: '22:57:15', badges: ['PII DETECTED'] },
  { id: 3, role: 'bot', text: 'PII DETECTED IN MESSAGE #2. REDACTION PROTOCOLS APPLIED. COMPLIANCE SCORE: 98%.', timestamp: '22:57:16', badges: ['COMPLIANT'] },
];

const INITIAL_REPORTS: Report[] = [
  {
    id: 'r1',
    msgId: 2,
    type: 'PII',
    piiFields: [{ label: 'EMAIL', value: 'test@example.com' }],
    redactedText: 'Hello, I need to test the PII detection system. My email is ██████████████████.',
    intent: 'BENIGN'
  },
  {
    id: 'r2',
    msgId: 3,
    type: 'RESPONSE',
    format: 'TEXT/PLAIN',
    tokens: 42,
    latency: '1.2s',
    lang: 'EN-US',
    complianceScore: 98,
    biasDetection: 4,
    toxicity: 1
  }
];

const IT_LAWS = [
  { icon: '🇪🇺', title: 'GDPR Article 5', desc: 'Principles relating to processing of personal data.', status: 'APPLIED', color: 'text-emerald-400' },
  { icon: '🇺🇸', title: 'CCPA Section 1798', desc: 'California Consumer Privacy Act compliance.', status: 'ACTIVE', color: 'text-emerald-400' },
  { icon: '🔒', title: 'HIPAA Safe Harbor', desc: 'De-identification of protected health information.', status: 'CLEAR', color: 'text-emerald-400' },
  { icon: '⚠️', title: 'IT Act 2000 §43A', desc: 'Compensation for failure to protect data.', status: 'TRIGGERED', color: 'text-amber-400' },
  { icon: '🌐', title: 'DPDP Act 2023 India', desc: 'Digital Personal Data Protection Act.', status: 'PASSED', color: 'text-emerald-400' },
];

// --- Helper Functions ---

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const detectPII = (text: string) => {
  const fields: PIIField[] = [];
  let redacted = text;

  const matches = {
    EMAIL: text.match(PII_REGEX.EMAIL),
    PHONE: text.match(PII_REGEX.PHONE),
    SSN: text.match(PII_REGEX.SSN),
    CREDIT_CARD: text.match(PII_REGEX.CREDIT_CARD),
  };

  Object.entries(matches).forEach(([label, found]) => {
    if (found) {
      found.forEach(val => {
        fields.push({ label, value: val });
        redacted = redacted.replace(val, '██████████');
      });
    }
  });

  // Name intro check
  let nameMatch;
  while ((nameMatch = PII_REGEX.NAME_INTRO.exec(text)) !== null) {
    fields.push({ label: 'NAME', value: nameMatch[1] });
    redacted = redacted.replace(nameMatch[1], '██████████');
  }

  return { fields, redacted };
};

// --- Components ---

export default function App() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [reports, setReports] = useState<Report[]>(INITIAL_REPORTS);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [piiHits, setPiiHits] = useState(1);
  const [selectedModel, setSelectedModel] = useState('Gemini Pro');

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setSessionTime(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsgId = messages.length + 1;
    const { fields, redacted } = detectPII(input);
    const hasPII = fields.length > 0;

    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      badges: hasPII ? ['PII DETECTED'] : ['COMPLIANT']
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');

    if (hasPII) {
      setPiiHits(prev => prev + fields.length);
      setReports(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        msgId: userMsgId,
        type: 'PII',
        piiFields: fields,
        redactedText: redacted,
        intent: 'BENIGN'
      }, ...prev]);
    }

    setIsTyping(true);
    
    // Simulate bot response
    setTimeout(() => {
      const botMsgId = userMsgId + 1;
      let responseText = "FRAMEWORK ACKNOWLEDGED. REQUEST PROCESSED UNDER STANDARD COMPLIANCE PROTOCOLS.";
      const lowerInput = input.toLowerCase();

      if (lowerInput.includes('gdpr')) responseText = "GDPR ARTICLE 5 COMPLIANCE VERIFIED. DATA MINIMIZATION PRINCIPLES APPLIED.";
      else if (lowerInput.includes('ccpa')) responseText = "CCPA SECTION 1798 PROTOCOLS ACTIVE. CONSUMER PRIVACY RIGHTS PROTECTED.";
      else if (lowerInput.includes('hipaa')) responseText = "HIPAA SAFE HARBOR DE-IDENTIFICATION STANDARDS MET. PHI PROTECTION ACTIVE.";
      else if (lowerInput.includes('ssn')) responseText = "SENSITIVE IDENTIFIER (SSN) DETECTED. IMMEDIATE REDACTION AND ENCRYPTION TRIGGERED.";
      else if (lowerInput.includes('breach')) responseText = "BREACH PENALTY CALCULATOR INITIALIZED. IT ACT 2000 §43A LIABILITY ASSESSMENT UNDERWAY.";
      else if (lowerInput.includes('dpdp')) responseText = "DPDP ACT 2023 (INDIA) CONSENT FRAMEWORK APPLIED. FIDUCIARY OBLIGATIONS ACTIVE.";

      const botMsg: Message = {
        id: botMsgId,
        role: 'bot',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        badges: ['COMPLIANT', 'FRAMEWORK']
      };

      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);

      setReports(prev => [{
        id: Math.random().toString(36).substr(2, 9),
        msgId: botMsgId,
        type: 'RESPONSE',
        format: 'TEXT/PLAIN',
        tokens: Math.floor(Math.random() * 100) + 20,
        latency: (Math.random() * 1.4 + 0.8).toFixed(1) + 's',
        lang: 'EN-US',
        complianceScore: Math.floor(Math.random() * 14) + 85,
        biasDetection: Math.floor(Math.random() * 22),
        toxicity: Math.floor(Math.random() * 2)
      }, ...prev]);
    }, 1500);
  };

  return (
    <div className="w-screen h-screen bg-[#0a0c10] text-[#e1e1e1] font-['JetBrains_Mono'] overflow-hidden flex flex-col relative">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Syne:wght@700;800&display=swap');

        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        .crt-overlay::after {
          content: " ";
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          background: repeating-linear-gradient(
            rgba(18, 16, 16, 0) 0%,
            rgba(18, 16, 16, 0.05) 50%,
            rgba(18, 16, 16, 0) 100%
          );
          background-size: 100% 4px;
          z-index: 100;
          pointer-events: none;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e2435;
          border-radius: 10px;
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fadeUp 0.3s ease-out forwards;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .animate-pulse-slow {
          animation: pulse 2s infinite;
        }

        @keyframes bounce-dot {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .dot-bounce {
          animation: bounce-dot 1.4s infinite ease-in-out both;
        }
        .dot-bounce:nth-child(1) { animation-delay: -0.32s; }
        .dot-bounce:nth-child(2) { animation-delay: -0.16s; }
      `}</style>

      <div className="crt-overlay absolute inset-0 pointer-events-none z-50"></div>

      {/* Header */}
      <header className="h-16 border-b border-[#1e2435] bg-[#0e1118] px-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-600 flex items-center justify-center text-white text-xl">
            ⚡
          </div>
          <div className="flex flex-col">
            <h1 className="font-['Syne'] text-xl font-extrabold bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent leading-none">
              NeuroChat
            </h1>
            <span className="text-[10px] text-cyan-400/60 font-bold tracking-widest mt-1">
              FRAMEWORK v0.1 <span className="bg-cyan-400/10 px-1 rounded">BETA</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-emerald-400/5 border border-emerald-400/20 px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
            <span className="text-[10px] font-bold text-emerald-400 tracking-wider">FRAMEWORK ACTIVE</span>
          </div>

          <div className="relative group">
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[#141820] border border-[#1e2435] text-[11px] px-4 py-2 rounded focus:outline-none focus:border-cyan-400/50 appearance-none cursor-pointer pr-10"
            >
              <option>GPT-4o</option>
              <option>Claude 3.5</option>
              <option>Gemini Pro</option>
              <option>Llama 3</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-cyan-400/50 text-[8px]">▼</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel - Conversation */}
        <section className="flex-1 flex flex-col border-r border-[#1e2435] bg-[#0a0c10]">
          <div className="h-12 border-b border-[#1e2435] flex items-center justify-between px-6 bg-[#0e1118]/50">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[3px] text-[#4a5568]">CONVERSATION</span>
              <div className="bg-cyan-400/10 text-cyan-400 text-[8px] px-1.5 py-0.5 rounded font-bold">LIVE</div>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-4 animate-fade-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-sm ${msg.role === 'user' ? 'bg-gradient-to-br from-violet-500 to-fuchsia-600' : 'bg-gradient-to-br from-cyan-400 to-blue-600'}`}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className={`flex flex-col max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[9px] text-[#4a5568]">{msg.timestamp}</span>
                    {msg.badges.map((badge, i) => (
                      <span key={i} className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                        badge === 'PII DETECTED' ? 'bg-red-400/10 text-red-400' :
                        badge === 'COMPLIANT' ? 'bg-emerald-400/10 text-emerald-400' :
                        'bg-cyan-400/10 text-cyan-400'
                      }`}>
                        {badge}
                      </span>
                    ))}
                  </div>
                  <div className={`p-4 text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-[12px_4px_12px_12px]' 
                      : 'bg-[#141820] border border-[#1e2435] rounded-[4px_12px_12px_12px]'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-4 animate-fade-up">
                <div className="w-8 h-8 rounded shrink-0 flex items-center justify-center text-sm bg-gradient-to-br from-cyan-400 to-blue-600">
                  🤖
                </div>
                <div className="flex flex-col items-start">
                  <div className="bg-[#141820] border border-[#1e2435] rounded-[4px_12px_12px_12px] p-4 flex gap-1">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full dot-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full dot-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full dot-bounce"></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-6 border-t border-[#1e2435] bg-[#0e1118]/30">
            <div className="flex flex-wrap gap-2 mb-4">
              {['GDPR rights', 'CCPA', 'PII test', 'breach penalties', 'HIPAA', 'DPDP Act'].map(hint => (
                <button 
                  key={hint}
                  onClick={() => setInput(prev => prev + (prev ? ' ' : '') + hint)}
                  className="text-[9px] bg-[#141820] border border-[#1e2435] px-2.5 py-1 rounded hover:border-cyan-400/50 hover:text-cyan-400 transition-colors"
                >
                  {hint}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Enter message for framework analysis..."
                  className="w-full bg-[#0a0c10] border border-[#1e2435] rounded-lg p-4 text-xs focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all resize-none h-24 custom-scrollbar"
                />
              </div>
              <button 
                onClick={handleSend}
                className="bg-gradient-to-br from-cyan-400 to-blue-600 text-white px-8 rounded-lg font-bold text-xs hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:-translate-y-0.5 transition-all active:translate-y-0"
              >
                SEND
              </button>
            </div>
          </div>
        </section>

        {/* Right Panel */}
        <aside className="w-[420px] flex flex-col bg-[#0e1118] border-l border-[#1e2435]">
          {/* Top: Framework Report */}
          <div className="flex-[1.3] flex flex-col overflow-hidden">
            <div className="h-12 border-b border-[#1e2435] flex items-center px-6 bg-[#0a0c10]/30 shrink-0">
              <span className="text-[10px] font-bold tracking-[3px] text-[#4a5568]">FRAMEWORK REPORT</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {reports.length === 0 && (
                <div className="h-full flex items-center justify-center text-[#4a5568] text-[10px] italic">
                  WAITING FOR DATA INPUT...
                </div>
              )}
              {reports.map((report) => (
                <div key={report.id} className="bg-[#141820] border border-[#1e2435] rounded-lg overflow-hidden animate-fade-up">
                  <div className="px-4 py-2 bg-[#1e2435]/30 border-b border-[#1e2435] flex items-center justify-between">
                    <span className="text-[9px] font-bold text-cyan-400">
                      {report.type === 'PII' ? `🔍 PII Detection — MSG #${report.msgId}` : `📊 Response Format — MSG #${report.msgId}`}
                    </span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                      report.type === 'PII' ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'
                    }`}>
                      {report.type === 'PII' ? `${report.piiFields?.length} FIELDS` : 'COMPLIANT'}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {report.type === 'PII' ? (
                      <>
                        <div className="space-y-2">
                          {report.piiFields?.map((field, i) => (
                            <div key={i} className="flex items-center justify-between">
                              <span className="text-[9px] text-[#4a5568]">{field.label}</span>
                              <span className="text-[9px] text-red-400 bg-red-400/5 px-2 py-0.5 rounded border border-red-400/10">██████████</span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t border-[#1e2435] flex items-center justify-between">
                          <span className="text-[9px] text-[#4a5568]">INTENT</span>
                          <span className="text-[9px] text-emerald-400 font-bold">{report.intent}</span>
                        </div>
                        <div className="bg-[#0a0c10] p-2 rounded text-[9px] text-[#4a5568] leading-relaxed italic">
                          {report.redactedText}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[8px] text-[#4a5568] block mb-1">FORMAT</span>
                            <span className="text-[10px] text-white">{report.format}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-[#4a5568] block mb-1">TOKENS</span>
                            <span className="text-[10px] text-white">{report.tokens}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-[#4a5568] block mb-1">LATENCY</span>
                            <span className="text-[10px] text-white">{report.latency}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-[#4a5568] block mb-1">LANG</span>
                            <span className="text-[10px] text-white">{report.lang}</span>
                          </div>
                        </div>
                        <div className="space-y-3 pt-2">
                          <div>
                            <div className="flex justify-between text-[8px] mb-1">
                              <span className="text-[#4a5568]">COMPLIANCE SCORE</span>
                              <span className="text-cyan-400">{report.complianceScore}%</span>
                            </div>
                            <div className="h-1 bg-[#0a0c10] rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-cyan-400 to-teal-400" style={{ width: `${report.complianceScore}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[8px] mb-1">
                              <span className="text-[#4a5568]">BIAS DETECTION</span>
                              <span className="text-red-400">{report.biasDetection}% ({report.biasDetection! > 15 ? 'MEDIUM' : 'LOW'})</span>
                            </div>
                            <div className="h-1 bg-[#0a0c10] rounded-full overflow-hidden">
                              <div className="h-full bg-red-400" style={{ width: `${report.biasDetection}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[8px] mb-1">
                              <span className="text-[#4a5568]">TOXICITY</span>
                              <span className="text-amber-400">{report.toxicity}%</span>
                            </div>
                            <div className="h-1 bg-[#0a0c10] rounded-full overflow-hidden">
                              <div className="h-full bg-amber-400" style={{ width: `${report.toxicity}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: IT Law Metadata */}
          <div className="flex-1 flex flex-col border-t border-[#1e2435] overflow-hidden">
            <div className="h-12 border-b border-[#1e2435] flex items-center px-6 bg-[#0a0c10]/30 shrink-0">
              <span className="text-[10px] font-bold tracking-[3px] text-[#4a5568]">IT LAW METADATA</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {IT_LAWS.map((law, i) => (
                <div key={i} className="p-3 bg-[#141820] border border-[#1e2435] rounded hover:border-cyan-400/20 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{law.icon}</span>
                      <span className="text-[10px] font-bold text-white">{law.title}</span>
                    </div>
                    <span className={`text-[8px] font-bold ${law.color}`}>{law.status}</span>
                  </div>
                  <p className="text-[9px] text-[#4a5568] leading-tight">{law.desc}</p>
                </div>
              ))}
            </div>

            {/* Stats Bar */}
            <div className="h-16 border-t border-[#1e2435] bg-[#0a0c10] grid grid-cols-4 divide-x divide-[#1e2435] shrink-0">
              <div className="flex flex-col items-center justify-center">
                <span className="text-[8px] text-[#4a5568] mb-1">MESSAGES</span>
                <span className="text-[11px] font-bold text-cyan-400">{messages.length}</span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-[8px] text-[#4a5568] mb-1">PII HITS</span>
                <span className="text-[11px] font-bold text-red-400">{piiHits}</span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-[8px] text-[#4a5568] mb-1">COMPLIANT</span>
                <span className="text-[11px] font-bold text-emerald-400">94%</span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-[8px] text-[#4a5568] mb-1">SESSION</span>
                <span className="text-[11px] font-bold text-amber-400">{formatTime(sessionTime)}</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
