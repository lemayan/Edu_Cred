import { useEffect, useRef, useCallback } from 'react';

/**
 * ConfettiField — Antigravity-style scattered confetti dashes
 *
 * Features:
 * - Hundreds of small colorful line segments / dashes scattered across the page
 * - Multi-colored: indigo, purple, blue, red, pink, coral, muted tones
 * - Each dash drifts slowly, rotates gently
 * - Mouse interaction: dashes near cursor scatter/swirl away
 * - Depth layers: varying sizes and opacities for parallax feel
 * - Very clean, minimal, premium aesthetic on white
 */
export default function ConfettiField({
    className = '',
    particleCount = 200,
    colors = null,
}) {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: -9999, y: -9999 });
    const animRef = useRef(null);

    const defaultColors = [
        '#6366f1', // indigo
        '#8b5cf6', // purple
        '#a78bfa', // light purple
        '#3b82f6', // blue
        '#60a5fa', // light blue
        '#2563eb', // deep blue
        '#ec4899', // pink
        '#f43f5e', // rose
        '#ef4444', // red
        '#f97316', // orange
        '#06b6d4', // cyan
        '#14b8a6', // teal
        '#16a34a', // green
        '#94a3b8', // slate
        '#cbd5e1', // light slate
    ];

    const initParticles = useCallback((w, h, count) => {
        const colorList = colors || defaultColors;
        const particles = [];
        for (let i = 0; i < count; i++) {
            const depth = Math.random(); // 0 = far, 1 = close
            const size = 2 + depth * 8; // far = tiny, close = bigger
            const driftSpeed = 0.3 + depth * 0.5; // faster drift
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * driftSpeed,
                vy: -0.2 - Math.random() * driftSpeed * 0.6, // gentle upward float
                // Rotation
                angle: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.025,
                // Size: length of the dash
                length: size,
                width: Math.max(1, depth * 2.5),
                // Visual
                color: colorList[Math.floor(Math.random() * colorList.length)],
                baseOpacity: 0.15 + depth * 0.55,
                opacity: 0.15 + depth * 0.55,
                depth,
                // Original velocity for restoration
                baseVx: (Math.random() - 0.5) * driftSpeed,
                baseVy: -0.2 - Math.random() * driftSpeed * 0.6,
                // Wobble: sinusoidal side-to-side sway
                wobblePhase: Math.random() * Math.PI * 2,
                wobbleAmp: 0.3 + Math.random() * 0.6,
                wobbleFreq: 0.008 + Math.random() * 0.015,
                // Twinkle: opacity oscillation
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.015 + Math.random() * 0.025,
            });
        }
        return particles;
    }, [colors]);

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

        // Mouse tracking
        const onMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };
        const onMouseLeave = () => {
            mouseRef.current = { x: -9999, y: -9999 };
        };

        canvas.parentElement.addEventListener('mousemove', onMouseMove);
        canvas.parentElement.addEventListener('mouseleave', onMouseLeave);

        const MOUSE_RADIUS = 120;
        const MOUSE_FORCE = 1.2;

        let time = 0;

        const draw = () => {
            ctx.clearRect(0, 0, width, height);
            time++;

            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;

            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];

                // Mouse repulsion — dashes scatter away from cursor
                const dx = p.x - mx;
                const dy = p.y - my;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < MOUSE_RADIUS && dist > 0) {
                    const force = (1 - dist / MOUSE_RADIUS) * MOUSE_FORCE * (0.5 + p.depth * 0.5);
                    p.vx += (dx / dist) * force;
                    p.vy += (dy / dist) * force;
                    p.rotSpeed += (Math.random() - 0.5) * 0.004;
                }

                // Restore velocity smoothly 
                p.vx += (p.baseVx - p.vx) * 0.015;
                p.vy += (p.baseVy - p.vy) * 0.015;

                // Sinusoidal wobble — gentle side-to-side sway
                const wobble = Math.sin(time * p.wobbleFreq + p.wobblePhase) * p.wobbleAmp;

                // Damping
                p.vx *= 0.995;
                p.vy *= 0.995;

                // Move
                p.x += p.vx + wobble * 0.3;
                p.y += p.vy;
                p.angle += p.rotSpeed;

                // Twinkle — opacity oscillation
                p.opacity = p.baseOpacity * (0.6 + 0.4 * Math.sin(time * p.twinkleSpeed + p.twinklePhase));

                // Wrap
                if (p.x < -20) p.x = width + 20;
                if (p.x > width + 20) p.x = -20;
                if (p.y < -20) p.y = height + 20;
                if (p.y > height + 20) p.y = -20;

                // Draw dash/line segment
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle);
                ctx.beginPath();
                ctx.moveTo(-p.length / 2, 0);
                ctx.lineTo(p.length / 2, 0);
                ctx.strokeStyle = p.color;
                ctx.globalAlpha = p.opacity;
                ctx.lineWidth = p.width;
                ctx.lineCap = 'round';
                ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.restore();
            }

            // Draw mouse glow ring (very subtle)
            if (mx > 0 && my > 0) {
                ctx.beginPath();
                ctx.arc(mx, my, MOUSE_RADIUS * 0.3, 0, Math.PI * 2);
                const glow = ctx.createRadialGradient(mx, my, 0, mx, my, MOUSE_RADIUS * 0.5);
                glow.addColorStop(0, 'rgba(99, 102, 241, 0.03)');
                glow.addColorStop(1, 'rgba(99, 102, 241, 0)');
                ctx.fillStyle = glow;
                ctx.fillRect(mx - MOUSE_RADIUS, my - MOUSE_RADIUS, MOUSE_RADIUS * 2, MOUSE_RADIUS * 2);
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
    }, [particleCount, initParticles]);

    return (
        <canvas
            ref={canvasRef}
            className={`particle-canvas ${className}`}
            style={{ display: 'block' }}
        />
    );
}
