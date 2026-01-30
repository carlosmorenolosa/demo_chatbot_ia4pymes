import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
    MessageSquare, Mic, Send, X, Sparkles, User
} from 'lucide-react';

const WidgetCustomizer = ({ config, clientId }) => {
    // Hardcoded for Demo: Always open, no toggle button visible (or maybe just open by default and fixed)
    // The user wants "quita todo lo que hay y que solo esté el chatbot". 
    // And "que siga siendo de icono flotante y que se abre". 
    // So we will keep the floating logic but maybe present it better on the page.
    // However, if we remove ALL context, the floating icon over WHITE background might look weird. 
    // Let's make a clean, modern background for the "Probar Page" itself so the widget pops.

    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // Real Chat State (Test Tab)
    const [realMessages, setRealMessages] = useState([]);
    const [realInputValue, setRealInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [isRecording, setIsRecording] = useState(false);

    // Refs for scrolling
    const chatContainerRef = useRef(null);
    const lastBotMessageRef = useRef(null);

    // Widget Configuration - PymerIA Defaults
    const widgetConfig = {
        primaryColor: '#1E40AF', // Strong Blue (Cobalt/Royal Blue approx)
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        position: 'bottom-right',
        welcomeMessage: '¡Hola! 👋 ¿Qué tareas repetitivas te quitan más tiempo cada día?', // Matching image text roughly
        displayName: 'PymerIA',
        logoUrl: '', // We will implement the custom logo icon in code as per image
        ctaText: '',
        voiceInput: true,
    };

    // Initialize real chat
    useEffect(() => {
        if (realMessages.length === 0) {
            setRealMessages([{ text: widgetConfig.welcomeMessage, isUser: false }]);
            setConversationHistory([{ role: 'model', content: widgetConfig.welcomeMessage }]);
        }
    }, [widgetConfig.welcomeMessage]);

    // --- SCROLL LOGIC ---
    useEffect(() => {
        if (isTyping && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            return;
        }

        const lastMsg = realMessages[realMessages.length - 1];
        if (!lastMsg) return;

        if (lastMsg.isUser) {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        } else {
            setTimeout(() => {
                if (lastBotMessageRef.current) {
                    lastBotMessageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
                }
            }, 50);
        }
    }, [realMessages, isTyping]);


    // Real Chat Logic
    const handleRealSendMessage = async (e) => {
        if ((e.key === 'Enter' || e.type === 'click') && realInputValue.trim()) {
            const userText = realInputValue;
            const newUserMsg = { text: userText, isUser: true };

            setRealMessages(prev => [...prev, newUserMsg]);
            setRealInputValue('');
            setIsTyping(true);

            try {
                // Production URL or Env Var
                const response = await fetch('https://pdypyzvqrhkbu4kl2ff4d7u6za0ntffy.lambda-url.eu-west-1.on.aws/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        clientId: clientId || 'test-client-123',
                        query: userText,
                        history: conversationHistory
                    })
                });

                if (!response.ok) throw new Error('Error en la red');

                const data = await response.json();
                const botResponse = data.response;

                setRealMessages(prev => [...prev, { text: botResponse, isUser: false }]);
                setConversationHistory(prev => [
                    ...prev,
                    { role: 'user', content: userText },
                    { role: 'model', content: botResponse }
                ]);
            } catch (error) {
                console.error("Error al chatear:", error);
                setRealMessages(prev => [...prev, { text: "Lo siento, hubo un error al conectar con el servidor.", isUser: false }]);
            } finally {
                setIsTyping(false);
            }
        }
    };

    // Voice Input Handler
    const handleVoiceInput = () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Tu navegador no soporta reconocimiento de voz. Prueba con Chrome.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsRecording(true);
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setRealInputValue(transcript);
            setIsRecording(false);
        };

        recognition.onerror = () => {
            setIsRecording(false);
        };

        recognition.onend = () => {
            setIsRecording(false);
        };

        recognition.start();
    };

    // Helper to render the widget UI
    const renderWidgetUI = () => {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className={`fixed sm:absolute bottom-6 sm:bottom-24 right-6 sm:right-6 w-[90vw] sm:w-[380px] h-[550px] bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-border/50 z-40`}
                style={{ fontFamily: 'Inter, sans-serif' }}
            >
                {/* Widget Header - Custom PymerIA Style */}
                <div className="p-5 flex items-center justify-between bg-white border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {/* Custom Icon Circle */}
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md relative overflow-hidden"
                            style={{ backgroundColor: widgetConfig.primaryColor }}>
                            {/* Simplified speech bubble icon */}
                            <MessageSquare size={20} fill="white" className="relative z-10" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 tracking-tight">{widgetConfig.displayName}</h3>
                            {/* <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> En línea
                            </p> */}
                        </div>
                    </div>
                    {/* Close button */}
                    <button
                        onClick={() => setIsPreviewOpen(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 p-1.5 rounded-full"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Widget Body */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 p-5 overflow-y-auto space-y-5 scroll-smooth bg-gray-50/50"
                >
                    {realMessages.map((msg, idx) => {
                        const isLast = idx === realMessages.length - 1;
                        return (
                            <div
                                key={idx}
                                ref={isLast && !msg.isUser ? lastBotMessageRef : null}
                                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${msg.isUser
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-blue-50/80 text-gray-800 rounded-tl-sm border border-blue-100/50'
                                        }`}
                                >
                                    {msg.isUser ? (
                                        msg.text
                                    ) : (
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                                                em: ({ children }) => <em className="italic">{children}</em>,
                                                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                                li: ({ children }) => <li>{children}</li>,
                                                code: ({ children }) => <code className="bg-black/10 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                                a: ({ href, children }) => <a href={href} className="text-blue-600 underline hover:text-blue-800" target="_blank" rel="noopener noreferrer">{children}</a>
                                            }}
                                        >
                                            {msg.text}
                                        </ReactMarkdown>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-gray-100/50 p-4 rounded-2xl rounded-tl-sm border border-gray-100 flex gap-1.5 items-center">
                                {[0, 1, 2].map((i) => (
                                    <motion.div
                                        key={i}
                                        className="w-2 h-2 bg-gray-400 rounded-full"
                                        animate={{ y: [0, -6, 0] }}
                                        transition={{
                                            duration: 0.6,
                                            repeat: Infinity,
                                            delay: i * 0.15,
                                            ease: "easeInOut"
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Invisible spacer for scroll */}
                    <div className="h-2"></div>
                </div>

                {/* Widget Input Area - PymerIA Style */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <div className="flex items-center gap-2 relative">
                        <input
                            type="text"
                            value={realInputValue}
                            onChange={(e) => setRealInputValue(e.target.value)}
                            onKeyDown={handleRealSendMessage}
                            placeholder="Escribe tu mensaje..."
                            disabled={isRecording}
                            className="flex-1 bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-[15px] focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 text-gray-800 transition-all placeholder:text-gray-400"
                        />

                        {widgetConfig.voiceInput && !realInputValue && (
                            <button
                                onClick={handleVoiceInput}
                                className={`absolute right-14 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors ${isRecording ? 'text-red-500 animate-pulse' : ''}`}
                            >
                                <Mic size={20} />
                            </button>
                        )}

                        <button
                            onClick={handleRealSendMessage}
                            className={`p-3 rounded-xl text-white shadow-lg shadow-blue-500/30 transition-all hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 flex items-center justify-center`}
                            style={{ backgroundColor: widgetConfig.primaryColor }}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                    {/* Small branding footer */}
                    {/* <div className="text-center mt-2">
                        <span className="text-[10px] text-gray-300 font-medium">Powered by PymerIA</span>
                    </div> */}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="relative h-[calc(100vh-140px)] w-full overflow-hidden bg-slate-50/50 flex flex-col items-center justify-center">
            {/* Background Elements to make it look 'premium' without images */}

            {/* CLEAN BACKGROUND */}
            {/* <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-blue-50/30"></div> */}

            {/* If the user wants "only the chatbot", maybe we center the chat bubble launcher? 
                Or we just show the background and the floating launcher in the corner as usual.
                Let's stick to floating launcher in corner, but empty clean background.
            */}

            {/* Text Hint */}
            {!isPreviewOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-4"
                >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 text-blue-600 mb-4 animate-bounce">
                        <MessageSquare size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Demo Interactiva</h2>
                    <p className="text-slate-500 max-w-md mx-auto">
                        Haz clic en el icono flotante de la esquina inferior derecha para probar <span className="font-bold text-blue-600">PymerIA</span>.
                    </p>
                </motion.div>
            )}

            {/* Launcher Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                className={`absolute bottom-8 right-8 w-16 h-16 rounded-full shadow-2xl shadow-blue-600/30 flex items-center justify-center text-white z-50 transition-transform`}
                style={{ backgroundColor: widgetConfig.primaryColor }}
            >
                {isPreviewOpen ? <X size={28} /> : (
                    <MessageSquare size={28} fill="white" />
                )}
            </motion.button>

            {/* The Widget Popup */}
            <AnimatePresence>
                {isPreviewOpen && renderWidgetUI()}
            </AnimatePresence>

        </div>
    );
};

export default WidgetCustomizer;
