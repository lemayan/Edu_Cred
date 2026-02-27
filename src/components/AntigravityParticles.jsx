import { useEffect, useRef } from 'react';

/**
 * AntigravityParticles
 * Exact recreation of the Google Antigravity hero effect.
 *
 * What it actually is (from studying https://antigravity.google/):
 *  - Short colored DASHES / streaks — NOT circles, NOT balls
 *  - The mouse cursor IS the vanishing point (focal origin)
 *  - Particles fly OUTWARD from that point toward the screen edges
 *  - As they fly out (z decreases), they grow longer and brighter
 *  - The "streak" look comes from drawing a line segment whose length
 *    is proportional to speed × scale (motion blur effect)
 *  - Very sparse — elegant space, not a party
 *  - Tiny background dots give a subtle starfield depth
 *
 * Physics:
 *  - Each particle stores a 3D (x, y, z) origin position
 *  - z decrements each frame (liftoff toward camera)
 *  - When z < 1, reset to z=maxZ with fresh random (x,y) near vanishing point
 *  - Perspective: scale = FL / (FL + z)
 *    screenX = ((x - vx) * scale) + vx     where vx = vanishing X (mouse)
 *    screenY = ((y - vy) * scale) + vy     where vy = vanishing Y (mouse)
 *  - The streak is drawn from the *previous frame's* projected position
 *    to the *current frame's* projected position — this gives the motion trail
 */
export default function AntigravityParticles() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        const FL = 320;   // focal length
        const MAX_Z = 800;
        const COUNT = 280;   // sparse = elegant
        const COLORS = ['#4285F4', '#EA4335', '#FBBC05', '#34A853', '#8B5CF6'];

        let W, H;
        // Vanishing point — starts at center, tracks mouse
        let vx, vy;
        let targetVx, targetVy;

        let particles = [];
        let raf;

        const rand = (a, b) => a + Math.random() * (b - a);

        // ── particle factory ─────────────────────────────────────────────────────
        function makeParticle(initialZ) {
            // Spread x/y around the vanishing point (they fan outward from there)
            const angle = rand(0, Math.PI * 2);
            const spread = rand(10, Math.max(W, H) * 0.55);
            return {
                x: Math.cos(angle) * spread,  // offset from vanishing point
                y: Math.sin(angle) * spread,
                z: initialZ ? rand(1, MAX_Z) : MAX_Z,
                speed: rand(2.5, 6.0),
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                // prev screen coords for streak
                prevX: null,
                prevY: null,
            };
        }

        // ── resize / init ─────────────────────────────────────────────────────────
        function init() {
            const parent = canvas.parentElement;
            W = parent.offsetWidth;
            H = parent.offsetHeight;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = W * dpr;
            canvas.height = H * dpr;
            canvas.style.width = W + 'px';
            canvas.style.height = H + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            vx = targetVx = W / 2;
            vy = targetVy = H / 2;

            particles = Array.from({ length: COUNT }, () => makeParticle(true));
        }

        // ── mouse ────────────────────────────────────────────────────────────────
        const onMouseMove = (e) => {
            const rect = canvas.getBoundingClientRect();
            targetVx = e.clientX - rect.left;
            targetVy = e.clientY - rect.top;
        };
        window.addEventListener('mousemove', onMouseMove);

        // ── render loop ───────────────────────────────────────────────────────────
        function frame() {
            ctx.clearRect(0, 0, W, H);

            // Smoothly ease vanishing point toward mouse (parallax lag)
            vx += (targetVx - vx) * 0.06;
            vy += (targetVy - vy) * 0.06;

            for (const p of particles) {
                // Current projected position
                const scale = FL / (FL + p.z);
                const curX = p.x * scale + vx;
                const curY = p.y * scale + vy;

                // Move particle forward
                p.z -= p.speed;

                // Liftoff loop
                if (p.z < 1) {
                    const angle = rand(0, Math.PI * 2);
                    const spread = rand(10, Math.max(W, H) * 0.55);
                    p.x = Math.cos(angle) * spread;
                    p.y = Math.sin(angle) * spread;
                    p.z = MAX_Z;
                    p.prevX = null;
                    p.prevY = null;
                    continue;
                }

                // Distance fog: invisible at z=MAX_Z, max 0.75 when close
                const alpha = Math.max(0, Math.min(0.75, (1 - p.z / MAX_Z) * 1.4));
                if (alpha < 0.02) {
                    p.prevX = curX;
                    p.prevY = curY;
                    continue;
                }

                // Streak: draw from previous projected pos to current
                if (p.prevX !== null) {
                    // Line thickness grows as particle approaches
                    const lw = Math.max(0.5, (1 - p.z / MAX_Z) * 2.2);

                    ctx.beginPath();
                    ctx.moveTo(p.prevX, p.prevY);
                    ctx.lineTo(curX, curY);
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = lw;
                    ctx.lineCap = 'round';
                    ctx.globalAlpha = alpha;
                    ctx.stroke();
                }

                p.prevX = curX;
                p.prevY = curY;
            }

            // Tiny background starfield dots
            ctx.fillStyle = '#000';
            for (let i = 0; i < 3; i++) {
                const bx = rand(0, W);
                const by = rand(0, H);
                ctx.globalAlpha = rand(0.02, 0.08);
                ctx.beginPath();
                ctx.arc(bx, by, 0.7, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.globalAlpha = 1;
            raf = requestAnimationFrame(frame);
        }

        init();
        window.addEventListener('resize', init);
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', init);
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 0,
            }}
        />
    );
}
