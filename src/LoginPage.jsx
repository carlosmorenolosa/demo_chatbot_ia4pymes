import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, Sparkles, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { Button } from './components/ui/Button';
import { Input } from './components/ui/Input';
import { Label } from './components/ui/Label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './components/ui/Card';
import ParticleBackground from './components/ui/ParticleBackground';

const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePosition({
                x: e.clientX,
                y: e.clientY,
            });
        };

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    // URL de la Lambda de Login (from environment)
    const LOGIN_LAMBDA_URL = import.meta.env.VITE_LAMBDA_LOGIN;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        // --- BACKDOOR PARA TEST (INDIVIDUAL) ---
        if (email === 'hola@gmail.com' && password === 'hola') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            login({
                clientId: 'test-client-123',
                username: 'hola',
                accountType: 'individual',
                managedClients: []
            });
            navigate('/');
            setIsLoading(false);
            return;
        }
        // --- BACKDOOR PARA TEST (AGENCIA) ---
        if (email === 'agencia@test.com' && password === 'agencia') {
            await new Promise(resolve => setTimeout(resolve, 1000));
            login({
                clientId: 'agency-001',
                username: 'Agencia Demo',
                accountType: 'agency',
                managedClients: [
                    { clientId: 'rest123', name: 'Restaurante El Buen Sabor' },
                    { clientId: 'clinic456', name: 'Clínica Dental Madrid' },
                    { clientId: 'gym789', name: 'Gimnasio FitPro' }
                ]
            });
            navigate('/');
            setIsLoading(false);
            return;
        }
        // ---------------------------------------

        try {
            const response = await fetch(LOGIN_LAMBDA_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al iniciar sesión');
            }

            // Login exitoso - guardar en AuthContext
            login(data);
            navigate('/');

        } catch (err) {
            setError(err.message || 'Error de conexión. Inténtalo más tarde.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-black relative overflow-hidden">
            {/* Particle Animation Background */}
            <ParticleBackground
                particleCount={60}
                color="rgba(99, 102, 241, 0.6)"
                speed={0.8}
                connectDistance={100}
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 z-0">
                <div
                    className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/15 rounded-full blur-[120px] transition-transform duration-100 ease-out"
                    style={{ transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)` }}
                />
                <div
                    className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[120px] transition-transform duration-100 ease-out"
                    style={{ transform: `translate(${mousePosition.x * -0.02}px, ${mousePosition.y * -0.02}px)` }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="z-10 w-full max-w-md px-4"
            >
                <Card glass className="border-white/10 bg-black/60 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
                    {/* Borde brillante animado */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:animate-shimmer pointer-events-none" />

                    <CardHeader className="space-y-1 text-center">
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mx-auto mb-4 h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25 relative"
                        >
                            <div className="absolute inset-0 rounded-3xl bg-white/20 blur-xl animate-pulse" />
                            <img src="/logo.png" alt="IA4PYMES" className="w-16 h-16 object-contain relative z-10" />
                        </motion.div>
                        <CardTitle className="text-4xl font-bold tracking-tight text-white relative inline-block">
                            Bienvenido
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-lg">
                            Accede al futuro de la IA
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">Correo Electrónico</Label>
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-lg blur opacity-0 group-focus-within:opacity-50 transition duration-500"></div>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="nombre@empresa.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="relative bg-black/50 border-white/10 text-white placeholder:text-slate-600 focus:border-transparent focus:ring-0 transition-all duration-300"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-purple-600 rounded-lg blur opacity-0 group-focus-within:opacity-50 transition duration-500"></div>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="relative bg-black/50 border-white/10 text-white placeholder:text-slate-600 focus:border-transparent focus:ring-0 transition-all duration-300 pr-10"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-md border border-red-500/20"
                                >
                                    {error}
                                </motion.div>
                            )}
                            <Button
                                type="submit"
                                className="w-full bg-white text-black hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.3)] border-0 h-12 font-bold text-base transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                                isLoading={isLoading}
                            >
                                {isLoading ? 'Iniciando...' : (
                                    <span className="flex items-center gap-2">
                                        Iniciar Sesión <ArrowRight className="h-5 w-5" />
                                    </span>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center border-t border-white/5 pt-6">
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-purple-400" /> Impulsado por IA4PYMES
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
};

export default LoginPage;

