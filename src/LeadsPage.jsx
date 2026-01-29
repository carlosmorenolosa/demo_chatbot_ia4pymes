import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Flame, ThermometerSun, Snowflake, Trash2, ExternalLink,
    Mail, Phone, Building2, MapPin, Target, AlertCircle, Clock,
    TrendingUp, ChevronDown, Search, RefreshCw, MessageSquare,
    Edit3, Send, DollarSign, CheckCircle, XCircle, History,
    Download, LayoutGrid, List, Plus, Save, X, Globe, Settings, GripVertical
} from 'lucide-react';

// URL de la Lambda (cambiar en producción)
const LAMBDA_LEADS_URL = import.meta.env.VITE_LAMBDA_LEADS || 'https://your-lambda-url.amazonaws.com';
const LAMBDA_DELETE_LEAD_URL = import.meta.env.VITE_LAMBDA_DELETE_LEAD || 'https://your-lambda-url.amazonaws.com';
const LAMBDA_HISTORY_URL = import.meta.env.VITE_LAMBDA_HISTORY || 'https://your-lambda-url.amazonaws.com';
const LAMBDA_UPDATE_CRM_URL = import.meta.env.VITE_LAMBDA_UPDATE_CRM || 'https://your-lambda-url.amazonaws.com';
const LAMBDA_CRM_SETTINGS_URL = import.meta.env.VITE_LAMBDA_CRM_SETTINGS || 'https://your-lambda-url.amazonaws.com';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './components/ui/Table';

const GLASS_PANEL = "bg-[#1a1f2e] border border-white/10";

// Default CRM Status configuration (fallback if API fails)
const DEFAULT_CRM_STATUSES = [
    { id: 'new', label: 'Nuevo', color: '#3B82F6', order: 0 },
    { id: 'contacted', label: 'Contactado', color: '#EAB308', order: 1 },
    { id: 'negotiation', label: 'En negociación', color: '#F97316', order: 2 },
    { id: 'proposal', label: 'Propuesta', color: '#A855F7', order: 3 },
    { id: 'won', label: 'Ganado', color: '#22C55E', order: 4 },
    { id: 'lost', label: 'Perdido', color: '#EF4444', order: 5 }
];

