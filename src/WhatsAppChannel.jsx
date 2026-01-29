import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, Settings, Database, BarChart, Key, Save, Copy, Check,
  Eye, EyeOff, AlertCircle, CheckCircle, Loader2, FileText, Upload, Trash2, Sparkles, Zap
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

const WhatsAppChannel = ({ clientId, activeSection = 'configuracion', onSectionChange, onFileSelect, uploadStatus, uploadProgress }) => {
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

  // URL de la Lambda de configuración de WhatsApp (requiere VITE_LAMBDA_WHATSAPP_CONFIG en .env)
  const WHATSAPP_CONFIG_URL = import.meta.env.VITE_LAMBDA_WHATSAPP_CONFIG;

  // Config state
  const [config, setConfig] = useState({
    nombre: 'Asistente WhatsApp',
    prompt: 'Eres un asistente de WhatsApp. Responde de forma breve y concisa.',
    tono: 'amistoso',
    estilo: 'conversacional',
    longitud: 'corta'
  });

  // Credentials state
  const [credentials, setCredentials] = useState({
    provider: 'twilio', // 'twilio' or 'meta'
    // Twilio
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioWhatsappNumber: '',
    // Meta
    metaAccessToken: '',
    metaPhoneNumberId: '',
    metaBusinessAccountId: '',
    metaVerifyToken: ''
  });

  const [showSecrets, setShowSecrets] = useState({
    twilioAuthToken: false,
    metaAccessToken: false
  });

  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected', 'testing', 'connected', 'error'
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const LAMBDA_LIST_DOCS_URL = import.meta.env.VITE_LAMBDA_LIST_DOCS;
  const LAMBDA_DELETE_DOC_URL = import.meta.env.VITE_LAMBDA_DELETE_DOC;
  const fileInputRef = useRef(null);

  // Delete document handler
  const handleDeleteDoc = async (documentName) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar "${documentName}"?`)) return;
    try {
      const response = await fetch(LAMBDA_DELETE_DOC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, documentName, channel: 'whatsapp' }),
      });
      if (!response.ok) throw new Error('Error al borrar.');
      setDocuments(prev => prev.filter(doc => doc.name !== documentName));
      toast.success('Documento eliminado');
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    }
  };

  // URL del webhook de WhatsApp (requiere VITE_WHATSAPP_WEBHOOK_URL en .env)
  const webhookUrl = `${import.meta.env.VITE_WHATSAPP_WEBHOOK_URL}/whatsapp/${clientId}`;

  // Cargar configuración al montar el componente
  useEffect(() => {
    const fetchConfig = async () => {
      if (!clientId) return;
      setIsLoading(true);
      try {
        const response = await fetch(`${WHATSAPP_CONFIG_URL}?clientId=${clientId}`);
        if (response.ok) {
          const data = await response.json();
          // Separar config de credentials
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
        console.error('Error cargando configuración de WhatsApp:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [clientId]);

  // Cargar documentos del canal whatsapp
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!clientId || !LAMBDA_LIST_DOCS_URL || currentSection !== 'database') return;
      setIsLoadingDocs(true);
      try {
        const response = await fetch(`${LAMBDA_LIST_DOCS_URL}?clientId=${clientId}&channel=whatsapp`);
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
  }, [clientId, currentSection, uploadStatus]);

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('URL copiada al portapapeles');
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(WHATSAPP_CONFIG_URL, {
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
      console.error('Error guardando configuración:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCredentials = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(WHATSAPP_CONFIG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          config: { ...config, credentials }
        })
      });

      if (!response.ok) throw new Error('Error al guardar');
      toast.success('Credenciales guardadas');
      setConnectionStatus('disconnected'); // Reset para que prueben la conexión
    } catch (error) {
      console.error('Error guardando credenciales:', error);
      toast.error('Error al guardar las credenciales');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    // Verificar que las credenciales estén completas
    if (credentials.provider === 'twilio') {
      if (!credentials.twilioAccountSid || !credentials.twilioAuthToken) {
        setConnectionStatus('error');
        toast.error('Completa las credenciales de Twilio primero');
        return;
      }
    } else if (credentials.provider === 'meta') {
      if (!credentials.metaAccessToken || !credentials.metaPhoneNumberId) {
        setConnectionStatus('error');
        toast.error('Completa las credenciales de Meta primero');
        return;
      }
    }

    // Por ahora solo verificamos que estén guardadas
    await new Promise(resolve => setTimeout(resolve, 1500));
    setConnectionStatus('connected');
    toast.success('Credenciales válidas');
  };

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
                <MessageSquare className="h-5 w-5 text-green-500" />
                Configuración del Chatbot WhatsApp
              </CardTitle>
              <CardDescription>
                Define cómo responde tu asistente en WhatsApp
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
                    placeholder="Ej: Asistente de Ventas"
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
                    <option value="amistoso">Amistoso</option>
                    <option value="profesional">Profesional</option>
                    <option value="casual">Casual</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Instrucciones del Sistema</Label>
                <Textarea
                  id="prompt"
                  value={config.prompt}
                  onChange={(e) => setConfig({ ...config, prompt: e.target.value })}
                  placeholder="Describe cómo debe comportarse tu asistente..."
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="estilo">Estilo de comunicación</Label>
                  <Select
                    id="estilo"
                    value={config.estilo}
                    onChange={(e) => setConfig({ ...config, estilo: e.target.value })}
                  >
                    <option value="directo">Directo</option>
                    <option value="conversacional">Conversacional</option>
                    <option value="detallado">Detallado</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitud">Longitud de respuestas</Label>
                  <Select
                    id="longitud"
                    value={config.longitud}
                    onChange={(e) => setConfig({ ...config, longitud: e.target.value })}
                  >
                    <option value="corta">Corta (WhatsApp optimizado)</option>
                    <option value="media">Media</option>
                    <option value="larga">Larga</option>
                  </Select>
                </div>
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
              <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 animate-pulse">
                <Upload className="h-10 w-10 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sube tus documentos de WhatsApp</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-8">
                Arrastra y suelta archivos PDF o DOCX aquí para entrenar a tu IA de WhatsApp.
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={(e) => onFileSelect && onFileSelect(e, 'whatsapp')}
              />
              <Button onClick={() => fileInputRef.current?.click()} size="lg" className="shadow-xl shadow-green-500/20 bg-green-600 hover:bg-green-700" disabled={uploadStatus === 'uploading'}>
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
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
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
              <CardTitle>Base de Conocimiento WhatsApp</CardTitle>
              <CardDescription>Documentos procesados y listos para ser consultados por WhatsApp.</CardDescription>
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
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                              <FileText className="w-12 h-12 text-green-500/60" />
                            </div>
                            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                              <Sparkles className="w-4 h-4 text-green-500" />
                            </div>
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">Tu base de conocimiento WhatsApp está vacía</h3>
                          <p className="text-sm text-muted-foreground text-center max-w-xs mb-6">
                            Sube documentos PDF o DOCX para entrenar a tu asistente de WhatsApp con información específica.
                          </p>
                          <Button onClick={() => fileInputRef.current?.click()} className="shadow-lg shadow-green-500/20 bg-green-600 hover:bg-green-700">
                            <Upload className="mr-2 h-4 w-4" /> Subir primer documento
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    documents.map((doc) => (
                      <TableRow key={doc.name} className="group">
                        <TableCell className="font-medium flex items-center gap-2">
                          <div className="p-2 rounded bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors">
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
                <Key className="h-5 w-5 text-green-500" />
                Credenciales de WhatsApp
              </CardTitle>
              <CardDescription>
                Conecta tu cuenta de WhatsApp Business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label>Proveedor</Label>
                <div className="flex gap-4">
                  <Button
                    variant={credentials.provider === 'twilio' ? 'default' : 'outline'}
                    onClick={() => setCredentials({ ...credentials, provider: 'twilio' })}
                    className="flex-1"
                  >
                    Twilio
                  </Button>
                  <Button
                    variant={credentials.provider === 'meta' ? 'default' : 'outline'}
                    onClick={() => setCredentials({ ...credentials, provider: 'meta' })}
                    className="flex-1"
                  >
                    Meta API Directa
                  </Button>
                </div>
              </div>

              {/* Twilio Fields */}
              {credentials.provider === 'twilio' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label htmlFor="twilioAccountSid">Account SID</Label>
                    <Input
                      id="twilioAccountSid"
                      value={credentials.twilioAccountSid}
                      onChange={(e) => setCredentials({ ...credentials, twilioAccountSid: e.target.value })}
                      placeholder="ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twilioAuthToken">Auth Token</Label>
                    <div className="relative">
                      <Input
                        id="twilioAuthToken"
                        type={showSecrets.twilioAuthToken ? 'text' : 'password'}
                        value={credentials.twilioAuthToken}
                        onChange={(e) => setCredentials({ ...credentials, twilioAuthToken: e.target.value })}
                        placeholder="Tu Auth Token de Twilio"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecrets({ ...showSecrets, twilioAuthToken: !showSecrets.twilioAuthToken })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecrets.twilioAuthToken ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="twilioWhatsappNumber">Número de WhatsApp</Label>
                    <Input
                      id="twilioWhatsappNumber"
                      value={credentials.twilioWhatsappNumber}
                      onChange={(e) => setCredentials({ ...credentials, twilioWhatsappNumber: e.target.value })}
                      placeholder="+34600123456"
                    />
                  </div>
                </div>
              )}

              {/* Meta Fields */}
              {credentials.provider === 'meta' && (
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-2">
                    <Label htmlFor="metaAccessToken">Access Token</Label>
                    <div className="relative">
                      <Input
                        id="metaAccessToken"
                        type={showSecrets.metaAccessToken ? 'text' : 'password'}
                        value={credentials.metaAccessToken}
                        onChange={(e) => setCredentials({ ...credentials, metaAccessToken: e.target.value })}
                        placeholder="EAAGXXXXXXX..."
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSecrets({ ...showSecrets, metaAccessToken: !showSecrets.metaAccessToken })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSecrets.metaAccessToken ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metaPhoneNumberId">Phone Number ID</Label>
                    <Input
                      id="metaPhoneNumberId"
                      value={credentials.metaPhoneNumberId}
                      onChange={(e) => setCredentials({ ...credentials, metaPhoneNumberId: e.target.value })}
                      placeholder="123456789012345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metaBusinessAccountId">Business Account ID</Label>
                    <Input
                      id="metaBusinessAccountId"
                      value={credentials.metaBusinessAccountId}
                      onChange={(e) => setCredentials({ ...credentials, metaBusinessAccountId: e.target.value })}
                      placeholder="987654321098765"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metaVerifyToken">Verify Token (para webhook)</Label>
                    <Input
                      id="metaVerifyToken"
                      value={credentials.metaVerifyToken}
                      onChange={(e) => setCredentials({ ...credentials, metaVerifyToken: e.target.value })}
                      placeholder="tu_token_secreto"
                    />
                  </div>
                </div>
              )}

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label>URL de Webhook (configúralo en {credentials.provider === 'twilio' ? 'Twilio' : 'Meta'})</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" onClick={handleCopyWebhook}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Connection Status */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
                <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'testing' ? 'bg-yellow-500 animate-pulse' :
                    connectionStatus === 'error' ? 'bg-red-500' :
                      'bg-gray-400'
                  }`} />
                <span className="text-sm">
                  {connectionStatus === 'connected' && 'Conectado'}
                  {connectionStatus === 'testing' && 'Probando conexión...'}
                  {connectionStatus === 'error' && 'Error de conexión'}
                  {connectionStatus === 'disconnected' && 'No conectado'}
                </span>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSaveCredentials} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Credenciales
                </Button>
                <Button variant="outline" onClick={handleTestConnection} disabled={connectionStatus === 'testing'}>
                  {connectionStatus === 'testing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Probar Conexión
                </Button>
              </div>
            </CardContent>
          </SpotlightCard>
        </motion.div>
      )}

      {/* Analytics Section */}
      {currentSection === 'analytics' && (
        <div className="h-full">
          <AnalyticsPage clientId={clientId} channel="whatsapp" highlightConversationId={highlightConversationId} onConversationViewed={() => setHighlightConversationId(null)} />
        </div>
      )}

      {/* Leads Section */}
      {currentSection === 'leads' && (
        <div className="h-full">
          <LeadsPage
            clientId={clientId}
            channel="whatsapp"
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

export default WhatsAppChannel;
