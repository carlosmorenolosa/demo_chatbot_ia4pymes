import React, { useState, useRef, useEffect, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from './contexts/AuthContext';
import './index.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Database, Layout, Upload, FileText, Trash2, Save,
  Copy, Check, Bot, Menu, X, ChevronRight, ChevronDown, Sparkles, Code, Zap, BarChart, HelpCircle,
  Globe, MessageSquare, Mail, Key, LogOut, Target
} from 'lucide-react';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Label } from './components/ui/Label';
import { Textarea } from './components/ui/Textarea';
import { Select } from './components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './components/ui/Card';
import SpotlightCard from './components/ui/SpotlightCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/Table';
import { SkeletonTableRow } from './components/ui/Skeleton';
import Tooltip from './components/ui/Tooltip';
import { cn } from './lib/utils';
// import WhatsAppChannel from './WhatsAppChannel'; // REMOVED
// import EmailChannel from './EmailChannel'; // REMOVED
import ClientSelector from './components/ClientSelector';
import GlobalUsageBadge from './components/GlobalUsageBadge';
import WidgetCustomizer from './WidgetCustomizer';
import AnalyticsPage from './AnalyticsPage';
// import LeadsPage from './LeadsPage'; // REMOVED

// Lazy load
const LoginPage = lazy(() => import('./LoginPage'));

// --- Utility Functions ---
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// --- Confirm Modal Component ---
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Eliminar', isLoading = false }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? 'Eliminando...' : confirmText}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Skeleton Row Component ---
const SkeletonRow = () => (
  <TableRow>
    <TableCell>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-muted animate-pulse" />
        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
      </div>
    </TableCell>
    <TableCell><div className="h-4 w-12 bg-muted rounded animate-pulse" /></TableCell>
    <TableCell><div className="h-4 w-16 bg-muted rounded animate-pulse" /></TableCell>
    <TableCell><div className="h-4 w-20 bg-muted rounded animate-pulse" /></TableCell>
    <TableCell className="text-right"><div className="h-8 w-8 bg-muted rounded animate-pulse ml-auto" /></TableCell>
  </TableRow>
);

// --- Empty State Component ---
const EmptyStateDocuments = ({ onUpload }) => (
  <div className="flex flex-col items-center justify-center py-16 px-8">
    <div className="relative mb-6">
      <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
        <FileText className="w-12 h-12 text-primary/60" />
      </div>
      <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
    </div>
    <h3 className="text-lg font-semibold text-foreground mb-2">Tu base de conocimiento está vacía</h3>
    <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
      Sube documentos PDF o DOCX para entrenar a tu asistente IA con información específica de tu negocio.
    </p>
    <Button onClick={onUpload} className="shadow-lg shadow-primary/20">
      <Upload className="mr-2 h-4 w-4" /> Subir primer documento
    </Button>
  </div>
);

