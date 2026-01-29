import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
    Activity, MessageSquare, Clock, TrendingUp, Calendar,
    BrainCircuit, Sparkles, AlertTriangle, Zap, Target,
    Search, Sun, CalendarDays, BarChart3, X, Download, RefreshCw, Info, ChevronDown
} from 'lucide-react';

// --- CONFIGURACIÓN (from environment variables) ---
const LAMBDA_ANALYTICS_URL = import.meta.env.VITE_LAMBDA_ANALYTICS;
const LAMBDA_QUALITATIVE_URL = import.meta.env.VITE_LAMBDA_QUALITATIVE;
const LAMBDA_HISTORY_URL = import.meta.env.VITE_LAMBDA_HISTORY;

// --- UTILIDADES DE ESTILO ---
const GLASS_PANEL = "bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]";
const NEON_TEXT = "bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400";

const AnalyticsPage = ({ clientId, channel = 'web', highlightConversationId = null, onConversationViewed = null }) => {
    // Estado para Analíticas Generales
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estado para Analíticas Cualitativas
    const [qualitativeData, setQualitativeData] = useState(null);
    const [qualitativeLoading, setQualitativeLoading] = useState(true);
    const [qualitativeError, setQualitativeError] = useState(null);

    // Estado para Historial
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);
    const [activeTab, setActiveTab] = useState('resumen'); // 'resumen' | 'historial'
    const [selectedConversation, setSelectedConversation] = useState(null);

    // Estado para búsqueda en historial
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Estado para paginación
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPagination, setHistoryPagination] = useState({ hasMore: false, total: 0, page: 1 });
    const [loadingMore, setLoadingMore] = useState(false);

    // Estado para refresh y filtro de fechas
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [dateFilter, setDateFilter] = useState({ from: '', to: '' });

    // Effect para manejar navegación desde Leads
    useEffect(() => {
        if (highlightConversationId) {
            // Cambiar a tab de historial
            setActiveTab('historial');
            // Limpiar el highlight después de un momento
            if (onConversationViewed) {
                setTimeout(() => onConversationViewed(), 1000);
            }
        }
    }, [highlightConversationId]);

    // Auto-seleccionar conversación cuando historyData se carga y hay highlightConversationId
    useEffect(() => {
        if (highlightConversationId && historyData.length > 0 && !selectedConversation) {
            console.log('Looking for conversation:', highlightConversationId);
            console.log('Available conversations:', historyData.map(c => c.conversationId));

            // Buscar la conversación por su ID (exacto o parcial)
            let matchingConv = historyData.find(conv =>
                conv.conversationId === highlightConversationId
            );

            // Si no hay coincidencia exacta, buscar coincidencia parcial
            if (!matchingConv) {
                matchingConv = historyData.find(conv =>
                    conv.conversationId && (
                        conv.conversationId.includes(highlightConversationId) ||
                        highlightConversationId.includes(conv.conversationId)
                    )
                );
            }

            if (matchingConv) {
                console.log('Found matching conversation:', matchingConv);
                setSelectedConversation(matchingConv);
            } else {
                console.log('No matching conversation found');
            }
        }
    }, [highlightConversationId, historyData]);
    const [selectedDays, setSelectedDays] = useState(30); // 7, 30, o 90 días
    useEffect(() => {
        const idToUse = clientId || 'test-client-123';

        const fetchAnalytics = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${LAMBDA_ANALYTICS_URL}?clientId=${idToUse}&channel=${channel}&days=${selectedDays}`);
                if (!response.ok) throw new Error('Error al cargar las analíticas cuantitativas');
                const result = await response.json();
                setData(result);
                setLastUpdated(new Date());
            } catch (err) {
                console.error("Error fetching analytics:", err);
                setError(err.message);
            } finally {
                setLoading(false);
                setIsRefreshing(false);
            }
        };

        const fetchQualitativeAnalytics = async () => {
            try {
                setQualitativeLoading(true);
                const response = await fetch(`${LAMBDA_QUALITATIVE_URL}?clientId=${idToUse}&channel=${channel}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Error al cargar el análisis cualitativo');
                }
                const result = await response.json();
                setQualitativeData(result);
            } catch (err) {
                console.error("Error fetching qualitative analytics:", err);
                setQualitativeError(err.message);
            } finally {
                setQualitativeLoading(false);
            }
        };

        const fetchHistory = async (page = 1, append = false) => {
            if (activeTab !== 'historial') return;
            try {
                if (append) {
                    setLoadingMore(true);
                } else {
                    setHistoryLoading(true);
                }
                let url = `${LAMBDA_HISTORY_URL}?clientId=${idToUse}&channel=${channel}&page=${page}&limit=20`;
                if (debouncedSearch) {
                    url += `&search=${encodeURIComponent(debouncedSearch)}`;
                }
                const response = await fetch(url);
                if (!response.ok) throw new Error('Error al cargar el historial');
                const result = await response.json();

                if (append) {
                    setHistoryData(prev => [...prev, ...(result.conversations || [])]);
                } else {
                    setHistoryData(result.conversations || result);
                }
                setHistoryPagination(result.pagination || { hasMore: false, total: 0, page: 1 });
            } catch (err) {
                console.error("Error fetching history:", err);
                setHistoryError(err.message);
            } finally {
                setHistoryLoading(false);
                setLoadingMore(false);
            }
        };

        if (activeTab === 'resumen') {
            fetchAnalytics();
            fetchQualitativeAnalytics();
        } else {
            fetchHistory();
        }

    }, [clientId, activeTab, debouncedSearch, selectedDays, channel]);

    // Debounce para la búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Función para exportar historial a Excel/CSV
    const exportToExcel = () => {
        if (!historyData || historyData.length === 0) return;

        // Preparar datos para CSV
        const rows = [];
        rows.push(['Conversación ID', 'Fecha', 'Rol', 'Mensaje', 'Hora']);

        historyData.forEach(conv => {
            conv.messages.forEach(msg => {
                const date = new Date(msg.timestamp);
                rows.push([
                    conv.conversationId,
                    date.toLocaleDateString('es-ES'),
                    msg.role === 'user' ? 'Usuario' : 'Asistente',
                    `"${msg.content.replace(/"/g, '""')}"`, // Escapar comillas
                    date.toLocaleTimeString('es-ES')
                ]);
            });
        });

        // Crear CSV con BOM para Excel
        const BOM = '\uFEFF';
        const csvContent = BOM + rows.map(row => row.join(';')).join('\n');

        // Descargar archivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historial_conversaciones_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Función para refrescar datos manualmente
    const refetchData = async () => {
        const idToUse = clientId || 'test-client-123';
        setIsRefreshing(true);
        try {
            const response = await fetch(`${LAMBDA_ANALYTICS_URL}?clientId=${idToUse}&channel=${channel}`);
            if (!response.ok) throw new Error('Error al cargar las analíticas');
            const result = await response.json();
            setData(result);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Error refreshing:", err);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Función para calcular tiempo transcurrido
    const getTimeAgo = () => {
        if (!lastUpdated) return '';
        const seconds = Math.floor((new Date() - lastUpdated) / 1000);
        if (seconds < 60) return 'hace un momento';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `hace ${minutes} min`;
        return `hace ${Math.floor(minutes / 60)}h`;
    };

    if (loading && activeTab === 'resumen') return <LoadingScreen />;

    const anyError = error || qualitativeError;
    if (anyError && activeTab === 'resumen') return <ErrorScreen error={anyError} />;

    return (
        <div className="w-full h-full bg-[#050505] text-white p-4 md:p-8 font-sans overflow-y-auto relative selection:bg-purple-500/30">
            {/* Background Gradients */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                {/* Header y Tabs */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <Header
                        period={data?.period}
                        onRefresh={refetchData}
                        isRefreshing={isRefreshing}
                        timeAgo={getTimeAgo()}
                        selectedDays={selectedDays}
                        onDaysChange={setSelectedDays}
                    />
                    <div className={`${GLASS_PANEL} p-1 rounded-lg flex`}>
                        <button
                            onClick={() => setActiveTab('resumen')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'resumen' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            Resumen
                        </button>
                        <button
                            onClick={() => setActiveTab('historial')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'historial' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white'}`}
                        >
                            Historial
                        </button>
                    </div>
                </div>

                {/* VISTA RESUMEN */}
                {activeTab === 'resumen' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <KpiCard
                                title="Conversaciones Totales"
                                value={data?.totalConversations || 0}
                                icon={<MessageSquare className="w-6 h-6 text-blue-400" />}
                                trend="+12%"
                                delay={0.1}
                                color="blue"
                                tooltip="Número total de sesiones de chat iniciadas"
                            />
                            <KpiCard
                                title="Mensajes Procesados"
                                value={data?.totalMessages || 0}
                                icon={<Activity className="w-6 h-6 text-purple-400" />}
                                trend="+5%"
                                delay={0.2}
                                color="purple"
                                tooltip="Total de mensajes enviados y recibidos"
                            />
                            <KpiCard
                                title="Tiempo Medio (s)"
                                value={data?.avgResponseTimeMs ? (data.avgResponseTimeMs / 1000).toFixed(1) : "0.0"}
                                icon={<Clock className="w-6 h-6 text-pink-400" />}
                                trend="-8%"
                                isGoodTrend={true}
                                delay={0.3}
                                color="pink"
                                tooltip="Tiempo promedio que tarda la IA en responder"
                            />
                        </div>

                        {/* Main Chart Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className={`${GLASS_PANEL} rounded-2xl p-6 md:p-8 relative overflow-hidden group`}
                        >
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="flex items-center justify-between mb-8 relative z-10">
                                <div>
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <TrendingUp className="text-blue-400" />
                                        Actividad de Conversaciones
                                    </h2>
                                    <p className="text-gray-400 text-sm mt-1">Volumen diario de interacciones</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                        {selectedDays}D
                                    </button>
                                </div>
                            </div>
                            <div className="h-[350px] w-full relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data?.conversationsPerDay || []}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#6b7280"
                                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                            tickLine={false}
                                            axisLine={false}
                                            dy={10}
                                        />
                                        <YAxis
                                            stroke="#6b7280"
                                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                                            tickLine={false}
                                            axisLine={false}
                                            dx={-10}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="conversationCount"
                                            stroke="#60A5FA"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorCount)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* Segunda fila de KPIs - Nuevas métricas */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <KpiCard
                                title="Msgs por Conversación"
                                value={data?.avgMessagesPerConversation || 0}
                                icon={<BarChart3 className="w-6 h-6 text-cyan-400" />}
                                delay={0.45}
                                color="blue"
                            />
                            <KpiCard
                                title="Hora Pico"
                                value={data?.peakHour !== undefined ? `${data.peakHour}:00` : '--'}
                                icon={<Sun className="w-6 h-6 text-yellow-400" />}
                                delay={0.5}
                                color="purple"
                            />
                            <KpiCard
                                title="Día Más Activo"
                                value={data?.peakDay || '--'}
                                icon={<CalendarDays className="w-6 h-6 text-green-400" />}
                                delay={0.55}
                                color="pink"
                            />
                        </div>

                        {/* Grid de gráficos adicionales */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Gráfico de actividad por hora */}
                            <HourlyActivityChart data={data?.messagesByHour || []} />

                            {/* Gráfico de patrón semanal */}
                            <WeeklyPatternChart data={data?.weeklyPattern || []} />
                        </div>

                        {/* AI Insights Section */}
                        {qualitativeData && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-2 space-y-6">
                                    <TopicsCard topics={qualitativeData.mainTopics} />
                                    <SuggestionsCard suggestions={qualitativeData.actionSuggestions} />
                                </div>
                                <div className="lg:col-span-1">
                                    <SentimentCard sentiment={qualitativeData.sentimentAnalysis} />
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* VISTA HISTORIAL */}
                {activeTab === 'historial' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                        {/* Lista de Conversaciones */}
                        <div className={`${GLASS_PANEL} rounded-xl overflow-hidden flex flex-col`}>
                            <div className="p-4 border-b border-white/10 bg-black/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-lg">Conversaciones Recientes</h3>
                                    <button
                                        onClick={exportToExcel}
                                        disabled={historyData.length === 0}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Exportar a Excel"
                                    >
                                        <Download size={14} />
                                        Exportar
                                    </button>
                                </div>
                                {/* Buscador */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar conversaciones..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                {/* Filtro de fechas */}
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 block mb-1">Desde</label>
                                        <input
                                            type="date"
                                            value={dateFilter.from}
                                            onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-xs text-gray-500 block mb-1">Hasta</label>
                                        <input
                                            type="date"
                                            value={dateFilter.to}
                                            onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                        />
                                    </div>
                                    {(dateFilter.from || dateFilter.to) && (
                                        <button
                                            onClick={() => setDateFilter({ from: '', to: '' })}
                                            className="px-2 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                            title="Limpiar filtro"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                                {historyLoading ? (
                                    <div className="text-center py-8 text-gray-500">Cargando historial...</div>
                                ) : historyError ? (
                                    <div className="text-center py-8 text-red-400 text-sm px-4">
                                        Error al cargar historial
                                    </div>
                                ) : historyData.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">No hay conversaciones recientes.</div>
                                ) : (
                                    (() => {
                                        // Filtrar por fechas
                                        const filtered = historyData.filter(conv => {
                                            const convDate = new Date(conv.lastTimestamp);
                                            convDate.setHours(0, 0, 0, 0);
                                            if (dateFilter.from) {
                                                const fromDate = new Date(dateFilter.from);
                                                if (convDate < fromDate) return false;
                                            }
                                            if (dateFilter.to) {
                                                const toDate = new Date(dateFilter.to);
                                                toDate.setHours(23, 59, 59, 999);
                                                if (convDate > toDate) return false;
                                            }
                                            return true;
                                        });

                                        if (filtered.length === 0) {
                                            return <div className="text-center py-8 text-gray-500">No hay conversaciones en este rango de fechas.</div>;
                                        }

                                        return (
                                            <>
                                                {filtered.map((conv) => (
                                                    <div
                                                        key={conv.conversationId}
                                                        onClick={() => setSelectedConversation(conv)}
                                                        className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedConversation?.conversationId === conv.conversationId ? 'bg-white/10 border-blue-500/50' : 'hover:bg-white/5 border-transparent'}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div className="flex flex-col gap-1 text-left w-full overflow-hidden">
                                                                {conv.sender ? (
                                                                    <span className="text-xs font-medium text-green-400 truncate w-full" title={conv.sender}>
                                                                        {conv.sender.replace('whatsapp:', '')}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded w-fit">
                                                                        {conv.conversationId.slice(0, 8)}...
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(conv.lastTimestamp).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-300 line-clamp-2">
                                                            {conv.messages.find(m => m.role === 'user')?.content || "Sin mensajes"}
                                                        </p>
                                                    </div>
                                                ))}

                                                {/* Botón Cargar Más */}
                                                {historyPagination.hasMore && (
                                                    <button
                                                        onClick={() => {
                                                            const nextPage = historyPagination.page + 1;
                                                            setHistoryPage(nextPage);
                                                            const idToUse = clientId || 'test-client-123';
                                                            (async () => {
                                                                setLoadingMore(true);
                                                                try {
                                                                    let url = `${LAMBDA_HISTORY_URL}?clientId=${idToUse}&channel=${channel}&page=${nextPage}&limit=20`;
                                                                    const response = await fetch(url);
                                                                    const result = await response.json();
                                                                    setHistoryData(prev => [...prev, ...result.conversations]);
                                                                    setHistoryPagination(result.pagination);
                                                                } finally {
                                                                    setLoadingMore(false);
                                                                }
                                                            })();
                                                        }}
                                                        disabled={loadingMore}
                                                        className="w-full mt-3 py-2 px-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-sm text-blue-300 transition-colors disabled:opacity-50"
                                                    >
                                                        {loadingMore ? 'Cargando...' : `Cargar más (${historyPagination.total - historyData.length} restantes)`}
                                                    </button>
                                                )}

                                                {/* Total info */}
                                                <p className="text-xs text-gray-500 text-center mt-2">
                                                    Mostrando {historyData.length} de {historyPagination.total} conversaciones
                                                </p>
                                            </>
                                        );
                                    })()
                                )}
                            </div>
                        </div>

                        {/* Detalle del Chat */}
                        <div className={`${GLASS_PANEL} lg:col-span-2 rounded-xl overflow-hidden flex flex-col`}>
                            {selectedConversation ? (
                                <>
                                    <div className="p-4 border-b border-white/10 bg-black/20 flex justify-between items-center">
                                        <div>
                                            <h3 className="font-semibold">Detalle de Conversación</h3>
                                            <p className={`text-xs ${selectedConversation.sender ? 'text-green-400 font-medium' : 'text-gray-500 font-mono'}`}>
                                                {selectedConversation.sender ? selectedConversation.sender.replace('whatsapp:', '') : selectedConversation.conversationId}
                                            </p>
                                        </div>
                                        <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300">
                                            {selectedConversation.messages.length} mensajes
                                        </span>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/40 custom-scrollbar">
                                        {selectedConversation.messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-[#1f2937] text-gray-200 rounded-tl-none'}`}>
                                                    {msg.role === 'user' ? (
                                                        <p className="text-sm">{msg.content}</p>
                                                    ) : (
                                                        <div className="text-sm prose prose-sm prose-invert max-w-none">
                                                            <ReactMarkdown
                                                                components={{
                                                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                                                    strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                                                                    em: ({ children }) => <em className="italic">{children}</em>,
                                                                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                                                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                                                    li: ({ children }) => <li>{children}</li>,
                                                                    a: ({ href, children }) => <a href={href} className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noopener noreferrer">{children}</a>
                                                                }}
                                                            >
                                                                {msg.content}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}
                                                    <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                                                        {new Date(msg.timestamp).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                                    <MessageSquare size={48} className="mb-4 opacity-20" />
                                    <p>Selecciona una conversación para ver el detalle</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- COMPONENTES AUXILIARES ---

const PeriodSelector = ({ selectedDays, onDaysChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const options = [
        { value: 7, label: 'Últimos 7 días' },
        { value: 30, label: 'Últimos 30 días' },
        { value: 90, label: 'Últimos 90 días' }
    ];

    const selectedLabel = options.find(opt => opt.value === selectedDays)?.label || 'Seleccionar periodo';

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-[#1a1a2e] border border-purple-500/30 rounded-lg px-3 py-1.5 text-sm text-white hover:border-purple-500/60 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
                <span>{selectedLabel}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 mt-2 w-48 bg-[#1a1a2e] border border-purple-500/30 rounded-lg shadow-xl overflow-hidden z-50 backdrop-blur-xl"
                    >
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onDaysChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedDays === option.value
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Click outside backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

const Header = ({ period, onRefresh, isRefreshing, timeAgo, selectedDays, onDaysChange }) => (
    <div className="flex-1">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-2">
            Panel de <span className={NEON_TEXT}>Control</span>
        </h1>
        <p className="text-gray-400 text-lg">Visión general del rendimiento de tu asistente IA</p>
        <div className="mt-2 text-sm text-gray-500 flex items-center gap-4">
            <div className="flex items-center gap-2">
                <Calendar size={14} />
                <PeriodSelector selectedDays={selectedDays} onDaysChange={onDaysChange} />
            </div>
            {onRefresh && (
                <button
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                    <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                    <span>{isRefreshing ? 'Actualizando...' : timeAgo ? `Actualizado ${timeAgo}` : 'Actualizar'}</span>
                </button>
            )}
        </div>
    </div>
);

// Componente para animar números (count-up effect)
const AnimatedNumber = ({ value, duration = 1000 }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
        const startTime = Date.now();
        const startValue = 0;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = startValue + (numValue - startValue) * easeOut;

            setDisplayValue(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value, duration]);

    // Formatear el número
    const formatted = typeof value === 'string' && value.includes('.')
        ? displayValue.toFixed(1)
        : Math.round(displayValue).toLocaleString('es-ES');

    return <>{formatted}</>;
};

const KpiCard = ({ title, value, icon, trend, isGoodTrend = true, delay, color, tooltip }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const colors = {
        blue: "group-hover:border-blue-500/50 group-hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]",
        purple: "group-hover:border-purple-500/50 group-hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]",
        pink: "group-hover:border-pink-500/50 group-hover:shadow-[0_0_30px_-5px_rgba(236,72,153,0.3)]"
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, type: "spring", stiffness: 100 }}
            className={`${GLASS_PANEL} p-6 rounded-2xl relative group transition-all duration-300 ${colors[color]} ${showTooltip ? 'z-20' : 'z-0'}`}
        >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                {React.cloneElement(icon, { size: 80 })}
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-lg bg-${color}-500/10 text-${color}-400`}>
                        {icon}
                    </div>
                    <span className="text-gray-400 font-medium text-sm tracking-wide uppercase flex items-center gap-1.5">
                        {title}
                        {tooltip && (
                            <div className="relative">
                                <Info
                                    size={14}
                                    className="text-gray-500 hover:text-gray-300 cursor-help transition-colors"
                                    onMouseEnter={() => setShowTooltip(true)}
                                    onMouseLeave={() => setShowTooltip(false)}
                                />
                                {showTooltip && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg z-50 border border-white/10">
                                        {tooltip}
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                                    </div>
                                )}
                            </div>
                        )}
                    </span>
                </div>

                <div className="flex items-end gap-4">
                    <span className="text-4xl font-bold text-white tracking-tight">
                        {typeof value === 'number' ? (
                            <AnimatedNumber value={value} duration={1200} />
                        ) : (
                            value
                        )}
                    </span>
                    {trend && (
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${(trend.startsWith('+') && isGoodTrend) || (trend.startsWith('-') && !isGoodTrend)
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                            }`}>
                            {trend}
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

// Gráfico de Actividad por Hora
const HourlyActivityChart = ({ data }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={`${GLASS_PANEL} rounded-2xl p-6 relative overflow-hidden group`}
    >
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex items-center gap-3 mb-6 relative z-10">
            <Sun className="text-cyan-400" />
            <div>
                <h3 className="text-lg font-bold text-white">Actividad por Hora</h3>
                <p className="text-gray-400 text-xs">Distribución de mensajes en 24h</p>
            </div>
        </div>
        <div className="h-[220px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                        dataKey="hour"
                        stroke="#6b7280"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(h) => `${h}h`}
                    />
                    <YAxis
                        stroke="#6b7280"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={30}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                        labelFormatter={(h) => `${h}:00`}
                    />
                    <Bar
                        dataKey="count"
                        fill="url(#hourlyGradient)"
                        radius={[4, 4, 0, 0]}
                    />
                    <defs>
                        <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#0891B2" stopOpacity={0.6} />
                        </linearGradient>
                    </defs>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </motion.div>
);

// Gráfico de Patrón Semanal
const WeeklyPatternChart = ({ data }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className={`${GLASS_PANEL} rounded-2xl p-6 relative overflow-hidden group`}
    >
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="flex items-center gap-3 mb-6 relative z-10">
            <CalendarDays className="text-purple-400" />
            <div>
                <h3 className="text-lg font-bold text-white">Patrón Semanal</h3>
                <p className="text-gray-400 text-xs">Actividad por día de la semana</p>
            </div>
        </div>
        <div className="h-[220px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                    <XAxis
                        dataKey="day"
                        stroke="#6b7280"
                        tick={{ fill: '#9CA3AF', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#6b7280"
                        tick={{ fill: '#9CA3AF', fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={30}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0d1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff' }}
                    />
                    <Bar
                        dataKey="count"
                        fill="url(#weeklyGradient)"
                        radius={[6, 6, 0, 0]}
                    />
                    <defs>
                        <linearGradient id="weeklyGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#A855F7" stopOpacity={0.9} />
                            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.6} />
                        </linearGradient>
                    </defs>
                </BarChart>
            </ResponsiveContainer>
        </div>
    </motion.div>
);

const TopicsCard = ({ topics = [] }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        className={`${GLASS_PANEL} rounded-2xl p-6`}
    >
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <BrainCircuit className="text-purple-400" />
            Temas Recurrentes
        </h3>
        <div className="space-y-4">
            {topics.map((topic, index) => (
                <div key={index} className="group">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-200 font-medium group-hover:text-purple-300 transition-colors">{topic.topic}</span>
                        <span className="text-sm font-mono text-gray-400">{topic.percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${topic.percentage}%` }}
                            transition={{ duration: 1, delay: 0.5 + (index * 0.1) }}
                            className={`h-full rounded-full bg-gradient-to-r ${topic.urgency === 'high' ? 'from-red-500 to-orange-500' :
                                topic.urgency === 'medium' ? 'from-yellow-500 to-amber-500' :
                                    'from-blue-500 to-cyan-500'
                                }`}
                        />
                    </div>
                </div>
            ))}
        </div>
    </motion.div>
);

const SuggestionsCard = ({ suggestions = [] }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className={`${GLASS_PANEL} rounded-2xl p-6`}
    >
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="text-yellow-400" />
            Sugerencias de IA
        </h3>
        <div className="grid gap-4">
            {suggestions.map((suggestion, index) => (
                <motion.div
                    key={index}
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.08)' }}
                    className="bg-white/5 border border-white/5 p-4 rounded-xl flex gap-4 items-start transition-all cursor-default"
                >
                    <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-400 mt-1">
                        <Zap size={16} />
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{suggestion}</p>
                </motion.div>
            ))}
        </div>
    </motion.div>
);

const SentimentCard = ({ sentiment }) => {
    const data = [
        { name: 'Positivo', value: sentiment.positive, color: '#4ade80' }, // green-400
        { name: 'Neutral', value: sentiment.neutral, color: '#94a3b8' }, // slate-400
        { name: 'Negativo', value: sentiment.negative, color: '#f87171' }, // red-400
    ];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className={`${GLASS_PANEL} rounded-2xl p-6 h-full flex flex-col`}
        >
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Target className="text-pink-400" />
                Sentimiento
            </h3>

            <div className="flex-grow flex flex-col items-center justify-center relative">
                <div className="h-[250px] w-full relative">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie
                                data={data}
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold text-white">
                            {Math.max(...data.map(d => d.value))}%
                        </span>
                        <span className="text-xs text-gray-400 uppercase tracking-wider">Dominante</span>
                    </div>
                </div>
            </div>

            <div className="mt-6 space-y-3">
                {data.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-gray-300">{item.name}</span>
                        </div>
                        <span className="font-bold text-white">{item.value}%</span>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 text-center">
                <span className="text-gray-400 text-sm">Tendencia General: </span>
                <span className={`font-bold ${sentiment.trend === 'positive' ? 'text-green-400' :
                    sentiment.trend === 'negative' ? 'text-red-400' : 'text-gray-400'
                    }`}>
                    {sentiment.trend === 'positive' ? 'Positiva ↗' :
                        sentiment.trend === 'negative' ? 'Negativa ↘' : 'Estable →'}
                </span>
            </div>
        </motion.div>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-[#0d1117]/90 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-xl">
                <p className="text-gray-400 text-xs mb-1">{label}</p>
                <p className="text-white font-bold text-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    {payload[0].value} Conversaciones
                </p>
            </div>
        );
    }
    return null;
};

const LoadingScreen = () => (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin reverse" />
            </div>
        </div>
    </div>
);

const ErrorScreen = ({ error }) => (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className={`${GLASS_PANEL} p-8 rounded-2xl max-w-md w-full text-center`}>
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-red-500 w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Error de Carga</h2>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-white font-medium hover:opacity-90 transition-opacity"
            >
                Reintentar
            </button>
        </div>
    </div>
);

export default AnalyticsPage;
