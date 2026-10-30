(() => {
  const resultKey = "alphaLastTestResult";
  let hasResult = false;
  try { hasResult = sessionStorage.getItem(resultKey) === "1"; } catch {}

  window.addEventListener("alpha:result-complete", () => {
    hasResult = true;
    try { sessionStorage.setItem(resultKey, "1"); } catch {}
  });

  document.querySelectorAll(".screen nav").forEach((nav) => {
    const purchaseLinks = [...nav.querySelectorAll('a[data-go="purchase"]')];
    const purchase = purchaseLinks.find((link) => link.textContent.trim().startsWith("Cart")) || purchaseLinks.at(-1);
    if (!purchase || nav.querySelector("[data-my-result]")) return;
    purchaseLinks.forEach((link) => { if (link !== purchase) link.remove(); });
    if (!purchase.textContent.trim().startsWith("Cart")) purchase.textContent = "Cart";
    const link = document.createElement("a");
    link.href = "#result";
    link.textContent = "Result";
    link.dataset.myResult = "";
    purchase.insertAdjacentElement("beforebegin", link);
  });

  document.querySelectorAll(".screen nav img.logo").forEach((logo) => {
    logo.tabIndex = 0;
    logo.setAttribute("role", "button");
    logo.setAttribute("aria-label", "홈으로 이동");
  });

  document.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".screen nav img.logo")) {
      event.preventDefault();
      event.target.click();
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target.closest('a[data-go="home"], a[data-my-result], .screen nav img.logo');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (target.hasAttribute("data-my-result")) {
      if (!hasResult) {
        alert("아직 저장된 테스트 결과가 없어요. 먼저 이미지 5장을 선택해 주세요.");
        return;
      }
      if (!document.querySelector("#result")?.classList.contains("active")) {
        window.alphaSkipResultAnimation = true;
      }
      show("result");
      return;
    }
    if (!confirm("홈으로 돌아가면 테스트 결과와 장바구니가 초기화됩니다. 계속할까요?")) return;
    hasResult = false;
    try { sessionStorage.removeItem(resultKey); } catch {}
    window.dispatchEvent(new Event("alpha:reset-test"));
    show("home");
    document.querySelector("#home").scrollTop = 0;
  }, true);

  document.querySelectorAll(".figma-footer-about").forEach((label) => {
    const link = document.createElement("a");
    link.className = label.className;
    link.textContent = "About Us";
    link.href = "https://instagram.com/r3po.seoul?cplk=MXd2dmQ1dmx5a3A2eg==";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.color = "inherit";
    link.style.textDecoration = "none";
    label.replaceWith(link);
  });
})();
