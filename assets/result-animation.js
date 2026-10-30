(() => {
  const result = document.querySelector("#result");
  if (!result) return;
  const rows = [...result.querySelectorAll(".terminal-profile .terminal-row")].map((row) => ({
    number: row.querySelector("strong"),
    meter: row.querySelector(".terminal-meter"),
  })).filter((row) => row.number && row.meter);
  const spectrum = result.querySelector(".spectrum-track i");
  const sourceKeywords = document.querySelector("#shop .rebuild-hover-keywords");
  if (sourceKeywords) result.querySelectorAll(".result-product").forEach((product) => {
    const image = product.querySelector("img");
    if (!image) return;
    const frame = document.createElement("div");
    frame.className = "result-photo-frame";
    const keywords = sourceKeywords.cloneNode(true);
    keywords.className = "result-hover-keywords";
    keywords.setAttribute("aria-hidden", "true");
    product.insertBefore(frame, image);
    frame.append(image, keywords);
  });
  let timer = 0;
  let active = false;
  let restore = () => {};

  const update = () => {
    const visible = result.classList.contains("active");
    if (visible === active) return;
    active = visible;
    clearInterval(timer);
    restore();
    if (!visible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const final = rows.map(({ number, meter }) => ({
      text: number.textContent,
      score: meter.style.getPropertyValue("--score"),
    }));
    const spectrumWidth = spectrum?.style.width || "";
    restore = () => {
      rows.forEach(({ number, meter }, index) => {
        number.textContent = final[index].text;
        meter.style.setProperty("--score", final[index].score);
      });
      if (spectrum) spectrum.style.width = spectrumWidth;
    };
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      if (elapsed >= 5000) {
        clearInterval(timer);
        restore();
        return;
      }
      rows.forEach(({ number, meter }, index) => {
        const duration = 1600 + 3400 * (index + 1) / rows.length;
        if (elapsed >= duration) {
          number.textContent = final[index].text;
          meter.style.setProperty("--score", final[index].score);
          return;
        }
        const progress = Math.min(1, elapsed / duration);
        number.textContent = (parseFloat(final[index].text) * progress).toFixed(3).padStart(6, "0");
        meter.style.setProperty("--score", (parseFloat(final[index].score) * progress) + "%");
      });
      if (spectrum) spectrum.style.width = (117 / 405 * 100 * Math.min(1, elapsed / 5000)) + "%";
    };
    tick();
    timer = setInterval(tick, 80);
  };
  new MutationObserver(update).observe(result, { attributes: true, attributeFilter: ["class"] });
  update();
})();
