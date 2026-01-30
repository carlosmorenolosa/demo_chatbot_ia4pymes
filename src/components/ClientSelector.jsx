import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Building2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const ClientSelector = () => {
    const { managedClients, selectedClient, selectClient, isAgency, user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Demo user check
    const isDemoUser = user?.username === 'hola';

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Mock clients for demo user if none exist
    const demoClients = [
        { clientId: '1', name: 'Restaurante El Buen Sabor' },
        { clientId: '2', name: 'Clínica Dental Sonrisas' },
        { clientId: '3', name: 'Gimnasio PowerFit' }
    ];

    const clientsToDisplay = (isDemoUser && managedClients.length === 0) ? demoClients : managedClients;

    // No mostrar si no es agencia o no hay clientes (excepto si es demo user 'hola')
    if (!isAgency && !isDemoUser && clientsToDisplay.length === 0) {
        return null;
    }

    // Force display for demo user even if not agency check fails normally
    if (clientsToDisplay.length === 0 && !isDemoUser) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    "bg-[#1e293b] hover:bg-[#334155] border border-transparent shadow-sm", // Dark slate bg like screenshot
                    "text-sm font-medium text-white"
                )}
            >
                <Building2 className="h-4 w-4 text-blue-400" />
                <span className="max-w-[200px] truncate">
                    {selectedClient?.name || (isDemoUser ? 'Restaurante El Buen Sabor' : 'Seleccionar cliente')}
                </span>
                <ChevronDown className={cn(
                    "h-4 w-4 text-gray-400 transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-800 border border-border rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-muted-foreground px-2">
                                {clientsToDisplay.length} cliente{clientsToDisplay.length !== 1 ? 's' : ''} gestionado{clientsToDisplay.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-1">
                            {clientsToDisplay.map((client) => (
                                <button
                                    key={client.clientId}
                                    onClick={() => {
                                        if (isDemoUser) return; // Disable selection for demo user
                                        selectClient(client);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                                        selectedClient?.clientId === client.clientId
                                            ? "bg-primary/10 text-primary"
                                            : isDemoUser ? "cursor-default text-gray-700 dark:text-gray-200 hover:bg-transparent" : "hover:bg-muted text-foreground"
                                    )}
                                >
                                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                                        <span className="text-xs font-bold text-blue-600">
                                            {client.name?.charAt(0)?.toUpperCase() || 'C'}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{client.name}</p>
                                    </div>
                                    {selectedClient?.clientId === client.clientId && (
                                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ClientSelector;
