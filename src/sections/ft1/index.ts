// FT-1 teardown entry. three.js and the 2 MB model load only as the visitor
// approaches the section, so they never weigh on the first paint.
export function initFt1() {
  const sec = document.getElementById("ft1");
  const canvas = document.getElementById("ft1-gl") as HTMLCanvasElement | null;
  const tagsEl = document.getElementById("ft1-tags");
  if (!sec || !canvas || !tagsEl) return;
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      import("./scene")
        .then((m) => m.start(sec, canvas, tagsEl))
        .catch((err) => {
          console.warn("FT-1 teardown unavailable", err);
          sec.classList.add("no-gl");
        });
    },
    { rootMargin: "150% 0px" },
  );
  io.observe(sec);
}
