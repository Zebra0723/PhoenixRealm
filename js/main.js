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

  /* ---- Booking page logic (availability driven by the chosen date) ---- */
  const bookingRoot = document.querySelector("[data-booking]");
  if (bookingRoot) {
    const fmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
    const totalEl = document.querySelector("[data-total]");
    const summaryEl = document.querySelector("[data-avail-summary]");
    const dotEl = document.querySelector("[data-avail-dot]");
    const cards = Array.prototype.slice.call(document.querySelectorAll("[data-ticket]"));
    const byType = {};
    cards.forEach(function (c) { byType[c.dataset.type] = c; });

    /* Stable per-date pseudo-random number so the same date always
       gives the same availability (no refresh needed). */
    function seeded(str) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
      return (h >>> 0) / 4294967296;
    }

    /* Rough UK school-holiday windows (month*100 + day) */
    function isSchoolHoliday(d) {
      const md = (d.getMonth() + 1) * 100 + d.getDate();
      const inRange = function (a, b) { return md >= a && md <= b; };
      return inRange(1218, 1231) || inRange(101, 102) ||  // Christmas / New Year
             inRange(214, 222) ||                          // February half term
             inRange(401, 415) ||                          // Easter
             inRange(524, 531) ||                          // May half term
             inRange(720, 831) ||                          // Summer
             inRange(1024, 1101);                          // October half term
    }

    /* How busy is the chosen date? */
    function demandFor(dateStr) {
      const d = new Date(dateStr + "T00:00:00");
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const holiday = isSchoolHoliday(d);
      if (weekend && holiday) return { p: 0.62, level: "peak", label: "Holiday weekend — very busy" };
      if (holiday)           return { p: 0.45, level: "high", label: "School holidays — busy" };
      if (weekend)           return { p: 0.42, level: "high", label: "Weekend — popular" };
      return { p: 0.08, level: "low", label: "Weekday — plenty of availability" };
    }

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

    function applyStock(card) {
      const state = card.dataset.stock;
      const out = state === "out";
      const max = parseInt(card.dataset.max, 10) || (out ? 0 : 20);
      const status = card.querySelector("[data-status]");
      const stepper = card.querySelector(".stepper");
      const input = card.querySelector("[data-qty]");
      card.classList.toggle("is-soldout", out);
      if (stepper) stepper.classList.toggle("is-disabled", out);
      card.querySelectorAll(".stepper button").forEach(function (b) { b.disabled = out; });
      if (input) {
        input.disabled = out;
        input.max = String(max);
        let v = parseInt(input.value, 10) || 0;
        if (v < 0) v = 0;
        if (v > max) v = max;
        input.value = v;
      }
      if (status) {
        status.classList.remove("is-in", "is-low", "is-out");
        if (out) { status.classList.add("is-out"); status.textContent = "Sold out"; }
        else if (state === "low") { status.classList.add("is-low"); status.textContent = "Only " + max + " left"; }
        else { status.classList.add("is-in"); status.textContent = "Available"; }
      }
    }

    /* Work out availability for the chosen date */
    function evaluateAvailability(dateStr) {
      const demand = demandFor(dateStr);
      cards.forEach(function (card) {
        const r = seeded(dateStr + ":" + card.dataset.type);
        card.dataset.stock = r < demand.p ? "out" : (r < demand.p + 0.22 ? "low" : "in");
      });
      // Family Pass needs 2 adults + 2 children: it can only be available
      // if both Adult and Child tickets are available.
      if (byType.family && ((byType.adult && byType.adult.dataset.stock === "out") ||
                            (byType.child && byType.child.dataset.stock === "out"))) {
        byType.family.dataset.stock = "out";
      }
      // Set the quantity cap: "Only a few left" allows just 2 or 3.
      cards.forEach(function (card) {
        const s = card.dataset.stock;
        if (s === "out") card.dataset.max = "0";
        else if (s === "low") card.dataset.max = String(2 + Math.floor(seeded(dateStr + ":" + card.dataset.type + ":cap") * 2));
        else card.dataset.max = "20";
      });
      cards.forEach(applyStock);

      // Summary + status dot
      const avail = cards.filter(function (c) { return c.dataset.stock !== "out"; }).length;
      if (summaryEl) {
        let tail;
        if (avail === cards.length) tail = "all ticket types available.";
        else if (avail === 0) tail = "everything's sold out for this date.";
        else tail = avail + " of " + cards.length + " ticket types available.";
        summaryEl.textContent = demand.label + " — " + tail;
      }
      if (dotEl) {
        dotEl.classList.remove("is-low", "is-high", "is-peak");
        dotEl.classList.add(demand.level === "low" ? "is-low" : (demand.level === "peak" ? "is-peak" : "is-high"));
      }
      recalc();
    }

    /* Steppers */
    cards.forEach(function (card) {
      const stepper = card.querySelector(".stepper");
      const input = stepper.querySelector("[data-qty]");
      const dec = stepper.querySelector("[data-dec]");
      const inc = stepper.querySelector("[data-inc]");
      function clamp() {
        const max = parseInt(card.dataset.max, 10) || 20;
        let v = parseInt(input.value, 10);
        if (isNaN(v) || v < 0) v = 0;
        if (v > max) v = max;
        input.value = v;
      }
      dec.addEventListener("click", function () { input.value = (parseInt(input.value, 10) || 0) - 1; clamp(); recalc(); });
      inc.addEventListener("click", function () { input.value = (parseInt(input.value, 10) || 0) + 1; clamp(); recalc(); });
      input.addEventListener("input", function () { clamp(); recalc(); });
    });

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

    /* Date selector: default + minimum = today; re-evaluate on change */
    const dateInput = document.querySelector("[data-date]");
    const today = new Date().toISOString().split("T")[0];
    if (dateInput) {
      dateInput.min = today;
      if (!dateInput.value) dateInput.value = today;
      dateInput.addEventListener("change", function () {
        evaluateAvailability(dateInput.value || today);
      });
    }

    evaluateAvailability((dateInput && dateInput.value) || today);
  }

  /* ---- Footer year ---- */
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
