(function () {
  "use strict";

  var $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  var $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safe(fn, name) {
    try { fn(); } catch (e) { if (window.console) console.warn("[" + name + "]", e); }
  }

  /* ---- Mobile nav ---- */
  function initNav() {
    var toggle = $(".nav-toggle");
    var mobileNav = $(".mobile-nav");
    if (!toggle || !mobileNav) return;
    toggle.addEventListener("click", function () {
      var open = mobileNav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });
    $$("a", mobileNav).forEach(function (a) {
      a.addEventListener("click", function () {
        mobileNav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---- Smooth anchor scroll (native, robusto en todos los OS) ---- */
  function initSmoothAnchors() {
    document.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href*="#"]') : null;
      if (!a) return;
      var url = new URL(a.href, window.location.href);
      if (url.pathname !== window.location.pathname) return;
      var id = url.hash;
      if (!id || id === "#") return;
      var el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      var navOffset = 88;
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - navOffset,
        behavior: reduced ? "auto" : "smooth"
      });
    });
  }

  /* ---- Reveal on scroll ---- */
  function initReveals() {
    var targets = $$(".reveal, .reveal-stagger");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.01, rootMargin: "0px 0px -2% 0px" });

    targets.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      targets.forEach(function (el) {
        if (!el.classList.contains("is-visible") && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-visible");
        }
      });
    }, 6000);
  }

  /* ---- Hero: revelación cinética del titular ---- */
  function initHeroTitleReveal() {
    var h1 = $(".hero h1");
    if (!h1 || h1.dataset.split) return;
    h1.dataset.split = "1";
    var text = h1.textContent.trim();
    h1.setAttribute("aria-label", text);
    h1.innerHTML = text.split(/(\s+)/).map(function (chunk) {
      if (/^\s+$/.test(chunk)) return chunk;
      return '<span class="hero-word" aria-hidden="true">' + chunk + "</span>";
    }).join("");
    // pequeño delay para asegurar el paint inicial antes de animar
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        $$(".hero-word", h1).forEach(function (w, i) {
          w.style.transitionDelay = (i * 70) + "ms";
        });
        h1.classList.add("is-revealed");
      });
    });
    // Safety net: si algo falla, el titular nunca debe quedar invisible
    setTimeout(function () { h1.classList.add("is-revealed"); }, 2000);
  }

  /* ---- Hero: parallax sutil con el mouse ---- */
  function initHeroParallax() {
    if (reduced) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var hero = $(".hero");
    var bg = hero && $(".hero__bg", hero);
    if (!hero || !bg) return;
    var raf = null;
    hero.addEventListener("mousemove", function (e) {
      var rect = hero.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        bg.style.transform = "translate3d(" + (x * -16).toFixed(1) + "px," + (y * -12).toFixed(1) + "px,0)";
        raf = null;
      });
    });
    hero.addEventListener("mouseleave", function () {
      bg.style.transform = "";
    });
  }

  /* ---- Hero: carrusel de fondo con crossfade ---- */
  function initHeroCarousel() {
    var stage = $("[data-hero-carousel]");
    if (!stage) return;
    var slides = $$("img", stage);
    if (slides.length < 2) return;

    // Loop < 4s cuenta como "intrusivo" — respeta prefers-reduced-motion (queda fija la 1a foto)
    if (reduced) return;

    var current = 0;
    var timer = null;

    function goTo(next) {
      slides[current].classList.remove("is-active");
      slides[next].classList.add("is-active");
      current = next;
    }

    function tick() {
      goTo((current + 1) % slides.length);
    }

    function start() {
      if (timer) return;
      timer = setInterval(tick, 5000);
    }
    function stop() {
      clearInterval(timer);
      timer = null;
    }

    start();
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });
  }

  /* ---- Galería: filtro por categoría ---- */
  function initGalleryFilter() {
    var menu = $(".gallery-filter-menu");
    var grid = $("[data-gallery-grid]");
    if (!menu || !grid) return;
    var buttons = $$(".gallery-filter", menu);
    var items = $$("[data-cat]", grid);
    var results = $("[data-gallery-results]");
    if (!buttons.length) return;

    function select(filter) {
      buttons.forEach(function (b) {
        b.setAttribute("aria-selected", b.getAttribute("data-filter") === filter ? "true" : "false");
      });
      items.forEach(function (el) {
        el.hidden = el.getAttribute("data-cat") !== filter;
      });
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        select(b.getAttribute("data-filter"));
        if (results) {
          var y = results.getBoundingClientRect().top + window.scrollY - 110;
          window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
        }
      });
    });

    select(buttons[0].getAttribute("data-filter"));
  }

  /* ---- Servicios: filtro por categoría (menú de precios) ---- */
  function initServicesFilter() {
    var menu = $(".services-filter-menu");
    var results = $("[data-services-results]");
    if (!menu || !results) return;
    var buttons = $$(".gallery-filter", menu);
    var panels = $$("[data-services-panel]");
    var hint = $("[data-services-hint]");
    if (!buttons.length || !panels.length) return;

    function select(filter) {
      buttons.forEach(function (b) {
        b.setAttribute("aria-selected", b.getAttribute("data-filter") === filter ? "true" : "false");
      });
      panels.forEach(function (el) {
        el.hidden = el.getAttribute("data-cat") !== filter;
      });
      if (hint) hint.hidden = true;
    }

    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        select(b.getAttribute("data-filter"));
        var y = results.getBoundingClientRect().top + window.scrollY - 110;
        window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
      });
    });

    panels.forEach(function (el) { el.hidden = true; });
  }

  /* ---- Header: sombra/estado al hacer scroll ---- */
  function initHeaderState() {
    var header = $(".site-header");
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- Fondo de video fijo (todas las páginas) — se pausa si el usuario pide menos movimiento ---- */
  function initSiteVideoBg() {
    var video = $(".site-video-bg video");
    if (!video) return;
    if (reduced) {
      video.removeAttribute("autoplay");
      video.pause();
      return;
    }
    video.muted = true;
    var playPromise = video.play();
    if (playPromise && playPromise.catch) playPromise.catch(function () {});
  }

  /* ---- Formulario de contacto: envío real por Formspree, tarjeta de éxito, luego el formulario reaparece vacío ---- */
  function initContactForm() {
    var form = $("[data-contact-form]");
    if (!form) return;
    var wrap = form.closest(".contact-form-wrap");
    var successEl = wrap ? $(".form-success", wrap) : null;
    var status = $(".form-status", form);
    var submitBtn = $('button[type="submit"]', form);

    function showStatus(text, ok) {
      if (!status) return;
      status.textContent = text;
      status.className = "form-status " + (ok ? "form-status--ok" : "form-status--err") + " is-visible";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;

      var action = form.getAttribute("action") || "";
      if (!action || action.indexOf("REPLACE_WITH_FORM_ID") !== -1) {
        showStatus("This form isn't connected yet — call us at (210) 314-2896 and we'll help right away.", false);
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      fetch(action, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      }).then(function (response) {
        if (response.ok) {
          if (status) status.className = "form-status";
          form.reset();
          if (successEl) {
            form.style.display = "none";
            successEl.hidden = false;
            setTimeout(function () {
              successEl.hidden = true;
              form.style.display = "";
            }, 4500);
          } else {
            showStatus("Thanks — your message is on its way. We'll get back to you soon.", true);
          }
        } else {
          showStatus("Something went wrong sending your message. Please call us at (210) 314-2896 instead.", false);
        }
      }).catch(function () {
        showStatus("Something went wrong sending your message. Please call us at (210) 314-2896 instead.", false);
      }).finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
    });
  }

  function boot() {
    safe(initNav, "initNav");
    safe(initSmoothAnchors, "initSmoothAnchors");
    safe(initReveals, "initReveals");
    safe(initHeroCarousel, "initHeroCarousel");
    safe(initHeroTitleReveal, "initHeroTitleReveal");
    safe(initHeroParallax, "initHeroParallax");
    safe(initGalleryFilter, "initGalleryFilter");
    safe(initServicesFilter, "initServicesFilter");
    safe(initHeaderState, "initHeaderState");
    safe(initSiteVideoBg, "initSiteVideoBg");
    safe(initContactForm, "initContactForm");
    document.documentElement.classList.add("is-ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
