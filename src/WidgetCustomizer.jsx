import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
    MessageSquare, Mic, Send, X, Sparkles, User
} from 'lucide-react';

const WidgetCustomizer = ({ config, clientId }) => {
    // Hardcoded for Demo
    const previewOpen = true;
    const [isPreviewOpen, setIsPreviewOpen] = useState(true);

    // Real Chat State (Test Tab)
    const [realMessages, setRealMessages] = useState([]);
    const [realInputValue, setRealInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([]);
    const [isRecording, setIsRecording] = useState(false);

    // Refs for scrolling
    const chatContainerRef = useRef(null);
    const lastBotMessageRef = useRef(null);

    // Default values if config is missing properties
    const widgetConfig = {
        primaryColor: config.primaryColor || '#3460F6',
        backgroundColor: config.backgroundColor || '#ffffff',
        textColor: config.textColor || '#1f2937',
        position: config.position || 'bottom-right',
        welcomeMessage: config.welcomeMessage || '¡Hola! ¿En qué puedo ayudarte hoy?',
        displayName: config.displayName || 'Asistente Virtual',
        logoUrl: config.logoUrl || '',
        ctaText: config.ctaText || '',
        voiceInput: config.voiceInput !== undefined ? config.voiceInput : true,
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
        // If typing, always scroll to bottom to show the indicator
        if (isTyping && chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            return;
        }

        const lastMsg = realMessages[realMessages.length - 1];
        if (!lastMsg) return;

        if (lastMsg.isUser) {
            // User message: scroll to bottom
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
            }
        } else {
            // Bot message: scroll to START of the message
            // Small delay to ensure layout is complete
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
                // Determine API URL based on environment (simplification for demo)
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
                className={`absolute ${widgetConfig.position === 'bottom-right' ? 'right-6' : 'left-6'} bottom-24 w-[350px] h-[450px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 z-40`}
                style={{ fontFamily: 'Inter, sans-serif' }}
            >
                {/* Widget Header */}
                <div
                    className="p-4 flex items-center justify-between text-white"
                    style={{ backgroundColor: widgetConfig.primaryColor }}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm overflow-hidden">
                            {widgetConfig.logoUrl ? (
                                <img src={widgetConfig.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <MessageSquare size={18} />
                            )}
                        </div>
                        <div>
                            <h3 className="font-semibold text-sm">{widgetConfig.displayName}</h3>
                            <p className="text-xs opacity-80">En línea</p>
                        </div>
                    </div>
                    {/* Close button */}
                    <button
                        onClick={() => setIsPreviewOpen(false)}
                        className="opacity-80 hover:opacity-100 transition-opacity"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Widget Body */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 p-4 overflow-y-auto space-y-4 scroll-smooth"
                    style={{ backgroundColor: widgetConfig.backgroundColor }}
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
                                    className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.isUser ? 'rounded-tr-none text-white' : 'rounded-tl-none border border-gray-100'}`}
                                    style={{
                                        backgroundColor: msg.isUser ? widgetConfig.primaryColor : '#f3f4f6',
                                        color: msg.isUser ? '#ffffff' : '#1f2937'
                                    }}
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
                            <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-none border border-gray-100 flex gap-1.5 items-center">
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
                </div>

                {/* Widget Input Area */}
                <div className="p-3 border-t border-gray-100 bg-white flex items-center gap-2">
                    <input
                        type="text"
                        value={realInputValue}
                        onChange={(e) => setRealInputValue(e.target.value)}
                        onKeyDown={handleRealSendMessage}
                        placeholder="Escribe un mensaje..."
                        disabled={isRecording}
                        className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50 text-gray-800"
                        style={{ '--tw-ring-color': widgetConfig.primaryColor }}
                    />
                    {widgetConfig.voiceInput && (
                        <button
                            onClick={handleVoiceInput}
                            className={`p-2 transition-colors ${isRecording
                                ? 'text-red-500 animate-pulse'
                                : 'text-gray-600 hover:text-gray-800'
                                }`}
                        >
                            <Mic size={20} />
                        </button>
                    )}
                    <button
                        onClick={handleRealSendMessage}
                        className="p-2 rounded-full text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: widgetConfig.primaryColor }}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)]">
            {/* Left Panel: Info Only */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-[#30363d] bg-[#0d1117]/50">
                    <h3 className="text-white font-medium flex items-center gap-2"><MessageSquare size={16} /> Chat de Prueba</h3>
                </div>

                <div className="flex-1 p-6 space-y-6 flex flex-col items-center justify-center text-center">
                    <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-200 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
                            <Sparkles className="text-yellow-400" size={20} /> Entorno de Pruebas
                        </h3>
                        <p className="text-sm mb-4">
                            Aquí puedes interactuar con tu chatbot en tiempo real. Utiliza tu configuración actual y conecta con tu base de conocimientos.
                        </p>
                        <div className="flex gap-2 flex-wrap justify-center">
                            <div className="px-3 py-1 bg-blue-500/20 rounded-full text-xs font-mono">Client ID: {clientId}</div>
                            <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-mono">Estado: Conectado</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Live Preview */}
            <div className="bg-[#0d1117] rounded-xl border border-[#30363d] relative overflow-hidden flex flex-col bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                {/* Mock Website Content - Fixed at top */}
                <div className="relative z-10 text-center space-y-2 pt-8 pb-4 px-8">
                    <h2 className="text-3xl font-bold text-white drop-shadow-2xl">Tu Sitio Web</h2>
                    <p className="text-gray-200 drop-shadow-lg text-sm">
                        Modo de Prueba: Interactúa con el widget real.
                    </p>
                </div>

                {/* The Widget Preview */}
                <AnimatePresence>
                    {isPreviewOpen && renderWidgetUI()}
                </AnimatePresence>

                {/* Toggle Button (Launcher) */}
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                    className={`absolute ${widgetConfig.position === 'bottom-right' ? 'right-6' : 'left-6'} bottom-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white z-20`}
                    style={{ backgroundColor: widgetConfig.primaryColor }}
                >
                    {isPreviewOpen ? <X size={24} /> : (
                        widgetConfig.logoUrl ? (
                            <img src={widgetConfig.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-full" />
                        ) : (
                            <MessageSquare size={24} />
                        )
                    )}
                </motion.button>
            </div>
        </div>
    );
};

export default WidgetCustomizer;
