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

  /* ---- Opening hours: live open / closed status ---- */
  const openStatusEl = document.querySelector("[data-open-status]");
  if (openStatusEl) {
    const isHoliday = function (d) {
      const md = (d.getMonth() + 1) * 100 + d.getDate();
      const r = function (a, b) { return md >= a && md <= b; };
      return r(1218, 1231) || r(101, 102) || r(214, 222) || r(401, 415) || r(524, 531) || r(720, 831) || r(1024, 1101);
    };
    const hoursFor = function (d) {
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      return (weekend || isHoliday(d)) ? { o: 9 * 60 + 30, c: 18 * 60 } : { o: 10 * 60, c: 17 * 60 };
    };
    const fmt = function (m) {
      const hh = Math.floor(m / 60), mm = m % 60;
      return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
    };
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    const h = hoursFor(now);
    if (mins >= h.o && mins < h.c) {
      openStatusEl.classList.add("is-open");
      openStatusEl.textContent = "Open now · closes " + fmt(h.c);
    } else {
      openStatusEl.classList.add("is-closed");
      openStatusEl.textContent = mins < h.o ? ("Closed · opens " + fmt(h.o)) : "Closed for today";
    }
  }

  /* ---- Reviews (Supabase-backed, cross-device) ---- */
  const reviewsRoot = document.querySelector("[data-reviews]");
  if (reviewsRoot) {
    const cfg = window.PR_CONFIG || {};
    const base = (cfg.SUPABASE_URL || "").replace(/\/+$/, "");
    const key = cfg.SUPABASE_ANON_KEY || "";
    const configured = !!(base && key);

    const listEl = reviewsRoot.querySelector("[data-reviews-list]");
    const summaryEl = reviewsRoot.querySelector("[data-reviews-summary]");
    const form = reviewsRoot.querySelector("[data-review-form]");
    const openBtn = reviewsRoot.querySelector("[data-review-open]");
    const cancelBtn = reviewsRoot.querySelector("[data-review-cancel]");
    const ratingWrap = reviewsRoot.querySelector("[data-rating]");
    const nameInput = form ? form.querySelector('[name="name"]') : null;
    const commentInput = form ? form.querySelector('[name="comment"]') : null;
    let rating = 0;

    function star(filled) {
      return '<svg viewBox="0 0 24 24" class="' + (filled ? "star-filled" : "star-empty") + '" aria-hidden="true"><path d="M12 3l2.7 5.5 6 .9-4.35 4.2 1.03 6L12 17.8 6.62 19.6l1.03-6L3.3 9.4l6-.9z"/></svg>';
    }
    function starsRow(n) { var s = ""; for (var i = 1; i <= 5; i++) s += star(i <= n); return s; }
    function esc(t) { var d = document.createElement("div"); d.textContent = t == null ? "" : t; return d.innerHTML; }
    function headers(extra) { var h = { apikey: key, Authorization: "Bearer " + key }; if (extra) for (var k in extra) h[k] = extra[k]; return h; }

    /* Star rating input */
    if (ratingWrap) {
      for (var i = 1; i <= 5; i++) {
        (function (v) {
          var b = document.createElement("button");
          b.type = "button";
          b.setAttribute("aria-label", v + (v > 1 ? " stars" : " star"));
          b.innerHTML = star(false);
          b.addEventListener("click", function () { rating = v; paintRating(); });
          ratingWrap.appendChild(b);
        })(i);
      }
    }
    function paintRating() {
      if (!ratingWrap) return;
      ratingWrap.querySelectorAll("button").forEach(function (b, idx) { b.innerHTML = star(idx < rating); });
    }

    function render(items) {
      if (!listEl) return;
      listEl.innerHTML = "";
      if (summaryEl) summaryEl.innerHTML = "";
      items = items || [];
      if (items.length && summaryEl) {
        var total = 0;
        items.forEach(function (r) { total += Number(r.rating) || 0; });
        var avg = total / items.length;
        summaryEl.innerHTML = '<span class="reviews__avg">' + avg.toFixed(1) + '</span>' +
          '<span class="reviews__stars">' + starsRow(Math.round(avg)) + '</span>' +
          '<span>' + items.length + ' rating' + (items.length > 1 ? "s" : "") + '</span>';
      }
      var texts = items.filter(function (r) { return r.comment && r.comment.trim() !== ""; });
      if (!texts.length) {
        var p = document.createElement("p");
        p.className = "reviews__empty";
        p.textContent = items.length ? "No written reviews yet — be the first to leave one." : "No reviews yet. Be the first to share your visit.";
        listEl.appendChild(p);
        return;
      }
      texts.forEach(function (r) {
        var card = document.createElement("div");
        card.className = "review-card";
        var date = r.created_at ? new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
        card.innerHTML =
          '<div class="review-card__top"><span class="review-card__name">' + esc(r.name || "Guest") + '</span>' +
          '<span class="review-card__date">' + date + '</span></div>' +
          '<div class="review-card__stars">' + starsRow(r.rating) + '</div>' +
          '<p>' + esc(r.comment) + '</p>';
        listEl.appendChild(card);
      });
    }

    function load() {
      if (!configured) { render([]); return; }
      fetch(base + "/rest/v1/reviews?select=*&order=created_at.desc", { headers: headers() })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(render)
        .catch(function () { render([]); });
    }

    if (openBtn && form) openBtn.addEventListener("click", function () {
      form.hidden = false; openBtn.hidden = true; if (nameInput) nameInput.focus();
    });
    if (cancelBtn && form) cancelBtn.addEventListener("click", function () {
      form.hidden = true; if (openBtn) openBtn.hidden = false;
    });

    function postReview(payload) {
      return fetch(base + "/rest/v1/reviews", {
        method: "POST",
        headers: headers({ "Content-Type": "application/json", Prefer: "return=representation" }),
        body: JSON.stringify(payload)
      }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); });
    }

    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = nameInput ? nameInput.value.trim() : "";
      var comment = commentInput ? commentInput.value.trim() : "";
      if (!name || !comment || rating < 1) { alert("Please add your name, a star rating and a few words."); return; }
      if (!configured) { alert("Reviews aren't connected yet. Please try again later."); return; }
      var btn = form.querySelector('[type="submit"]');
      btn.disabled = true; btn.textContent = "Posting…";
      postReview({ name: name, rating: rating, comment: comment })
        .then(function () {
          form.reset(); rating = 0; paintRating();
          form.hidden = true; if (openBtn) openBtn.hidden = false;
          load();
        })
        .catch(function () { alert("Sorry, we couldn't post your review. Please try again."); })
        .then(function () { btn.disabled = false; btn.textContent = "Post review"; });
    });

    /* Quick rate (rating only, no written review) */
    const quickWrap = reviewsRoot.querySelector("[data-quick-rate]");
    const quickMsg = reviewsRoot.querySelector("[data-quick-rate-msg]");
    let quickBusy = false;
    function paintQuick(n) {
      if (!quickWrap) return;
      quickWrap.querySelectorAll("button").forEach(function (b, idx) { b.innerHTML = star(idx < n); });
    }
    if (quickWrap) {
      for (var q = 1; q <= 5; q++) {
        (function (v) {
          var b = document.createElement("button");
          b.type = "button";
          b.setAttribute("aria-label", "Rate " + v + (v > 1 ? " stars" : " star"));
          b.innerHTML = star(false);
          b.addEventListener("click", function () {
            if (quickBusy) return;
            if (!configured) { alert("Reviews aren't connected yet. Please try again later."); return; }
            quickBusy = true;
            paintQuick(v);
            if (quickMsg) quickMsg.textContent = "Saving…";
            postReview({ name: "Anonymous", rating: v, comment: "" })
              .then(function () { if (quickMsg) quickMsg.textContent = "Thanks for rating!"; load(); })
              .catch(function () { if (quickMsg) quickMsg.textContent = "Couldn't save — please try again."; paintQuick(0); })
              .then(function () { quickBusy = false; });
          });
          quickWrap.appendChild(b);
        })(q);
      }
    }

    load();
  }

  /* ---- Back to top ---- */
  (function () {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "to-top";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V6M6 12l6-6 6 6"/></svg>';
    document.body.appendChild(btn);
    function onScroll() { btn.classList.toggle("is-visible", window.pageYOffset > 500); }
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  })();

  /* ---- Footer year ---- */
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
