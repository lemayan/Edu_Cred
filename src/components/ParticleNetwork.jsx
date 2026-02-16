import { useEffect, useRef, useCallback } from 'react';

/**
 * Interactive Particle Network Canvas
 * 
 * Renders an animated particle field with:
 * - Particles that drift organically
 * - Lines connecting nearby particles (constellation effect)
 * - Mouse interaction — particles gently push away from the cursor
 * - Responsive — fills parent container
 * - Multi-color support — pass an array of colors for varied particles
 */
export default function ParticleNetwork({ className = '', particleCount = 80, color = '#16a34a', colors = null }) {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: -9999, y: -9999 });
    const animRef = useRef(null);

    const hexToRgb = useCallback((hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }, []);

    const initParticles = useCallback((width, height, count) => {
        const colorList = colors || [color];
        const rgbs = colorList.map(c => hexToRgb(c));
        const particles = [];
        for (let i = 0; i < count; i++) {
            const rgb = rgbs[i % rgbs.length];
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                radius: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.15,
                rgb,
            });
        }
        return particles;
    }, [color, colors, hexToRgb]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let width, height, particles, dpr;

        const resize = () => {
            dpr = window.devicePixelRatio || 1;
            const rect = canvas.parentElement.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            particles = initParticles(width, height, particleCount);
        };

        resize();
        window.addEventListener('resize', resize);

        // Mouse tracking (relative to canvas)
        const onMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };
        const onMouseLeave = () => {
            mouseRef.current = { x: -9999, y: -9999 };
        };

        canvas.parentElement.addEventListener('mousemove', onMouseMove);
        canvas.parentElement.addEventListener('mouseleave', onMouseLeave);

        const LINE_DIST = 120;
        const MOUSE_RADIUS = 150;
        const MOUSE_FORCE = 0.8;

        const draw = () => {
            ctx.clearRect(0, 0, width, height);

            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;

            // Update and draw particles
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Mouse repulsion
                const dx = p.x - mx;
                const dy = p.y - my;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < MOUSE_RADIUS && dist > 0) {
                    const force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE;
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                }

                // Damping
                p.vx *= 0.98;
                p.vy *= 0.98;

                // Move
                p.x += p.vx;
                p.y += p.vy;

                // Wrap around edges
                if (p.x < -20) p.x = width + 20;
                if (p.x > width + 20) p.x = -20;
                if (p.y < -20) p.y = height + 20;
                if (p.y > height + 20) p.y = -20;

                // Draw particle
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${p.rgb.r}, ${p.rgb.g}, ${p.rgb.b}, ${p.opacity})`;
                ctx.fill();
            }

            // Draw lines between nearby particles
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const a = particles[i];
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < LINE_DIST) {
                        const alpha = (1 - dist / LINE_DIST) * 0.15;
                        // Blend colors of connected particles
                        const mr = Math.round((a.rgb.r + b.rgb.r) / 2);
                        const mg = Math.round((a.rgb.g + b.rgb.g) / 2);
                        const mb = Math.round((a.rgb.b + b.rgb.b) / 2);
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(${mr}, ${mg}, ${mb}, ${alpha})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }

            // Draw lines from mouse to nearby particles
            if (mx > 0 && my > 0) {
                for (let i = 0; i < particles.length; i++) {
                    const p = particles[i];
                    const dx = p.x - mx;
                    const dy = p.y - my;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < MOUSE_RADIUS) {
                        const alpha = (1 - dist / MOUSE_RADIUS) * 0.25;
                        ctx.beginPath();
                        ctx.moveTo(mx, my);
                        ctx.lineTo(p.x, p.y);
                        ctx.strokeStyle = `rgba(${p.rgb.r}, ${p.rgb.g}, ${p.rgb.b}, ${alpha})`;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }

            animRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', resize);
            canvas.parentElement?.removeEventListener('mousemove', onMouseMove);
            canvas.parentElement?.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [color, colors, particleCount, initParticles]);

    return (
        <canvas
            ref={canvasRef}
            className={`particle-canvas ${className}`}
            style={{ display: 'block' }}
        />
    );
}
