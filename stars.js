(() => {
    "use strict";

    const canvas = document.getElementById("stars");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const moonEl = document.getElementById("moon");
    const continueHint = document.getElementById("continueHint");

    let width = 0;
    let height = 0;
    let dpr = 1;

    let stars = [];
    const comets = [];
    const explosions = [];
    const bigStars = [];

    let heartsMode = false;
    let moonClicks = 0;
    let collisionTriggered = false;
    let heartsTriggered = false;
    let countingPaused = false;

    const COMET_INTERVAL_MIN = 25000;
    const COMET_INTERVAL_MAX = 40000;
    let nextCometAt = 0;

    const rand = (min, max) => Math.random() * (max - min) + min;

    // ---------- Инициализация ----------
    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        createStars();
    }

    function createStars() {
        const count = Math.min(260, Math.max(80, Math.floor((width * height) / 9000)));
        stars = [];
        for (let i = 0; i < count; i++) {
            const size = Math.pow(Math.random(), 2) * 1.8 + 0.4;
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size,
                baseAlpha: rand(0.35, 0.95),
                phase: Math.random() * Math.PI * 2,
                speed: rand(0.00015, 0.0007),
                hue: Math.random() < 0.15 ? rand(190, 220) : null,
                heartHue: Math.random() < 0.4 ? 350 : (Math.random() < 0.3 ? 330 : null),
            });
        }
    }

    // ---------- Кометы ----------
    function spawnComet() {
        const fromLeft = Math.random() < 0.5;
        const startX = fromLeft ? rand(-80, width * 0.35) : rand(width * 0.65, width + 80);
        const startY = rand(-60, height * 0.3);
        const speed = rand(9, 15);
        const dirX = fromLeft ? 1 : -1;

        comets.push({
            x: startX, y: startY,
            vx: dirX * speed * rand(0.75, 1),
            vy: speed * rand(0.55, 0.9),
            tail: rand(90, 200),
            life: 1,
            decay: rand(0.006, 0.012),
        });
    }

    function spawnCometsFromMoon() {
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            setTimeout(spawnComet, i * 180);
        }
    }

    function scheduleNextComet(now) {
        nextCometAt = now + rand(COMET_INTERVAL_MIN, COMET_INTERVAL_MAX);
    }

    function updateComets() {
        for (let i = comets.length - 1; i >= 0; i--) {
            const c = comets[i];
            c.x += c.vx;
            c.y += c.vy;
            c.life -= c.decay;
            if (c.life <= 0 || c.x < -300 || c.x > width + 300 || c.y > height + 300) {
                comets.splice(i, 1);
            }
        }
    }

    function drawComet(c) {
        const len = Math.hypot(c.vx, c.vy) || 1;
        const tailX = c.x - (c.vx / len) * c.tail;
        const tailY = c.y - (c.vy / len) * c.tail;

        if (heartsMode) {
            const grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
            grad.addColorStop(0, `rgba(255, 200, 220, ${c.life})`);
            grad.addColorStop(0.3, `rgba(255, 170, 200, ${c.life * 0.7})`);
            grad.addColorStop(0.7, `rgba(255, 150, 190, ${c.life * 0.25})`);
            grad.addColorStop(1, "rgba(255, 150, 190, 0)");

            ctx.globalAlpha = 1;
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2.2;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();

            ctx.globalAlpha = c.life;
            ctx.fillStyle = "rgba(255, 220, 235, 0.45)";
            ctx.beginPath();
            ctx.arc(c.x, c.y, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = c.life;
            ctx.fillStyle = "#ff9ec4";
            drawHeart(c.x, c.y, 4.5);

            ctx.globalAlpha = 1;
        } else {
            const grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
            grad.addColorStop(0, `rgba(255, 255, 255, ${c.life})`);
            grad.addColorStop(0.25, `rgba(200, 220, 255, ${c.life * 0.75})`);
            grad.addColorStop(0.6, `rgba(160, 190, 255, ${c.life * 0.3})`);
            grad.addColorStop(1, "rgba(160, 190, 255, 0)");

            ctx.globalAlpha = 1;
            ctx.strokeStyle = grad;
            ctx.lineWidth = 2.2;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            ctx.lineTo(tailX, tailY);
            ctx.stroke();

            ctx.globalAlpha = c.life;
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(c.x, c.y, 2.4, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = c.life * 0.4;
            ctx.fillStyle = "#dbe6ff";
            ctx.beginPath();
            ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    }

    // ---------- Столкновение двух больших звёзд ----------
    function triggerCollision() {
        const cx = width / 2;
        const cy = height / 2;

        const startXL = -80;
        const startYL = cy - 120;
        const dxL = cx - startXL;
        const dyL = cy - startYL;
        const lenL = Math.hypot(dxL, dyL) || 1;
        const speedL = 7;

        bigStars.push({
            x: startXL, y: startYL,
            vx: (dxL / lenL) * speedL,
            vy: (dyL / lenL) * speedL,
            size: 12,
            color: "#fff5cc",
        });

        const startXR = width + 80;
        const startYR = cy + 120;
        const dxR = cx - startXR;
        const dyR = cy - startYR;
        const lenR = Math.hypot(dxR, dyR) || 1;
        const speedR = 7;

        bigStars.push({
            x: startXR, y: startYR,
            vx: (dxR / lenR) * speedR,
            vy: (dyR / lenR) * speedR,
            size: 12,
            color: "#ffe0a8",
        });
    }

    function updateBigStars() {
        for (const s of bigStars) {
            s.x += s.vx;
            s.y += s.vy;
        }
        if (bigStars.length >= 2) {
            const a = bigStars[0];
            const b = bigStars[1];
            const dist = Math.hypot(a.x - b.x, a.y - b.y);
            const passed = a.x >= b.x;

            if (dist < 40 || passed) {
                const cx = (a.x + b.x) / 2;
                const cy = (a.y + b.y) / 2;
                createExplosion(cx, cy);
                showContinue();
                bigStars.length = 0;
            }
        }
    }

    function drawBigStars() {
        for (const s of bigStars) {
            const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.size * 3.2);
            grad.addColorStop(0, "#ffffff");
            grad.addColorStop(0.35, s.color);
            grad.addColorStop(1, "rgba(255, 245, 200, 0)");

            ctx.globalAlpha = 1;
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 3.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // ---------- Взрыв ----------
    function createExplosion(cx, cy) {
        explosions.push({
            x: cx, y: cy, vx: 0, vy: 0,
            life: 1, decay: 0.04,
            color: "#ffffff",
            size: 120,
            flash: true,
        });

        const count = 180;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = rand(2, 13);
            explosions.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: rand(0.007, 0.018),
                color: ["#fff5cc", "#ffd166", "#ffe0a8", "#ffffff", "#ffb86b"][(Math.random() * 5) | 0],
                size: rand(1.5, 3.5),
            });
        }
    }

    function updateExplosions() {
        for (let i = explosions.length - 1; i >= 0; i--) {
            const p = explosions[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.97;
            p.vy *= 0.97;
            if (!p.flash) p.vy += 0.03;
            p.life -= p.decay;
            if (p.life <= 0) explosions.splice(i, 1);
        }
    }

    function drawExplosions() {
        for (const p of explosions) {
            const alpha = Math.max(p.life, 0);
            if (p.flash) {
                const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
                grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                grad.addColorStop(0.35, `rgba(255, 240, 200, ${alpha * 0.6})`);
                grad.addColorStop(1, "rgba(255, 240, 200, 0)");
                ctx.globalAlpha = 1;
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            } else {
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    // ---------- Надпись «Продолжай» ----------
    // Появляется через 1 сек, мягко проявляется 1.2 сек, держится 3 сек.
    // После появления — разблокирует счётчик кликов и обнуляет его.
    function showContinue() {
        if (!continueHint) return;

        const appearDelay = 1000;
        const fadeDuration = 1200;
        const visibleFor = 3000;

        setTimeout(() => {
            continueHint.classList.add("visible");

            setTimeout(() => {
                countingPaused = false;
                moonClicks = 0;
            }, fadeDuration);

            setTimeout(() => {
                continueHint.classList.remove("visible");
            }, visibleFor);
        }, appearDelay);
    }

    // ---------- Сердечко на canvas ----------
    function drawHeart(x, y, size) {
        const s = size;
        ctx.beginPath();
        ctx.moveTo(x, y + s * 0.85);
        ctx.bezierCurveTo(x - s * 1.7, y - s * 0.35, x - s * 1.15, y - s * 1.45, x, y - s * 0.55);
        ctx.bezierCurveTo(x + s * 1.15, y - s * 1.45, x + s * 1.7, y - s * 0.35, x, y + s * 0.85);
        ctx.closePath();
        ctx.fill();
    }

    // ---------- Главный цикл ----------
    function draw(now) {
        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const wave = 0.5 + 0.5 * Math.sin(s.phase + now * s.speed);
            const alpha = s.baseAlpha * wave;
            if (alpha < 0.02) continue;

            ctx.globalAlpha = alpha;

            if (heartsMode) {
                ctx.fillStyle = s.heartHue
                    ? `hsl(${s.heartHue}, 85%, 78%)`
                    : "#ffd6e0";
                drawHeart(s.x, s.y, s.size * 1.8);
            } else {
                ctx.fillStyle = s.hue ? `hsl(${s.hue}, 80%, 88%)` : "#ffffff";
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctx.fill();

                if (s.size > 1.4) {
                    ctx.globalAlpha = alpha * 0.35;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size * 2.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.globalAlpha = 1;

        if (nextCometAt === 0) scheduleNextComet(now);
        if (now >= nextCometAt) {
            spawnComet();
            scheduleNextComet(now);
        }
        updateComets();
        for (const c of comets) drawComet(c);

        updateBigStars();
        drawBigStars();

        updateExplosions();
        drawExplosions();

        requestAnimationFrame(draw);
    }

    function drawStatic() {
        ctx.clearRect(0, 0, width, height);
        for (const s of stars) {
            ctx.globalAlpha = s.baseAlpha * 0.7;
            ctx.fillStyle = s.hue ? `hsl(${s.hue}, 80%, 88%)` : "#ffffff";
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ---------- Клик по месяцу ----------
    function handleMoonClick() {
        spawnCometsFromMoon();

        if (countingPaused) return;

        moonClicks++;

        if (moonClicks >= 20 && !collisionTriggered) {
            collisionTriggered = true;
            countingPaused = true;
            triggerCollision();
        }
        if (moonClicks >= 40 && !heartsTriggered) {
            heartsTriggered = true;
            heartsMode = true;
        }
    }

    if (moonEl) {
        moonEl.addEventListener("click", handleMoonClick);
        moonEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                e.preventDefault();
                handleMoonClick();
            }
        });
    }

    // ---------- Старт ----------
    window.addEventListener("resize", resize);
    resize();

    if (prefersReduced) {
        drawStatic();
    } else {
        setTimeout(() => spawnComet(), rand(5000, 10000));
        requestAnimationFrame(draw);
    }
})();
