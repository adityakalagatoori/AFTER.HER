/* ==========================================================================
   AFTER HER — Script
   Dependency-free: boot sequence, HUD, parallax hero, reveal-on-scroll,
   constellation + case dossiers, legal-journey timeline, comparison slider,
   system diagram, nav, modals. Respects prefers-reduced-motion throughout.
   ========================================================================== */

(() => {
  "use strict";

  /* ---------------- -1. Clickjacking defense (fallback) ----------------
     GitHub Pages serves static files with no way to set response headers,
     so X-Frame-Options / CSP frame-ancestors (the real fix) cannot be
     enforced here at all. This JS fallback is strictly weaker: it only
     acts after this script has loaded and run, so a malicious page could
     still render this site inside an iframe and overlay deceptive content
     for a brief window before the redirect fires, or block it entirely by
     disabling JavaScript in the frame. It's a real but partial mitigation,
     not a guarantee — documented here rather than implied otherwise. */
  if (window.top !== window.self) {
    window.top.location = window.self.location.href;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;

  /* ---------------- 0. Boot sequence ---------------- */
  const bootSequence = document.getElementById("bootSequence");
  const bootLinesEl = document.getElementById("bootLines");
  const bootSkip = document.getElementById("bootSkip");
  const hud = document.getElementById("hud");

  const bootMessages = [
    "ARCHIVE SYSTEM — INITIALIZING",
    "VERIFYING SOURCED RECORDS",
    "ACCESS GRANTED"
  ];

  function finishBoot() {
    bootSequence.classList.add("is-hidden");
    hud.classList.add("is-visible");
    setTimeout(() => { bootSequence.hidden = true; }, 650);
  }

  if (prefersReducedMotion || !bootSequence) {
    if (bootSequence) bootSequence.hidden = true;
    hud.classList.add("is-visible");
  } else {
    let i = 0;
    function showNextLine() {
      if (i >= bootMessages.length) {
        setTimeout(finishBoot, 500);
        return;
      }
      const line = document.createElement("div");
      line.className = "boot-line";
      line.textContent = bootMessages[i];
      bootLinesEl.innerHTML = "";
      bootLinesEl.appendChild(line);
      i += 1;
      setTimeout(showNextLine, 700);
    }
    showNextLine();
    bootSkip.addEventListener("click", finishBoot);
  }

  /* ---------------- 1. Navigation: scroll background + mobile menu ---------------- */
  const nav = document.getElementById("siteNav");
  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");

  function updateNavBackground() {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  }
  updateNavBackground();
  window.addEventListener("scroll", updateNavBackground, { passive: true });

  function setMobileMenu(isOpen) {
    navLinks.classList.toggle("is-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    document.body.style.overflow = isOpen ? "hidden" : "";
  }

  navToggle.addEventListener("click", () => {
    setMobileMenu(!navLinks.classList.contains("is-open"));
  });

  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") setMobileMenu(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navLinks.classList.contains("is-open")) setMobileMenu(false);
  });

  /* ---------------- 2. Scroll progress bar ---------------- */
  const progressBar = document.getElementById("scrollProgress");
  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = pct + "%";
  }
  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);

  /* ---------------- 3. Reveal-on-scroll ---------------- */
  const revealEls = document.querySelectorAll(".reveal");
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("in-view"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ---------------- 4. Timeline node activation ---------------- */
  const timelineItems = document.querySelectorAll(".timeline-item");
  if ("IntersectionObserver" in window) {
    const timelineObserver = new IntersectionObserver(
      (entries) => entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("in-view");
      }),
      { threshold: 0.4 }
    );
    timelineItems.forEach((item) => timelineObserver.observe(item));
  } else {
    timelineItems.forEach((item) => item.classList.add("in-view"));
  }

  /* ---------------- 5. HUD section counter ---------------- */
  const sections = Array.from(document.querySelectorAll("main > section"));
  const hudSectionEl = document.getElementById("hudSection");
  const hudTotalEl = document.getElementById("hudTotal");
  if (hudTotalEl) hudTotalEl.textContent = String(sections.length).padStart(2, "0");

  if ("IntersectionObserver" in window && sections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = sections.indexOf(entry.target) + 1;
            if (idx > 0) hudSectionEl.textContent = String(idx).padStart(2, "0");
          }
        });
      },
      { threshold: 0.5 }
    );
    sections.forEach((s) => sectionObserver.observe(s));
  }

  /* ---------------- 5a2. Research trail ----------------
     Session-local only: a plain in-memory array, never written to
     localStorage/sessionStorage/cookies and never sent anywhere. Resets on
     reload by design — this is a "what have I looked at just now" aid, not
     a tracking feature. */
  const researchTrail = [];
  function logTrail(action) {
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    researchTrail.push({ time, action });
  }

  const trailToggle = document.getElementById("trailToggle");
  const trailModal = document.getElementById("trailModal");
  const trailList = document.getElementById("trailList");
  const trailEmpty = document.getElementById("trailEmpty");
  const trailClear = document.getElementById("trailClear");

  function renderTrail() {
    if (!trailList) return;
    trailList.innerHTML = researchTrail.map((entry) =>
      `<li><span class="trail-time">${entry.time}</span><span>${entry.action}</span></li>`
    ).join("");
    if (trailEmpty) trailEmpty.classList.toggle("is-hidden", researchTrail.length > 0);
  }

  if (trailToggle && trailModal) {
    trailToggle.addEventListener("click", () => {
      renderTrail();
      openOverlay(trailModal);
    });
  }
  if (trailClear) {
    trailClear.addEventListener("click", () => {
      researchTrail.length = 0;
      renderTrail();
    });
  }

  /* ---------------- 5b. Moving breadcrumb ----------------
     ARCHIVE normally; ARCHIVE / AH-00X with the amber active-marker moved
     onto the case segment once a file is open. Reset on close. */
  const hudCrumbArchive = document.getElementById("hudCrumbArchive");
  const hudCrumbSep = document.getElementById("hudCrumbSep");
  const hudCrumbCase = document.getElementById("hudCrumbCase");

  function setBreadcrumb(caseCode) {
    if (!hudCrumbArchive) return;
    if (caseCode) {
      hudCrumbArchive.classList.remove("is-active");
      hudCrumbSep.hidden = false;
      hudCrumbCase.hidden = false;
      hudCrumbCase.textContent = caseCode;
      hudCrumbCase.classList.add("is-active");
    } else {
      hudCrumbArchive.classList.add("is-active");
      hudCrumbSep.hidden = true;
      hudCrumbCase.hidden = true;
      hudCrumbCase.classList.remove("is-active");
    }
  }

  /* ---------------- 6. Hero — Archive Room (GSAP) ----------------
     Entrance timeline + pointer depth + scroll transition. Emotional
     target: gravity and stillness, not suspense — slow, non-elastic
     easing throughout, no flicker/pulse on the light source.
     Falls back to a plain CSS-visible state if GSAP fails to load (no
     network, CDN blocked, etc.) or under reduced motion. */
  const hasGsap = typeof window.gsap !== "undefined";
  const heroArchive = document.getElementById("heroArchive");

  if (heroArchive) {
    const haArchitecture = document.getElementById("haArchitecture");
    const haShelving = document.getElementById("haShelving");
    const haFolder = document.getElementById("haFolder");
    const haDocument = document.getElementById("haDocument");
    const haLight = document.getElementById("haLight");
    const heroLabel = document.getElementById("heroLabel");
    const heroTitleEl = document.getElementById("heroTitle");
    const heroSub = document.getElementById("heroSub");
    const heroScrollCue = document.getElementById("heroScrollCue");

    if (!hasGsap) {
      // No animation library available — show everything immediately
      // rather than leaving the hero blank.
      [haArchitecture, haShelving, haFolder, haDocument, haLight].forEach((el) => {
        if (el) el.style.opacity = el === haLight ? "1" : "1";
      });
    } else if (prefersReducedMotion) {
      gsap.set([haArchitecture, haShelving], { opacity: 1 });
      gsap.set(haFolder, { opacity: 1, transform: "none" });
      gsap.set(haDocument, { opacity: 0.5, transform: "none" });
      gsap.set(haLight, { opacity: 1 });
    } else {
      // Named timeline: heroIntro -> environmentReveal -> materialReveal ->
      // titleResolve -> archiveEntry. Slow, decelerating, no overshoot.
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.addLabel("heroIntro")
        .to(haArchitecture, { opacity: 1, duration: 1.1 }, "heroIntro")
        .addLabel("environmentReveal", "heroIntro+=0.5")
        .to(haShelving, { opacity: 1, duration: 1.0 }, "environmentReveal")
        .to(haLight, { opacity: 1, duration: 1.2 }, "environmentReveal+=0.2")
        .addLabel("materialReveal", "environmentReveal+=0.4")
        .to(haFolder, { opacity: 1, y: 0, rotate: -2, duration: 0.9 }, "materialReveal")
        .to(haDocument, { opacity: 0.5, y: 0, duration: 0.9 }, "materialReveal+=0.15")
        .addLabel("titleResolve", "materialReveal+=0.3")
        .to(heroLabel, { opacity: 1, y: 0, duration: 0.7 }, "titleResolve")
        .to(heroTitleEl.querySelectorAll(".line-1, .line-2"), { opacity: 1, y: 0, duration: 0.9, stagger: 0.15 }, "titleResolve+=0.2")
        .to(heroSub, { opacity: 1, y: 0, duration: 0.8 }, "titleResolve+=0.5")
        .addLabel("archiveEntry", "titleResolve+=0.9")
        .to(heroScrollCue, { opacity: 1, duration: 0.6 }, "archiveEntry");
    }

    // Pointer parallax — intentionally tiny displacements (per the
    // approved brief): background ~1-2px, shelving ~2-3px, folder ~4-6px,
    // document ~6-9px, light ~8-12px. The light also drifts a fraction
    // toward the pointer, never a flashlight/spotlight effect.
    if (hasGsap && !prefersReducedMotion && !isTouch) {
      const moveArch = gsap.quickTo(haArchitecture, "x", { duration: 0.8, ease: "power2.out" });
      const moveShelf = gsap.quickTo(haShelving, "x", { duration: 0.7, ease: "power2.out" });
      const moveFolderX = gsap.quickTo(haFolder, "x", { duration: 0.6, ease: "power2.out" });
      const moveFolderY = gsap.quickTo(haFolder, "y", { duration: 0.6, ease: "power2.out" });
      const moveDocX = gsap.quickTo(haDocument, "x", { duration: 0.5, ease: "power2.out" });
      const moveLightX = gsap.quickTo(haLight, "x", { duration: 1.0, ease: "power2.out" });
      const moveLightY = gsap.quickTo(haLight, "y", { duration: 1.0, ease: "power2.out" });

      heroArchive.addEventListener("mousemove", (e) => {
        const rect = heroArchive.getBoundingClientRect();
        const xPct = (e.clientX - rect.left) / rect.width - 0.5;
        const yPct = (e.clientY - rect.top) / rect.height - 0.5;
        moveArch(xPct * 2);
        moveShelf(xPct * 3);
        moveFolderX(xPct * 6);
        moveFolderY(yPct * 4);
        moveDocX(xPct * -9);
        moveLightX(xPct * 12);
        moveLightY(yPct * 10);
      });
    }

    // Scroll transition: the archive room softly recedes (not a hard cut)
    // as the user scrolls into the archive proper.
    if (hasGsap && !prefersReducedMotion && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.to(heroArchive, {
        opacity: 0.15,
        scale: 1.05,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true
        }
      });

      // E1.1 — scroll-as-camera, continued: the constellation is the next
      // "focal plane" the camera arrives at after the hero recedes. It
      // starts slightly receded itself (scaled down, dimmed) and settles to
      // full prominence as it's scrolled into view — the same scrub
      // technique as the hero recede above, extended to the next object in
      // the sequence, not a separate animation system. The filter bar
      // settles a beat behind it (shorter travel, slight delay via its own
      // start offset) so the two don't arrive as one flat block.
      const constellationSection = document.getElementById("stories");
      const constellationElForScroll = document.getElementById("constellation");
      const filtersEl = document.querySelector(".constellation-filters");
      if (constellationSection && constellationElForScroll) {
        gsap.fromTo(constellationElForScroll,
          { scale: 0.94, opacity: 0.55, y: 24 },
          {
            scale: 1, opacity: 1, y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: constellationSection,
              start: "top 85%",
              end: "top 35%",
              scrub: true
            }
          }
        );
      }
      if (constellationSection && filtersEl) {
        gsap.fromTo(filtersEl,
          { opacity: 0.4, y: 14 },
          {
            opacity: 1, y: 0,
            ease: "none",
            scrollTrigger: {
              trigger: constellationSection,
              start: "top 90%",
              end: "top 55%",
              scrub: true
            }
          }
        );
      }
    }
  }

  /* ---------------- 6a2. Timeline — scroll-scrubbed progress line ----------------
     "Time as space": the amber line fills in step with scroll position
     across the standalone Timeline section, rather than appearing all at
     once. The existing IntersectionObserver-driven node reveal (section 4,
     above) is untouched — this just adds the connecting line's motion on
     top of it. Skipped entirely under reduced motion or without GSAP; the
     static border-left (always present) carries the full meaning either
     way. */
  const timelineProgressFill = document.getElementById("timelineProgressFill");
  if (timelineProgressFill && hasGsap && !prefersReducedMotion) {
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    if (window.ScrollTrigger) {
      gsap.to(timelineProgressFill, {
        height: "100%",
        ease: "none",
        scrollTrigger: {
          trigger: "#timeline",
          start: "top 70%",
          end: "bottom 60%",
          scrub: true
        }
      });
    }
  }

  /* ---------------- 6b. Investigation cursor ----------------
     A small text-label follower that names what the pointer is currently
     over, using [data-cursor] attributes already placed on case points,
     photographs, sources, and close controls. Desktop-only; the media
     query in CSS also hard-disables it for touch/reduced-motion, this JS
     guard is the second layer so no listener work happens needlessly. */
  const investigationCursor = document.getElementById("investigationCursor");
  const investigationCursorLabel = document.getElementById("investigationCursorLabel");

  if (investigationCursor && !isTouch && !prefersReducedMotion) {
    let cursorX = 0;
    let cursorY = 0;
    const moveCursor = hasGsap
      ? gsap.quickTo(investigationCursor, "x", { duration: 0.15, ease: "power2.out" })
      : null;
    const moveCursorY = hasGsap
      ? gsap.quickTo(investigationCursor, "y", { duration: 0.15, ease: "power2.out" })
      : null;

    document.addEventListener("mousemove", (e) => {
      cursorX = e.clientX;
      cursorY = e.clientY;
      if (hasGsap) {
        moveCursor(cursorX);
        moveCursorY(cursorY);
      } else {
        investigationCursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`;
      }

      const target = e.target.closest("[data-cursor]");
      if (target) {
        investigationCursorLabel.textContent = target.getAttribute("data-cursor");
        investigationCursor.classList.add("is-visible");
      } else {
        investigationCursor.classList.remove("is-visible");
      }
    });

    document.addEventListener("mouseleave", () => {
      investigationCursor.classList.remove("is-visible");
    });
  }

  /* ---------------- 7. Layer card expansion ---------------- */
  document.querySelectorAll(".layer-card").forEach((card) => {
    card.addEventListener("click", () => {
      card.setAttribute("aria-expanded", String(card.getAttribute("aria-expanded") !== "true"));
    });
  });

  /* ---------------- 8. Category panels (Day After) ---------------- */
  const categoryButtons = document.querySelectorAll(".category-btn");
  categoryButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(btn.getAttribute("aria-controls"));
      const isPressed = btn.getAttribute("aria-pressed") === "true";
      categoryButtons.forEach((otherBtn) => {
        if (otherBtn !== btn) {
          otherBtn.setAttribute("aria-pressed", "false");
          const otherPanel = document.getElementById(otherBtn.getAttribute("aria-controls"));
          if (otherPanel) otherPanel.classList.remove("is-open");
        }
      });
      btn.setAttribute("aria-pressed", String(!isPressed));
      panel.classList.toggle("is-open", !isPressed);
    });
  });

  /* ---------------- 9. Generic overlay system (modals + dossier) ---------------- */
  let lastFocusedEl = null;

  function openOverlay(overlay) {
    lastFocusedEl = document.activeElement;
    overlay.hidden = false;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
    document.body.style.overflow = "hidden";
    const closeBtn = overlay.querySelector("[data-close]");
    if (closeBtn) closeBtn.focus();
    document.addEventListener("keydown", onOverlayKeydown);
  }

  function closeOverlay(overlay) {
    overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onOverlayKeydown);
    setTimeout(() => { overlay.hidden = true; }, prefersReducedMotion ? 0 : 300);
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  function onOverlayKeydown(e) {
    if (e.key !== "Escape") return;
    const openModal = document.querySelector(".modal-overlay.is-open");
    if (openModal) { closeOverlay(openModal); return; }
    // Layered return: closing the source sheet first, not the whole case —
    // the user should land back exactly where they were, not be ejected
    // from the document entirely.
    if (typeof sourceSheetOpen !== "undefined" && sourceSheetOpen) { closeSourceSheet(); return; }
    if (!dossierOverlay.hidden) closeCaseDossier();
  }

  // Plain modals use the simple generic close. The dossier overlay is wired
  // separately, below, once it's declared — it closes through the reverse
  // case-opening sequence instead of the generic fade.
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay(overlay);
    });
    overlay.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => closeOverlay(overlay));
    });
  });

  /* ---------------- 10. Case dossiers ----------------
     Every fact below is drawn directly from the cited sources. No quote,
     date, document or outcome here is invented; where a milestone date is
     not reliably established by those sources, the legal-journey node says
     so explicitly instead of estimating one. */
  const caseData = {
    mathura: {
      code: "AH-001",
      title: "Mathura — Tukaram v. State of Maharashtra",
      meta: ["Maharashtra", "1972–1983", "Status: Acquitted at final appeal"],
      protected: true,
      figure: {
        src: "assets/bombay-high-court.jpg",
        alt: "Exterior of the Bombay High Court building, Mumbai, viewed across the public Oval Maidan",
        caption: "The Bombay High Court, Mumbai — heard this case on appeal before the Supreme Court's final 1979 ruling.",
        source: "Photo: A.Savin, via Wikimedia Commons (Free Art License), 2016. A present-day photograph of the building, not of the 1970s proceedings."
      },
      before: "Indian law protects the identity of a survivor by design, and this archive does not try to reconstruct one. What's publicly documented is limited to her status in the case record: a 16-year-old from a Dalit community in rural Maharashtra.",
      incident: "On the night of March 26, 1972, Mathura was allegedly raped by two police constables inside the compound of Desaiganj police station in what is now Gadchiroli district, after she and family members had been brought in for questioning.",
      legalJourney: [
        { date: "1972", status: "Sessions Court", body: "Acquitted both accused policemen." },
        { date: "Unverified", status: "Bombay High Court — Appeal", body: "Convicted both men on appeal; exact 1970s hearing date not independently confirmed by the sources used here.", unverified: true },
        { date: "1979", status: "Supreme Court", body: "Reversed the High Court and acquitted both men, holding that the absence of injuries and her lack of resistance amounted to implied consent." }
      ],
      aftermathText: "The judgment drew sustained criticism from legal scholars and a national campaign by women's groups. It led directly to the Criminal Law (Amendment) Act, 1983: a reversed burden of proof in custodial rape cases (Evidence Act, s.114A), mandatory in-camera trials, and a statutory ban on publishing a survivor's identity — the direct ancestor of the law that makes most of this archive's other case files anonymous by default.",
      remains: "No retrial followed the 1983 reform; the acquittal stands as the final legal outcome. The case is remembered almost entirely for the law it produced, not for any resolution it reached for Mathura herself.",
      sources: [
        { label: "iPleaders — case history & legal aftermath", url: "https://blog.ipleaders.in/journey-mathura-nirbhaya-rape-laws-india/", supports: ["aftermath", "remains"] },
        { label: "LawFoyer — Tukaram v. State of Maharashtra case brief", url: "https://lawfoyer.in/tukaram-and-anr-vs-state-of-maharashtra/", supports: ["incident", "legalJourney"] }
      ]
    },
    bhanwari: {
      code: "AH-002",
      title: "Bhanwari Devi — Vishaka & Ors v. State of Rajasthan",
      meta: ["Rajasthan", "1992–1997", "Status: Acquitted at trial; guidelines issued"],
      protected: false,
      figure: {
        src: "assets/rajasthan-high-court.jpg",
        alt: "Aerial exterior view of the Rajasthan High Court building, Jodhpur",
        caption: "The Rajasthan High Court, Jodhpur — institutional reference for the state court system her case moved through.",
        source: "Photo: TrendSPLEND, via Wikimedia Commons (CC BY-SA 4.0), 2020. This building was completed in 2019 and postdates the 1992 case — shown as a present-day institutional reference, not a contemporaneous image."
      },
      before: "Bhanwari Devi is a rare exception in this archive: a survivor who has spoken publicly under her own name as an activist. Before 1992, she worked as a saathin — a village-level social worker in a Rajasthan state program — campaigning against child marriage.",
      incident: "In 1992, Bhanwari Devi was gang-raped by a group of men after she attempted to stop the marriage of an infant girl in her village, in apparent retaliation for that work.",
      legalJourney: [
        { date: "1992", status: "Incident & Investigation", body: "Case registered; investigation proceeded amid local resistance to her activism." },
        { date: "Unverified", status: "Trial Court", body: "Acquitted the accused, citing insufficient evidence; exact verdict date not confirmed by the sources used here.", unverified: true },
        { date: "Aug 13, 1997", status: "Supreme Court", body: "Ruled on Vishaka & Ors v. State of Rajasthan, a PIL brought by women's groups in response to the case, not a retrial of it." }
      ],
      aftermathText: "The Supreme Court used the case to issue the Vishaka Guidelines — India's first binding legal framework addressing sexual harassment in the workplace, applying to every public and private institution until superseded by the PoSH Act, 2013.",
      remains: "The criminal case against her attackers ended in acquittal; it was never reopened. The Vishaka Guidelines remain her case's most visible legacy, built from a prosecution that itself failed.",
      sources: [
        { label: "iPleaders — Vishaka v. State of Rajasthan case brief", url: "https://blog.ipleaders.in/vishaka-ors-vs-state-of-rajasthan-ors-1997/", supports: ["legalJourney", "aftermath"] },
        { label: "Sabrang India — full Supreme Court judgment text", url: "https://sabrangindia.in/document/supreme-court-india-judgement-vishakha-pil-enforce-fundamental-rights-working-women", supports: ["legalJourney"] }
      ]
    },
    nirbhaya: {
      code: "AH-003",
      title: "“Nirbhaya” — 2012 Delhi Gang Rape Case",
      meta: ["Delhi", "2012–2020", "Status: Convicted; sentence carried out"],
      protected: true,
      figure: {
        src: "assets/supreme-court-of-india.jpg",
        alt: "Exterior entrance of the Supreme Court of India building in New Delhi",
        caption: "The Supreme Court of India, New Delhi — the court that upheld the death sentences in this case in 2017.",
        source: "Photo: Pinakpani, via Wikimedia Commons (CC BY-SA 4.0), 2017. A present-day photograph of the institution, not of the 2017 proceedings themselves."
      },
      before: "Survivor identity is legally protected here as elsewhere in this archive; she is publicly known only by the media-given name “Nirbhaya” (“fearless”). What is documented is her occupation at the time: a 23-year-old physiotherapy student in Delhi.",
      incident: "On December 16, 2012, she was gang-raped and fatally assaulted by six men on a moving private bus, then thrown from the vehicle along with her companion. She died of her injuries on December 29, 2012.",
      legalJourney: [
        { date: "Dec 18, 2012", status: "Arrests", body: "Police identified and arrested the bus driver and several co-accused within days; the sixth was arrested in Bihar." },
        { date: "2013", status: "Trial Court", body: "Four adult defendants convicted and sentenced to death; a juvenile co-accused was tried separately under the Juvenile Justice Act." },
        { date: "2017", status: "Supreme Court", body: "Upheld the death sentences for all four adult convicts." },
        { date: "2020", status: "Execution", body: "The sentences were carried out. The juvenile had already completed a three-year term in a reform facility, the maximum available under the JJ Act." }
      ],
      aftermathText: "The case triggered sustained nationwide protest and directly produced the Criminal Law (Amendment) Act, 2013: a broadened legal definition of sexual assault, new offenses (stalking, voyeurism, disrobing), and significantly longer minimum sentences for gang rape — reforms still in force today.",
      remains: "Unlike most cases in this archive, this one reached a definitive legal end: conviction, appeal, and execution. What remains open is the much larger question the comparison below addresses directly — why this case produced sustained national memory and legislative change where others, including Hathras, did not.",
      sources: [
        { label: "The Wire — case timeline", url: "https://cms.thewire.in/law/2012-delhi-rape-case", supports: ["incident", "legalJourney"] },
        { label: "LawFullLegal — Mukesh & Anr v. State for NCT of Delhi (2017)", url: "https://lawfullegal.in/mukesh-anr-vs-state-for-nct-of-delhi-ors-2017nirbhaya-case-law/", supports: ["legalJourney"] }
      ]
    },
    kathua: {
      code: "AH-004",
      title: "The Kathua Case",
      meta: ["Jammu & Kashmir", "2018–2019", "Status: 6 convicted, 1 acquitted"],
      protected: true,
      figure: {
        src: "assets/punjab-haryana-high-court.jpg",
        alt: "Exterior of the Punjab and Haryana High Court building in Chandigarh",
        caption: "The Punjab & Haryana High Court, Chandigarh — the jurisdiction covering Pathankot, where the Supreme Court ordered this trial moved and held in camera.",
        source: "Photo: Harvinder Chandigarh, via Wikimedia Commons (CC BY-SA 4.0), 2017."
      },
      before: "The victim was an 8-year-old girl from a nomadic Muslim community in the Kathua district of Jammu. No further personal detail about her is reproduced here.",
      incident: "In January 2018, she was abducted, drugged, held captive inside a temple, and sexually assaulted over several days before being murdered.",
      legalJourney: [
        { date: "2018", status: "Investigation & Charges", body: "Eight people were charged, including a former government official, police officers, and a juvenile." },
        { date: "May 31, 2018", status: "Trial Begins", body: "Communal tension in Jammu led the Supreme Court to move the trial to Pathankot, Punjab, and to hold it in camera." },
        { date: "Jun 10, 2019", status: "Verdict", body: "After roughly 240 hearings and 114 prosecution witnesses, the court convicted six defendants — three to life imprisonment, three to five-year terms — and acquitted one for lack of evidence." }
      ],
      aftermathText: "The case drew significant national attention and renewed debate over fast-track trials for crimes against children, and over communal politicization of sexual violence cases.",
      remains: "The verdict stands as delivered; this archive has not identified a subsequent appeal outcome from the sources consulted. One of the eight originally charged was acquitted.",
      sources: [
        { label: "The News Minute — verdict report", url: "https://www.thenewsminute.com/news/kathua-gang-rape-and-murder-8-year-old-6-accused-found-guilty-103341", supports: ["legalJourney"] },
        { label: "Newslaundry — verdict details", url: "https://www.newslaundry.com/amp/story/2019%2F06%2F10%2Fkathuaverdict-six-found-guilty-of-gangrape-murder-of-8-year-old-child", supports: ["legalJourney", "aftermath"] }
      ]
    },
    hathras: {
      code: "AH-005",
      title: "The Hathras Case",
      meta: ["Uttar Pradesh", "2020–2023", "Status: No rape conviction"],
      protected: true,
      figure: {
        src: "assets/allahabad-high-court.jpg",
        alt: "Elevated exterior view of the Allahabad High Court building and grounds",
        caption: "The Allahabad High Court — Uttar Pradesh's High Court, whose jurisdiction the case moved through.",
        source: "Photo: Vroomtrapit, via Wikimedia Commons (CC0 public domain), 2009."
      },
      before: "The victim was a 19-year-old Dalit woman from Hathras district, Uttar Pradesh. No further personal detail about her is reproduced here.",
      incident: "On September 14, 2020, she was assaulted in a field in Hathras district and died of her injuries on September 29, 2020, at Delhi's Safdarjung Hospital.",
      legalJourney: [
        { date: "Sep 30, 2020", status: "Cremation Controversy", body: "Her body was cremated by Uttar Pradesh police late that night without her family present, drawing national condemnation and accusations of an evidence cover-up." },
        { date: "Oct 2020", status: "Supreme Court", body: "Heard petitions seeking a court-monitored probe and a trial transferred to Delhi." },
        { date: "Mar 2, 2023", status: "Trial Court Verdict", body: "Of four accused, three were acquitted for lack of evidence. The fourth, Sandeep, was convicted only of culpable homicide not amounting to murder (IPC s.304) and under the SC/ST Prevention of Atrocities Act, 1989, and sentenced to life imprisonment. No one was convicted of rape." }
      ],
      aftermathText: "Legal commentators have documented the case as an example of institutional failure — in the initial police response, the handling of evidence, and the disputed cremation — rather than as a case that reached a clear resolution.",
      remains: "No one was held legally responsible for rape in this case. National attention, intense in September 2020, had receded well before the 2023 verdict — the comparison this archive draws directly below.",
      sources: [
        { label: "The Kashmir Walla — verdict report", url: "https://thekashmirwalla.com/hathras-gangrape-murder-case-3-acquitted-1-convicted-by-up-court/", supports: ["incident", "legalJourney"] },
        { label: "JURIST — commentary on institutional failure", url: "https://www.jurist.org/commentary/2023/03/yadav-gaur-hathras-case-institutional-failure", supports: ["aftermath", "remains"] }
      ]
    },
    bilkis: {
      code: "AH-006",
      title: "Bilkis Bano v. Union of India",
      meta: ["Gujarat", "2002–2024", "Status: Convictions stand; remission quashed"],
      protected: false,
      figure: {
        src: "assets/gujarat-high-court.jpg",
        alt: "Exterior of the Gujarat High Court building, including a Gandhi statue in the forecourt",
        caption: "The Gujarat High Court, Ahmedabad — institutionally relevant, though the trial itself was moved to Maharashtra.",
        source: "Photo: Yash Y. Vadiwala, via Wikimedia Commons (CC BY-SA 3.0), 2012."
      },
      before: "Bilkis Bano, like Bhanwari Devi, has spoken publicly under her own name throughout her case. At the time of the attack she was five months pregnant.",
      incident: "During the 2002 Gujarat riots, Bilkis Bano was gang-raped while fleeing communal violence that followed the Godhra train-burning incident. Seven members of her family, including her three-year-old daughter, were murdered.",
      legalJourney: [
        { date: "2002", status: "Incident", body: "The attack and killings occurred amid widespread communal violence across Gujarat." },
        { date: "Unverified", status: "Trial & Conviction", body: "Eleven men were ultimately convicted and sentenced to life imprisonment; exact trial-court date not confirmed by the sources used here.", unverified: true },
        { date: "Aug 15, 2022", status: "Gujarat Government Remission", body: "All eleven convicts were granted early remission by the Gujarat state government and released on India's Independence Day." },
        { date: "Jan 2024", status: "Supreme Court", body: "Quashed the Gujarat government's remission order, ruling that Gujarat lacked the jurisdiction to grant it — the trial having been moved to Maharashtra." }
      ],
      aftermathText: "The remission and its reversal became a national flashpoint over whether convicted perpetrators of mass communal sexual violence could be quietly released, independent of the original verdict's severity.",
      remains: "The original convictions stand. As of the Supreme Court's 2024 ruling, the convicts were ordered back into custody; this archive has not independently verified their current custodial status beyond that ruling.",
      sources: [
        { label: "Scroll.in — convicts' release report", url: "https://scroll.in/latest/1062500/bilkis-bano-case-11-convicts-surrender-at-godhra-sub-jail", supports: ["legalJourney"] },
        { label: "Onmanorama — case summary and SC ruling", url: "https://onmanorama.com/news/india/2024/01/09/bilkis-bano-supreme-court-early-remission-convicts-gujarat-riots-gang-rape-murder-case.html", supports: ["legalJourney", "aftermath"] }
      ]
    }
  };

  const dossierOverlay = document.getElementById("dossierOverlay");
  const dossierCode = document.getElementById("dossierCode");
  const dossierTitle = document.getElementById("dossierTitle");
  const dossierMeta = document.getElementById("dossierMeta");
  const dossierBody = document.getElementById("dossierBody");

  // `compareGroup` names the <input name="..."> group for this render's
  // checkboxes so two different legal-journey instances on the same page
  // (narrative view vs. evidence view) never cross-select each other.
  function renderLegalJourney(nodes, compareGroup) {
    return (
      '<div class="legal-journey">' +
      nodes.map((n, i) => `
        <div class="legal-node">
          ${compareGroup ? `
            <label class="legal-node-compare" data-cursor="Compare">
              <input type="checkbox" class="compare-check" data-compare-group="${compareGroup}" data-compare-index="${i}">
              <span>Compare</span>
            </label>
          ` : ""}
          <span class="legal-node-date${n.unverified ? " unverified" : ""}">${n.date}</span>
          <div class="legal-node-body">
            <strong>${n.status}</strong>
            ${n.body}
          </div>
        </div>
      `).join("") +
      "</div>" +
      (compareGroup ? `<div class="compare-panel" id="comparePanel-${compareGroup}"></div>` : "")
    );
  }

  /* ---------------- 10d. Source Sheet / Source Room ----------------
     Replaces plain outbound links with a two-step reveal: pin -> sheet with
     what we actually know about the source -> explicit "Open Original"
     click to leave the site. Only fields present in the existing
     {label, url} source data are shown — the "label" string already
     carries "Publisher — description" (set when each case was researched),
     split here for display, not invented. No date/claim field is shown
     unless it already exists in the data, since fabricating one would
     violate the project's sourcing standard. */
  function renderSourcesList(sources) {
    return `
      <div class="dossier-sources">
        <p>Sources</p>
        <ul>
          ${sources.map((s, i) => `
            <li>
              <button class="source-link" data-cursor="Source" data-source-index="${i}" type="button">
                ${s.label}
              </button>
            </li>
          `).join("")}
        </ul>
      </div>
    `;
  }

  const sourceSheet = document.getElementById("sourceSheet");
  const sourceSheetType = document.getElementById("sourceSheetType");
  const sourceSheetPublisher = document.getElementById("sourceSheetPublisher");
  const sourceSheetTitle = document.getElementById("sourceSheetTitle");
  const sourceSheetContext = document.getElementById("sourceSheetContext");
  const sourceSheetLink = document.getElementById("sourceSheetLink");
  let sourceSheetOpen = false;

  const chapterLabels = {
    before: "Before",
    incident: "What Happened",
    legalJourney: "The Legal Journey",
    aftermath: "Aftermath",
    remains: "What Remains"
  };

  function openSourceSheet(source) {
    const parts = source.label.split(" — ");
    const publisher = parts.length > 1 ? parts[0] : "Source";
    const title = parts.length > 1 ? parts.slice(1).join(" — ") : parts[0];
    sourceSheetType.textContent = /court|judgment|supreme|high court/i.test(source.label) ? "Primary Source — Court Record" : "Named Reporting";
    sourceSheetPublisher.textContent = publisher;
    sourceSheetTitle.textContent = title;
    // Cross-reference: which chapters this specific source actually grounds,
    // from the `supports` tags set when the case was researched — not
    // inferred or guessed here.
    const supports = (source.supports || []).map((key) => chapterLabels[key] || key);
    sourceSheetContext.textContent = supports.length
      ? `Supports: ${supports.join(", ")}.`
      : "Cited in this case file.";
    sourceSheetLink.href = source.url;
    sourceSheet.classList.add("is-open");
    sourceSheet.setAttribute("aria-hidden", "false");
    sourceSheetOpen = true;
    logTrail(`Source opened — ${publisher}`);
  }

  function closeSourceSheet() {
    sourceSheet.classList.remove("is-open");
    sourceSheet.setAttribute("aria-hidden", "true");
    sourceSheetOpen = false;
  }

  // Event delegation: source-link buttons are re-created every time a
  // chapter/evidence view renders, so the listener lives on the stable
  // dossierBody container instead of being re-attached per render.
  dossierBody.addEventListener("click", (e) => {
    if (!currentCaseId) return;
    const data = caseData[currentCaseId];
    const sourceBtn = e.target.closest(".source-link");
    if (sourceBtn) {
      const source = data.sources[Number(sourceBtn.getAttribute("data-source-index"))];
      if (source) openSourceSheet(source);
      return;
    }
    const traceBtn = e.target.closest(".trace-btn");
    if (traceBtn) {
      const source = data.sources[Number(traceBtn.getAttribute("data-trace-index"))];
      if (source) openSourceSheet(source);
      return;
    }
    const figure = e.target.closest(".case-figure");
    if (figure && data.figure) openPhotoInspect(data);
  });

  function openPhotoInspect(data) {
    const photoInspect = document.getElementById("photoInspect");
    const photoInspectImage = document.getElementById("photoInspectImage");
    const photoInspectCaption = document.getElementById("photoInspectCaption");
    photoInspectImage.src = data.figure.src;
    photoInspectImage.alt = data.figure.alt;
    photoInspectCaption.innerHTML = `${data.figure.caption}<br><span class="cap-source">${data.figure.source}</span>`;
    openOverlay(photoInspect);
    logTrail(`Examined photograph — ${data.code}`);
  }

  dossierBody.addEventListener("keydown", (e) => {
    if ((e.key !== "Enter" && e.key !== " ") || !currentCaseId) return;
    const figure = e.target.closest(".case-figure");
    if (!figure) return;
    e.preventDefault();
    const data = caseData[currentCaseId];
    if (data.figure) openPhotoInspect(data);
  });

  /* ---------------- 10e-1. Command Palette ----------------
     "/" opens it, unless focus is already in a text input (so typing a
     literal "/" into search still works). Arrow keys move a highlight,
     Enter runs the highlighted command, Escape closes. */
  const commandPalette = document.getElementById("commandPalette");
  const commandList = document.getElementById("commandList");
  let commandHighlight = 0;

  function paletteItems() {
    return Array.from(commandList.querySelectorAll(".command-item"));
  }

  function highlightCommand(i) {
    const items = paletteItems();
    items.forEach((el) => el.classList.remove("is-highlighted"));
    commandHighlight = (i + items.length) % items.length;
    items[commandHighlight].classList.add("is-highlighted");
  }

  function openPalette() {
    commandPalette.classList.add("is-open");
    commandPalette.setAttribute("aria-hidden", "false");
    highlightCommand(0);
  }
  function closePalette() {
    commandPalette.classList.remove("is-open");
    commandPalette.setAttribute("aria-hidden", "true");
  }

  function runCommand(cmd) {
    closePalette();
    switch (cmd) {
      case "search": openSearch(); break;
      case "timeline": document.getElementById("aftermath")?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" }); break;
      case "sources": document.getElementById("data")?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" }); break;
      case "system": document.getElementById("system")?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" }); break;
      case "trail": if (trailModal) { renderTrail(); openOverlay(trailModal); } break;
      case "return":
        if (fileState === "OPEN") closeCaseDossier();
        document.getElementById("stories")?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth" });
        break;
      default: break;
    }
  }

  document.addEventListener("keydown", (e) => {
    const typing = /input|textarea/i.test(e.target.tagName) || e.target.isContentEditable;
    if (e.key === "/" && !typing && commandPalette && !commandPalette.classList.contains("is-open")) {
      e.preventDefault();
      openPalette();
      return;
    }
    if (!commandPalette || !commandPalette.classList.contains("is-open")) return;
    if (e.key === "Escape") { closePalette(); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); highlightCommand(commandHighlight + 1); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); highlightCommand(commandHighlight - 1); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      const items = paletteItems();
      runCommand(items[commandHighlight].getAttribute("data-command"));
    }
  });

  commandList.addEventListener("click", (e) => {
    const btn = e.target.closest(".command-item");
    if (btn) runCommand(btn.getAttribute("data-command"));
  });

  commandPalette.addEventListener("click", (e) => {
    if (e.target === commandPalette) closePalette();
  });

  /* ---------------- 10e0. Archive Search ----------------
     Plain client-side substring match over the real text already in
     caseData — no network call, no AI summarization, nothing invented.
     Built once the dossier data exists (after caseData is defined above). */
  const searchToggle = document.getElementById("searchToggle");
  const archiveSearch = document.getElementById("archiveSearch");
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");
  const searchEmpty = document.getElementById("searchEmpty");
  const searchClose = document.getElementById("searchClose");

  const searchIndex = Object.keys(caseData).map((id) => {
    const d = caseData[id];
    return {
      id,
      code: d.code,
      title: d.title,
      haystack: [d.title, d.code, ...d.meta, d.before, d.incident, d.aftermathText, d.remains].join(" ").toLowerCase()
    };
  });

  function openSearch() {
    archiveSearch.classList.add("is-open");
    archiveSearch.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    searchInput.value = "";
    searchResults.innerHTML = "";
    searchEmpty.classList.remove("is-hidden");
    setTimeout(() => searchInput.focus(), prefersReducedMotion ? 0 : 300);
  }

  function closeSearch() {
    archiveSearch.classList.remove("is-open");
    archiveSearch.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function runSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      searchResults.innerHTML = "";
      searchEmpty.classList.remove("is-hidden");
      return;
    }
    const matches = searchIndex.filter((entry) => entry.haystack.includes(q));
    searchEmpty.classList.toggle("is-hidden", matches.length > 0);
    searchResults.innerHTML = matches.map((entry) => {
      // Show a short snippet around the first match, for context.
      const idx = entry.haystack.indexOf(q);
      const start = Math.max(0, idx - 40);
      const snippet = (start > 0 ? "…" : "") + entry.haystack.slice(start, idx + q.length + 60) + "…";
      return `
        <li>
          <button class="search-result" type="button" data-search-case="${entry.id}">
            <span class="search-result-case">${entry.code} — ${entry.title.split(" — ")[0]}</span>
            <span class="search-result-snippet">${snippet}</span>
          </button>
        </li>
      `;
    }).join("");
  }

  if (searchToggle) searchToggle.addEventListener("click", openSearch);
  if (searchClose) searchClose.addEventListener("click", closeSearch);
  if (searchInput) searchInput.addEventListener("input", (e) => runSearch(e.target.value));
  if (searchResults) {
    searchResults.addEventListener("click", (e) => {
      const btn = e.target.closest(".search-result");
      if (!btn) return;
      const caseId = btn.getAttribute("data-search-case");
      closeSearch();
      logTrail(`Search → opened ${caseData[caseId].code}`);
      // No origin element for the folder-launch animation from here — the
      // reduced-motion/no-origin branch in openCaseDossier already handles
      // this (plain fade-in dossier), which is the right fallback since
      // there's no constellation point to animate from.
      openCaseDossier(caseId, null);
    });
  }
  if (archiveSearch) {
    archiveSearch.addEventListener("click", (e) => {
      if (e.target === archiveSearch) closeSearch();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && archiveSearch && archiveSearch.classList.contains("is-open")) closeSearch();
  });

  /* ---------------- 10e. Compare mode ----------------
     Select exactly two legal-journey milestones and see them side by side.
     A static two-column layout, not a draggable divider — a drag handle
     needs per-instance width math that's easy to get subtly wrong, and the
     two-column view delivers the actual feature (compare two real records)
     without that risk. */
  dossierBody.addEventListener("change", (e) => {
    const check = e.target.closest(".compare-check");
    if (!check || !currentCaseId) return;
    const group = check.getAttribute("data-compare-group");
    const allChecks = Array.from(dossierBody.querySelectorAll(`.compare-check[data-compare-group="${group}"]`));
    const checked = allChecks.filter((c) => c.checked);

    if (checked.length > 2) {
      check.checked = false; // keep the selection at exactly two
      return;
    }

    const panel = document.getElementById(`comparePanel-${group}`);
    if (!panel) return;

    if (checked.length === 2) {
      const data = caseData[currentCaseId];
      // `checked` is already in DOM order (from filtering allChecks, which
      // querySelectorAll returns in document order), so no sort is needed.
      const [a, b] = checked.map((c) => data.legalJourney[Number(c.getAttribute("data-compare-index"))]);
      panel.innerHTML = `
        <div class="compare-columns">
          <div class="compare-column">
            <span class="legal-node-date">${a.date}</span>
            <strong>${a.status}</strong>
            <p>${a.body}</p>
          </div>
          <div class="compare-column">
            <span class="legal-node-date">${b.date}</span>
            <strong>${b.status}</strong>
            <p>${b.body}</p>
          </div>
        </div>
      `;
      panel.classList.add("is-open");
      logTrail("Compared two legal-journey records");
    } else {
      panel.innerHTML = "";
      panel.classList.remove("is-open");
    }
  });

  document.querySelectorAll("[data-close-source]").forEach((btn) => {
    btn.addEventListener("click", closeSourceSheet);
  });
  sourceSheet.addEventListener("click", (e) => {
    if (e.target === sourceSheet) closeSourceSheet();
  });

  const constellationEl = document.getElementById("constellation");

  function dossier_scrollReset() {
    const d = dossierOverlay.querySelector(".dossier");
    if (d) d.scrollTop = 0;
    dossierOverlay.scrollTop = 0;
  }

  /* ---------------- 10a. Case-opening transition: state machine ----------------
     IDLE -> OPENING -> OPEN -> CLOSING -> IDLE. A click is ignored unless the
     machine is IDLE; Escape/close is ignored unless it's OPEN — this is the
     "don't leave the UI half-open" rule: rather than trying to interrupt and
     reverse an in-flight animation, we simply don't allow a second action to
     start one until the current one has settled. */
  let fileState = "IDLE";

  const fileTransition = document.getElementById("fileTransition");
  const ftFolder = document.getElementById("ftFolder");
  const ftFolderCode = document.getElementById("ftFolderCode");
  const ftFolderTitle = document.getElementById("ftFolderTitle");
  const ftPaper1 = document.getElementById("ftPaper1");
  const ftPaperCode = document.getElementById("ftPaperCode");
  const ftPaperTitle = document.getElementById("ftPaperTitle");
  const ftPaperImage = document.getElementById("ftPaperImage");
  const ftPaperPin = document.getElementById("ftPaperPin");

  // FLIP (First-Last-Invert-Play): animates an element smoothly between two
  // very different layouts (small, in-folder <-> fixed, fullscreen) by
  // measuring both states and animating the delta, instead of guessing a
  // scale value that would be wrong at different viewport sizes.
  function flipToggle(el, toggleClass, onDone) {
    const first = el.getBoundingClientRect();
    el.classList.toggle(toggleClass);
    const last = el.getBoundingClientRect();
    const scaleX = first.width / last.width;
    const scaleY = first.height / last.height;
    const dx = (first.left + first.width / 2) - (last.left + last.width / 2);
    const dy = (first.top + first.height / 2) - (last.top + last.height / 2);
    el.style.transition = "none";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${scaleX}, ${scaleY})`;
    // eslint-disable-next-line no-unused-expressions
    el.offsetHeight; // force reflow so the inverted start state actually paints
    requestAnimationFrame(() => {
      el.style.transition = "";
      el.style.transform = "";
      if (onDone) {
        el.addEventListener("transitionend", onDone, { once: true });
      }
    });
  }

  function openCaseDossier(id, originEl) {
    if (fileState !== "IDLE") return; // block a second case while one is mid-transition
    const data = caseData[id];
    if (!data) return;

    currentCaseId = id;
    if (evidenceToggle) {
      evidenceToggle.setAttribute("aria-pressed", "false");
      evidenceToggle.textContent = "Evidence Mode";
    }
    evidenceModeOn = false;

    if (prefersReducedMotion || !originEl) {
      // Reduced motion: skip straight to the dossier, no folder/paper sequence.
      dossierCode.textContent = data.code;
      dossierTitle.textContent = data.title;
      dossierMeta.innerHTML = data.meta.map((m) => `<span>${m}</span>`).join("");
      renderNarrative(id);
      openOverlay(dossierOverlay);
      dossier_scrollReset();
      fileState = "OPEN";
      setBreadcrumb(data.code);
      logTrail(`Opened ${data.code} — ${data.title.split(" — ")[0]}`);
      return;
    }

    fileState = "OPENING";
    // Lock scroll for the whole sequence, not just from the handoff onward —
    // otherwise the page can scroll underneath the ~1.6s folder/paper
    // animation, which both looks wrong and would desync the FLIP
    // measurement (which assumes the viewport hasn't moved mid-flight).
    document.body.style.overflow = "hidden";

    // Launch point: the folder scales up from the exact constellation point
    // clicked. transform-origin must be in pixels relative to the folder's
    // own (small, fixed-size) box, not a viewport percentage.
    const originRect = originEl.getBoundingClientRect();
    const folderRect = ftFolder.getBoundingClientRect();
    const originPxX = (originRect.left + originRect.width / 2) - folderRect.left;
    const originPxY = (originRect.top + originRect.height / 2) - folderRect.top;
    ftFolder.style.transformOrigin = `${originPxX}px ${originPxY}px`;

    if (constellationEl) {
      constellationEl.classList.add("is-receding");
      document.querySelectorAll(".const-point").forEach((p) => p.classList.remove("is-origin"));
      originEl.classList.add("is-origin");
    }

    ftFolderCode.textContent = data.code;
    ftFolderTitle.textContent = data.title.split(" — ")[0];
    ftPaperCode.textContent = data.code;
    ftPaperTitle.textContent = data.title.split(" — ")[0];
    if (data.figure) {
      ftPaperImage.src = data.figure.src;
      ftPaperImage.alt = data.figure.alt;
      ftPaperPin.textContent = "Source verified";
    } else {
      ftPaperImage.removeAttribute("src");
      ftPaperImage.alt = "";
      ftPaperPin.textContent = "";
    }

    fileTransition.hidden = false;

    function handoffToDossier() {
      dossierCode.textContent = data.code;
      dossierTitle.textContent = data.title;
      dossierMeta.innerHTML = data.meta.map((m) => `<span>${m}</span>`).join("");
      renderNarrative(id);
      dossierOverlay.classList.add("no-anim");
      openOverlay(dossierOverlay);
      dossier_scrollReset();
      requestAnimationFrame(() => dossierOverlay.classList.remove("no-anim"));
      fileTransition.classList.remove("is-active", "stage-approach", "stage-open");
      ftPaper1.classList.remove("is-filling", "content-visible");
      fileTransition.hidden = true;
      fileState = "OPEN";
      setBreadcrumb(data.code);
      logTrail(`Opened ${data.code} — ${data.title.split(" — ")[0]}`);
    }

    function liftPaper() {
      flipToggle(ftPaper1, "is-filling", handoffToDossier);
      requestAnimationFrame(() => ftPaper1.classList.add("content-visible"));
    }

    if (hasGsap) {
      // Named GSAP timeline — the named labels are the actual choreography
      // contract (archiveFocus -> folderApproach -> folderOpen ->
      // paperReveal), with deliberate overlap between stages (each begins
      // before the previous CSS transition fully finishes) rather than the
      // back-to-back setTimeout gaps the Phase B audit flagged.
      gsap.timeline()
        .addLabel("archiveFocus")
        .call(() => fileTransition.classList.add("is-active"), null, "archiveFocus")
        .addLabel("folderApproach", "archiveFocus+=0.02")
        .call(() => fileTransition.classList.add("stage-approach"), null, "folderApproach")
        // Folder-open begins at ~80% of the approach's 550ms CSS transition,
        // not after it — this is the overlap fix from the Phase B audit.
        .addLabel("folderOpen", "folderApproach+=0.44")
        .call(() => fileTransition.classList.add("stage-open"), null, "folderOpen")
        .addLabel("paperReveal", "folderOpen+=0.36")
        .call(liftPaper, null, "paperReveal");
    } else {
      // Fallback if GSAP failed to load: original setTimeout chain.
      requestAnimationFrame(() => fileTransition.classList.add("is-active"));
      setTimeout(() => fileTransition.classList.add("stage-approach"), 20);
      setTimeout(() => fileTransition.classList.add("stage-open"), 20 + 550);
      setTimeout(liftPaper, 20 + 550 + 450);
    }
  }

  function closeCaseDossier() {
    if (fileState !== "OPEN") return; // ignore while a transition is already running
    if (prefersReducedMotion) {
      closeOverlay(dossierOverlay);
      if (constellationEl) constellationEl.classList.remove("is-receding");
      fileState = "IDLE";
      setBreadcrumb(null);
      return;
    }

    const data = caseData[currentCaseId];
    fileState = "CLOSING";

    // Re-show the transition layer already in its "filled paper" end state,
    // carrying the same title/image the dossier was just showing, then hide
    // the dossier instantly underneath it — the reverse of the handoff above.
    if (data) {
      ftFolderCode.textContent = data.code;
      ftFolderTitle.textContent = data.title.split(" — ")[0];
      ftPaperCode.textContent = data.code;
      ftPaperTitle.textContent = data.title.split(" — ")[0];
      if (data.figure) {
        ftPaperImage.src = data.figure.src;
        ftPaperImage.alt = data.figure.alt;
      }
    }

    dossierOverlay.classList.add("no-anim");
    dossierOverlay.classList.remove("is-open");
    dossierOverlay.hidden = true;
    document.removeEventListener("keydown", onOverlayKeydown);

    fileTransition.hidden = false;
    fileTransition.classList.add("is-active", "stage-approach", "stage-open");
    ftPaper1.classList.add("is-filling", "content-visible");

    function finishClose() {
      fileTransition.classList.remove("is-active");
      fileTransition.hidden = true;
      document.body.style.overflow = "";
      if (lastFocusedEl) lastFocusedEl.focus();
      if (constellationEl) constellationEl.classList.remove("is-receding");
      dossierOverlay.classList.remove("no-anim");
      fileState = "IDLE";
      setBreadcrumb(null);
    }

    function closeFolder() {
      fileTransition.classList.remove("stage-open");
      if (hasGsap) {
        gsap.timeline()
          .call(() => fileTransition.classList.remove("stage-approach"), null, "+=0.3")
          .call(finishClose, null, "+=0.55");
      } else {
        setTimeout(() => {
          fileTransition.classList.remove("stage-approach");
          setTimeout(finishClose, 550);
        }, 450);
      }
    }

    // Stage 1 (reverse): paper shrinks from fullscreen back into the folder.
    requestAnimationFrame(() => {
      ftPaper1.classList.remove("content-visible");
      flipToggle(ftPaper1, "is-filling", closeFolder);
    });
  }

  document.querySelectorAll(".const-point").forEach((point) => {
    point.addEventListener("click", (e) => {
      // Mobile/touch: there's no :hover, so the metadata tooltip (const-tip)
      // would otherwise never be seen before committing to open the case.
      // First tap reveals it instead of opening; tapping the same point
      // again (now that metadata is visible) opens it.
      if (isTouch && !point.classList.contains("is-tapped")) {
        e.preventDefault();
        document.querySelectorAll(".const-point.is-tapped").forEach((p) => p.classList.remove("is-tapped"));
        point.classList.add("is-tapped");
        return;
      }
      openCaseDossier(point.getAttribute("data-story"), point);
    });
  });

  dossierOverlay.addEventListener("click", (e) => {
    if (e.target === dossierOverlay) closeCaseDossier();
  });
  dossierOverlay.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeCaseDossier());
  });

  /* ---------------- 10b. Constellation filters ----------------
     Filters are drawn only from facts already established in each case's
     dossier (conviction outcome, whether it produced legal reform) — no
     new claim is introduced here. */
  const filterButtons = document.querySelectorAll(".filter-btn");
  const constPoints = document.querySelectorAll(".const-point");
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      const filter = btn.getAttribute("data-filter");
      constPoints.forEach((point) => {
        const tags = (point.getAttribute("data-tags") || "").split(" ");
        const matches = filter === "all" || tags.includes(filter);
        point.classList.toggle("is-filtered-out", !matches);
      });
    });
  });

  /* ---------------- 10c. Evidence Mode ----------------
     Re-renders the same dossier data as a condensed claim -> source list,
     using only facts and sources already present in caseData — nothing new
     is introduced for this view. */
  const evidenceToggle = document.getElementById("evidenceToggle");
  let evidenceModeOn = false;
  let currentCaseId = null;

  // "Trace to Source" — finds the real sources tagged (via `supports`) for
  // a given chapter key and renders a button that opens the first one in
  // the Source Sheet, naming how many back it if there's more than one.
  // Returns an empty string (no button) if no source is actually tagged for
  // that chapter, rather than showing a dead/fake control.
  function renderTraceButton(data, chapterKey) {
    const matches = data.sources
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => (s.supports || []).includes(chapterKey));
    if (!matches.length) return "";
    const extra = matches.length > 1 ? ` (+${matches.length - 1} more)` : "";
    return `<button class="source-tag pinned trace-btn" type="button" data-trace-index="${matches[0].i}">Trace to source${extra}</button>`;
  }

  function renderNarrative(id) {
    const data = caseData[id];
    const figureHtml = data.figure ? `
      <figure class="case-figure" data-cursor="Examine" tabindex="0" role="button" aria-label="Examine this photograph">
        <img src="${data.figure.src}" alt="${data.figure.alt}" loading="lazy" decoding="async">
        <figcaption>${data.figure.caption}<span class="cap-source">${data.figure.source}</span></figcaption>
      </figure>
    ` : "";
    dossierBody.innerHTML = `
      <div class="chapter chapter--context">
        <span class="chapter-num">Chapter 01</span>
        <h3 class="chapter-title">Before</h3>
        ${data.protected ? '<span class="source-tag pinned">Identity protected — Section 228A IPC</span>' : ""}
        <p class="chapter-body">${data.before}</p>
      </div>
      <div class="chapter">
        <span class="chapter-num">Chapter 02</span>
        <h3 class="chapter-title">What Happened</h3>
        <p class="chapter-body">${data.incident}</p>
        ${renderTraceButton(data, "incident")}
      </div>
      <div class="chapter">
        <span class="chapter-num">Chapter 03</span>
        <h3 class="chapter-title">The Legal Journey</h3>
        <p class="legal-journey-hint">Select two milestones to compare them side by side.</p>
        ${renderLegalJourney(data.legalJourney, "narrative")}
        ${renderTraceButton(data, "legalJourney")}
        ${figureHtml}
      </div>
      <div class="chapter chapter--legal-record">
        <span class="chapter-num">Chapter 04</span>
        <h3 class="chapter-title">Aftermath</h3>
        <p class="chapter-body">${data.aftermathText}</p>
        ${renderTraceButton(data, "aftermath")}
      </div>
      <div class="chapter chapter--legal-record">
        <span class="chapter-num">Chapter 05</span>
        <h3 class="chapter-title">What Remains</h3>
        <p class="chapter-body">${data.remains}</p>
        ${renderTraceButton(data, "remains")}
      </div>
      ${renderSourcesList(data.sources)}
    `;
  }

  function renderEvidence(id) {
    const data = caseData[id];
    const claims = [
      { label: "What Happened", text: data.incident, key: "incident" },
      { label: "Aftermath", text: data.aftermathText, key: "aftermath" },
      { label: "What Remains", text: data.remains, key: "remains" }
    ];
    dossierBody.innerHTML = `
      <p class="chapter-body evidence-intro">Every claim below traces to one of the sources listed at the end. This view strips the narrative framing to show the factual basis directly.</p>
      <div class="evidence-list">
        ${claims.map((c) => `
          <div class="evidence-item">
            <span class="evidence-claim-label">${c.label}</span>
            <p class="evidence-claim">${c.text}</p>
            ${renderTraceButton(data, c.key)}
          </div>
        `).join("")}
        <div class="evidence-item">
          <span class="evidence-claim-label">Legal Journey — Verified Milestones Only</span>
          ${renderLegalJourney(data.legalJourney)}
          ${renderTraceButton(data, "legalJourney")}
        </div>
      </div>
      ${renderSourcesList(data.sources)}
    `;
  }

  if (evidenceToggle) {
    evidenceToggle.addEventListener("click", () => {
      evidenceModeOn = !evidenceModeOn;
      evidenceToggle.setAttribute("aria-pressed", String(evidenceModeOn));
      evidenceToggle.textContent = evidenceModeOn ? "Return to Story" : "Evidence Mode";
      if (currentCaseId) {
        if (evidenceModeOn) renderEvidence(currentCaseId);
        else renderNarrative(currentCaseId);
        logTrail(evidenceModeOn ? "Entered Evidence Mode" : "Returned to narrative");
      }
    });
  }

  /* ---------------- 11. Remembered vs Underreported slider ---------------- */
  const rvfSlider = document.getElementById("rvfSlider");
  const rvfHandle = document.getElementById("rvfHandle");
  if (rvfSlider && rvfHandle) {
    const leftPane = rvfSlider.querySelector(".rvf-pane-left");
    function updateSlider() {
      const val = Number(rvfHandle.value);
      leftPane.style.flexBasis = val + "%";
      rvfSlider.style.gridTemplateColumns = `${val}fr ${100 - val}fr`;
    }
    rvfHandle.addEventListener("input", updateSlider);
    updateSlider();
  }

  /* ---------------- 12. System diagram ---------------- */
  const systemNotes = {
    media: "Media attention is the least predictable variable in this archive. Nirbhaya drew sustained national coverage for weeks; Hathras drew intense coverage that receded well before its 2023 verdict. Coverage volume does not reliably track case severity.",
    police: "Initial police response shapes everything downstream. In Hathras, the disputed overnight cremation became a central controversy. In Mathura, the alleged assault occurred inside a police station itself.",
    courts: "Across India, the data section below shows roughly 90% of rape trials remained pending at the end of 2024, with a conviction rate that has hovered near 24–27% for most of the last two decades. Kathua and Nirbhaya reached convictions; Mathura and Hathras did not.",
    policy: "Three of the six cases here — Mathura, Bhanwari Devi, and Nirbhaya — directly produced national legal reform (the 1983 amendment, the Vishaka Guidelines, and the 2013 amendment respectively), independent of their own case's final verdict.",
    society: "Public memory and legal outcome often diverge. Bilkis Bano and Bhanwari Devi both chose public visibility as survivors; most others in this archive remain legally anonymous, as Indian law requires by default.",
    aftermath: "What follows a verdict varies as much as the verdict itself: executed sentences (Nirbhaya), a quashed remission forcing convicts back into custody (Bilkis Bano), or a conviction that didn't touch the offense itself (Hathras)."
  };

  const systemNodes = document.querySelectorAll(".system-node");
  const systemReadout = document.getElementById("systemReadout");
  systemNodes.forEach((node) => {
    node.addEventListener("click", () => {
      const key = node.getAttribute("data-node");
      const isPressed = node.getAttribute("aria-pressed") === "true";
      systemNodes.forEach((n) => n.setAttribute("aria-pressed", "false"));
      if (isPressed) {
        systemReadout.innerHTML = '<p class="system-readout-placeholder">Select a node above.</p>';
        return;
      }
      node.setAttribute("aria-pressed", "true");
      systemReadout.innerHTML = `<h4>${node.textContent}</h4><p>${systemNotes[key]}</p>`;
    });
  });

  /* ---------------- 13. Share safely + silence modals ---------------- */
  const shareCta = document.getElementById("shareCta");
  const shareModal = document.getElementById("shareModal");
  if (shareCta) shareCta.addEventListener("click", () => openOverlay(shareModal));

  const silenceCta = document.getElementById("silenceCta");
  const silenceModal = document.getElementById("silenceModal");
  if (silenceCta) silenceCta.addEventListener("click", () => openOverlay(silenceModal));

  /* ---------------- 14. Footer info links ---------------- */
  const infoModal = document.getElementById("infoModal");
  const infoModalTitle = document.getElementById("infoModalTitle");
  const infoModalBody = document.getElementById("infoModalBody");

  const footerInfo = {
    safetyLink: {
      title: "Safety",
      body: "If you or someone you know needs support, please reach out to a local crisis line or support organization in your region. This site does not provide emergency services or real-time support."
    },
    privacyLink: {
      title: "Privacy",
      body: "This site collects no personal data, uses no tracking, and stores no information about visitors. The case files in the archive document real public legal cases; all other framing sections are conceptual, as noted in the footer disclaimer."
    }
  };

  Object.keys(footerInfo).forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", () => {
      infoModalTitle.textContent = footerInfo[id].title;
      infoModalBody.textContent = footerInfo[id].body;
      openOverlay(infoModal);
    });
  });

  /* ==========================================================================
     THE STORY ROOM
     HONESTY BOUNDARY (do not weaken this): this is a static site with no
     backend. storyRoomState lives only in this JS variable — never written
     to localStorage/sessionStorage/cookies, never sent over the network,
     never logged to console, never placed in a URL. It is gone the moment
     the tab closes or this function's closure is torn down. Every place
     that tells the user something is or isn't saved must stay literally
     true to that.
     ========================================================================== */
  (function initStoryRoom() {
    const storyRoom = document.getElementById("storyRoom");
    if (!storyRoom) return;

    const storyRoomToggle = document.getElementById("storyRoomToggle");
    const storyLeaveBtn = document.getElementById("storyLeaveBtn");
    const storyPauseBtn = document.getElementById("storyPauseBtn");
    const storyBreadcrumb = document.getElementById("storyBreadcrumb");

    const panels = {
      entry: document.getElementById("panelEntry"),
      begin: document.getElementById("panelBegin"),
      cantsay: document.getElementById("panelCantSay"),
      desk: document.getElementById("panelDesk"),
      identity: document.getElementById("panelIdentity"),
      identitycheck: document.getElementById("panelIdentityCheck"),
      review: document.getElementById("panelReview"),
      offer: document.getElementById("panelOffer"),
      exit: document.getElementById("panelExit")
    };

    const storyFragmentsEl = document.getElementById("storyFragments");
    const addFragmentBtn = document.getElementById("addFragmentBtn");
    const fragmentEditor = document.getElementById("fragmentEditor");
    const fragmentEditorLabel = document.getElementById("fragmentEditorLabel");
    const fragmentPrompt = document.getElementById("fragmentPrompt");
    const fragmentTextarea = document.getElementById("fragmentTextarea");
    const fragmentDoneBtn = document.getElementById("fragmentDoneBtn");
    const fragmentDeleteBtn = document.getElementById("fragmentDeleteBtn");
    const identityCurrentLabel = document.getElementById("identityCurrentLabel");
    const identityFlagsEl = document.getElementById("identityFlags");
    const identityCheckEmpty = document.getElementById("identityCheckEmpty");
    const reviewFragmentsEl = document.getElementById("reviewFragments");
    const reviewIdentityEl = document.getElementById("reviewIdentity");
    const storyPauseOverlay = document.getElementById("storyPauseOverlay");

    // In-memory only. See the honesty boundary comment above.
    let storyRoomState = {
      active: false,
      fragments: [],
      nextId: 1,
      activeFragmentId: null,
      identityMode: "anonymous",
      paused: false
    };

    const startPrompts = {
      incident: "Write what happened — as much or as little detail as you want.",
      after: "Write about what came next, in whatever order it comes to you.",
      misunderstood: "Write about the part people got wrong.",
      neversaid: "Write the thing you've never been able to say. You can stop at any point.",
      wantknown: "Write what you wish other people understood.",
      free: "Write freely. There's no structure to follow here.",
      before: "Describe what happened before — the lead-up, not the event itself.",
      afterward: "Describe what happened after.",
      changed: "Describe what changed.",
      reacted: "Describe how people reacted.",
      lost: "Describe what you lost.",
      wished: "Describe what you wish someone had done.",
      nodescribe: "You don't have to describe it. Write whatever you want instead — even just how you feel right now."
    };

    const identityLabels = {
      anonymous: "Anonymous",
      pseudonym: "Pseudonym",
      firstname: "First name only",
      myname: "My name",
      notsure: "Not sure"
    };

    function showPanel(key) {
      Object.values(panels).forEach((p) => { if (p) p.hidden = true; });
      if (panels[key]) panels[key].hidden = false;
      storyRoom.scrollTop = 0;
      updateBreadcrumbLabel(key);
    }

    function updateBreadcrumbLabel(key) {
      const labels = {
        entry: "THE STORY ROOM",
        begin: "THE STORY ROOM / BEGIN",
        cantsay: "THE STORY ROOM / BEGIN",
        desk: `THE STORY ROOM / ${storyRoomState.fragments.length} FRAGMENT${storyRoomState.fragments.length === 1 ? "" : "S"}`,
        identity: "THE STORY ROOM / IDENTITY",
        identitycheck: "THE STORY ROOM / IDENTITY CHECK",
        review: "THE STORY ROOM / BEFORE SHARING",
        offer: "THE STORY ROOM / ARCHIVE REVIEW",
        exit: "THE STORY ROOM / LEAVING"
      };
      storyBreadcrumb.textContent = `ARCHIVE / ${labels[key] || "THE STORY ROOM"}`;
    }

    function enterStoryRoom() {
      storyRoomState.active = true;
      storyRoom.hidden = false;
      storyRoom.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      showPanel("entry");
      if (typeof logTrail === "function") logTrail("Entered the Story Room");
    }

    function exitStoryRoom() {
      storyRoomState.active = false;
      storyRoom.hidden = true;
      storyRoom.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      storyPauseBtn.hidden = true;
    }

    function beginStorySession() {
      storyPauseBtn.hidden = false;
      showPanel("begin");
    }

    function createStoryFragment(startKey) {
      const fragment = {
        id: storyRoomState.nextId++,
        text: "",
        privacy: "private",
        prompt: startPrompts[startKey] || ""
      };
      storyRoomState.fragments.push(fragment);
      storyRoomState.activeFragmentId = fragment.id;
      renderFragments();
      openStoryFragment(fragment.id);
    }

    function getFragment(id) {
      return storyRoomState.fragments.find((f) => f.id === id);
    }

    function openStoryFragment(id) {
      const f = getFragment(id);
      if (!f) return;
      storyRoomState.activeFragmentId = id;
      const index = storyRoomState.fragments.indexOf(f) + 1;
      fragmentEditorLabel.textContent = `Fragment ${String(index).padStart(2, "0")}`;
      fragmentPrompt.textContent = f.prompt;
      fragmentTextarea.value = f.text;
      fragmentEditor.querySelectorAll(".privacy-pill").forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-privacy") === f.privacy);
      });
      fragmentEditor.hidden = false;
      fragmentTextarea.focus();
    }

    function editStoryFragment() {
      const f = getFragment(storyRoomState.activeFragmentId);
      if (!f) return;
      f.text = fragmentTextarea.value;
    }

    function setFragmentPrivacy(privacy) {
      const f = getFragment(storyRoomState.activeFragmentId);
      if (!f) return;
      f.privacy = privacy;
      fragmentEditor.querySelectorAll(".privacy-pill").forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-privacy") === privacy);
      });
    }

    function closeFragmentEditor() {
      editStoryFragment();
      fragmentEditor.hidden = true;
      renderFragments();
      updateBreadcrumbLabel("desk");
    }

    function deleteFragment(id) {
      storyRoomState.fragments = storyRoomState.fragments.filter((f) => f.id !== id);
      fragmentEditor.hidden = true;
      renderFragments();
      updateBreadcrumbLabel("desk");
    }

    function moveFragment(id, direction) {
      const arr = storyRoomState.fragments;
      const i = arr.findIndex((f) => f.id === id);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      renderFragments();
    }

    // Security: fragment text is user-typed and gets inserted via
    // innerHTML in several places below. Without escaping, something like
    // <img src=x onerror=alert(1)> typed into a fragment would execute as
    // real HTML the moment the card re-renders. This is the one place in
    // the whole site where arbitrary user text reaches innerHTML, so every
    // caller must route through this first.
    function escapeHtml(str) {
      const div = document.createElement("div");
      div.textContent = str;
      return div.innerHTML;
    }

    function excerpt(text) {
      if (!text.trim()) return "Not written yet.";
      const safe = escapeHtml(text);
      return safe.length > 90 ? safe.slice(0, 90).trim() + "…" : safe;
    }

    function renderFragments() {
      storyFragmentsEl.innerHTML = storyRoomState.fragments.map((f, i) => `
        <div class="story-fragment-card" tabindex="0" data-fragment-id="${f.id}" role="button" aria-label="Open fragment ${i + 1}">
          <span class="story-fragment-card-label">Fragment ${String(i + 1).padStart(2, "0")}</span>
          <p class="story-fragment-card-excerpt">${excerpt(f.text)}</p>
          <div class="story-fragment-card-footer">
            <span class="fragment-privacy-badge" data-state="${f.privacy}">${f.privacy === "share" ? "Ready to share" : f.privacy === "unsure" ? "Not sure" : "Private"}</span>
            <div class="fragment-reorder-btns">
              <button type="button" data-move="-1" data-fragment-id="${f.id}" aria-label="Move fragment ${i + 1} earlier">↑</button>
              <button type="button" data-move="1" data-fragment-id="${f.id}" aria-label="Move fragment ${i + 1} later">↓</button>
            </div>
          </div>
        </div>
      `).join("");
      updateBreadcrumbLabel("desk");
    }

    storyFragmentsEl.addEventListener("click", (e) => {
      const moveBtn = e.target.closest("[data-move]");
      if (moveBtn) {
        moveFragment(Number(moveBtn.getAttribute("data-fragment-id")), Number(moveBtn.getAttribute("data-move")));
        return;
      }
      const card = e.target.closest(".story-fragment-card");
      if (card) openStoryFragment(Number(card.getAttribute("data-fragment-id")));
    });
    storyFragmentsEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".story-fragment-card");
      if (card) { e.preventDefault(); openStoryFragment(Number(card.getAttribute("data-fragment-id"))); }
    });

    // Simple heuristic scan only — explicitly not comprehensive. Flags
    // emails, phone-like digit runs, @handles, and capitalized multi-word
    // sequences that might be proper nouns. Never rewrites or deletes text
    // on its own; the storyteller decides for each flag.
    function inspectIdentityRisk() {
      const flags = [];
      storyRoomState.fragments.forEach((f) => {
        const text = f.text || "";
        const patterns = [
          { type: "Email address", re: /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi },
          { type: "Phone number", re: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{10}\b/g },
          { type: "Social handle", re: /@[a-z0-9_]{3,}/gi },
          { type: "Possible proper name", re: /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/g }
        ];
        patterns.forEach(({ type, re }) => {
          const matches = text.match(re) || [];
          matches.forEach((m) => flags.push({ fragmentId: f.id, type, text: m, decision: null }));
        });
      });
      renderIdentityFlags(flags);
      showPanel("identitycheck");
    }

    let currentFlags = [];
    function renderIdentityFlags(flags) {
      currentFlags = flags;
      identityCheckEmpty.hidden = flags.length > 0;
      identityFlagsEl.innerHTML = flags.map((flag, i) => `
        <div class="identity-flag">
          <span class="identity-flag-type">${flag.type}</span>
          <p class="identity-flag-text">"${escapeHtml(flag.text)}"</p>
          <div class="identity-flag-actions" data-flag-index="${i}">
            <button type="button" data-decision="keep">Keep</button>
            <button type="button" data-decision="remove">Remove</button>
            <button type="button" data-decision="generalize">Generalize</button>
            <button type="button" data-decision="later">Review later</button>
          </div>
        </div>
      `).join("");
    }
    identityFlagsEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-decision]");
      if (!btn) return;
      const group = btn.closest(".identity-flag-actions");
      group.querySelectorAll("button").forEach((b) => b.classList.remove("is-chosen"));
      btn.classList.add("is-chosen");
      const idx = Number(group.getAttribute("data-flag-index"));
      if (currentFlags[idx]) currentFlags[idx].decision = btn.getAttribute("data-decision");
      // "Remove" and "Generalize" are the storyteller's own decision to act
      // on in their own text — this prototype never edits their words for
      // them. The chosen state is recorded only to show in review.
    });

    function openStoryReview() {
      reviewFragmentsEl.innerHTML = storyRoomState.fragments.length
        ? storyRoomState.fragments.map((f, i) => `
            <div class="review-fragment">
              <strong>Fragment ${String(i + 1).padStart(2, "0")}</strong> — ${f.privacy === "share" ? "Ready to share" : f.privacy === "unsure" ? "Not sure" : "Private"}<br>
              ${excerpt(f.text)}
            </div>
          `).join("")
        : '<p class="story-microcopy story-microcopy--muted">No fragments yet.</p>';
      reviewIdentityEl.textContent = identityLabels[storyRoomState.identityMode];
      showPanel("review");
    }

    function setSharingDecision(decision) {
      if (decision === "offer") {
        showPanel("offer");
        return;
      }
      // "keep", "save", and "unsure" all end the same way in this
      // prototype: nothing leaves the browser. "Save a copy" additionally
      // triggers a local file download below.
      if (decision === "save") downloadStoryCopy();
      showPanel("exit");
      if (typeof logTrail === "function") logTrail(`Story Room: chose "${decision}"`);
    }

    function downloadStoryCopy() {
      const lines = [
        "AFTER HER — The Story Room",
        `Identity: ${identityLabels[storyRoomState.identityMode]}`,
        "This file was generated locally in your browser. It was not sent anywhere.",
        ""
      ];
      storyRoomState.fragments.forEach((f, i) => {
        lines.push(`Fragment ${i + 1} (${f.privacy}):`);
        lines.push(f.text || "(not written)");
        lines.push("");
      });
      const blob = new Blob([lines.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-story.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function pauseStoryRoom() {
      storyRoomState.paused = true;
      storyPauseOverlay.hidden = false;
    }
    function resumeStoryRoom() {
      storyRoomState.paused = false;
      storyPauseOverlay.hidden = true;
    }

    // ---- Wiring ----
    if (storyRoomToggle) storyRoomToggle.addEventListener("click", enterStoryRoom);
    storyLeaveBtn.addEventListener("click", exitStoryRoom);
    document.getElementById("storyLookingBtn").addEventListener("click", exitStoryRoom);
    document.getElementById("storyBeginBtn").addEventListener("click", beginStorySession);

    document.getElementById("beginOptions").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-start]");
      if (btn) { showPanel("desk"); createStoryFragment(btn.getAttribute("data-start")); }
    });
    document.getElementById("cantSayBtn").addEventListener("click", () => showPanel("cantsay"));
    document.getElementById("cantSayBackBtn").addEventListener("click", () => showPanel("begin"));
    panels.cantsay.querySelector(".story-fragment-options").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-start]");
      if (btn) { showPanel("desk"); createStoryFragment(btn.getAttribute("data-start")); }
    });

    // Every fragment — not just the first — gets the full "how do you want
    // to begin?" chooser (including the "I don't know how to say it" path).
    // Routing this straight to a free-write fragment was the bug: it made
    // the chooser a one-time thing instead of a real, repeatable option.
    addFragmentBtn.addEventListener("click", () => showPanel("begin"));
    fragmentDoneBtn.addEventListener("click", closeFragmentEditor);
    fragmentDeleteBtn.addEventListener("click", () => deleteFragment(storyRoomState.activeFragmentId));
    fragmentTextarea.addEventListener("input", editStoryFragment);
    fragmentEditor.querySelectorAll(".privacy-pill").forEach((btn) => {
      btn.addEventListener("click", () => setFragmentPrivacy(btn.getAttribute("data-privacy")));
    });

    document.getElementById("identityBtn").addEventListener("click", () => showPanel("identity"));
    document.getElementById("identityBackBtn").addEventListener("click", () => showPanel("desk"));
    document.getElementById("identityOptions").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-identity]");
      if (!btn) return;
      storyRoomState.identityMode = btn.getAttribute("data-identity");
      identityCurrentLabel.textContent = identityLabels[storyRoomState.identityMode];
      showPanel("desk");
    });

    // Identity Check is now reached FROM Review (where "Check for
    // identifying details" actually lives), not before it — its back
    // button returns to Review, matching how it's actually entered. The
    // Desk's "Review before leaving" button goes straight to Review, so
    // the label finally matches the destination.
    document.getElementById("identityCheckBackBtn").addEventListener("click", () => showPanel("review"));
    document.getElementById("reviewIdentityCheckBtn").addEventListener("click", inspectIdentityRisk);
    document.getElementById("reviewBtn").addEventListener("click", openStoryReview);

    document.getElementById("reviewBackBtn").addEventListener("click", () => showPanel("desk"));
    document.getElementById("destKeepBtn").addEventListener("click", () => setSharingDecision("keep"));
    document.getElementById("destSaveBtn").addEventListener("click", () => setSharingDecision("save"));
    document.getElementById("destOfferBtn").addEventListener("click", () => setSharingDecision("offer"));
    document.getElementById("destUnsureBtn").addEventListener("click", () => setSharingDecision("unsure"));
    document.getElementById("offerUnderstoodBtn").addEventListener("click", () => showPanel("exit"));

    document.getElementById("returnToArchiveBtn").addEventListener("click", exitStoryRoom);
    document.getElementById("exitBackToDeskBtn").addEventListener("click", () => showPanel("desk"));

    storyPauseBtn.addEventListener("click", pauseStoryRoom);
    document.getElementById("pauseContinueBtn").addEventListener("click", resumeStoryRoom);
    document.getElementById("pauseLeaveBtn").addEventListener("click", () => { resumeStoryRoom(); exitStoryRoom(); });

    // Escape now steps back to a safe point rather than hard-exiting from
    // anywhere. Previously, pressing Escape while deep in Identity Check or
    // Review instantly discarded every fragment with no warning — since
    // nothing is ever saved, that was permanent and silent. Now it only
    // fully exits from screens where there's nothing written yet to lose
    // (Entry/Begin/Cantsay) or where the story's already concluded (Exit);
    // everywhere else it returns to the Desk, where fragments stay visible
    // and nothing is lost.
    function currentPanelKey() {
      return Object.keys(panels).find((key) => panels[key] && !panels[key].hidden);
    }
    const safeExitPanels = new Set(["entry", "begin", "cantsay", "exit"]);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || storyRoom.hidden) return;
      if (!fragmentEditor.hidden) { closeFragmentEditor(); return; }
      if (!storyPauseOverlay.hidden) { resumeStoryRoom(); return; }
      const key = currentPanelKey();
      if (safeExitPanels.has(key)) exitStoryRoom();
      else showPanel("desk");
    });
  })();
})();
