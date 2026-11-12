/* Take Root Life Coaching — interactions */
(() => {
  const d = document;
  const root = d.documentElement;
  const $ = (s, c = d) => c.querySelector(s);
  const $$ = (s, c = d) => Array.from(c.querySelectorAll(s));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = () => !reduce && window.gsap && window.ScrollTrigger;
  root.classList.add("is-ready");

  /* ---------- Page transitions (curtain) ---------- */
  const PT_KEY = "tr-pt";
  const arriving = root.classList.contains("pt-in");
  if (arriving) {
    try { sessionStorage.removeItem(PT_KEY); } catch (_) {}
    requestAnimationFrame(() => requestAnimationFrame(() => {
      root.classList.add("pt-reveal");
      setTimeout(() => root.classList.remove("pt-in", "pt-reveal"), 1000);
    }));
  }
  const pageLabel = (url) => {
    if (url.pathname.includes("/journal/")) return "Journal";
    const file = url.pathname.split("/").pop() || "index.html";
    return ({ "index.html": "Home", "about.html": "About", "coaching.html": "Coaching", "work-with-me.html": "Book a session", "footing-check.html": "Footing Check", "journal.html": "Journal", "faq.html": "FAQ", "contact.html": "Contact", "ideas.html": "A few ideas", "404.html": "Take Root" })[file] || "Take Root";
  };
  const internalPage = (a) => {
    if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return null;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/^(https?|file):$/.test(url.protocol)) return null;
    if (url.pathname === location.pathname && url.search === location.search) return null;
    if (!/(\.html|\/)$/.test(url.pathname)) return null;
    return url;
  };
  let leaving = false;
  if (!reduce) {
    d.addEventListener("click", (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const url = internalPage(e.target.closest("a[href]"));
      if (!url) return;
      e.preventDefault();
      if (leaving) return;
      leaving = true;
      const label = pageLabel(url);
      try { sessionStorage.setItem(PT_KEY, label); } catch (_) {}
      const lbl = $("#pt-label"); if (lbl) lbl.textContent = label;
      root.classList.remove("pt-in", "pt-reveal");
      root.classList.add("pt-out");
      setTimeout(() => { location.href = url.href; }, 720);
    });
    // Warm the cache for the next page as soon as the pointer heads towards a link
    const prefetched = new Set();
    const prefetch = (e) => {
      const url = internalPage(e.target.closest && e.target.closest("a[href]"));
      if (!url || prefetched.has(url.pathname)) return;
      prefetched.add(url.pathname);
      const l = d.createElement("link"); l.rel = "prefetch"; l.href = url.pathname; d.head.appendChild(l);
    };
    d.addEventListener("pointerover", prefetch, { passive: true });
    d.addEventListener("touchstart", prefetch, { passive: true });
  }
  // Coming back via the browser's back/forward cache: lift the curtain
  addEventListener("pageshow", (e) => { if (e.persisted) { leaving = false; root.classList.remove("pt-out", "pt-in", "pt-reveal"); } });

  /* ---------- Live local time in the footer ---------- */
  const clock = $("[data-clock]");
  if (clock) {
    const fmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
    const tick = () => { clock.textContent = `· ${fmt.format(new Date())} ET`; };
    tick(); setInterval(tick, 30000);
  }

  /* ---------- Testimonial stage: one story at a time ---------- */
  const tStage = $(".tstage");
  if (tStage) {
    const tabs = $$(".ts-tab", tStage);
    const panels = $$(".ts-panel", tStage);
    const countEl = $("[data-ts-count]", tStage);
    const holder = d.createElement("div");
    holder.className = "ts-panels";
    panels[0].before(holder);
    panels.forEach((p) => holder.appendChild(p));
    const DUR = 7000;
    let cur = 0, timer = null, inView = false, hovering = false;
    const words = (p) => $$(".wi", p);
    const animated = !reduce && window.gsap;
    if (animated) panels.forEach((p) => {
      const big = $(".ts-big", p);
      Array.from(big.childNodes).forEach(function walk(n) {
        if (n.nodeType === 3) {
          const frag = d.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(d.createTextNode(" ")); return; }
            const o = d.createElement("span"); o.className = "wr";
            const i = d.createElement("span"); i.className = "wi"; i.textContent = tok;
            o.appendChild(i); frag.appendChild(o);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) Array.from(n.childNodes).forEach(walk);
      });
    });
    const sizeHolder = () => {
      let m = 0;
      panels.forEach((p) => {
        const was = p.hidden; p.hidden = false; p.style.visibility = "hidden"; p.style.position = "absolute"; p.style.width = holder.clientWidth + "px";
        m = Math.max(m, p.offsetHeight);
        p.hidden = was; p.style.visibility = ""; p.style.position = ""; p.style.width = "";
      });
      holder.style.minHeight = m + "px";
    };
    sizeHolder(); addEventListener("resize", sizeHolder);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(sizeHolder);
    const schedule = () => { clearTimeout(timer); if (inView && !hovering && !reduce) timer = setTimeout(() => show((cur + 1) % panels.length), DUR); };
    const restartBar = (tab) => { const bar = $(".ts-bar i", tab); if (!bar) return; bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; };
    const show = (i, focus) => {
      if (i === cur) { schedule(); return; }
      const oldP = panels[cur], newP = panels[i];
      tabs.forEach((t, k) => { t.setAttribute("aria-selected", String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      restartBar(tabs[i]);
      if (focus) tabs[i].focus();
      if (countEl) countEl.textContent = String(i + 1).padStart(2, "0");
      cur = i;
      if (!animated) { oldP.hidden = true; newP.hidden = false; schedule(); return; }
      const g = window.gsap;
      panels.forEach((p) => { g.killTweensOf(words(p)); g.killTweensOf($(".ts-full", p)); if (p !== newP) p.hidden = true; });
      newP.hidden = false;
      g.fromTo(words(newP), { yPercent: 150, rotate: 3 }, { yPercent: 0, rotate: 0, duration: 0.95, ease: "expo.out", stagger: 0.014 });
      g.fromTo($(".ts-full", newP), { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.15, ease: "power3.out" });
      schedule();
    };
    tabs.forEach((t, k) => {
      t.addEventListener("click", () => show(k));
      t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); show((k + 1) % tabs.length, true); }
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); show((k - 1 + tabs.length) % tabs.length, true); }
      });
    });
    tStage.addEventListener("pointerenter", () => { hovering = true; tStage.classList.add("is-paused"); clearTimeout(timer); });
    tStage.addEventListener("pointerleave", () => { hovering = false; tStage.classList.remove("is-paused"); restartBar(tabs[cur]); schedule(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => {
        inView = en.isIntersecting;
        if (inView) { restartBar(tabs[cur]); schedule(); } else clearTimeout(timer);
      }, { threshold: 0.35 }).observe(tStage);
    }
  }

  /* ---------- Preloader: counts up with real loading, then lifts away ---------- */
  const preloading = root.classList.contains("is-preloading");
  let loaderDone = !preloading;
  const afterLoader = [];
  if (preloading) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    scrollTo(0, 0);
    let finished = false;
    const finish = () => {
      if (finished) return; finished = true;
      setTimeout(() => {
        root.classList.add("ld-out");
        loaderDone = true;
        afterLoader.splice(0).forEach((f) => f());
        d.dispatchEvent(new Event("tr:loaded"));
        setTimeout(() => root.classList.remove("is-preloading", "ld-out"), 1200);
      }, 240);
    };
    // The counter itself runs inline from first paint (see the loader markup); lift when it reaches 100
    if (window.__ldDone) finish(); else d.addEventListener("tr:ld100", finish, { once: true });
  }

  /* ---------- Page entrance ---------- */
  let loaded = false;
  const markLoaded = () => {
    if (loaded) return; loaded = true;
    const go = () => setTimeout(() => requestAnimationFrame(() => root.classList.add("is-loaded")), arriving ? 0 : preloading ? 150 : 0);
    if (loaderDone) go(); else afterLoader.push(go);
  };
  // Arriving through the curtain, fonts are already cached: start the entrance as the curtain lifts
  if (arriving) markLoaded();
  else if (d.fonts && d.fonts.ready) d.fonts.ready.then(markLoaded);
  setTimeout(markLoaded, 700);

  /* ---------- Navigation ---------- */
  const nav = $("#nav");
  const burger = $(".burger");
  const menu = $("#menu");
  const setMenu = (open) => {
    root.classList.toggle("menu-open", open);
    if (window.__lenis) open ? window.__lenis.stop() : window.__lenis.start();
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.setAttribute("aria-hidden", String(!open));
    if (open) nav.classList.remove("is-hidden");
  };
  burger && burger.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
  d.addEventListener("keydown", (e) => { if (e.key === "Escape" && root.classList.contains("menu-open")) { setMenu(false); burger.focus(); } });
  $$("#menu a").forEach((a) => a.addEventListener("click", () => setMenu(false)));

  let lastY = scrollY, navDown = true, navAnchor = scrollY;
  const sticky = $("#sticky-book");
  const footer = $(".footer");
  let footerVisible = false;
  if (footer && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => { footerVisible = e.isIntersecting; }, { threshold: 0 }).observe(footer);
  }

  /* ---------- Scroll-linked lighting (signs list + steps) ---------- */
  const litItems = [...$$(".signs-list li"), ...$$(".step")];
  const labels = $$(".root-label");

  let ticking = false;
  const onScroll = () => {
    const y = scrollY;
    if (!root.classList.contains("menu-open")) {
      // Direction is judged over a few pixels, and the bounce at the very top/bottom on iPhone is ignored
      const maxY = d.documentElement.scrollHeight - innerHeight;
      if (y < 120) nav.classList.remove("is-hidden");
      else if (y < maxY - 4) {
        const down = y > lastY;
        if (down !== navDown) { navDown = down; navAnchor = lastY; }
        if (navDown && y - navAnchor > 12) nav.classList.add("is-hidden");
        else if (!navDown && navAnchor - y > 12) nav.classList.remove("is-hidden");
      }
    }
    lastY = y;
    if (sticky && !d.body.classList.contains("no-sticky")) {
      const on = y > innerHeight * 0.75 && !footerVisible;
      sticky.classList.toggle("is-on", on);
      sticky.setAttribute("aria-hidden", String(!on));
      const a = $("a", sticky); a && a.setAttribute("tabindex", on ? "0" : "-1");
    }
    const vh = innerHeight;
    litItems.forEach((el) => {
      const r = el.getBoundingClientRect();
      el.classList.toggle("is-lit", r.top < vh * (el.classList.contains("step") ? 0.6 : 0.68));
    });
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  $$("[data-top]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); if (window.__lenis) window.__lenis.scrollTo(0); else scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); }));

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else revealEls.forEach((el) => el.classList.add("is-in"));

  /* ---------- Statement: split into words ---------- */
  const splitWords = (node) => {
    Array.from(node.childNodes).forEach((n) => {
      if (n.nodeType === 3) {
        const frag = d.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) frag.appendChild(d.createTextNode(tok));
          else { const s = d.createElement("span"); s.className = "w"; s.textContent = tok; frag.appendChild(s); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) {
        if (n.classList.contains("pill-img")) n.classList.add("w");
        else splitWords(n);
      }
    });
  };
  $$(".statement[data-words]").forEach((el) => splitWords(el));

  /* ---------- Testimonials track ---------- */
  const track = $("#t-track");
  if (track) {
    const bar = $("#t-bar");
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const ratio = track.clientWidth / track.scrollWidth;
      const pos = max > 0 ? track.scrollLeft / max : 0;
      if (bar) bar.style.width = `${Math.min(100, (ratio + (1 - ratio) * pos) * 100)}%`;
    };
    track.addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
    $$("[data-t]").forEach((b) => b.addEventListener("click", () => {
      const card = $(".t-card", track);
      const step = card ? card.getBoundingClientRect().width + 20 : 400;
      track.scrollBy({ left: step * Number(b.dataset.t), behavior: reduce ? "auto" : "smooth" });
    }));
    let down = false, startX = 0, startL = 0, moved = false;
    track.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = true; moved = false; startX = e.clientX; startL = track.scrollLeft; });
    addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; track.classList.add("is-drag"); }
      track.scrollLeft = startL - dx;
    });
    addEventListener("pointerup", () => { if (!down) return; down = false; track.classList.remove("is-drag"); });
    track.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  }

  /* ---------- Accordion ---------- */
  $$(".faq-item").forEach((item) => {
    const summary = $("summary", item);
    const body = $(".faq-body", item);
    summary.addEventListener("click", (e) => {
      if (reduce || !body.animate) return;
      e.preventDefault();
      if (item.open) {
        const h = body.offsetHeight;
        const a = body.animate([{ height: h + "px", opacity: 1 }, { height: "0px", opacity: 0 }], { duration: 450, easing: "cubic-bezier(.22,1,.36,1)" });
        item.classList.add("closing");
        a.onfinish = () => { item.open = false; item.classList.remove("closing"); };
      } else {
        item.open = true;
        const h = body.offsetHeight;
        body.animate([{ height: "0px", opacity: 0 }, { height: h + "px", opacity: 1 }], { duration: 550, easing: "cubic-bezier(.22,1,.36,1)" });
      }
    });
  });

  /* ---------- Booking tabs ---------- */
  const seg = $(".seg");
  if (seg) {
    const tabs = $$("[role=tab]", seg);
    const thumb = $(".seg-thumb", seg);
    const select = (tab, focus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        $("#" + t.getAttribute("aria-controls")).hidden = !on;
      });
      thumb.style.width = tab.offsetWidth + "px";
      thumb.style.transform = `translateX(${tab.offsetLeft - 5}px)`;
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => { select(t); history.replaceState(null, "", "#" + t.dataset.hash); });
      t.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); select(tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length], true); }
      });
    });
    const initial = tabs.find((t) => "#" + t.dataset.hash === location.hash) || tabs[0];
    requestAnimationFrame(() => select(initial));
    addEventListener("resize", () => select(tabs.find((t) => t.getAttribute("aria-selected") === "true")));
    if (location.hash === "#returning") setTimeout(() => $("#book")?.scrollIntoView({ behavior: "smooth" }), 400);
  }

  /* ---------- Contact form ---------- */
  const form = $("[data-form]");
  if (form) {
    const wrap = form.closest("[data-form-wrap]");
    const params = new URLSearchParams(location.search);
    const topic = params.get("topic");
    if (topic) { const r = form.querySelector(`input[name="topic"][value="${CSS.escape(topic)}"]`); if (r) r.checked = true; }
    let footing = null;
    try { footing = JSON.parse(localStorage.getItem("tr-footing") || "null"); } catch (_) {}
    const note = $(".attach-note", form);
    if (footing && note) {
      note.classList.add("is-on");
      $("[data-footing-summary]", note).textContent = footing.summary;
    }
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const attach = data.get("attach_footing") && footing;
      if (attach) data.set("footing_check", footing.summary);
      const endpoint = form.dataset.endpoint;
      const btnEl = $("button[type=submit]", form);
      btnEl.disabled = true;
      try {
        if (endpoint) {
          const res = await fetch(endpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
          if (!res.ok) throw new Error("Request failed");
        } else {
          const lines = [
            `Name: ${data.get("name")}`, `Email: ${data.get("email")}`,
            data.get("phone") ? `Phone: ${data.get("phone")}` : "",
            data.get("topic") ? `What's on my mind: ${data.get("topic")}` : "",
            data.get("contact_pref") ? `Best way to reach me: ${data.get("contact_pref")}` : "",
            "", String(data.get("message") || ""),
            attach ? `\nMy Footing Check: ${footing.summary}` : "",
          ].filter((l, i) => l !== "" || i === 5);
          const subject = encodeURIComponent(`New enquiry from ${data.get("name")} — Take Root website`);
          location.href = `mailto:${form.dataset.email}?subject=${subject}&body=${encodeURIComponent(lines.join("\n"))}`;
        }
        wrap.classList.add("is-sent");
        wrap.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      } catch (err) {
        btnEl.disabled = false;
        alert("Sorry — something went wrong sending your message. Please email " + form.dataset.email + " directly.");
      }
    });
  }

  /* ---------- Article reading progress ---------- */
  const progress = $(".progress");
  const article = $(".article");
  if (progress && article) {
    const p = () => {
      const r = article.getBoundingClientRect();
      const total = r.height - innerHeight * 0.6;
      const v = Math.min(1, Math.max(0, -r.top / Math.max(total, 1)));
      progress.style.transform = `scaleX(${v})`;
    };
    addEventListener("scroll", p, { passive: true });
    p();
  }

  /* ---------- GSAP-powered motion ---------- */
  const initMotion = () => {
    const words = $$(".statement[data-words]");
    const tips = $$("#roots .tip");
    if (!hasGsap()) {
      words.forEach((el) => el.removeAttribute("data-words"));
      labels.forEach((l) => l.classList.add("is-on"));
      return;
    }
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);
    const fine = matchMedia("(pointer: fine)").matches;

    /* Smooth scrolling on desktop */
    if (fine && window.Lenis) {
      const lenis = new Lenis({ lerp: 0.105, smoothWheel: true, wheelMultiplier: 1 });
      window.__lenis = lenis;
      if (root.classList.contains("is-preloading")) { lenis.stop(); d.addEventListener("tr:loaded", () => lenis.start(), { once: true }); }
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      d.addEventListener("click", (e) => {
        const a = e.target.closest('a[href*="#"]');
        if (!a || a.hasAttribute("data-top")) return;
        const url = new URL(a.href, location.href);
        if (url.pathname !== location.pathname || !url.hash) return;
        const target = d.querySelector(url.hash);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -120 });
        history.replaceState(null, "", url.hash);
      });
    }

    /* Headlines: words rise out of a mask, line by line */
    const splitHeadline = (el) => {
      const walk = (node) => {
        Array.from(node.childNodes).forEach((n) => {
          if (n.nodeType === 3) {
            const frag = d.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((tok) => {
              if (!tok) return;
              if (/^\s+$/.test(tok)) { frag.appendChild(d.createTextNode(" ")); return; }
              const o = d.createElement("span"); o.className = "wr";
              const i = d.createElement("span"); i.className = "wi"; i.textContent = tok;
              o.appendChild(i); frag.appendChild(o);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1 && !n.classList.contains("wr")) walk(n);
        });
      };
      walk(el);
    };
    const heads = $$(".section .h2, .panel .h2, .footer .f-title, .big-q, .quote-strip blockquote, .qf-big, .stack-copy h3")
      .filter((el) => !el.closest(".hero, .phero, .t-track"));
    heads.forEach((el) => {
      el.removeAttribute("data-reveal");
      el.classList.add("is-in");
      splitHeadline(el);
      const words = $$(".wi", el);
      const tops = [];
      const delays = words.map((w) => {
        const top = Math.round(w.parentElement.offsetTop / 4);
        let line = tops.indexOf(top);
        if (line === -1) { tops.push(top); line = tops.length - 1; }
        return line;
      });
      const lineStart = {};
      const timing = words.map((w, k) => { const ln = delays[k]; lineStart[ln] = (lineStart[ln] ?? -1) + 1; return ln * 0.1 + lineStart[ln] * 0.03; });
      gsap.set(words, { yPercent: 150, rotate: 3 });
      ScrollTrigger.create({
        trigger: el, start: "top 88%", once: true,
        onEnter: () => words.forEach((w, k) => gsap.to(w, { yPercent: 0, rotate: 0, duration: 1.1, ease: "expo.out", delay: timing[k] })),
      });
    });

    /* Photos wipe into view */
    const wipes = $$(".post-card .media, .story-media .frame, .arch, .card--img, .feature, .stack-media");
    if ("IntersectionObserver" in window) {
      // A fully clipped element never reports as visible, so watch an unclipped stand-in
      const owner = new Map();
      const wio = new IntersectionObserver((entries) => entries.forEach((en) => {
        if (!en.isIntersecting) return;
        wio.unobserve(en.target);
        const el = owner.get(en.target);
        el.classList.add("is-wiped");
        setTimeout(() => { el.classList.remove("img-wipe", "is-wiped"); }, 1400);
      }), { rootMargin: "0px 0px -8% 0px", threshold: 0 });
      wipes.forEach((el) => {
        const probe = d.createElement("span");
        probe.setAttribute("aria-hidden", "true");
        probe.style.cssText = "position:absolute;left:0;right:0;top:0;height:40%;pointer-events:none;visibility:hidden";
        if (getComputedStyle(el.parentElement).position === "static") el.parentElement.style.position = "relative";
        el.parentElement.insertBefore(probe, el);
        const sync = () => { probe.style.top = el.offsetTop + "px"; probe.style.height = Math.max(40, el.offsetHeight * 0.4) + "px"; };
        sync(); addEventListener("resize", sync);
        owner.set(probe, el);
        el.classList.add("img-wipe");
        wio.observe(probe);
      });
    }

    /* Parallax inside large photos */
    $$(".arch img, .story-media .frame img, .feature > img").forEach((im) => {
      gsap.fromTo(im, { yPercent: -7, scale: 1.16 }, { yPercent: 7, scale: 1.16, ease: "none", scrollTrigger: { trigger: im.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });

    /* Crossing ribbons: opposite directions, faster with scroll speed */
    const rTracks = $$(".ribbon .marquee-track");
    if (rTracks.length) {
      const loops = rTracks.map((t, i) => {
        t.style.animation = "none";
        const lp = gsap.fromTo(t, { xPercent: i ? -50 : 0 }, { xPercent: i ? 0 : -50, ease: "none", duration: 38, repeat: -1 });
        lp.totalTime(38 * 200);
        return lp;
      });
      let dir = 1;
      ScrollTrigger.create({
        start: 0, end: "max",
        onUpdate: (self) => {
          dir = self.direction || dir;
          const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 240, 7);
          loops.forEach((lp) => gsap.to(lp, { timeScale: dir * boost, duration: 0.2, overwrite: true, onComplete: () => gsap.to(lp, { timeScale: dir, duration: 1.4, ease: "power2.out" }) }));
        },
      });
      gsap.fromTo(".ribbon", { yPercent: -50, rotate: -1.4 }, { yPercent: -50, rotate: -3.8, ease: "none", scrollTrigger: { trigger: ".ribbons", start: "top bottom", end: "bottom top", scrub: true } });
    }

    /* Testimonial stage: the section darkens as it arrives */
    const tst = $(".tstage");
    if (tst) {
      gsap.fromTo(tst,
        { "--ts-bg": "#f3ede1", "--ts-fg": "#1f150d", "--ts-muted": "rgba(31,21,13,0.6)", "--ts-line": "rgba(31,21,13,0.14)", "--ts-em": "#c94c19" },
        { "--ts-bg": "#1f150d", "--ts-fg": "#f7f1e6", "--ts-muted": "rgba(247,241,230,0.62)", "--ts-line": "rgba(247,241,230,0.16)", "--ts-em": "#f6a065", ease: "none",
          scrollTrigger: { trigger: tst, start: "top 85%", end: "top 30%", scrub: true } });
    }

    /* Hero card zooms out as you scroll away from it */
    const heroEl = $(".hero");
    if (heroEl) gsap.to(heroEl, { scale: 0.93, borderRadius: 48, ease: "none", scrollTrigger: { trigger: heroEl, start: "top top", end: "bottom top", scrub: true } });

    /* Cards tilt towards the mouse */
    if (fine) {
      $$(".bento > .card, .plan, .topic, .detail, .book-grid > .card, .quote-feature").forEach((el) => {
        el.addEventListener("pointerenter", () => { el.style.transition = "opacity .3s, box-shadow .6s"; });
        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
          gsap.to(el, { rotateY: x * 7, rotateX: -y * 7, transformPerspective: 1100, duration: 0.6, ease: "power3.out" });
        });
        el.addEventListener("pointerleave", () => gsap.to(el, { rotateY: 0, rotateX: 0, duration: 0.9, ease: "elastic.out(1, .5)" }));
      });
    }

    /* Footing Check header: the preview wheel keeps reshaping */
    const dw = $("[data-demo-wheel] .dw-shape");
    if (dw) {
      const pt = (i, v) => { const a = (-90 + 60 * i) * Math.PI / 180; return [200 + Math.cos(a) * 16 * v, 200 + Math.sin(a) * 16 * v]; };
      const state = { v: [6, 6, 6, 6, 6, 6] };
      const draw = () => dw.setAttribute("points", state.v.map((v, i) => pt(i, v).map((n) => n.toFixed(1)).join(",")).join(" "));
      const next = () => gsap.to(state.v, { endArray: state.v.map(() => 3 + Math.random() * 7), duration: 1.8, ease: "power3.inOut", onUpdate: draw, onComplete: () => gsap.delayedCall(0.6, next) });
      draw(); next();
    }

    /* Magnetic buttons + cursor (mouse only) */
    if (fine) {
      root.classList.add("has-magnet");
      $$(".btn, .t-btn, .socials a, .arrow-dot, .f-disc, .f-top").forEach((el) => {
        if (el.closest(".post-card, .card--img")) return;
        const ico = $(".ico", el);
        el.addEventListener("pointermove", (e) => {
          const r = el.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          gsap.to(el, { x: dx * 0.22, y: dy * 0.32, duration: 0.5, ease: "power3.out" });
          if (ico) gsap.to(ico, { x: dx * 0.12, y: dy * 0.12, duration: 0.5, ease: "power3.out" });
        });
        el.addEventListener("pointerleave", () => {
          gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, .45)" });
          if (ico) gsap.to(ico, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, .45)" });
        });
      });

      const cur = $(".cursor"), label = $(".cursor-label");
      if (cur) {
        $$(".card--img").forEach((el) => el.setAttribute("data-cursor", "View"));
        $$(".hero-card, .spin-badge").forEach((el) => el.setAttribute("data-cursor", "Book"));
        const tr = $("#t-track"); if (tr) tr.setAttribute("data-cursor", "Drag");
        const xTo = gsap.quickTo(cur, "x", { duration: 0.35, ease: "power3.out" });
        const yTo = gsap.quickTo(cur, "y", { duration: 0.35, ease: "power3.out" });
        addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; root.classList.add("has-cursor"); xTo(e.clientX); yTo(e.clientY); }, { passive: true });
        d.addEventListener("mouseleave", () => root.classList.remove("has-cursor"));
        d.addEventListener("pointerover", (e) => {
          const lab = e.target.closest("[data-cursor]");
          const link = e.target.closest("a, button, summary, label, [role=tab], input, textarea, select");
          cur.classList.toggle("is-label", !!lab);
          cur.classList.toggle("is-link", !lab && !!link);
          label.textContent = lab ? lab.getAttribute("data-cursor") : "";
        });
      }
    }

    // Statement words light up as you read
    words.forEach((el) => {
      gsap.to($$(".w", el), {
        opacity: 1, ease: "none", stagger: 0.12,
        scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 52%", scrub: 0.6 },
      });
    });

    // Hero parallax
    const heroMedia = $(".hero-media");
    if (heroMedia) {
      gsap.to(heroMedia, { yPercent: 9, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    }

    // Root system draws itself
    const stage = $("#roots");
    if (stage) {
      const draws = $$(".draw", stage);
      draws.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
      gsap.set(tips, { scale: 0, transformOrigin: "50% 50%" });
      const rootsPaths = $$(".root", stage);
      const hairsPaths = $$(".hair", stage);
      const tl = gsap.timeline({ defaults: { ease: "none" } });
      const marks = [];
      rootsPaths.forEach((p, i) => {
        tl.to(p, { strokeDashoffset: 0, duration: 1 }, i * 0.55);
        tl.to(tips[i], { scale: 1, duration: 0.25, ease: "back.out(2)" }, i * 0.55 + 0.9);
        marks.push(i * 0.55 + 0.95);
      });
      hairsPaths.forEach((p, i) => tl.to(p, { strokeDashoffset: 0, duration: 0.6 }, 0.6 + i * 0.25));
      const total = tl.duration();
      const desktop = matchMedia("(min-width: 1025px)").matches;
      ScrollTrigger.create({
        trigger: desktop ? ".roots-grid" : stage,
        start: desktop ? "top 65%" : "top 85%",
        end: desktop ? "bottom 85%" : "bottom 45%",
        scrub: 0.8,
        animation: tl,
        onUpdate: (self) => {
          const t = self.progress * total;
          labels.forEach((l, i) => l.classList.toggle("is-on", t >= marks[i]));
        },
      });
    }

    // Stacking process cards: earlier cards recede
    const cards = $$(".stack-card");
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      gsap.to(card, {
        scale: 0.94, "--dim": 0.38, ease: "none",
        scrollTrigger: { trigger: next, start: "top 78%", end: "top 22%", scrub: true },
      });
    });

    // Gentle parallax inside image cards
    $$("[data-parallax]").forEach((el) => {
      gsap.fromTo(el, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });

    /* Footer: opens out, rules draw, the disc spins in, links rise, photos follow the cursor */
    const footer = $(".footer");
    if (footer) {
      const radius = getComputedStyle(footer).borderTopLeftRadius || "28px";
      gsap.fromTo(footer, { clipPath: "inset(7% 3.5% 0% 3.5% round 72px)" }, {
        clipPath: `inset(0% 0% 0% 0% round ${radius})`, ease: "none",
        scrollTrigger: { trigger: footer, start: "top bottom", end: "top 35%", scrub: 0.6 },
      });
      const fRules = $$(".f-rule", footer);
      gsap.set(fRules, { "--ln": 0 });
      const ups = $$(".f-up", footer);
      const disc = $(".f-disc", footer);
      gsap.set(ups, { y: 36, opacity: 0 });
      if (disc) gsap.set(disc, { scale: 0.4, rotate: -120, opacity: 0 });
      ScrollTrigger.create({ trigger: ".f-hero", start: "top 82%", once: true, onEnter: () => {
        gsap.to(ups, { y: 0, opacity: 1, duration: 1, ease: "expo.out", stagger: 0.14, delay: 0.1 });
        if (disc) gsap.to(disc, { scale: 1, rotate: 0, opacity: 1, duration: 1.5, ease: "expo.out", delay: 0.25 });
        gsap.to(fRules[0], { "--ln": 1, duration: 1.4, ease: "expo.inOut", delay: 0.3 });
      } });
      const rowsEls = $$(".f-row", footer);
      const contactBits = $$(".f-contact > *", footer);
      gsap.set([...rowsEls, ...contactBits], { y: 30, opacity: 0 });
      ScrollTrigger.create({ trigger: ".f-main", start: "top 90%", once: true, onEnter: () => {
        gsap.to(rowsEls, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.06 });
        gsap.to(contactBits, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.08, delay: 0.15 });
        gsap.to(fRules[1] || {}, { "--ln": 1, duration: 1.4, ease: "expo.inOut", delay: 0.4 });
        rowsEls.forEach((r) => { const im = new Image(); im.src = r.dataset.img; });
      } });
      const prev = $(".f-preview", footer);
      const pimg = prev && $("img", prev);
      if (fine && prev) {
        gsap.set(prev, { xPercent: -50, yPercent: -50, scale: 0.6, opacity: 0 });
        const px = gsap.quickTo(prev, "x", { duration: 0.55, ease: "power3.out" });
        const py = gsap.quickTo(prev, "y", { duration: 0.55, ease: "power3.out" });
        let lastY = 0;
        // Keep the photo inside the link list (never over the bottom bar) and on screen
        const idx = $(".f-index", footer);
        const clampY = (y) => {
          const half = prev.offsetHeight / 2 + 20;   // room for the tilt
          const b = idx.getBoundingClientRect();
          const lo = Math.max(half, b.top + half), hi = Math.min(innerHeight - half, b.bottom - half);
          return hi < lo ? (lo + hi) / 2 : Math.min(hi, Math.max(lo, y));
        };
        // A clear column between the longest link name and the arrows, so the photo never covers any text
        const spot = () => {
          if (innerWidth <= 1024) return { ok: false };
          const textR = Math.max(...rowsEls.map((x) => { const t = $(".f-t", x); return x.getBoundingClientRect().left + t.offsetLeft + t.offsetWidth; })) + 30;
          const arrL = Math.min(...rowsEls.map((x) => $(".f-arr", x).getBoundingClientRect().left)) - 16;
          const w = prev.offsetWidth * 1.08;   // allow for the slight tilt
          return arrL - textR >= w ? { x: textR + (arrL - textR) / 2, zone: textR, ok: true } : { ok: false };
        };
        let showing = false, current = null;
        const hide = () => { if (!showing) return; showing = false; gsap.to(prev, { scale: 0.6, opacity: 0, duration: 0.3, ease: "power2.in", overwrite: "auto" }); };
        // The photo only shows while the pointer is on a link's number or name, not over the arrow side
        const update = (r, e) => {
          const s = spot();
          if (!s.ok || e.clientX > s.zone) { hide(); return; }
          const y = clampY(e.clientY);
          if (!showing || current !== r) {
            if (current !== r) pimg.src = r.dataset.img;
            current = r;
            if (!showing) gsap.set(prev, { x: s.x, y });
            showing = true;
            gsap.to(prev, { scale: 1, opacity: 1, duration: 0.45, ease: "power3.out", overwrite: "auto" });
          }
          px(s.x); py(y);
          const v = e.clientY - lastY; lastY = e.clientY;
          gsap.to(prev, { rotate: Math.max(-8, Math.min(8, v * 0.5)), duration: 0.4 });
        };
        rowsEls.forEach((r) => {
          r.addEventListener("pointerenter", (e) => update(r, e));
          r.addEventListener("pointermove", (e) => update(r, e));
          r.addEventListener("pointerleave", hide);
        });
      }
    }

    // Recalculate once images/fonts settle
    addEventListener("load", () => ScrollTrigger.refresh());
  };
  if (d.readyState === "complete" || d.readyState === "interactive") initMotion();
  else d.addEventListener("DOMContentLoaded", initMotion);
})();
