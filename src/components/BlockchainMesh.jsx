import { useEffect, useRef } from 'react';

/**
 * AuroraBackground — Anthropic-inspired flowing gradient aurora
 *
 * Features:
 * - Organic flowing gradient blobs that morph and drift
 * - Warm-to-cool color transitions (amber → rose → violet → cyan)
 * - Mouse-reactive: gradients subtly shift toward cursor
 * - Film grain / noise texture overlay for depth
 * - Smooth, premium, almost ethereal feel
 * - Different palettes for issue (warm) vs verify (cool)
 */
export default function BlockchainMesh({
    className = '',
    theme = 'green',
}) {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: 0.5, y: 0.5 }); // normalized 0-1
    const smoothMouse = useRef({ x: 0.5, y: 0.5 });
    const animRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Palettes — each blob has its own color journey
        const palettes = {
            green: [
                // Warm greens + teals + accent violet
                { colors: ['#16a34a', '#059669', '#0d9488'], opacity: 0.35 },  // emerald blob
                { colors: ['#06b6d4', '#0891b2', '#0e7490'], opacity: 0.25 },  // teal blob
                { colors: ['#8b5cf6', '#7c3aed', '#6d28d9'], opacity: 0.18 },  // violet accent
                { colors: ['#f59e0b', '#d97706', '#b45309'], opacity: 0.12 },  // warm amber glow 
                { colors: ['#10b981', '#34d399', '#6ee7b7'], opacity: 0.2 },   // light green mist
            ],
            blue: [
                // Cool blues + purples + accent rose
                { colors: ['#3b82f6', '#2563eb', '#1d4ed8'], opacity: 0.35 },  // blue blob
                { colors: ['#8b5cf6', '#7c3aed', '#a78bfa'], opacity: 0.25 },  // purple blob
                { colors: ['#06b6d4', '#22d3ee', '#67e8f9'], opacity: 0.18 },  // cyan accent
                { colors: ['#ec4899', '#db2777', '#be185d'], opacity: 0.12 },  // rose glow
                { colors: ['#6366f1', '#818cf8', '#a5b4fc'], opacity: 0.2 },   // indigo mist
            ],
        };

        const palette = palettes[theme] || palettes.green;
        let width, height, dpr;
        let time = 0;
        let blobs = [];

        // Noise texture generation using offscreen canvas
        let noiseCanvas;
        function generateNoise() {
            noiseCanvas = document.createElement('canvas');
            noiseCanvas.width = 256;
            noiseCanvas.height = 256;
            const nctx = noiseCanvas.getContext('2d');
            const imageData = nctx.createImageData(256, 256);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const v = Math.random() * 255;
                data[i] = v;
                data[i + 1] = v;
                data[i + 2] = v;
                data[i + 3] = 18; // very subtle
            }
            nctx.putImageData(imageData, 0, 0);
        }
        generateNoise();

        function hexToRGB(hex) {
            return {
                r: parseInt(hex.slice(1, 3), 16),
                g: parseInt(hex.slice(3, 5), 16),
                b: parseInt(hex.slice(5, 7), 16),
            };
        }

        function lerpColor(c1, c2, t) {
            return {
                r: Math.round(c1.r + (c2.r - c1.r) * t),
                g: Math.round(c1.g + (c2.g - c1.g) * t),
                b: Math.round(c1.b + (c2.b - c1.b) * t),
            };
        }

        function resize() {
            dpr = window.devicePixelRatio || 1;
            const rect = canvas.parentElement.getBoundingClientRect();
            width = rect.width;
            height = rect.height;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            initBlobs();
        }

        function initBlobs() {
            blobs = palette.map((p, i) => {
                const angle = (Math.PI * 2 / palette.length) * i;
                const rgbColors = p.colors.map(hexToRGB);
                return {
                    // Orbital center position (normalized 0-1)
                    cx: 0.5 + Math.cos(angle) * 0.25,
                    cy: 0.5 + Math.sin(angle) * 0.25,
                    // Orbit parameters
                    orbitRadius: 0.15 + Math.random() * 0.2,
                    orbitSpeed: 0.0003 + Math.random() * 0.0004,
                    orbitPhase: Math.random() * Math.PI * 2,
                    // Size
                    radius: 0.25 + Math.random() * 0.2,
                    // Animation
                    breathSpeed: 0.001 + Math.random() * 0.001,
                    breathPhase: Math.random() * Math.PI * 2,
                    breathAmount: 0.08 + Math.random() * 0.08,
                    // Color cycling
                    rgbColors,
                    colorSpeed: 0.0005 + Math.random() * 0.0003,
                    colorPhase: Math.random() * Math.PI * 2,
                    opacity: p.opacity,
                    // Stretch/squash for organic shape
                    stretchAngle: Math.random() * Math.PI,
                    stretchSpeed: 0.0004 + Math.random() * 0.0003,
                    stretchAmount: 0.15 + Math.random() * 0.15,
                };
            });
        }

        resize();
        window.addEventListener('resize', resize);

        // Mouse tracking
        const onMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            mouseRef.current = {
                x: (e.clientX - rect.left) / rect.width,
                y: (e.clientY - rect.top) / rect.height,
            };
        };
        const onMouseLeave = () => {
            mouseRef.current = { x: 0.5, y: 0.5 };
        };

        canvas.parentElement.addEventListener('mousemove', onMouseMove);
        canvas.parentElement.addEventListener('mouseleave', onMouseLeave);

        function draw() {
            time++;
            ctx.clearRect(0, 0, width, height);

            // Smooth mouse following
            smoothMouse.current.x += (mouseRef.current.x - smoothMouse.current.x) * 0.03;
            smoothMouse.current.y += (mouseRef.current.y - smoothMouse.current.y) * 0.03;
            const smx = smoothMouse.current.x;
            const smy = smoothMouse.current.y;

            // Draw soft background wash first
            const bgGrad = ctx.createLinearGradient(0, 0, width, height);
            if (theme === 'green') {
                bgGrad.addColorStop(0, 'rgba(240, 253, 244, 0.5)');  // green-50
                bgGrad.addColorStop(1, 'rgba(236, 254, 255, 0.3)');  // cyan-50
            } else {
                bgGrad.addColorStop(0, 'rgba(239, 246, 255, 0.5)');  // blue-50
                bgGrad.addColorStop(1, 'rgba(245, 243, 255, 0.3)');  // violet-50
            }
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);

            // Use 'lighter' blend for that glowing aurora feel
            ctx.globalCompositeOperation = 'lighter';

            // Draw each blob
            for (const blob of blobs) {
                // Orbital motion
                const orbitAngle = time * blob.orbitSpeed + blob.orbitPhase;
                const baseX = blob.cx + Math.cos(orbitAngle) * blob.orbitRadius;
                const baseY = blob.cy + Math.sin(orbitAngle * 0.7) * blob.orbitRadius * 0.6;

                // Mouse influence — blobs gently drift toward cursor
                const mouseInfluence = 0.08;
                const bx = (baseX + (smx - 0.5) * mouseInfluence) * width;
                const by = (baseY + (smy - 0.5) * mouseInfluence) * height;

                // Breathing (size pulsing)
                const breathe = 1 + Math.sin(time * blob.breathSpeed + blob.breathPhase) * blob.breathAmount;
                const r = blob.radius * Math.min(width, height) * breathe;

                // Stretch for organic elliptical shape
                const strAngle = time * blob.stretchSpeed + blob.stretchAngle;
                const stretchX = 1 + Math.sin(strAngle) * blob.stretchAmount;
                const stretchY = 1 + Math.cos(strAngle) * blob.stretchAmount;

                // Color cycling
                const colorT = (Math.sin(time * blob.colorSpeed + blob.colorPhase) + 1) / 2;
                const colorIdx = colorT * (blob.rgbColors.length - 1);
                const ci = Math.floor(colorIdx);
                const cf = colorIdx - ci;
                const c1 = blob.rgbColors[Math.min(ci, blob.rgbColors.length - 1)];
                const c2 = blob.rgbColors[Math.min(ci + 1, blob.rgbColors.length - 1)];
                const currentColor = lerpColor(c1, c2, cf);

                // Draw the blob as stretched radial gradient
                ctx.save();
                ctx.translate(bx, by);
                ctx.scale(stretchX, stretchY);
                ctx.rotate(strAngle * 0.3);

                const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
                grad.addColorStop(0, `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${blob.opacity})`);
                grad.addColorStop(0.4, `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${blob.opacity * 0.6})`);
                grad.addColorStop(0.7, `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, ${blob.opacity * 0.2})`);
                grad.addColorStop(1, `rgba(${currentColor.r}, ${currentColor.g}, ${currentColor.b}, 0)`);

                ctx.fillStyle = grad;
                ctx.fillRect(-r, -r, r * 2, r * 2);

                ctx.restore();
            }

            // Reset blend mode
            ctx.globalCompositeOperation = 'source-over';

            // Draw noise/grain texture overlay for depth
            if (noiseCanvas) {
                ctx.globalAlpha = 0.4;
                // Tile the noise across the whole canvas
                const pattern = ctx.createPattern(noiseCanvas, 'repeat');
                if (pattern) {
                    ctx.fillStyle = pattern;
                    ctx.fillRect(0, 0, width, height);
                }
                ctx.globalAlpha = 1;
            }

            // Subtle vignette for depth
            const vignetteGrad = ctx.createRadialGradient(
                width / 2, height / 2, Math.min(width, height) * 0.2,
                width / 2, height / 2, Math.max(width, height) * 0.8
            );
            vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vignetteGrad.addColorStop(1, 'rgba(0, 0, 0, 0.03)');
            ctx.fillStyle = vignetteGrad;
            ctx.fillRect(0, 0, width, height);

            animRef.current = requestAnimationFrame(draw);
        }

        draw();

        return () => {
            cancelAnimationFrame(animRef.current);
            window.removeEventListener('resize', resize);
            canvas.parentElement?.removeEventListener('mousemove', onMouseMove);
            canvas.parentElement?.removeEventListener('mouseleave', onMouseLeave);
        };
    }, [theme]);

    return (
        <canvas
            ref={canvasRef}
            className={`absolute inset-0 z-0 pointer-events-none ${className}`}
            style={{ display: 'block' }}
        />
    );
}
