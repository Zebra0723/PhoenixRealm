/* =========================================================
   Phoenix Realm — interactions
   ========================================================= */
(function () {
  "use strict";

  /* ---- Mobile nav toggle ---- */
  const nav = document.querySelector(".nav");
  const toggle = document.querySelector(".nav__toggle");
  if (nav && toggle) {
    toggle.addEventListener("click", function () {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll(".nav__link").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---- Active link highlight (by filename) ---- */
  const here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".nav__link").forEach(function (link) {
    const target = (link.getAttribute("href") || "").toLowerCase();
    if (target === here || (here === "" && target === "index.html")) {
      link.classList.add("is-active");
      link.setAttribute("aria-current", "page");
    }
  });

  /* ---- Reveal on scroll ---- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- Booking page logic ---- */
  const bookingRoot = document.querySelector("[data-booking]");
  if (bookingRoot) {
    const fmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
    const totalEl = document.querySelector("[data-total]");

    function recalc() {
      let total = 0;
      document.querySelectorAll("[data-ticket]").forEach(function (card) {
        const price = parseFloat(card.getAttribute("data-price")) || 0;
        const input = card.querySelector("[data-qty]");
        const qty = Math.max(0, parseInt(input.value, 10) || 0);
        total += price * qty;
      });
      if (totalEl) totalEl.textContent = fmt.format(total);
    }

    document.querySelectorAll(".stepper").forEach(function (stepper) {
      const input = stepper.querySelector("[data-qty]");
      const dec = stepper.querySelector("[data-dec]");
      const inc = stepper.querySelector("[data-inc]");
      function clamp() {
        let v = parseInt(input.value, 10);
        if (isNaN(v) || v < 0) v = 0;
        if (v > 20) v = 20;
        input.value = v;
      }
      dec.addEventListener("click", function () { input.value = (parseInt(input.value, 10) || 0) - 1; clamp(); recalc(); });
      inc.addEventListener("click", function () { input.value = (parseInt(input.value, 10) || 0) + 1; clamp(); recalc(); });
      input.addEventListener("input", function () { clamp(); recalc(); });
    });
    recalc();

    /* Date selector: default + minimum = today */
    const dateInput = document.querySelector("[data-date]");
    if (dateInput) {
      const today = new Date().toISOString().split("T")[0];
      dateInput.min = today;
      if (!dateInput.value) dateInput.value = today;
    }
  }

  /* ---- Modal (fake checkout) ---- */
  const modal = document.querySelector("[data-modal]");
  if (modal) {
    let lastFocused = null;
    function openModal() {
      lastFocused = document.activeElement;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      const closeBtn = modal.querySelector("[data-modal-close]");
      if (closeBtn) closeBtn.focus();
      document.addEventListener("keydown", onKey);
    }
    function closeModal() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onKey);
      if (lastFocused) lastFocused.focus();
    }
    function onKey(e) { if (e.key === "Escape") closeModal(); }

    document.querySelectorAll("[data-checkout]").forEach(function (btn) {
      btn.addEventListener("click", openModal);
    });
    modal.querySelectorAll("[data-modal-close]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });
  }

  /* ---- Footer year ---- */
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
