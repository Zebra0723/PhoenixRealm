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

  /* ---- Modal helper (dynamic title / message / icon) ---- */
  const modal = document.querySelector("[data-modal]");
  let dialog = null;
  if (modal) {
    const titleEl = modal.querySelector("[data-modal-title]");
    const msgEl = modal.querySelector("[data-modal-message]");
    const iconEl = modal.querySelector("[data-modal-icon]");
    const icons = {
      alert: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.01"/></svg>',
      check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>'
    };
    let lastFocused = null;
    function onKey(e) { if (e.key === "Escape") close(); }
    function open(opts) {
      opts = opts || {};
      if (titleEl) titleEl.textContent = opts.title || "Booking unavailable";
      if (msgEl) msgEl.textContent = opts.message || "Sorry, this item is not currently available for purchase. Please try again later.";
      if (iconEl) {
        iconEl.innerHTML = icons[opts.icon] || icons.alert;
        iconEl.classList.toggle("modal__icon--ok", opts.icon === "check");
      }
      lastFocused = document.activeElement;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      const c = modal.querySelector("[data-modal-close]");
      if (c) c.focus();
      document.addEventListener("keydown", onKey);
    }
    function close() {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onKey);
      if (lastFocused) lastFocused.focus();
    }
    modal.querySelectorAll("[data-modal-close]").forEach(function (el) { el.addEventListener("click", close); });
    dialog = { open: open, close: close };
  }

  /* ---- Booking page logic (with random stock) ---- */
  const bookingRoot = document.querySelector("[data-booking]");
  if (bookingRoot) {
    const fmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
    const totalEl = document.querySelector("[data-total]");
    const summaryEl = document.querySelector("[data-avail-summary]");
    const cards = Array.prototype.slice.call(document.querySelectorAll("[data-ticket]"));

    function recalc() {
      let total = 0;
      cards.forEach(function (card) {
        if (card.dataset.stock === "out") return;
        const price = parseFloat(card.getAttribute("data-price")) || 0;
        const input = card.querySelector("[data-qty]");
        total += price * Math.max(0, parseInt(input.value, 10) || 0);
      });
      if (totalEl) totalEl.textContent = fmt.format(total);
    }

    /* Apply a ticket's stock state to its card */
    function applyStock(card) {
      const state = card.dataset.stock;
      const out = state === "out";
      const status = card.querySelector("[data-status]");
      const stepper = card.querySelector(".stepper");
      const input = card.querySelector("[data-qty]");
      card.classList.toggle("is-soldout", out);
      if (stepper) stepper.classList.toggle("is-disabled", out);
      card.querySelectorAll(".stepper button").forEach(function (b) { b.disabled = out; });
      if (input) { input.disabled = out; if (out) input.value = 0; }
      if (status) {
        status.classList.remove("is-in", "is-low", "is-out");
        if (out) { status.classList.add("is-out"); status.textContent = "Sold out"; }
        else if (state === "low") { status.classList.add("is-low"); status.textContent = "Only a few left"; }
        else { status.classList.add("is-in"); status.textContent = "Available"; }
      }
    }

    function updateSummary() {
      if (!summaryEl) return;
      const total = cards.length;
      const avail = cards.filter(function (c) { return c.dataset.stock !== "out"; }).length;
      if (avail === total) summaryEl.textContent = "Good news — every ticket type is available right now.";
      else if (avail === 0) summaryEl.textContent = "Everything's sold out at the moment. Try checking again later.";
      else summaryEl.textContent = avail + " of " + total + " ticket types available — the rest have sold out.";
    }

    /* Randomly decide availability for each ticket type */
    function rollStock() {
      cards.forEach(function (card) {
        const r = Math.random();
        card.dataset.stock = r < 0.40 ? "out" : (r < 0.65 ? "low" : "in");
      });
      // Don't leave the whole park sold out
      if (cards.every(function (c) { return c.dataset.stock === "out"; })) {
        cards[Math.floor(Math.random() * cards.length)].dataset.stock = "in";
      }
      cards.forEach(applyStock);
      updateSummary();
      recalc();
    }

    /* Steppers */
    cards.forEach(function (card) {
      const stepper = card.querySelector(".stepper");
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

    /* Re-roll availability on demand */
    const refreshBtn = document.querySelector("[data-refresh-stock]");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function () {
        refreshBtn.disabled = true;
        const original = refreshBtn.textContent;
        refreshBtn.textContent = "Updating…";
        if (summaryEl) summaryEl.textContent = "Checking live availability…";
        setTimeout(function () {
          rollStock();
          refreshBtn.disabled = false;
          refreshBtn.textContent = original;
        }, 550);
      });
    }

    /* Checkout */
    document.querySelectorAll("[data-checkout]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!dialog) return;
        let selected = 0, soldSelected = false;
        cards.forEach(function (card) {
          const qty = Math.max(0, parseInt(card.querySelector("[data-qty]").value, 10) || 0);
          if (qty > 0) {
            if (card.dataset.stock === "out") soldSelected = true;
            else selected += qty;
          }
        });
        if (soldSelected) {
          dialog.open({ icon: "alert", title: "Booking unavailable", message: "Sorry, this item is not currently available for purchase. Please try again later." });
        } else if (selected === 0) {
          dialog.open({ icon: "alert", title: "No tickets selected", message: "Please add at least one available ticket before continuing." });
        } else {
          dialog.open({ icon: "check", title: "Tickets held for you", message: "Good news — these tickets are available. This is a prototype, so no payment has been taken." });
        }
      });
    });

    /* Date selector: default + minimum = today */
    const dateInput = document.querySelector("[data-date]");
    if (dateInput) {
      const today = new Date().toISOString().split("T")[0];
      dateInput.min = today;
      if (!dateInput.value) dateInput.value = today;
    }

    rollStock();
  }

  /* ---- Footer year ---- */
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
