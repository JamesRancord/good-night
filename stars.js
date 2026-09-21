(() => {
    "use strict";

    const canvas = document.getElementById("stars");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars = [];
    const comets = [];

    // Тайминг комет: раз в ~30 секунд, с небольшим разбросом
    const COMET_INTERVAL_MIN = 5000; // 5 сек
    const COMET_INTERVAL_MAX = 10000; // 10 сек
    let nextCometAt = 0;

    const rand = (min, max) => Math.random() * (max - min) + min;

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
            });
        }
    }

    // ---------- Кометы ----------
    function spawnComet() {
        // Летят сверху вниз по диагонали. Примерно половина слева-направо,
        // половина справа-налево — как настоящий метеорный поток.
        const fromLeft = Math.random() < 0.5;

        const startX = fromLeft
            ? rand(-80, width * 0.35)
            : rand(width * 0.65, width + 80);
        const startY = rand(-60, height * 0.3);

        const speed = rand(9, 15);
        const dirX = fromLeft ? 1 : -1;

        comets.push({
            x: startX,
            y: startY,
            vx: dirX * speed * rand(0.75, 1),
            vy: speed * rand(0.55, 0.9),
            // Длина хвоста в пикселях — визуально красиво от 90 до 200
            tail: rand(90, 200),
            life: 1,
            decay: rand(0.006, 0.012),
        });
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

            // Убираем, если погасла или ушла далеко за экран
            if (c.life <= 0 || c.x < -300 || c.x > width + 300 || c.y > height + 300) {
                comets.splice(i, 1);
            }
        }
    }

    function drawComet(c) {
        // Хвост — градиентная линия от головы назад по вектору движения
        const tailX = c.x - (c.vx / Math.hypot(c.vx, c.vy)) * c.tail;
        const tailY = c.y - (c.vy / Math.hypot(c.vx, c.vy)) * c.tail;

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

        // Светящаяся голова
        ctx.globalAlpha = c.life;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(c.x, c.y, 2.4, 0, Math.PI * 2);
        ctx.fill();

        // Мягкий ореол вокруг головы
        ctx.globalAlpha = c.life * 0.4;
        ctx.fillStyle = "#dbe6ff";
        ctx.beginPath();
        ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // ---------- Главный цикл ----------
    function draw(now) {
        ctx.clearRect(0, 0, width, height);

        // Звёзды
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const wave = 0.5 + 0.5 * Math.sin(s.phase + now * s.speed);
            const alpha = s.baseAlpha * wave;
            if (alpha < 0.02) continue;

            ctx.globalAlpha = alpha;
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

        // Кометы
        if (nextCometAt === 0) scheduleNextComet(now);
        if (now >= nextCometAt) {
            spawnComet();
            scheduleNextComet(now);
        }

        updateComets();
        for (const c of comets) drawComet(c);

        ctx.globalAlpha = 1;
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

    window.addEventListener("resize", resize);
    resize();

    if (prefersReduced) {
        drawStatic();
    } else {
        // Первую комету пускаем через 5–10 секунд после загрузки,
        // чтобы посетитель её точно увидел
        setTimeout(() => spawnComet(), rand(5000, 10000));
        requestAnimationFrame(draw);
    }
})();