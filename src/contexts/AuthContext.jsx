import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);

    // Recuperar sesión de localStorage al cargar
    useEffect(() => {
        const savedUser = localStorage.getItem('chatbot_user');
        const savedSelectedClient = localStorage.getItem('chatbot_selected_client');
        if (savedUser) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);

                // Restaurar cliente seleccionado o usar el primero disponible
                if (savedSelectedClient) {
                    setSelectedClient(JSON.parse(savedSelectedClient));
                } else if (parsedUser.managedClients?.length > 0) {
                    setSelectedClient(parsedUser.managedClients[0]);
                }
            } catch (e) {
                localStorage.removeItem('chatbot_user');
                localStorage.removeItem('chatbot_selected_client');
            }
        }
        setIsLoading(false);
    }, []);

    const login = (userData) => {
        setUser(userData);
        localStorage.setItem('chatbot_user', JSON.stringify(userData));

        // Si es agencia, seleccionar el primer cliente
        if (userData.managedClients?.length > 0) {
            setSelectedClient(userData.managedClients[0]);
            localStorage.setItem('chatbot_selected_client', JSON.stringify(userData.managedClients[0]));
        } else {
            setSelectedClient(null);
            localStorage.removeItem('chatbot_selected_client');
        }
    };

    const logout = () => {
        setUser(null);
        setSelectedClient(null);
        localStorage.removeItem('chatbot_user');
        localStorage.removeItem('chatbot_selected_client');
    };

    const selectClient = (client) => {
        setSelectedClient(client);
        localStorage.setItem('chatbot_selected_client', JSON.stringify(client));
    };

    // clientId a usar: si es agencia usa selectedClient, sino usa user.clientId
    const currentClientId = selectedClient?.clientId || user?.clientId || null;

    const value = {
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        // Multi-client support
        selectedClient,
        selectClient,
        currentClientId,
        isAgency: user?.accountType === 'agency',
        managedClients: user?.managedClients || []
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
