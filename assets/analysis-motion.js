(() => {
  const svg = document.querySelector("#analysis .analysis-stars");
  if (!svg) return;
  const ns = "http://www.w3.org/2000/svg";
  const paths = [
    "M 450 490 L 450 655",
    "M 680 545 L 680 660",
    "M 750 325 L 750 650",
    "M 950 550 L 950 1155",
    "M 150 615 L 430 615",
    "M 90 1025 L 550 1025",
    "M 800 1060 L 1150 1060",
    "M 550 1300 L 730 1300",
    "M 1150 670 L 1150 815",
    "M 460 120 L 810 120"
  ];
  const choices = paths.map((path) => ({ path, order:Math.random() })).sort((a,b) => a.order-b.order);
  choices.slice(0,8).forEach(({ path }) => {
    const image = document.createElementNS(ns, "image");
    image.setAttribute("href", "assets/figma/analysis-star-original.svg");
    image.setAttribute("x", "-7");
    image.setAttribute("y", "-7");
    image.setAttribute("width", "14");
    image.setAttribute("height", "14");
    const motion = document.createElementNS(ns, "animateMotion");
    motion.setAttribute("path", path);
    motion.setAttribute("dur", (2.4 + Math.random() * 2.4).toFixed(2) + "s");
    motion.setAttribute("begin", (-Math.random() * 2).toFixed(2) + "s");
    motion.setAttribute("repeatCount", "indefinite");
    motion.setAttribute("calcMode", "linear");
    image.appendChild(motion);
    svg.appendChild(image);
  });
})();