const LeadsPage = ({ clientId, channel = 'web', onNavigateToConversation }) => {
    const [leads, setLeads] = useState([]);
    const [summary, setSummary] = useState({ total: 0, hot: 0, warm: 0, cold: 0 });
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [selectedDays, setSelectedDays] = useState(30);
    const [selectedLead, setSelectedLead] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [filterTemp, setFilterTemp] = useState('all'); // 'all' | 'hot' | 'warm' | 'cold'
    const [nextKey, setNextKey] = useState(null);
    const [hasMore, setHasMore] = useState(false);

    // Estado para modal de conversación
    const [conversationModal, setConversationModal] = useState(null);
    const [loadingConversation, setLoadingConversation] = useState(false);

    // CRM states
    const [newNote, setNewNote] = useState('');
    const [updatingCRM, setUpdatingCRM] = useState(false);
    const [editingDealValue, setEditingDealValue] = useState(false);
    const [dealValueInput, setDealValueInput] = useState('');

    // Filters
    const [filterStatus, setFilterStatus] = useState('all');
    const [draggedLead, setDraggedLead] = useState(null);
    const [filterChannel, setFilterChannel] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'board'
    const [isDragging, setIsDragging] = useState(false);

    // Creation & Editing States
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [createFormData, setCreateFormData] = useState({ name: '', email: '', phone: '', status: 'new', dealValue: 0, notes: '', temperature: 'cold' });
    const [editingContact, setEditingContact] = useState(false);
    const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '' });

    // Dynamic CRM Statuses
    const [crmStatuses, setCrmStatuses] = useState(DEFAULT_CRM_STATUSES);
    const [statusesConfigOpen, setStatusesConfigOpen] = useState(false);
    const [editableStatuses, setEditableStatuses] = useState([]);
    const [savingStatuses, setSavingStatuses] = useState(false);

    // Toast notifications
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchLeads = async (loadMore = false) => {
        try {
            if (loadMore) {
                setLoadingMore(true);
            } else {
                setLoading(true);
                setLeads([]);
                setNextKey(null);
            }
            setError(null);

            let url = `${LAMBDA_LEADS_URL}?clientId=${clientId}&days=${selectedDays}`;
            if (channel && channel !== 'all') {
                url += `&channel=${channel}`;
            }

            if (loadMore && nextKey) {
                url += `&lastKey=${encodeURIComponent(nextKey)}`;
            }

            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al cargar leads');
            const data = await response.json();

            if (loadMore) {
                setLeads(prev => [...prev, ...(data.leads || [])]);
            } else {
                setLeads(data.leads || []);
                if (data.summary) {
                    setSummary(data.summary);
                }
            }

            setHasMore(data.hasMore || false);
            setNextKey(data.nextKey || null);
        } catch (err) {
            console.error('Error fetching leads:', err);
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Fetch CRM Statuses from API
    const fetchCrmStatuses = async () => {
        try {
            const response = await fetch(`${LAMBDA_CRM_SETTINGS_URL}?clientId=${encodeURIComponent(clientId)}`);
            if (response.ok) {
                const data = await response.json();
                if (data.crmStatuses && data.crmStatuses.length > 0) {
                    // Sort by order and set
                    const sorted = [...data.crmStatuses].sort((a, b) => a.order - b.order);
                    setCrmStatuses(sorted);
                }
            }
        } catch (err) {
            console.error('Error fetching CRM statuses:', err);
            // Keep default statuses on error
        }
    };

    // Migration State
    const [migrationModalOpen, setMigrationModalOpen] = useState(false);
    const [deletedStatuses, setDeletedStatuses] = useState([]); // List of { id, label, count }
    const [migrationMap, setMigrationMap] = useState({}); // { deletedId: targetId }
    const [pendingStatusesToSave, setPendingStatusesToSave] = useState(null);

    // Prepare Save: Validate deletions and prompt if necessary
    const prepareSaveCrmStatuses = () => {
        const currentIds = crmStatuses.map(s => s.id);
        const newIds = editableStatuses.map(s => s.id);
        const deletedIds = currentIds.filter(id => !newIds.includes(id));

        const orphanLeads = leads.filter(l => deletedIds.includes(l.crmStatus));

        if (orphanLeads.length > 0) {
            // Found deleted statuses with leads -> Show Migration Modal
            const conflicts = deletedIds.map(id => {
                const count = orphanLeads.filter(l => l.crmStatus === id).length;
                const label = crmStatuses.find(s => s.id === id)?.label || id;
                return { id, label, count };
            }).filter(c => c.count > 0);

            if (conflicts.length > 0) {
                setDeletedStatuses(conflicts);
                // Default target: first available new status
                const defaultTarget = editableStatuses[0]?.id || 'new';
                const initialMap = {};
                conflicts.forEach(c => initialMap[c.id] = defaultTarget);
                setMigrationMap(initialMap);

                setPendingStatusesToSave(editableStatuses);
                setMigrationModalOpen(true);
                return;
            }
        }

        // No conflicts, proceed to save directly
        executeSave(editableStatuses);
    };

    // Execute Save (with optional migrations)
    const executeSave = async (statusesToSave, migrations = []) => {
        setSavingStatuses(true);
        const orderedStatuses = statusesToSave.map((s, i) => ({ ...s, order: i }));

        try {
            const body = {
                clientId,
                crmStatuses: orderedStatuses,
                migrations
            };

            console.log('Saving CRM statuses with migrations:', body);

            const response = await fetch(LAMBDA_CRM_SETTINGS_URL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Optimistic Update for migrations
                if (migrations.length > 0) {
                    setLeads(prev => prev.map(lead => {
                        const migration = migrations.find(m => m.fromStatus === lead.crmStatus);
                        if (migration) {
                            return { ...lead, crmStatus: migration.toStatus };
                        }
                        return lead;
                    }));
                }

                setCrmStatuses(orderedStatuses);
                setStatusesConfigOpen(false);
                setMigrationModalOpen(false);
                setPendingStatusesToSave(null);
                showToast('Configuración guardada correctamente', 'success');
            } else {
                throw new Error(result.message || 'Error al guardar');
            }
        } catch (err) {
            console.error('Error saving:', err);
            showToast('Error al guardar configuración', 'error');
        } finally {
            setSavingStatuses(false);
        }
    };

    useEffect(() => {
        fetchCrmStatuses();
        fetchLeads();
    }, [clientId, channel, selectedDays]);

    const handleDelete = async (leadId) => {
        if (!confirm('¿Eliminar este lead permanentemente?')) return;

        setDeletingId(leadId);
        try {
            const leadToDelete = leads.find(l => l.leadId === leadId);
            const leadChannel = leadToDelete?.channel || channel;
            const url = `${LAMBDA_DELETE_LEAD_URL}?clientId=${clientId}&channel=${leadChannel}&leadId=${leadId}`;
            const response = await fetch(url, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error al eliminar');

            // Actualizar lista local
            setLeads(prev => prev.filter(l => l.leadId !== leadId));
            setSummary(prev => ({ ...prev, total: prev.total - 1 }));
            setSelectedLead(null);
        } catch (err) {
            console.error('Error deleting lead:', err);
            alert('Error al eliminar el lead');
        } finally {
            setDeletingId(null);
        }
    };

    // Función para obtener una conversación específica
    const fetchConversation = async (conversationId) => {
        setLoadingConversation(true);
        try {
            const url = `${LAMBDA_HISTORY_URL}?clientId=${clientId}&conversationId=${encodeURIComponent(conversationId)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al cargar conversación');
            const data = await response.json();
            setConversationModal(data.conversation);
            setSelectedLead(null); // Cerrar modal del lead
        } catch (err) {
            console.error('Error fetching conversation:', err);
            alert('No se pudo cargar la conversación');
        } finally {
            setLoadingConversation(false);
        }
    };

    // CRM update function with optimistic updates
    const updateLeadCRM = async (action, data, targetLead = selectedLead) => {
        if (!targetLead) return;

        setUpdatingCRM(true);

        // Optimistic update - update UI immediately
        const now = new Date().toISOString();
        let optimisticLead = { ...targetLead };
        let successMessage = '';

        if (action === 'updateStatus') {
            const statusLabel = crmStatuses.find(s => s.id === data.status)?.label || data.status;
            optimisticLead.crmStatus = data.status;
            optimisticLead.timeline = [
                ...(optimisticLead.timeline || []),
                { id: Date.now().toString(), type: 'status_change', timestamp: now, description: `Estado cambiado a: ${statusLabel}` }
            ];
            successMessage = `Estado actualizado: ${statusLabel}`;
        } else if (action === 'addNote') {
            const newNoteObj = { id: Date.now().toString(), text: data.text, createdAt: now };
            optimisticLead.notes = [...(optimisticLead.notes || []), newNoteObj];
            optimisticLead.timeline = [
                ...(optimisticLead.timeline || []),
                { id: Date.now().toString(), type: 'note_added', timestamp: now, description: `Nota añadida` }
            ];
            successMessage = 'Nota añadida';
        } else if (action === 'deleteNote') {
            optimisticLead.notes = (optimisticLead.notes || []).filter(n => n.id !== data.noteId);
            successMessage = 'Nota eliminada';
        } else if (action === 'updateDealValue') {
            optimisticLead.dealValue = data.value;
            optimisticLead.timeline = [
                ...(optimisticLead.timeline || []),
                { id: Date.now().toString(), type: 'deal_value_changed', timestamp: now, description: `Valor del deal: ${data.value}€` }
            ];
            successMessage = `Valor del deal: ${data.value}€`;
        } else if (action === 'updateContact') {
            optimisticLead.contact = { ...optimisticLead.contact, ...data };
            optimisticLead.timeline = [
                ...(optimisticLead.timeline || []),
                { id: Date.now().toString(), type: 'contact_updated', timestamp: now, description: `Datos de contacto actualizados` }
            ];
            successMessage = 'Contacto actualizado';
        } else if (action === 'updateTemperature') {
            const tempLabels = { hot: 'Caliente', warm: 'Tibio', cold: 'Frío' };
            const oldTemp = optimisticLead.qualification?.temperature || 'cold';
            const newTemp = data.temperature;
            optimisticLead.qualification = { ...optimisticLead.qualification, temperature: newTemp };
            optimisticLead.timeline = [
                ...(optimisticLead.timeline || []),
                { id: Date.now().toString(), type: 'temperature_changed', timestamp: now, description: `Temperatura cambiada a: ${tempLabels[newTemp]}` }
            ];
            successMessage = `Temperatura: ${tempLabels[newTemp]}`;

            // Update summary counts in real-time
            if (oldTemp !== newTemp) {
                setSummary(prev => ({
                    ...prev,
                    [oldTemp]: Math.max(0, (prev[oldTemp] || 0) - 1),
                    [newTemp]: (prev[newTemp] || 0) + 1
                }));
            }
        }

        optimisticLead.lastUpdated = now;

        // Update UI immediately
        setSelectedLead(optimisticLead);
        setLeads(prev => prev.map(l => l.leadId === optimisticLead.leadId ? optimisticLead : l));

        try {
            const response = await fetch(LAMBDA_UPDATE_CRM_URL, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    channel: targetLead.channel || channel,
                    leadId: targetLead.leadId,
                    action,
                    data
                })
            });

            if (!response.ok) throw new Error('Error al actualizar');
            const result = await response.json();

            if (result.success) {
                showToast(successMessage, 'success');

                // Clear inputs
                if (action === 'addNote') setNewNote('');
                if (action === 'updateDealValue') setEditingDealValue(false);
                if (action === 'updateContact') setEditingContact(false);
            } else {
                throw new Error(result.error || 'Error desconocido');
            }
        } catch (err) {
            console.error('Error updating CRM:', err);
            showToast('Error al actualizar', 'error');
            showToast('Error al actualizar', 'error');
            // Revert optimistic update
            if (selectedLead && selectedLead.leadId === targetLead.leadId) setSelectedLead(targetLead);
            setLeads(prev => prev.map(l => l.leadId === targetLead.leadId ? targetLead : l));
        } finally {
            setUpdatingCRM(false);
        }
    };

    // Get CRM status info (from dynamic statuses)
    const getCRMStatus = (statusId) => {
        const found = crmStatuses.find(s => s.id === statusId);
        if (found) {
            return {
                value: found.id,
                label: found.label,
                color: found.color,
                // Generate tailwind-compatible classes from hex
                bgClass: `bg-[${found.color}]`,
                textClass: `text-[${found.color}]`
            };
        }
        return { value: statusId, label: statusId, color: '#3B82F6', bgClass: 'bg-blue-500', textClass: 'text-blue-400' };
    };

    const getTemperatureIcon = (temp) => {
        switch (temp) {
            case 'hot': return <Flame className="w-4 h-4 text-orange-400" />;
            case 'warm': return <ThermometerSun className="w-4 h-4 text-yellow-400" />;
            case 'cold': return <Snowflake className="w-4 h-4 text-blue-400" />;
            default: return null;
        }
    };

    const getTemperatureBadge = (temp) => {
        const styles = {
            hot: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
            warm: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
            cold: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        };
        return styles[temp] || styles.cold;
    };

    const filteredLeads = leads.filter(l => {
        const matchTemp = filterTemp === 'all' || l.qualification?.temperature === filterTemp;
        const matchStatus = filterStatus === 'all' || (l.crmStatus || 'new') === filterStatus;
        const matchChannel = filterChannel === 'all' || (l.sourceContact?.type || 'manual') === filterChannel;

        const searchLower = searchTerm.toLowerCase();
        const matchSearch = searchTerm === '' ||
            (l.contact?.name || '').toLowerCase().includes(searchLower) ||
            (l.contact?.email || '').toLowerCase().includes(searchLower) ||
            (l.contact?.phone || '').includes(searchLower);

        return matchTemp && matchStatus && matchChannel && matchSearch;
    });

    const downloadCSV = () => {
        const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Canal', 'Estado', 'Temperatura', 'Valor', 'Fecha'];
        const rows = filteredLeads.map(l => [
            l.leadId,
            `"${l.sourceContact?.name || ''}"`,
            `"${l.sourceContact?.email || ''}"`,
            `"${l.sourceContact?.phone || ''}"`,
            l.sourceContact?.type || '',
            l.crmStatus || 'new',
            l.qualification?.temperature || '',
            l.dealValue || 0,
            l.createdAt
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `leads_export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '--';
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Drag & Drop Handlers
    const handleDragStart = (e, lead) => {
        setIsDragging(true);
        setDraggedLead(lead);
        e.dataTransfer.setData('leadId', lead.leadId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e, targetStatus) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('leadId');
        // Find lead from ID if state is lost, or use state
        const leadToUpdate = draggedLead || leads.find(l => l.leadId === leadId);

        if (leadToUpdate && leadToUpdate.crmStatus !== targetStatus) {
            // Update state for DnD continuity if needed, though we rely on ID now mostly
            if (!draggedLead) setDraggedLead(leadToUpdate);
            await updateLeadCRM('updateStatus', { status: targetStatus }, leadToUpdate);
        }
        setDraggedLead(null);
        // Delay resetting isDragging to ensure click event is ignored
        setTimeout(() => setIsDragging(false), 500);
    };

    const handleDragEnd = () => {
        // Ensure isDragging is eventually reset even if dropped outside
        setTimeout(() => setIsDragging(false), 500);
    };

    const createNewLead = async (e) => {
        e.preventDefault();
        setLoading(true); // Reuse loading state or create specific one
        try {
            const response = await fetch(LAMBDA_UPDATE_CRM_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    channel: 'manual', // or let user choose
                    action: 'createLead',
                    data: createFormData
                })
            });

            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Error al crear lead');

            showToast('Lead creado correctamente', 'success');
            setCreateModalOpen(false);
            setCreateFormData({ name: '', email: '', phone: '', status: 'new', dealValue: 0, notes: '', temperature: 'cold' });
            fetchLeads(); // Refresh list
        } catch (err) {
            console.error('Error creating lead:', err);
            showToast('Error al crear lead', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-6 text-white">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold flex items-center gap-3 text-white drop-shadow-lg">
                        <Target className="text-cyan-400" />
                        Leads Capturados
                    </h1>
                    <p className="text-gray-300 text-sm mt-1 font-medium">
                        Contactos extraídos automáticamente cada día · Gestiona tu pipeline de ventas con estados, notas y valor de cada oportunidad
                    </p>
                </div>

                {/* Period Selector */}
                <div className="flex items-center gap-2">
                    {[7, 30, 90].map(days => (
                        <button
                            key={days}
                            onClick={() => setSelectedDays(days)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedDays === days
                                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                }`}
                        >
                            {days}D
                        </button>
                    ))}
                    <button
                        onClick={() => fetchLeads(false)}
                        disabled={loading}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`${GLASS_PANEL} rounded-xl p-4 cursor-pointer ${filterTemp === 'all' ? 'ring-2 ring-cyan-500/50' : ''}`}
                    onClick={() => setFilterTemp('all')}
                >
                    <div className="flex items-center justify-between">
                        <Users className="w-5 h-5 text-cyan-400" />
                        <span className="text-xs text-gray-500">Total</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">{summary.total}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`${GLASS_PANEL} rounded-xl p-4 cursor-pointer ${filterTemp === 'hot' ? 'ring-2 ring-orange-500/50' : ''}`}
                    onClick={() => setFilterTemp('hot')}
                    title="Alta intención de compra - Lead muy interesado, menciona precios o quiere comprar"
                >
                    <div className="flex items-center justify-between">
                        <Flame className="w-5 h-5 text-orange-400" />
                        <span className="text-xs text-gray-500">Calientes 🔥</span>
                    </div>
                    <p className="text-2xl font-bold mt-2 text-orange-400">{summary.hot}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`${GLASS_PANEL} rounded-xl p-4 cursor-pointer ${filterTemp === 'warm' ? 'ring-2 ring-yellow-500/50' : ''}`}
                    onClick={() => setFilterTemp('warm')}
                    title="Interesado pero sin urgencia - Están evaluando opciones"
                >
                    <div className="flex items-center justify-between">
                        <ThermometerSun className="w-5 h-5 text-yellow-400" />
                        <span className="text-xs text-gray-500">Tibios</span>
                    </div>
                    <p className="text-2xl font-bold mt-2 text-yellow-400">{summary.warm}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`${GLASS_PANEL} rounded-xl p-4 cursor-pointer ${filterTemp === 'cold' ? 'ring-2 ring-blue-500/50' : ''}`}
                    onClick={() => setFilterTemp('cold')}
                    title="Solo preguntando - Baja intención de compra, consultas generales"
                >
                    <div className="flex items-center justify-between">
                        <Snowflake className="w-5 h-5 text-blue-400" />
                        <span className="text-xs text-gray-500">Fríos</span>
                    </div>
                    <p className="text-2xl font-bold mt-2 text-blue-400">{summary.cold}</p>
                </motion.div>
            </div>

            {/* Filters Bar */}
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search Input */}
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-cyan-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, email..."
                            className="pl-10 pr-4 py-1.5 bg-cyan-950/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-100 placeholder-cyan-500/50 focus:outline-none focus:border-cyan-500/50 hover:border-cyan-500/50 transition-colors w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="h-6 w-px bg-white/10 mx-2 hidden md:block"></div>

                    {/* Dropdowns */}
                    <div className="flex items-center gap-2 bg-cyan-950/30 p-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 transition-colors">
                        <span className="text-xs text-cyan-500/70 ml-2 font-medium">ESTADO</span>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-transparent text-sm text-cyan-100 focus:outline-none p-1.5 [&>option]:bg-[#0f172a] [&>option]:text-gray-300"
                        >
                            <option value="all">Todos</option>
                            {crmStatuses.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-cyan-950/30 p-1.5 rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 transition-colors">
                        <span className="text-xs text-cyan-500/70 ml-2 font-medium">CANAL</span>
                        <select
                            value={filterChannel}
                            onChange={(e) => setFilterChannel(e.target.value)}
                            className="bg-transparent text-sm text-cyan-100 focus:outline-none p-1.5 [&>option]:bg-[#0f172a] [&>option]:text-gray-300"
                        >
                            <option value="all">Todos</option>
                            <option value="web">Web</option>
                            <option value="whatsapp">WhatsApp</option>
                            <option value="email">Email</option>
                            <option value="manual">Manual</option>
                        </select>
                    </div>

                    {(filterStatus !== 'all' || filterChannel !== 'all' || filterTemp !== 'all' || searchTerm !== '') && (
                        <button
                            onClick={() => { setFilterStatus('all'); setFilterChannel('all'); setFilterTemp('all'); setSearchTerm(''); }}
                            className="text-xs text-red-400 hover:text-red-300 underline"
                        >
                            Limpiar
                        </button>
                    )}
                </div>

                {/* View Toggles & Actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setEditableStatuses([...crmStatuses]);
                            setStatusesConfigOpen(true);
                        }}
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-purple-200 border border-purple-500/40 hover:border-purple-400/60 hover:from-purple-600/40 hover:to-pink-600/40 transition-all flex items-center gap-2 text-sm font-medium shadow-lg shadow-purple-500/10"
                        title="Configurar Estados del Pipeline"
                    >
                        <Settings className="w-4 h-4" />
                        <span className="hidden md:inline">Configurar Estados</span>
                    </button>

                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all flex items-center gap-2 text-sm font-medium shadow-lg shadow-cyan-500/10"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden md:inline">Nuevo Lead</span>
                    </button>

                    <div className="h-6 w-px bg-white/10 mx-1 hidden md:block"></div>

                    <button
                        onClick={downloadCSV}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-2 text-sm font-medium"
                        title="Exportar CSV"
                    >
                        <Download className="w-4 h-4" />
                        <span className="hidden md:inline">Exportar</span>
                    </button>

                    <div className="flex bg-black/20 p-1 rounded-lg border border-white/10">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                            title="Vista Lista"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('board')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-cyan-500/20 text-cyan-400 shadow-sm' : 'text-gray-400 hover:text-gray-300'}`}
                            title="Vista Tablero Kanban"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Leads List Table */}
            <div className={`${GLASS_PANEL} rounded-xl overflow-hidden`}>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Cargando leads...
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-red-400">
                        <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                        {error}
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        No hay leads {filterTemp !== 'all' ? `${filterTemp}s` : ''} en este período
                    </div>
                ) : viewMode === 'list' ? (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead className="text-gray-400">Identidad</TableHead>
                                <TableHead className="text-gray-400">Estado del Lead</TableHead>
                                <TableHead className="text-gray-400">Canal de Origen</TableHead>
                                <TableHead className="text-gray-400">Historial</TableHead>
                                <TableHead className="text-gray-400">Notas Adicionales</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLeads.map((lead, idx) => {
                                const lastNote = lead.notes && lead.notes.length > 0 ? lead.notes[lead.notes.length - 1] : null;
                                const lastAction = lead.timeline && lead.timeline.length > 0 ? lead.timeline[lead.timeline.length - 1] : null;

                                return (
                                    <TableRow
                                        key={lead.leadId}
                                        className="hover:bg-white/5 border-white/5 cursor-pointer transition-colors group"
                                        onClick={() => setSelectedLead(lead)}
                                    >
                                        {/* Identidad */}
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white">
                                                    {lead.contact?.name || 'Lead Anónimo'}
                                                </span>
                                                <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    {lead.contact?.email || lead.contact?.phone || 'Sin contacto'}
                                                </span>
                                                {/* Temperature Badge Inline */}
                                                <div className="mt-1 flex">
                                                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-medium border flex items-center gap-1 ${getTemperatureBadge(lead.qualification?.temperature)}`}>
                                                        {getTemperatureIcon(lead.qualification?.temperature)}
                                                        {lead.qualification?.score}/10
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Estado */}
                                        <TableCell>
                                            {lead.crmStatus && lead.crmStatus !== 'new' ? (
                                                <span
                                                    className="px-2.5 py-1 text-xs rounded-full font-medium text-white border border-white/10"
                                                    style={{ backgroundColor: getCRMStatus(lead.crmStatus).color }}
                                                >
                                                    {getCRMStatus(lead.crmStatus).label}
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 text-xs rounded-full font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                    Nuevo
                                                </span>
                                            )}
                                        </TableCell>

                                        {/* Canal de Origen */}
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {lead.sourceContact?.type === 'whatsapp' ? (
                                                    <div className="p-1.5 rounded-md bg-green-500/10 text-green-400">
                                                        <MessageSquare className="w-4 h-4" />
                                                    </div>
                                                ) : lead.sourceContact?.type === 'email' ? (
                                                    <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-400">
                                                        <Mail className="w-4 h-4" />
                                                    </div>
                                                ) : (
                                                    <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </div>
                                                )}
                                                <span className="text-sm text-gray-300 capitalize">
                                                    {lead.sourceContact?.type || 'Web'}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Historial */}
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(lead.lastUpdated || lead.extractedAt)}
                                                </span>
                                                <span className="text-xs text-gray-500 truncate max-w-[150px]">
                                                    {lastAction ? lastAction.description : 'Lead capturado'}
                                                </span>
                                            </div>
                                        </TableCell>

                                        {/* Notas */}
                                        <TableCell>
                                            {lastNote ? (
                                                <div className="flex items-start gap-1.5 max-w-[180px]" title={lastNote.text}>
                                                    <Edit3 className="w-3 h-3 text-gray-500 mt-0.5 shrink-0" />
                                                    <span className="text-xs text-gray-400 truncate">
                                                        {lastNote.text}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-600 italic">Sin notas</span>
                                            )}
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(lead.leadId);
                                                }}
                                                disabled={deletingId === lead.leadId}
                                                className="p-2 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 className={`w-4 h-4 ${deletingId === lead.leadId ? 'animate-pulse' : ''}`} />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[600px] pt-4">
                        {crmStatuses.map(status => {
                            const statusLeads = filteredLeads.filter(l => (l.crmStatus || 'new') === status.id);
                            return (
                                <div
                                    key={status.id}
                                    className="min-w-[280px] w-[280px] flex-shrink-0 bg-black/20 rounded-xl border border-white/10 flex flex-col max-h-[700px]"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, status.id)}
                                >
                                    <div className={`p-3 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#1e293b] z-10 rounded-t-xl`}>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }}></div>
                                            <span className="font-semibold text-sm text-gray-200">{status.label}</span>
                                        </div>
                                        <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">{statusLeads.length}</span>
                                    </div>
                                    <div className="p-2 flex flex-col gap-2 overflow-y-auto flex-1 custom-scrollbar">
                                        {statusLeads.map(lead => (
                                            <div
                                                key={lead.leadId}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, lead)}
                                                onDragEnd={handleDragEnd}
                                                onClick={(e) => {
                                                    if (!isDragging) {
                                                        setSelectedLead(lead);
                                                    }
                                                }}
                                                className="bg-[#1a1f2e] p-3 rounded-lg border border-white/5 hover:border-cyan-500/50 cursor-pointer shadow-sm hover:shadow-md transition-all group relative active:cursor-grabbing hover:bg-[#252b3b]"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-medium text-sm text-white line-clamp-1">{lead.contact?.name || 'Anónimo'}</span>
                                                    <div className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border flex items-center gap-1 ${getTemperatureBadge(lead.qualification?.temperature)}`}>
                                                        {getTemperatureIcon(lead.qualification?.temperature)}
                                                        {lead.qualification?.score}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-400 mb-2 truncate">
                                                    {lead.contact?.email || lead.contact?.phone || 'Sin contacto'}
                                                </div>
                                                {lead.dealValue > 0 && <div className="text-xs font-bold text-green-400 mb-2">{lead.dealValue} €</div>}
                                                <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-white/5">
                                                    <span className="capitalize">{lead.sourceContact?.type || 'Web'}</span>
                                                    <span>{new Date(lead.lastUpdated || lead.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Load More Button */}
                {hasMore && !loading && (
                    <div className="p-4 border-t border-white/10">
                        <button
                            onClick={() => fetchLeads(true)}
                            disabled={loadingMore}
                            className="w-full py-2 px-4 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {loadingMore ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Cargando...
                                </>
                            ) : (
                                <>
                                    Cargar más leads
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Counter */}
                {leads.length > 0 && (
                    <div className="p-3 text-center text-xs text-gray-500 border-t border-white/10">
                        Mostrando {leads.length} de {summary.total} leads
                    </div>
                )}
            </div>

            {/* Lead Detail Modal */}
            <AnimatePresence>
                {selectedLead && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedLead(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`${GLASS_PANEL} rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto`}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Users className="w-5 h-5 text-cyan-400" />
                                        Detalle del Lead
                                    </h2>
                                    <p className="text-gray-400 text-xs mt-1">ID: {selectedLead.leadId.slice(0, 8)}...</p>
                                </div>
                                <button
                                    onClick={() => setSelectedLead(null)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Bloque 1: Identidad */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                                            <Users className="w-3 h-3" /> Identidad
                                        </h3>
                                        <button
                                            onClick={() => {
                                                if (editingContact) {
                                                    setEditingContact(false);
                                                } else {
                                                    setContactForm({
                                                        name: selectedLead.contact?.name || '',
                                                        email: selectedLead.contact?.email || '',
                                                        phone: selectedLead.contact?.phone || ''
                                                    });
                                                    setEditingContact(true);
                                                }
                                            }}
                                            className={`p-1.5 rounded-lg transition-colors ${editingContact ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-cyan-400'}`}
                                            title={editingContact ? "Cancelar edición" : "Editar contacto"}
                                        >
                                            {editingContact ? <X className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                                        </button>
                                    </div>

                                    {editingContact ? (
                                        <div className="bg-white/5 rounded-xl p-4 border border-cyan-500/30 space-y-3 ring-1 ring-cyan-500/20">
                                            <div className="space-y-2">
                                                <label className="text-xs text-gray-500">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={contactForm.name}
                                                    onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                                                    placeholder="Nombre del lead"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-2">
                                                    <label className="text-xs text-gray-500">Email</label>
                                                    <input
                                                        type="email"
                                                        value={contactForm.email}
                                                        onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                                                        placeholder="email@ejemplo.com"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs text-gray-500">Teléfono</label>
                                                    <input
                                                        type="tel"
                                                        value={contactForm.phone}
                                                        onChange={e => setContactForm({ ...contactForm, phone: e.target.value })}
                                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                                                        placeholder="+34 600..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-2">
                                                <button
                                                    onClick={() => updateLeadCRM('updateContact', contactForm)}
                                                    className="flex items-center gap-2 bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-cyan-600 transition-colors shadow-lg shadow-cyan-500/20"
                                                >
                                                    <Save className="w-4 h-4" />
                                                    Guardar Cambios
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                                    {selectedLead.contact?.name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-lg">{selectedLead.contact?.name || 'Lead Anónimo'}</p>
                                                    <div className={`mt-1 inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border items-center gap-1 ${getTemperatureBadge(selectedLead.qualification?.temperature)}`}>
                                                        {getTemperatureIcon(selectedLead.qualification?.temperature)}
                                                        Score: {selectedLead.qualification?.score}/10
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                                {selectedLead.contact?.email ? (
                                                    <div className="flex items-center gap-2 text-sm text-gray-300 bg-black/20 p-2 rounded-lg border border-white/5">
                                                        <Mail className="w-4 h-4 text-gray-500" />
                                                        <a href={`mailto:${selectedLead.contact.email}`} className="hover:text-cyan-400 truncate transition-colors">{selectedLead.contact.email}</a>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-black/20 p-2 rounded-lg border border-white/5 opacity-50">
                                                        <Mail className="w-4 h-4" /> Sin email
                                                    </div>
                                                )}
                                                {selectedLead.contact?.phone ? (
                                                    <div className="flex items-center gap-2 text-sm text-gray-300 bg-black/20 p-2 rounded-lg border border-white/5">
                                                        <Phone className="w-4 h-4 text-gray-500" />
                                                        <a href={`tel:${selectedLead.contact.phone}`} className="hover:text-cyan-400 transition-colors">{selectedLead.contact.phone}</a>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-sm text-gray-600 bg-black/20 p-2 rounded-lg border border-white/5 opacity-50">
                                                        <Phone className="w-4 h-4" /> Sin teléfono
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Bloque 2: Clasificación y Venta */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                        <Target className="w-3 h-3" /> Clasificación y Venta
                                    </h3>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 grid gap-4">
                                        {/* Estado CRM */}
                                        <div>
                                            <label className="text-xs text-gray-500 mb-2 block">Estado del Pipeline</label>
                                            <div className="flex flex-wrap gap-2">
                                                {crmStatuses.map(status => {
                                                    const isActive = (selectedLead.crmStatus || 'new') === status.id;
                                                    return (
                                                        <button
                                                            key={status.id}
                                                            onClick={() => updateLeadCRM('updateStatus', { status: status.id })}
                                                            disabled={updatingCRM || isActive}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${isActive
                                                                ? 'text-white shadow-lg ring-1 ring-white/20'
                                                                : 'bg-white/5 hover:bg-white/10 border border-white/10 opacity-60 hover:opacity-100'
                                                                }`}
                                                            style={isActive ? { backgroundColor: status.color } : { color: status.color }}
                                                        >
                                                            {status.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Temperatura del Lead */}
                                        <div>
                                            <label className="text-xs text-gray-500 mb-2 block">Temperatura del Lead</label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateLeadCRM('updateTemperature', { temperature: 'hot' })}
                                                    disabled={updatingCRM || selectedLead.qualification?.temperature === 'hot'}
                                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all border ${selectedLead.qualification?.temperature === 'hot'
                                                        ? 'bg-orange-500/30 text-orange-300 border-orange-500/50 shadow-lg shadow-orange-500/20'
                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-orange-500/10 hover:text-orange-300'
                                                        }`}
                                                >
                                                    <Flame className="w-3.5 h-3.5" /> Caliente
                                                </button>
                                                <button
                                                    onClick={() => updateLeadCRM('updateTemperature', { temperature: 'warm' })}
                                                    disabled={updatingCRM || selectedLead.qualification?.temperature === 'warm'}
                                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all border ${selectedLead.qualification?.temperature === 'warm'
                                                        ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50 shadow-lg shadow-yellow-500/20'
                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-yellow-500/10 hover:text-yellow-300'
                                                        }`}
                                                >
                                                    <ThermometerSun className="w-3.5 h-3.5" /> Tibio
                                                </button>
                                                <button
                                                    onClick={() => updateLeadCRM('updateTemperature', { temperature: 'cold' })}
                                                    disabled={updatingCRM || selectedLead.qualification?.temperature === 'cold'}
                                                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all border ${selectedLead.qualification?.temperature === 'cold'
                                                        ? 'bg-blue-500/30 text-blue-300 border-blue-500/50 shadow-lg shadow-blue-500/20'
                                                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-blue-500/10 hover:text-blue-300'
                                                        }`}
                                                >
                                                    <Snowflake className="w-3.5 h-3.5" /> Frío
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Canal de Origen */}
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1.5 block">Canal de Origen</label>
                                                <div className="flex items-center gap-2 text-sm bg-black/20 p-2 rounded-lg border border-white/5">
                                                    {selectedLead.sourceContact?.type === 'whatsapp' ? <Phone className="w-4 h-4 text-green-400" /> :
                                                        selectedLead.sourceContact?.type === 'email' ? <Mail className="w-4 h-4 text-purple-400" /> :
                                                            <Globe className="w-4 h-4 text-blue-400" />}
                                                    <span className="capitalize text-gray-300">{selectedLead.sourceContact?.type || 'Web'}</span>
                                                    {selectedLead.conversationId && (
                                                        <button
                                                            onClick={() => fetchConversation(selectedLead.conversationId)}
                                                            className="ml-auto p-1.5 hover:bg-white/10 rounded-lg text-cyan-400 transition-colors"
                                                            title="Ver conversación original"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Valor del Deal */}
                                            <div>
                                                <label className="text-xs text-gray-500 mb-1.5 block">Valor Estimado</label>
                                                <div className="flex items-center gap-2">
                                                    {editingDealValue ? (
                                                        <div className="flex items-center gap-1">
                                                            <input
                                                                type="number"
                                                                value={dealValueInput}
                                                                onChange={(e) => setDealValueInput(e.target.value)}
                                                                className="w-24 bg-black/20 border border-cyan-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none"
                                                                autoFocus
                                                            />
                                                            <button onClick={() => updateLeadCRM('updateDealValue', { value: parseInt(dealValueInput) })} className="p-1 text-green-400 hover:bg-green-500/20 rounded"><CheckCircle className="w-4 h-4" /></button>
                                                            <button onClick={() => setEditingDealValue(false)} className="p-1 text-red-400 hover:bg-red-500/20 rounded"><XCircle className="w-4 h-4" /></button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setDealValueInput(selectedLead.dealValue || 0); setEditingDealValue(true); }}
                                                            className="flex items-center gap-2 text-sm font-bold text-green-400 hover:bg-green-500/20 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20 w-full justify-center transition-all shadow-sm hover:shadow-md hover:border-green-500/40"
                                                        >
                                                            <DollarSign className="w-4 h-4" />
                                                            {selectedLead.dealValue ? `${selectedLead.dealValue} €` : 'Asignar valor'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bloque 3: Seguimiento */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                                        <History className="w-3 h-3" /> Seguimiento
                                    </h3>
                                    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                        {/* Tabs like header */}
                                        <div className="flex border-b border-white/10 bg-black/20">
                                            <div className="px-4 py-2 text-xs font-medium text-white border-b-2 border-orange-500">Historial y Notas</div>
                                        </div>

                                        <div className="p-4 space-y-4">
                                            {/* Timeline / Notes Feed */}
                                            <div className="max-h-[200px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                                {/* Combine timeline and notes logic here or just list notes for now as per previous implementation, but Plan says "Timeline and Notes". I will prioritize Notes and Timeline events if available. */}

                                                {selectedLead.timeline?.slice().reverse().map((event, i) => (
                                                    <div key={i} className="flex gap-3 text-sm">
                                                        <div className="mt-1 min-w-[4px] h-[4px] rounded-full bg-gray-600" />
                                                        <div>
                                                            <p className="text-gray-300 text-xs">{event.description}</p>
                                                            <p className="text-[10px] text-gray-600">{formatDate(event.timestamp)}</p>
                                                        </div>
                                                    </div>
                                                )) || <p className="text-xs text-gray-500 italic">No hay historial reciente.</p>}

                                                {/* Notes List explicitly if not in timeline */}
                                                {selectedLead.notes?.map((note) => (
                                                    <div key={note.id} className="bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 relative group">
                                                        <button
                                                            onClick={() => updateLeadCRM('deleteNote', { noteId: note.id })}
                                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{note.text}</p>
                                                        <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" /> {formatDate(note.createdAt)}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Note Input */}
                                            <div className="flex gap-2 mt-2 pt-2 border-t border-white/10">
                                                <input
                                                    type="text"
                                                    value={newNote}
                                                    onChange={(e) => setNewNote(e.target.value)}
                                                    placeholder="Escribe una nota rápida..."
                                                    className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                                                    onKeyDown={(e) => e.key === 'Enter' && newNote.trim() && updateLeadCRM('addNote', { text: newNote })}
                                                />
                                                <button
                                                    onClick={() => newNote.trim() && updateLeadCRM('addNote', { text: newNote })}
                                                    disabled={!newNote.trim() || updatingCRM}
                                                    className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 disabled:opacity-50 transition-colors"
                                                >
                                                    <Send className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>












            {/* Create Lead Modal */}
            <AnimatePresence>
                {createModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setCreateModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`${GLASS_PANEL} rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto border-cyan-500/30 ring-1 ring-cyan-500/20`}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-cyan-400" />
                                    Crear Nuevo Lead
                                </h2>
                                <button
                                    onClick={() => setCreateModalOpen(false)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <form onSubmit={createNewLead} className="space-y-4">
                                {/* Datos de Contacto */}
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Datos de Contacto</h3>
                                    <div className="grid gap-3">
                                        <div>
                                            <label className="text-sm text-gray-300 block mb-1">Nombre Completo *</label>
                                            <input
                                                type="text"
                                                required
                                                value={createFormData.name}
                                                onChange={e => setCreateFormData({ ...createFormData, name: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                                                placeholder="Ej: Carlos Pérez"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-sm text-gray-300 block mb-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={createFormData.email}
                                                    onChange={e => setCreateFormData({ ...createFormData, email: e.target.value })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                                                    placeholder="usuario@email.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm text-gray-300 block mb-1">Teléfono</label>
                                                <input
                                                    type="tel"
                                                    value={createFormData.phone}
                                                    onChange={e => setCreateFormData({ ...createFormData, phone: e.target.value })}
                                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                                                    placeholder="+34 600 000 000"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Detalles del negocio */}
                                <div className="space-y-3 pt-4 border-t border-white/10">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Detalles del Negocio</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-sm text-gray-300 block mb-1">Estado Inicial</label>
                                            <select
                                                value={createFormData.status}
                                                onChange={e => setCreateFormData({ ...createFormData, status: e.target.value })}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 [&>option]:bg-[#0f172a]"
                                            >
                                                {crmStatuses.map(s => (
                                                    <option key={s.id} value={s.id}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm text-gray-300 block mb-1">Valor Estimado (€)</label>
                                            <input
                                                type="number"
                                                value={createFormData.dealValue}
                                                onChange={e => setCreateFormData({ ...createFormData, dealValue: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-gray-600"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-300 block mb-2">Temperatura del Lead</label>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setCreateFormData({ ...createFormData, temperature: 'hot' })}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all border ${createFormData.temperature === 'hot'
                                                    ? 'bg-orange-500/30 text-orange-300 border-orange-500/50 shadow-lg shadow-orange-500/20'
                                                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-orange-500/10 hover:text-orange-300'
                                                    }`}
                                            >
                                                <Flame className="w-4 h-4" /> Caliente
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCreateFormData({ ...createFormData, temperature: 'warm' })}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all border ${createFormData.temperature === 'warm'
                                                    ? 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50 shadow-lg shadow-yellow-500/20'
                                                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-yellow-500/10 hover:text-yellow-300'
                                                    }`}
                                            >
                                                <ThermometerSun className="w-4 h-4" /> Tibio
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCreateFormData({ ...createFormData, temperature: 'cold' })}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all border ${createFormData.temperature === 'cold'
                                                    ? 'bg-blue-500/30 text-blue-300 border-blue-500/50 shadow-lg shadow-blue-500/20'
                                                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-blue-500/10 hover:text-blue-300'
                                                    }`}
                                            >
                                                <Snowflake className="w-4 h-4" /> Frío
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-gray-300 block mb-1">Nota Inicial</label>
                                        <textarea
                                            value={createFormData.notes}
                                            onChange={e => setCreateFormData({ ...createFormData, notes: e.target.value })}
                                            className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 placeholder-gray-600 min-h-[80px]"
                                            placeholder="Añade detalles relevantes..."
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                    <button
                                        type="button"
                                        onClick={() => setCreateModalOpen(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-6 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Crear Lead
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            < AnimatePresence >
                {conversationModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                        onClick={() => setConversationModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`${GLASS_PANEL} rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col`}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5" />
                                    Conversación
                                </h3>
                                <button
                                    onClick={() => setConversationModal(null)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Sender info */}
                            {conversationModal.sender && (
                                <div className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    {conversationModal.sender}
                                </div>
                            )}

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto space-y-3">
                                {conversationModal.messages?.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user'
                                                ? 'bg-cyan-500/20 text-cyan-100'
                                                : 'bg-white/10 text-gray-200'
                                                }`}
                                        >
                                            <p className="whitespace-pre-wrap">{msg.content}</p>
                                            <span className="text-xs opacity-50 mt-1 block">
                                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) : ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence >

            {/* Statuses Config Modal */}
            <AnimatePresence>
                {statusesConfigOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setStatusesConfigOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`${GLASS_PANEL} rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto border-purple-500/30 ring-1 ring-purple-500/20`}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-purple-400" />
                                    Configurar Estados
                                </h2>
                                <button
                                    onClick={() => setStatusesConfigOpen(false)}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-3 mb-6">
                                {editableStatuses.map((status, index) => (
                                    <div key={status.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/10 group">
                                        <GripVertical className="w-4 h-4 text-gray-600 cursor-grab" />
                                        <input
                                            type="color"
                                            value={status.color}
                                            onChange={(e) => {
                                                const updated = [...editableStatuses];
                                                updated[index].color = e.target.value;
                                                setEditableStatuses(updated);
                                            }}
                                            className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={status.label}
                                            onChange={(e) => {
                                                const updated = [...editableStatuses];
                                                updated[index].label = e.target.value;
                                                setEditableStatuses(updated);
                                            }}
                                            className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                            placeholder="Nombre del estado"
                                        />
                                        <button
                                            onClick={() => {
                                                if (editableStatuses.length > 1) {
                                                    setEditableStatuses(editableStatuses.filter((_, i) => i !== index));
                                                } else {
                                                    showToast('Debe haber al menos un estado', 'error');
                                                }
                                            }}
                                            className="p-2 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => {
                                    const newId = `status_${Date.now()}`;
                                    setEditableStatuses([
                                        ...editableStatuses,
                                        { id: newId, label: 'Nuevo Estado', color: '#6B7280', order: editableStatuses.length }
                                    ]);
                                }}
                                className="w-full py-2 px-4 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-purple-500/20 mb-6"
                            >
                                <Plus className="w-4 h-4" />
                                Añadir Estado
                            </button>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => setStatusesConfigOpen(false)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={prepareSaveCrmStatuses}
                                    disabled={savingStatuses}
                                    className="px-6 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {savingStatuses ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Guardar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Migration Modal */}
            <AnimatePresence>
                {migrationModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className={`${GLASS_PANEL} rounded-2xl p-6 max-w-lg w-full border-orange-500/30 ring-1 ring-orange-500/20`}
                        >
                            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                                <AlertCircle className="w-8 h-8 text-orange-400" />
                                <div>
                                    <h2 className="text-xl font-bold text-white">Conflicto de Estados</h2>
                                    <p className="text-sm text-gray-400">Algunos estados que vas a eliminar contienen leads.</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-sm text-orange-200">
                                    Para evitar perder datos, selecciona a qué nuevo estado quieres mover los leads de los estados eliminados.
                                </div>

                                {deletedStatuses.map(status => (
                                    <div key={status.id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-semibold text-white">{status.label}</span>
                                            <span className="text-xs bg-white/10 px-2 py-1 rounded-full text-white">
                                                {status.count} leads afectados
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-400">Mover a:</span>
                                            <select
                                                value={migrationMap[status.id] || ''}
                                                onChange={(e) => setMigrationMap(prev => ({ ...prev, [status.id]: e.target.value }))}
                                                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 [&>option]:bg-[#0f172a] [&>option]:text-white"
                                            >
                                                {pendingStatusesToSave.map(s => (
                                                    <option key={s.id} value={s.id}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                                <button
                                    onClick={() => {
                                        setMigrationModalOpen(false);
                                        setPendingStatusesToSave(null);
                                    }}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        // Build migrations array
                                        const migrations = Object.keys(migrationMap).map(fromStatus => ({
                                            fromStatus,
                                            toStatus: migrationMap[fromStatus]
                                        }));
                                        executeSave(pendingStatusesToSave, migrations);
                                    }}
                                    disabled={savingStatuses}
                                    className="px-6 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-lg shadow-orange-500/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {savingStatuses ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Confirmar Migración
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toast Notification */}
            < AnimatePresence >
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${toast.type === 'success'
                            ? 'bg-green-500/90 text-white'
                            : 'bg-red-500/90 text-white'
                            }`}
                    >
                        {toast.type === 'success' ? (
                            <CheckCircle className="w-5 h-5" />
                        ) : (
                            <AlertCircle className="w-5 h-5" />
                        )}
                        <span className="text-sm font-medium">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence >
        </div >
    );
};

export default LeadsPage;
