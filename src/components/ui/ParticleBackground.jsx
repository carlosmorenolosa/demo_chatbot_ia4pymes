import React, { useEffect, useRef } from 'react';

const ParticleBackground = ({
    particleCount = 80,
    color = 'rgba(99, 102, 241, 0.7)',
    speed = 1.2,
    connectDistance = 150
}) => {
    const canvasRef = useRef(null);
    const particlesRef = useRef([]);
    const animationFrameRef = useRef();
    const mouseRef = useRef({ x: null, y: null });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Initialize particles with varied sizes and properties
        particlesRef.current = [];
        for (let i = 0; i < particleCount; i++) {
            const isBright = Math.random() > 0.7; // 30% are brighter/larger
            particlesRef.current.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.5) * speed,
                radius: isBright ? Math.random() * 3 + 2 : Math.random() * 2 + 0.5,
                opacity: isBright ? Math.random() * 0.5 + 0.5 : Math.random() * 0.3 + 0.1,
                pulseSpeed: Math.random() * 0.02 + 0.01,
                pulseOffset: Math.random() * Math.PI * 2,
                hue: Math.random() * 60 - 30 // Color variation
            });
        }

        const handleMouseMove = (e) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleMouseLeave = () => {
            mouseRef.current = { x: null, y: null };
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseleave', handleMouseLeave);

        let time = 0;
        const animate = () => {
            time += 0.016; // ~60fps timing
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const particles = particlesRef.current;

            // Update and draw particles
            particles.forEach((p, i) => {
                // Move particles
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges smoothly
                if (p.x < -10) p.x = canvas.width + 10;
                if (p.x > canvas.width + 10) p.x = -10;
                if (p.y < -10) p.y = canvas.height + 10;
                if (p.y > canvas.height + 10) p.y = -10;

                // Mouse interaction - attraction with repulsion at close range
                if (mouseRef.current.x !== null) {
                    const dx = mouseRef.current.x - p.x;
                    const dy = mouseRef.current.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 250 && dist > 50) {
                        // Attraction
                        p.x += dx * 0.008;
                        p.y += dy * 0.008;
                    } else if (dist <= 50) {
                        // Repulsion when too close
                        p.x -= dx * 0.03;
                        p.y -= dy * 0.03;
                    }
                }

                // Pulsing effect
                const pulse = Math.sin(time * p.pulseSpeed * 100 + p.pulseOffset) * 0.3 + 0.7;
                const currentRadius = p.radius * pulse;
                const currentOpacity = p.opacity * pulse;

                // Draw particle with glow effect
                const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentRadius * 3);
                gradient.addColorStop(0, `hsla(${240 + p.hue}, 80%, 65%, ${currentOpacity})`);
                gradient.addColorStop(0.4, `hsla(${260 + p.hue}, 70%, 55%, ${currentOpacity * 0.5})`);
                gradient.addColorStop(1, 'transparent');

                ctx.beginPath();
                ctx.arc(p.x, p.y, currentRadius * 3, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                // Draw core
                ctx.beginPath();
                ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${240 + p.hue}, 90%, 75%, ${currentOpacity})`;
                ctx.fill();

                // Draw connections with gradient
                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dx = p.x - p2.x;
                    const dy = p.y - p2.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < connectDistance) {
                        const lineOpacity = (1 - dist / connectDistance) * 0.4;

                        // Create gradient line
                        const lineGradient = ctx.createLinearGradient(p.x, p.y, p2.x, p2.y);
                        lineGradient.addColorStop(0, `hsla(${240 + p.hue}, 80%, 65%, ${lineOpacity * p.opacity})`);
                        lineGradient.addColorStop(1, `hsla(${240 + p2.hue}, 80%, 65%, ${lineOpacity * p2.opacity})`);

                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.strokeStyle = lineGradient;
                        ctx.lineWidth = (1 - dist / connectDistance) * 1.5;
                        ctx.stroke();
                    }
                }

                // Draw connection to mouse
                if (mouseRef.current.x !== null) {
                    const dx = mouseRef.current.x - p.x;
                    const dy = mouseRef.current.y - p.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 200) {
                        const lineOpacity = (1 - dist / 200) * 0.6;
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(mouseRef.current.x, mouseRef.current.y);
                        ctx.strokeStyle = `hsla(${280}, 90%, 70%, ${lineOpacity})`;
                        ctx.lineWidth = (1 - dist / 200) * 2;
                        ctx.stroke();
                    }
                }
            });

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseleave', handleMouseLeave);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [particleCount, color, speed, connectDistance]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0 pointer-events-none"
            style={{ background: 'transparent' }}
        />
    );
};

export default ParticleBackground;
