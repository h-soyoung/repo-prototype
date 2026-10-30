(() => {
  const home = document.querySelector("#home");
  if (!home) return;
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.style.position = "absolute";
  svg.innerHTML = '<filter id="home-rough-stroke" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".075" numOctaves="2" seed="4" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/></filter>';
  home.prepend(svg);
  if (!("IntersectionObserver" in window)) return;
  const items = home.querySelectorAll(".story-reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-visible", entry.isIntersecting);
    });
  }, { root: home, rootMargin: "0px 0px -5% 0px", threshold: 0 });
  home.classList.add("home-reveals-ready");
  items.forEach((item) => observer.observe(item));
})();
