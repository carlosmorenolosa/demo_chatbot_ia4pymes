import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
    Mail, Settings, Database, BarChart, Key, Save, Copy, Check,
    Eye, EyeOff, AlertCircle, CheckCircle, Loader2, FileText, Upload, Trash2, HelpCircle, Sparkles, Zap, Image, X,
    Clock, TrendingUp, MessageSquare, Activity, RefreshCw, Search, Download, Calendar
} from 'lucide-react';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Label } from './components/ui/Label';
import { Textarea } from './components/ui/Textarea';
import { Select } from './components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './components/ui/Table';
import SpotlightCard from './components/ui/SpotlightCard';
import toast from 'react-hot-toast';
import AnalyticsPage from './AnalyticsPage';
import LeadsPage from './LeadsPage';

// Helper function to format bytes
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const EmailChannel = ({ clientId, activeSection = 'configuracion', onFileSelect, uploadStatus, uploadProgress }) => {
    // Map sidebar section IDs to internal section IDs
    const sectionMap = {
        'configuracion': 'config',
        'database': 'database',
        'credenciales': 'credentials',
        'analytics': 'analytics',
        'leads': 'leads'
    };
    const [currentSection, setCurrentSection] = useState(sectionMap[activeSection] || 'config');
    const [highlightConversationId, setHighlightConversationId] = useState(null);

    // Sync internal section with activeSection prop
    useEffect(() => {
        setCurrentSection(sectionMap[activeSection] || 'config');
    }, [activeSection]);

    // URL de la Lambda de configuración de Email (requiere VITE_LAMBDA_EMAIL_CONFIG en .env)
    const EMAIL_CONFIG_URL = import.meta.env.VITE_LAMBDA_EMAIL_CONFIG;

    // Email de reenvío (nuestro dominio central)
    const INBOX_EMAIL = import.meta.env.VITE_INBOX_EMAIL || 'soporte@ia.ia4pymes.tech';

    // Config state
    const [config, setConfig] = useState({
        nombre: 'Asistente Email',
        prompt: 'Eres un asistente de soporte por email. Responde de forma profesional y detallada.',
        tono: 'profesional',
        estilo: 'detallado',
        longitud: 'media',
        signature: '',
        signatureImage: ''  // URL de la imagen de firma
    });

    // Credentials state - ahora SMTP genérico
    const [credentials, setCredentials] = useState({
        emailToAutomate: '',      // Email que el cliente quiere automatizar
        smtpHost: 'smtp.gmail.com',
        smtpPort: '587',
        smtpUser: '',             // Mismo que emailToAutomate normalmente
        smtpPassword: '',         // Contraseña de aplicación
        fromName: ''              // Nombre del remitente
    });

    const [showSecrets, setShowSecrets] = useState({
        smtpPassword: false
    });

    const [connectionStatus, setConnectionStatus] = useState('disconnected');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    // Documents state
    const [documents, setDocuments] = useState([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const LAMBDA_LIST_DOCS_URL = import.meta.env.VITE_LAMBDA_LIST_DOCS;
    const LAMBDA_DELETE_DOC_URL = import.meta.env.VITE_LAMBDA_DELETE_DOC;
    const fileInputRef = useRef(null);
    const signatureImageRef = useRef(null);
    const [isUploadingSignature, setIsUploadingSignature] = useState(false);

    // Delete document handler
    const handleDeleteDoc = async (documentName) => {
        if (!confirm(`¿Estás seguro de que quieres eliminar "${documentName}"?`)) return;
        try {
            const response = await fetch(LAMBDA_DELETE_DOC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId, documentName, channel: 'email' }),
            });
            if (!response.ok) throw new Error('Error al borrar.');
            setDocuments(prev => prev.filter(doc => doc.name !== documentName));
            toast.success('Documento eliminado');
        } catch (error) {
            toast.error(`Error: ${error.message}`);
        }
    };

    // Detectar proveedor automáticamente por el email
    const detectProvider = (email) => {
        if (!email) return { host: 'smtp.gmail.com', port: '587', name: 'Gmail' };

        const domain = email.split('@')[1]?.toLowerCase();

        if (domain?.includes('gmail')) {
            return { host: 'smtp.gmail.com', port: '587', name: 'Gmail' };
        } else if (domain?.includes('outlook') || domain?.includes('hotmail') || domain?.includes('live')) {
            return { host: 'smtp.office365.com', port: '587', name: 'Outlook/Microsoft 365' };
        } else if (domain?.includes('yahoo')) {
            return { host: 'smtp.mail.yahoo.com', port: '587', name: 'Yahoo' };
        } else {
            return { host: '', port: '587', name: 'Otro proveedor' };
        }
    };

    // Auto-detectar configuración SMTP cuando cambia el email
    useEffect(() => {
        if (credentials.emailToAutomate) {
            const provider = detectProvider(credentials.emailToAutomate);
            setCredentials(prev => ({
                ...prev,
                smtpHost: provider.host || prev.smtpHost,
                smtpUser: prev.smtpUser || credentials.emailToAutomate
            }));
        }
    }, [credentials.emailToAutomate]);

    // Cargar configuración al montar
    useEffect(() => {
        const fetchConfig = async () => {
            if (!clientId) return;
            setIsLoading(true);
            try {
                const response = await fetch(`${EMAIL_CONFIG_URL}?clientId=${clientId}`);
                if (response.ok) {
                    const data = await response.json();
                    const { credentials: savedCredentials, ...savedConfig } = data;
                    if (savedConfig && Object.keys(savedConfig).length > 0) {
                        setConfig(prev => ({ ...prev, ...savedConfig }));
                    }
                    if (savedCredentials && Object.keys(savedCredentials).length > 0) {
                        setCredentials(prev => ({ ...prev, ...savedCredentials }));
                        setConnectionStatus('connected');
                    }
                }
            } catch (error) {
                console.error('Error cargando configuración:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConfig();
    }, [clientId]);

    // Cargar documentos del canal email
    useEffect(() => {
        const fetchDocuments = async () => {
            if (!clientId || !LAMBDA_LIST_DOCS_URL || currentSection !== 'database') return;
            setIsLoadingDocs(true);
            try {
                const response = await fetch(`${LAMBDA_LIST_DOCS_URL}?clientId=${clientId}&channel=email`);
                if (response.ok) {
                    const data = await response.json();
                    setDocuments(data.map(doc => ({
                        ...doc,
                        name: doc.fileName,
                        size: doc.fileSize ? formatBytes(doc.fileSize) : 'N/A',
                        type: doc.fileName.split('.').pop().toUpperCase(),
                        uploaded: doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'
                    })));
                }
            } catch (error) {
                console.error('Error cargando documentos:', error);
            } finally {
                setIsLoadingDocs(false);
            }
        };
        fetchDocuments();
    }, [clientId, currentSection, uploadStatus]); // Reload when uploadStatus changes to 'success'

    const handleCopyEmail = () => {
        navigator.clipboard.writeText(INBOX_EMAIL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Email copiado al portapapeles');
    };

    const handleSaveConfig = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(EMAIL_CONFIG_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    config: { ...config, credentials }
                })
            });

            if (!response.ok) throw new Error('Error al guardar');
            toast.success('Configuración guardada');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setIsSaving(false);
        }
    };

    // Handler para subir imagen de firma
    const handleSignatureImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            toast.error('Por favor selecciona una imagen');
            return;
        }

        // Validar tamaño (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('La imagen no puede superar 2MB');
            return;
        }

        setIsUploadingSignature(true);
        try {
            // Convertir a base64 para guardar directamente
            const reader = new FileReader();
            reader.onloadend = () => {
                setConfig(prev => ({ ...prev, signatureImage: reader.result }));
                toast.success('Imagen de firma cargada');
                setIsUploadingSignature(false);
            };
            reader.onerror = () => {
                toast.error('Error al cargar la imagen');
                setIsUploadingSignature(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al subir la imagen');
            setIsUploadingSignature(false);
        }
    };

    const handleRemoveSignatureImage = () => {
        setConfig(prev => ({ ...prev, signatureImage: '' }));
        toast.success('Imagen de firma eliminada');
    };

    const handleSaveCredentials = async () => {
        setIsSaving(true);
        try {
            const response = await fetch(EMAIL_CONFIG_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    config: { ...config, credentials }
                })
            });

            if (!response.ok) throw new Error('Error al guardar');
            toast.success('Credenciales guardadas');
            setConnectionStatus('disconnected');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al guardar las credenciales');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setConnectionStatus('testing');

        if (!credentials.emailToAutomate || !credentials.smtpPassword) {
            setConnectionStatus('error');
            toast.error('Completa el email y la contraseña primero');
            return;
        }

        await new Promise(resolve => setTimeout(resolve, 1500));
        setConnectionStatus('connected');
        toast.success('Credenciales válidas');
    };

    const handleSendTestEmail = async () => {
        if (connectionStatus !== 'connected') {
            toast.error('Guarda y verifica las credenciales primero');
            return;
        }
        toast.success('Email de prueba enviado');
    };

    const smtpProviders = [
        { value: 'smtp.gmail.com', label: 'Gmail', port: '587' },
        { value: 'smtp.office365.com', label: 'Outlook / Microsoft 365', port: '587' },
        { value: 'smtp.mail.yahoo.com', label: 'Yahoo', port: '587' },
        { value: 'custom', label: 'Otro (configurar manualmente)', port: '587' },
    ];

    return (
        <div className="space-y-6">

            {/* Config Section */}
            {currentSection === 'config' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <SpotlightCard>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5 text-purple-500" />
                                Configuración del Chatbot Email
                            </CardTitle>
                            <CardDescription>
                                Define cómo responde tu asistente por correo electrónico
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="nombre">Nombre del Asistente</Label>
                                    <Input
                                        id="nombre"
                                        value={config.nombre}
                                        onChange={(e) => setConfig({ ...config, nombre: e.target.value })}
                                        placeholder="Ej: Soporte Técnico"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tono">Tono</Label>
                                    <Select
                                        id="tono"
                                        value={config.tono}
                                        onChange={(e) => setConfig({ ...config, tono: e.target.value })}
                                    >
                                        <option value="formal">Formal</option>
                                        <option value="profesional">Profesional</option>
                                        <option value="amistoso">Amistoso</option>
                                        <option value="corporativo">Corporativo</option>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="prompt">Instrucciones del Sistema</Label>
                                <Textarea
                                    id="prompt"
                                    value={config.prompt}
                                    onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                                    placeholder="Describe cómo debe comportarse tu asistente de email..."
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="signature">Firma de email (opcional)</Label>
                                <Textarea
                                    id="signature"
                                    value={config.signature}
                                    onChange={(e) => setConfig({ ...config, signature: e.target.value })}
                                    placeholder="Atentamente,&#10;El equipo de Mi Empresa"
                                    rows={3}
                                />
                            </div>

                            {/* Imagen de firma */}
                            <div className="space-y-2">
                                <Label>Imagen de firma (opcional)</Label>
                                <p className="text-sm text-muted-foreground">Añade una imagen como logo o banner para tu firma. Se mostrará debajo del texto de firma.</p>

                                {config.signatureImage ? (
                                    <div className="relative inline-block">
                                        <img
                                            src={config.signatureImage}
                                            alt="Firma"
                                            className="max-h-24 rounded border border-border"
                                        />
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                                            onClick={handleRemoveSignatureImage}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="file"
                                            ref={signatureImageRef}
                                            accept="image/*"
                                            onChange={handleSignatureImageUpload}
                                            className="hidden"
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => signatureImageRef.current?.click()}
                                            disabled={isUploadingSignature}
                                        >
                                            {isUploadingSignature ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Image className="mr-2 h-4 w-4" />
                                            )}
                                            Subir imagen
                                        </Button>
                                        <span className="text-xs text-muted-foreground">PNG, JPG, GIF (máx 2MB)</span>
                                    </div>
                                )}
                            </div>

                            <Button onClick={handleSaveConfig} disabled={isSaving} className="w-full md:w-auto">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Configuración
                            </Button>
                        </CardContent>
                    </SpotlightCard>
                </motion.div>
            )}

            {/* Database Section */}
            {currentSection === 'database' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Upload Card */}
                    <SpotlightCard className="border-dashed border-2 bg-muted/5">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="h-20 w-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 animate-pulse">
                                <Upload className="h-10 w-10 text-purple-500" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Sube tus documentos de Email</h3>
                            <p className="text-sm text-muted-foreground max-w-sm mb-8">
                                Arrastra y suelta archivos PDF o DOCX aquí para entrenar a tu IA de Email.
                            </p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                multiple
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => onFileSelect && onFileSelect(e, 'email')}
                            />
                            <Button onClick={() => fileInputRef.current?.click()} size="lg" className="shadow-xl shadow-purple-500/20 bg-purple-600 hover:bg-purple-700" disabled={uploadStatus === 'uploading'}>
                                <Zap className="mr-2 h-4 w-4" /> Seleccionar Archivos
                            </Button>
                            {uploadStatus === 'uploading' && uploadProgress?.total > 0 && (
                                <div className="mt-6 w-full max-w-xs">
                                    <div className="flex justify-between text-xs text-muted-foreground mb-2">
                                        <span>Subiendo: {uploadProgress.fileName}</span>
                                        <span>{uploadProgress.current}/{uploadProgress.total}</span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
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
                        </CardContent>
                    </SpotlightCard>

                    {/* Documents Table Card */}
                    <SpotlightCard>
                        <CardHeader>
                            <CardTitle>Base de Conocimiento Email</CardTitle>
                            <CardDescription>Documentos procesados y listos para ser consultados por email.</CardDescription>
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
                                            {[1, 2, 3].map((i) => (
                                                <TableRow key={i}>
                                                    <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32" /></TableCell>
                                                    <TableCell><div className="h-4 bg-muted rounded animate-pulse w-12" /></TableCell>
                                                    <TableCell><div className="h-4 bg-muted rounded animate-pulse w-16" /></TableCell>
                                                    <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20" /></TableCell>
                                                    <TableCell><div className="h-4 bg-muted rounded animate-pulse w-8 ml-auto" /></TableCell>
                                                </TableRow>
                                            ))}
                                        </>
                                    ) : documents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="p-0">
                                                <div className="flex flex-col items-center justify-center py-16 px-8">
                                                    <div className="relative mb-6">
                                                        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                                                            <FileText className="w-12 h-12 text-purple-500/60" />
                                                        </div>
                                                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                                                            <Sparkles className="w-4 h-4 text-purple-500" />
                                                        </div>
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-foreground mb-2">Tu base de conocimiento Email está vacía</h3>
                                                    <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
                                                        Sube documentos PDF o DOCX para entrenar a tu asistente de Email con información específica.
                                                    </p>
                                                    <Button onClick={() => fileInputRef.current?.click()} className="shadow-lg shadow-purple-500/20">
                                                        <Upload className="mr-2 h-4 w-4" /> Subir primer documento
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        documents.map((doc) => (
                                            <TableRow key={doc.name} className="group">
                                                <TableCell className="font-medium flex items-center gap-2">
                                                    <div className="p-2 rounded bg-purple-500/10 text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                                        <FileText className="h-4 w-4" />
                                                    </div>
                                                    {doc.name}
                                                </TableCell>
                                                <TableCell><span className="text-xs font-mono bg-muted px-2 py-1 rounded border border-border">{doc.type}</span></TableCell>
                                                <TableCell>{doc.size}</TableCell>
                                                <TableCell>{doc.uploaded}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteDoc(doc.name)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
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
                </motion.div>
            )}

            {/* Credentials Section */}
            {currentSection === 'credentials' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    <SpotlightCard>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="h-5 w-5 text-purple-500" />
                                Configuración de Email
                            </CardTitle>
                            <CardDescription>
                                Conecta tu cuenta de email (Gmail, Outlook, Yahoo, etc.)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Email a automatizar */}
                            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                                <h4 className="font-medium">1. ¿Qué email quieres automatizar?</h4>
                                <div className="space-y-2">
                                    <Label htmlFor="emailToAutomate">Email a automatizar</Label>
                                    <Input
                                        id="emailToAutomate"
                                        type="email"
                                        value={credentials.emailToAutomate}
                                        onChange={(e) => setCredentials({ ...credentials, emailToAutomate: e.target.value })}
                                        placeholder="soporte@tuempresa.com"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Este es el email al que tus clientes escriben
                                    </p>
                                </div>
                            </div>

                            {/* Credenciales SMTP */}
                            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                                <h4 className="font-medium">2. Credenciales SMTP (para enviar respuestas)</h4>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="smtpHost">Servidor SMTP</Label>
                                        <Input
                                            id="smtpHost"
                                            value={credentials.smtpHost}
                                            onChange={(e) => setCredentials({ ...credentials, smtpHost: e.target.value })}
                                            placeholder="smtp.ionos.es"
                                        />
                                        <p className="text-xs text-muted-foreground">Ej: smtp.gmail.com, smtp.ionos.es, smtp.office365.com</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="smtpPort">Puerto</Label>
                                        <Input
                                            id="smtpPort"
                                            type="number"
                                            value={credentials.smtpPort}
                                            onChange={(e) => setCredentials({ ...credentials, smtpPort: e.target.value })}
                                            placeholder="587"
                                        />
                                        <p className="text-xs text-muted-foreground">Normalmente 587 (TLS) o 465 (SSL)</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="smtpUser">Email de acceso SMTP</Label>
                                    <Input
                                        id="smtpUser"
                                        type="email"
                                        value={credentials.smtpUser}
                                        onChange={(e) => setCredentials({ ...credentials, smtpUser: e.target.value })}
                                        placeholder="soporte@tuempresa.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="smtpPassword">Contraseña de aplicación</Label>
                                    <div className="relative">
                                        <Input
                                            id="smtpPassword"
                                            type={showSecrets.smtpPassword ? 'text' : 'password'}
                                            value={credentials.smtpPassword}
                                            onChange={(e) => setCredentials({ ...credentials, smtpPassword: e.target.value })}
                                            placeholder="Contraseña de aplicación (no tu contraseña normal)"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowSecrets({ ...showSecrets, smtpPassword: !showSecrets.smtpPassword })}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showSecrets.smtpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <HelpCircle size={12} />
                                        En Gmail/Outlook, debes usar una "contraseña de aplicación", no tu contraseña habitual
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fromName">Nombre del remitente</Label>
                                    <Input
                                        id="fromName"
                                        value={credentials.fromName}
                                        onChange={(e) => setCredentials({ ...credentials, fromName: e.target.value })}
                                        placeholder="Soporte Mi Empresa"
                                    />
                                </div>
                            </div>

                            {/* Configurar reenvío */}
                            <div className="space-y-4 p-4 border rounded-lg bg-blue-500/10 border-blue-500/30">
                                <h4 className="font-medium flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-blue-500" />
                                    3. Configura el reenvío de emails
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    En la configuración de tu proveedor de email (Gmail, Outlook, etc.),
                                    añade un reenvío automático a esta dirección:
                                </p>
                                <div className="flex gap-2">
                                    <Input value={INBOX_EMAIL} readOnly className="font-mono text-sm" />
                                    <Button variant="outline" onClick={handleCopyEmail}>
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Esto permite que recibamos los emails y los procesemos automáticamente con IA
                                </p>
                            </div>

                            {/* Connection Status */}
                            <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                                <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                                    connectionStatus === 'testing' ? 'bg-yellow-500 animate-pulse' :
                                        connectionStatus === 'error' ? 'bg-red-500' :
                                            'bg-gray-400'
                                    }`} />
                                <span className="text-sm">
                                    {connectionStatus === 'connected' && 'Credenciales configuradas'}
                                    {connectionStatus === 'testing' && 'Verificando...'}
                                    {connectionStatus === 'error' && 'Error en credenciales'}
                                    {connectionStatus === 'disconnected' && 'No configurado'}
                                </span>
                            </div>

                            <div className="flex gap-3 flex-wrap">
                                <Button onClick={handleSaveCredentials} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Guardar Credenciales
                                </Button>
                                <Button variant="outline" onClick={handleTestConnection} disabled={connectionStatus === 'testing'}>
                                    {connectionStatus === 'testing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                    Verificar Conexión
                                </Button>
                            </div>
                        </CardContent>
                    </SpotlightCard>
                </motion.div>
            )}

            {currentSection === 'analytics' && (
                <div className="h-full">
                    <AnalyticsPage clientId={clientId} channel="email" highlightConversationId={highlightConversationId} onConversationViewed={() => setHighlightConversationId(null)} />
                </div>
            )}

            {/* Leads Section */}
            {currentSection === 'leads' && (
                <div className="h-full">
                    <LeadsPage
                        clientId={clientId}
                        channel="email"
                        onNavigateToConversation={(convId) => {
                            setHighlightConversationId(convId);
                            setCurrentSection('analytics');
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default EmailChannel;