// --- Main App Inner Component ---
const MainApp = () => {
  // --- STATE ---
  const activeChannel = 'web';
  const [activeSection, setActiveSection] = useState('configuracion');
  const [highlightConversationId, setHighlightConversationId] = useState(null);
  const [config, setConfig] = useState({
    nombre: 'Mi Chatbot Genial',
    prompt: 'Eres un asistente de IA amigable y servicial. Responde a las preguntas basándote únicamente en la información proporcionada en la base de datos.',
    tono: 'amistoso',
    estilo: 'profesional',
    longitud: 'media',
    // Visual Config Defaults
    primaryColor: '#3460F6',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    position: 'bottom-right',
    welcomeMessage: '¡Hola! ¿En qué puedo ayudarte hoy?',
    voiceInput: true,
    logoUrl: ''
  });
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Estado para modal de confirmación
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, docName: null, isLoading: false });

  // Estado para progreso de subida
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });
  const fileInputRef = useRef(null);

  // --- CONSTANTS ---
  const LAMBDA_SAVE_CONFIG_URL = import.meta.env.VITE_LAMBDA_SAVE_CONFIG;
  const LAMBDA_GENERATE_UPLOAD_URL = import.meta.env.VITE_LAMBDA_GENERATE_UPLOAD;
  const LAMBDA_LIST_DOCS_URL = import.meta.env.VITE_LAMBDA_LIST_DOCS;
  const LAMBDA_DELETE_DOC_URL = import.meta.env.VITE_LAMBDA_DELETE_DOC;
  const LAMBDA_ANALYTICS_URL = import.meta.env.VITE_LAMBDA_ANALYTICS;
  const LAMBDA_GET_CONFIG_URL = import.meta.env.VITE_LAMBDA_GET_CONFIG;

  // --- GLOBAL STATS ---
  const [globalStats, setGlobalStats] = useState(0);

  // Usar clientId del contexto de autenticación
  const { currentClientId, user, logout } = useAuth();
  const CLIENT_ID = currentClientId || 'test-client-123';

  // --- GLOBAL STATS EFFECT ---
  useEffect(() => {
    const fetchGlobalStats = async () => {
      try {
        const idToUse = CLIENT_ID;
        if (!idToUse) return;

        const response = await fetch(`${LAMBDA_ANALYTICS_URL}?clientId=${idToUse}`);
        if (response.ok) {
          const data = await response.json();
          if (typeof data.globalTotalResponses !== 'undefined') {
            setGlobalStats(data.globalTotalResponses);
          }
        }
      } catch (error) {
        console.error("Error fetching global stats:", error);
      }
    };

    fetchGlobalStats();
    const interval = setInterval(fetchGlobalStats, 30000);
    return () => clearInterval(interval);
  }, [CLIENT_ID]);

  // --- EFFECTS ---
  useEffect(() => {
    const fetchConfig = async () => {
      if (!LAMBDA_GET_CONFIG_URL.startsWith('http') || !CLIENT_ID) return;
      try {
        const response = await fetch(`${LAMBDA_GET_CONFIG_URL}?clientId=${CLIENT_ID}`);
        if (!response.ok) throw new Error(`Error de red: ${response.statusText}`);
        const data = await response.json();
        setConfig(prev => ({ ...prev, ...data }));
      } catch (error) {
        console.error("Error fatal al cargar la configuración:", error);
      }
    };
    fetchConfig();
  }, [CLIENT_ID]);

  // --- FETCH DOCUMENTS FUNCTION (Extracted) ---
  const fetchDocuments = async () => {
    if (!CLIENT_ID) return;
    setIsLoadingDocs(true);
    try {
      // Pasar channel para filtrar documentos por canal
      const response = await fetch(`${LAMBDA_LIST_DOCS_URL}?clientId=${CLIENT_ID}&channel=web`);
      if (!response.ok) throw new Error('No se pudo obtener la lista de documentos.');
      const data = await response.json();
      const formattedData = data.map(doc => ({
        ...doc,
        id: doc.fileName,
        name: doc.fileName,
        size: doc.fileSize ? formatBytes(doc.fileSize) : 'N/A',
        type: doc.fileName.split('.').pop().toUpperCase(),
        uploaded: new Date(doc.uploadedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      }));
      setDocuments(formattedData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  // Effect to call fetchDocuments when activeSection changes to 'database'
  useEffect(() => {
    if (activeSection === 'database') {
      fetchDocuments();
    }
  }, [activeSection, CLIENT_ID]);

  // --- HANDLERS ---
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveConfig = async (e) => {
    if (e) e.preventDefault();
    setSaveStatus('Guardando...');
    try {
      const response = await fetch(LAMBDA_SAVE_CONFIG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: CLIENT_ID, config: config }),
      });
      if (!response.ok) throw new Error('Error al guardar la configuración');
      await response.json();
      setSaveStatus('success');
      toast.success('Configuración guardada correctamente');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error al guardar:', error);
      setSaveStatus('error');
      toast.error('Error al guardar la configuración');
      setTimeout(() => setSaveStatus(''), 5000);
    }
  };

  const handleFileSelect = async (e, channel = 'web') => {
    const files = e.target.files;
    if (files.length === 0) return;

    const totalFiles = files.length;
    setUploadProgress({ current: 0, total: totalFiles, fileName: '' });
    setUploadStatus('uploading');

    let allSucceeded = true;
    let uploadedCount = 0;

    for (const file of files) {
      setUploadProgress({ current: uploadedCount, total: totalFiles, fileName: file.name });
      try {
        const presignResponse = await fetch(LAMBDA_GENERATE_UPLOAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, clientId: CLIENT_ID, contentType: file.type, channel }),
        });
        if (!presignResponse.ok) throw new Error('No se pudo obtener la URL de subida.');
        const { url, fields } = await presignResponse.json();
        const formData = new FormData();
        Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
        formData.append('file', file);
        const uploadResponse = await fetch(url, { method: 'POST', body: formData });
        if (!uploadResponse.ok) throw new Error(`Error al subir ${file.name}.`);
        uploadedCount++;
        setUploadProgress({ current: uploadedCount, total: totalFiles, fileName: file.name });
      } catch (error) {
        allSucceeded = false;
        setUploadStatus(`Error: ${error.message}`);
        toast.error(`Error: ${error.message}`);
        break;
      }
    }
    if (allSucceeded) {
      setUploadStatus('success');
      toast.success(`${files.length} archivo(s) subido(s) correctamente`);
      setTimeout(() => {
        setUploadStatus('');
        setUploadProgress({ current: 0, total: 0, fileName: '' });

        fetchDocuments();
      }, 4000);
    }
  };

  const handleDeleteDoc = async (documentName) => {
    setDeleteModal({ isOpen: true, docName: documentName, isLoading: false });
  };

  const confirmDelete = async () => {
    const documentName = deleteModal.docName;
    setDeleteModal(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(LAMBDA_DELETE_DOC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: CLIENT_ID, documentName: documentName }),
      });
      if (!response.ok) throw new Error('Error al borrar.');
      setDocuments(prev => prev.filter(doc => doc.name !== documentName));
      toast.success('Documento eliminado');
      setDeleteModal({ isOpen: false, docName: null, isLoading: false });
    } catch (error) {
      toast.error(`Error: ${error.message}`);
      setDeleteModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  // --- RENDER HELPERS ---
  const sections = [
    { id: 'configuracion', label: 'Configuración', icon: Settings, tooltip: 'Nombre, prompt y comportamiento del bot' },
    { id: 'database', label: 'Base de Datos', icon: Database, tooltip: 'Documentos que el bot usa para responder' },
    { id: 'analytics', label: 'Analíticas', icon: BarChart, tooltip: 'Estadísticas de uso y conversaciones' },
    { id: 'probar', label: 'Probar Chatbot', icon: MessageSquare, tooltip: 'Prueba tu asistente en tiempo real' },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/20">

      {/* --- Sidebar --- */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="relative z-20 flex flex-col border-r bg-card/50 backdrop-blur-xl"
      >
        <div className="flex h-20 items-center justify-between px-6 border-b border-border/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden bg-white shadow-lg shadow-primary/20">
              <img src="/logo.png" alt="IA4PYMES" className="w-full h-full object-cover" />
            </div>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-lg tracking-tight whitespace-nowrap"
              >
                Chatbot Admin
              </motion.span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="shrink-0">
            {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
          {sections.map((section) => (
            <Tooltip key={section.id} content={section.tooltip} position="right">
              <Button
                variant={activeSection === section.id ? 'secondary' : 'ghost'}
                className={cn(
                  "w-full justify-start gap-3 h-11 relative overflow-hidden group",
                  activeSection === section.id && "bg-primary/10 text-primary hover:bg-primary/15",
                  !isSidebarOpen && "justify-center px-0"
                )}
                onClick={() => setActiveSection(section.id)}
              >
                {activeSection === section.id && (
                  <motion.div
                    layoutId="activeSection"
                    className="absolute inset-0 bg-primary/10 border-l-2 border-primary"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <section.icon className={cn("h-5 w-5 relative z-10", activeSection === section.id ? "text-primary" : "text-muted-foreground")} />
                {isSidebarOpen && (
                  <span className="relative z-10 flex-1 text-left">{section.label}</span>
                )}
              </Button>
            </Tooltip>
          ))}
        </nav>

        <div className="p-4 border-t border-border/50 space-y-2">
          {/* Contador Global de Uso */}
          {isSidebarOpen && <GlobalUsageBadge count={globalStats} />}

          <div className={cn("flex items-center gap-3 rounded-xl bg-muted/50 p-3 border border-white/5", !isSidebarOpen && "justify-center p-2")}>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
              {user?.username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-medium truncate">{user?.username || 'Usuario'}</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className={cn(
              "w-full text-red-400 hover:text-red-300 hover:bg-red-500/10",
              !isSidebarOpen && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4" />
            {isSidebarOpen && <span className="ml-2">Cerrar sesión</span>}
          </Button>
        </div>
      </motion.aside>

      {/* --- Main Content --- */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/50 dark:bg-black/20">
        {/* Background Ambience */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] animate-float" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] animate-float" style={{ animationDelay: '3s' }} />
        </div>

        {/* Header */}
        <header className="h-20 flex items-center justify-between px-8 border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {sections.find(s => s.id === activeSection)?.label}
              <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeSection === 'configuracion' && 'Define el comportamiento de tu IA'}
              {activeSection === 'database' && 'Gestiona el conocimiento de tu asistente'}
              {activeSection === 'analytics' && 'Revisa el rendimiento de tu chatbot'}
              {activeSection === 'probar' && 'Prueba tu chatbot en tiempo real'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ClientSelector />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Sistema Operativo
            </span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-6xl space-y-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {/* === CONFIGURACION === */}
                {activeSection === 'configuracion' && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <SpotlightCard className="lg:col-span-2">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Bot className="h-5 w-5 text-primary" /> Personalidad del Chatbot
                        </CardTitle>
                        <CardDescription>Define cómo interactúa tu IA con los usuarios. El chatbot usará estas instrucciones en cada conversación.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Tooltip content="El nombre que usará el bot al presentarse a los usuarios" position="right">
                            <Label className="flex items-center gap-1.5">Nombre del Asistente <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" /></Label>
                          </Tooltip>
                          <Input name="nombre" value={config.nombre} onChange={handleConfigChange} className="bg-background/50" />
                        </div>
                        <div className="space-y-2">
                          <Tooltip content="Instrucciones que definen la personalidad, tono y límites del bot. Sé específico con objetivos y restricciones." position="right">
                            <Label className="flex items-center gap-1.5">Prompt del Sistema <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" /></Label>
                          </Tooltip>
                          <Textarea
                            name="prompt"
                            value={config.prompt}
                            onChange={handleConfigChange}
                            className="min-h-[150px] text-sm bg-background/50"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <Label>Tono</Label>
                            <Select name="tono" value={config.tono} onChange={handleConfigChange} className="bg-background/50">
                              <option value="amistoso">Amistoso</option>
                              <option value="profesional">Profesional</option>
                              <option value="neutral">Neutral</option>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Estilo</Label>
                            <Select name="estilo" value={config.estilo} onChange={handleConfigChange} className="bg-background/50">
                              <option value="profesional">Profesional</option>
                              <option value="creativo">Creativo</option>
                              <option value="directo">Directo</option>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Longitud</Label>
                            <Select name="longitud" value={config.longitud} onChange={handleConfigChange} className="bg-background/50">
                              <option value="corta">Corta</option>
                              <option value="media">Media</option>
                              <option value="larga">Larga</option>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="justify-between border-t bg-muted/20 px-6 py-4">
                        <div className="flex items-center gap-2 text-sm">
                          {saveStatus === 'success' && <span className="text-green-500 flex items-center gap-1"><Check className="h-4 w-4" /> Guardado</span>}
                          {saveStatus === 'error' && <span className="text-red-500">Error al guardar</span>}
                        </div>
                        <Button onClick={handleSaveConfig} disabled={saveStatus === 'Guardando...'} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                          {saveStatus === 'Guardando...' ? 'Guardando...' : <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</>}
                        </Button>
                      </CardFooter>
                    </SpotlightCard>
                  </div>
                )}

                {/* --- DATABASE --- */}
                {activeSection === 'database' && (
                  <div className="space-y-6">
                    <SpotlightCard className="border-dashed border-2 bg-muted/5">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
                          <Upload className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Sube tus documentos</h3>
                        <p className="text-sm text-muted-foreground max-w-sm mb-8 font-bold">
                          Arrastra y suelta archivos PDF o DOCX aquí para entrenar a tu IA.
                        </p>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          multiple
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileSelect}
                        />
                        <Button onClick={() => fileInputRef.current.click()} size="lg" className="shadow-xl shadow-primary/20" disabled={uploadStatus === 'uploading'}>
                          <Zap className="mr-2 h-4 w-4" /> Seleccionar Archivos
                        </Button>
                        {uploadStatus === 'uploading' && uploadProgress.total > 0 && (
                          <div className="mt-6 w-full max-w-xs">
                            <div className="flex justify-between text-xs text-muted-foreground mb-2">
                              <span>Subiendo: {uploadProgress.fileName}</span>
                              <span>{uploadProgress.current}/{uploadProgress.total}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                                transition={{ duration: 0.3 }}
                              />
                            </div>
                          </div>
                        )}
                        {uploadStatus === 'success' && (
                          <p className="mt-6 text-sm font-medium text-green-500 flex items-center gap-2">
                            <Check className="h-4 w-4" /> ¡Archivos subidos correctamente!
                          </p>
                        )}
                        {uploadStatus && uploadStatus.startsWith('Error') && (
                          <p className="mt-6 text-sm font-medium text-red-500">{uploadStatus}</p>
                        )}
                      </CardContent>
                    </SpotlightCard>

                    <SpotlightCard>
                      <CardHeader>
                        <CardTitle>Base de Conocimiento</CardTitle>
                        <CardDescription>Documentos que el chatbot puede consultar al responder. Elimina los que ya no necesites.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nombre</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Tamaño</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {isLoadingDocs ? (
                              <>
                                <SkeletonRow />
                                <SkeletonRow />
                                <SkeletonRow />
                              </>
                            ) : documents.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={5} className="p-0">
                                  <EmptyStateDocuments onUpload={() => fileInputRef.current.click()} />
                                </TableCell>
                              </TableRow>
                            ) : (
                              documents.map((doc) => (
                                <TableRow key={doc.id} className="group">
                                  <TableCell className="font-medium flex items-center gap-2">
                                    <div className="p-2 rounded bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                      <FileText className="h-4 w-4" />
                                    </div>
                                    {doc.name}
                                  </TableCell>
                                  <TableCell><span className="text-xs font-mono bg-muted px-2 py-1 rounded border border-border">{doc.type}</span></TableCell>
                                  <TableCell>{doc.size}</TableCell>
                                  <TableCell>{doc.uploaded}</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteDoc(doc.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </SpotlightCard>
                  </div>
                )}

                {/* --- PROBAR CHATBOT (Formerly Interfaz Visual) --- */}
                {activeSection === 'probar' && (
                  <WidgetCustomizer
                    config={config}
                    onConfigChange={handleConfigChange}
                    onSave={handleSaveConfig}
                    saveStatus={saveStatus}
                    clientId={CLIENT_ID}
                  />
                )}

                {/* --- ANALYTICS --- */}
                {activeSection === 'analytics' && (
                  <div className="h-full">
                    <AnalyticsPage clientId={CLIENT_ID} highlightConversationId={highlightConversationId} onConversationViewed={() => setHighlightConversationId(null)} />
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
            <div className="h-10"></div>
          </div>
        </div>

        {/* Delete Modal */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
          onConfirm={confirmDelete}
          title="¿Estás seguro?"
          message={`¿Realmente deseas eliminar el documento "${deleteModal.docName}"? Esta acción no se puede deshacer.`}
          isLoading={deleteModal.isLoading}
        />

      </main>
    </div>
  );
};

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen bg-gray-900"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Main Export
export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
      } />
      <Route path="/*" element={
        <ProtectedRoute>
          <MainApp />
        </ProtectedRoute>
      } />
    </Routes>
  );
}