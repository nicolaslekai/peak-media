// TOOLS section (index.html #werkzeuge): draws the art in once it scrolls into view by
// adding .tools--in; the CSS holds the hidden start state only while the class is missing.
// Reduced motion or no IntersectionObserver: shown at once.
(() => {
  const section = document.querySelector('.tools');
  const art = section && section.querySelector('.tools__art');
  if (!art) return;
  const show = () => section.classList.add('tools--in');
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    show();
    return;
  }
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    show();
    io.disconnect();
  }, { threshold: 0.4 });
  io.observe(art);
})();
