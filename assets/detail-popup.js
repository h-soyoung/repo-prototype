(() => {
  const detail = document.querySelector("#detail");
  if (!detail) return;
  const popup = document.createElement("section");
  popup.className = "cart-popup";
  popup.hidden = true;
  popup.setAttribute("role", "dialog");
  popup.setAttribute("aria-label", "장바구니에 담긴 상품");
  popup.innerHTML = '<div class="cart-popup-heading"><span></span><button type="button" class="cart-popup-close" aria-label="닫기">×</button></div><div class="cart-popup-items"></div><div class="cart-popup-pages"><button type="button" data-page="-1" aria-label="이전 상품">‹</button><span></span><button type="button" data-page="1" aria-label="다음 상품">›</button></div><div class="cart-popup-actions"><button type="button" data-popup-go="purchase">GO TO CART</button><button type="button" data-popup-go="shop">CONTINUE SHOPPING</button></div>';
  detail.appendChild(popup);
  let ids = [];
  let page = 0;
  let returnFocus = null;
  const render = () => {
    popup.querySelector(".cart-popup-heading span").textContent = "Cart (" + ids.length + ")";
    const items = popup.querySelector(".cart-popup-items");
    items.replaceChildren();
    ids.slice(page * 4, page * 4 + 4).forEach((id) => {
      const product = (window.alphaProducts || []).find((item) => item.id === id);
      if (!product) return;
      const card = document.createElement("div");
      card.className = "cart-popup-item";
      const image = document.createElement("img");
      image.src = product.image;
      image.alt = product.name;
      const name = document.createElement("strong");
      name.textContent = product.name;
      const price = document.createElement("span");
      price.textContent = product.price;
      const maker = document.createElement("span");
      maker.textContent = "BY SOYOUNG HONG";
      const quantity = document.createElement("div");
      quantity.className = "cart-popup-quantity";
      quantity.textContent = "수량 1";
      card.append(image, name, price, maker, quantity);
      items.appendChild(card);
    });
    popup.querySelector(".cart-popup-pages span").textContent = String(page + 1);
    popup.querySelector('[data-page="-1"]').disabled = page === 0;
    popup.querySelector('[data-page="1"]').disabled = (page + 1) * 4 >= ids.length;
  };
  const close = () => {
    popup.hidden = true;
    returnFocus?.focus();
  };
  window.addEventListener("alpha:cart-added", (event) => {
    ids = event.detail.ids;
    page = Math.max(0, Math.ceil(ids.length / 4) - 1);
    returnFocus = event.detail.source;
    const screen = returnFocus.closest("#detail, #shop");
    if (!screen) return;
    screen.appendChild(popup);
    popup.style.top = (screen.scrollTop + 88) + "px";
    render();
    popup.hidden = false;
    popup.querySelector(".cart-popup-close").focus();
  });
  popup.addEventListener("click", (event) => {
    if (event.target.closest(".cart-popup-close")) close();
    const pageButton = event.target.closest("[data-page]");
    if (pageButton && !pageButton.disabled) { page += Number(pageButton.dataset.page); render(); }
    const go = event.target.closest("[data-popup-go]");
    if (go) { close(); if (go.dataset.popupGo === "purchase") show("purchase"); }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !popup.hidden) close();
  });
  const observer = new MutationObserver(() => {
    if (!popup.parentElement?.classList.contains("active")) popup.hidden = true;
  });
  [detail, document.querySelector("#shop")].filter(Boolean)
    .forEach((screen) => observer.observe(screen, { attributes:true, attributeFilter:["class"] }));
})();
