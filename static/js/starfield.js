export function mountStarfield(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let stars = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let lastTime = 0;
  let elapsed = 0;

  const draw = () => {
    ctx.clearRect(0, 0, width, height);

    for (const star of stars) {
      const x = star.x * width;
      const y = star.y * height;
      const twinkle = motion.matches ? 0.85 : 0.76 + 0.24 * Math.sin(elapsed * star.speed + star.phase);
      const alpha = star.opacity * twinkle;

      if (star.bright) {
        ctx.beginPath();
        ctx.arc(x, y, star.radius * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(235, 237, 240, ${alpha * 0.14})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(x, y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(235, 237, 240, ${alpha})`;
      ctx.fill();
    }
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let seed = 709;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const count = Math.min(280, Math.max(70, Math.round(width * height / 5200)));
    stars = Array.from({ length: count }, () => {
      const x = random();
      const y = random();
      const depth = random();
      const bright = depth > 0.97;
      const quietCenter = 1 - 0.35 * Math.exp(-(((x - 0.5) / 0.24) ** 2));
      return {
        x,
        y,
        radius: bright ? 1.1 + random() * 0.45 : 0.35 + depth * 0.65,
        opacity: (bright ? 0.85 : 0.16 + depth * 0.48) * quietCenter,
        phase: random() * Math.PI * 2,
        speed: 0.35 + random() * 0.65,
        bright,
      };
    });
    draw();
  };

  const animate = (time) => {
    if (time - lastTime >= 1000 / 30) {
      elapsed += Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;
      draw();
    }
    frame = requestAnimationFrame(animate);
  };

  const syncAnimation = () => {
    cancelAnimationFrame(frame);
    draw();
    if (!motion.matches && !document.hidden) {
      lastTime = performance.now();
      frame = requestAnimationFrame(animate);
    }
  };

  resize();
  syncAnimation();
  window.addEventListener('resize', resize);
  motion.addEventListener('change', syncAnimation);
  document.addEventListener('visibilitychange', syncAnimation);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    motion.removeEventListener('change', syncAnimation);
    document.removeEventListener('visibilitychange', syncAnimation);
  };
}
