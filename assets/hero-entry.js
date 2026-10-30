/* Independent entry rule for the first screen; does not alter the liquid shader. */
(() => {
  const home = document.querySelector("#home");
  const portal = document.querySelector("#homePortal");
  if (!home || !portal) return;

  let movementStarted = 0;
  let lastMoveAt = 0;
  let lastX = NaN;
  let lastY = NaN;
  let entered = false;

  const navigate = (id) => {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.toggle("active", screen.id === id);
    });
    location.hash = id;
  };

  document.addEventListener("pointermove", (event) => {
    if (!home.classList.contains("active")) {
      entered = false;
      movementStarted = 0;
      lastMoveAt = 0;
      lastX = lastY = NaN;
      return;
    }
    if (entered || !portal.contains(event.target)) {
      movementStarted = 0;
      lastMoveAt = 0;
      lastX = lastY = NaN;
      return;
    }
    if (event.clientX === lastX && event.clientY === lastY) return;

    const now = performance.now();
    if (!lastMoveAt || now - lastMoveAt > 750) movementStarted = now;
    lastX = event.clientX;
    lastY = event.clientY;
    lastMoveAt = now;

    if (now - movementStarted >= 5000) {
      entered = true;
      navigate("select");
    }
  }, true);

  document.addEventListener("click", (event) => {
    const link = event.target.closest("#home [data-go]");
    if (!link) return;
    if (link.dataset.go === "home") return;
    if (link.dataset.go === "select" && !entered) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    navigate(link.dataset.go);
  }, true);
})();
