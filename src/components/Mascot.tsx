import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Mic, Volume2, X, Send } from 'lucide-react';
import { getMentorResponse } from '../geminiService';
import { useAuth } from '../AuthContext';
import { useAccessibility } from '../AccessibilityContext';

export const Mascot: React.FC = () => {
  const { profile } = useAuth();
  const { speak } = useAccessibility();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: `Hi ${profile?.name || 'there'}! I'm your EduMentor. How can I help you grow today?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    const history = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    const response = await getMentorResponse(history, userMsg, profile);
    setMessages(prev => [...prev, { role: 'model', text: response || '' }]);
    setIsTyping(false);
    
    if (response) speak(response);
  };

  const startVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.start();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl overflow-hidden border border-indigo-100 flex flex-col h-[500px]"
          >
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  🎓
                </div>
                <span className="font-fredoka font-medium">EduMentor Chat</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    m.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-indigo-50 text-slate-800 rounded-tl-none'
                  }`}>
                    <p className="text-sm">{m.text}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-none animate-pulse">
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2">
              <button onClick={startVoiceInput} className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-colors">
                <Mic size={20} />
              </button>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask your mentor..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button onClick={handleSend} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors">
                <Send size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className="w-16 h-16 rounded-full bg-white shadow-xl border-4 border-indigo-500 cursor-pointer flex items-center justify-center overflow-hidden"
        >
          {/* Animated Mascot Placeholder */}
          <motion.div
            animate={{ 
              rotate: [0, 5, -5, 0],
              y: [0, -4, 0]
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="text-4xl"
          >
            🧑‍🏫
          </motion.div>
        </motion.div>
        
        {/* Animated Ruler */}
        <motion.div
           animate={{ rotate: [45, 60, 45] }}
           transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
           className="absolute -top-2 -left-2 text-2xl"
        >
          📏
        </motion.div>
      </div>
    </div>
  );
};
