(function () {
  const predio = window.PREDIO;
  const destacadas = window.DESTACADAS || [];
  const gallery = window.GALLERY || [];
  const planos = window.PLANOS || [];
  const videos = window.VIDEOS || [];
  const contacto = window.CONTACTO || {};
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElement(tag);
    // `loading` debe ir antes que `src`; si no, la imagen se descarga de inmediato.
    if (attrs.loading) node.setAttribute("loading", attrs.loading);
    Object.entries(attrs).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "html") node.innerHTML = v;
      else node.setAttribute(k, v);
    });
    children.forEach((c) => c && node.appendChild(c));
    return node;
  };
  const icon = (name) => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("class", "i");
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(ns, "use");
    use.setAttribute("href", `#i-${name}`);
    svg.appendChild(use);
    return svg;
  };
  const fmt = (n) => n.toLocaleString("es-MX");

  /* ---------- Navegación ---------- */
  const nav = $("#nav");
  const toggle = $(".nav-toggle");
  const links = $("#nav-links");
  const hero = $("#inicio");
  const mobileCta = $(".mobile-cta");

  const setMenu = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    document.body.classList.toggle("menu-open", open);
  };
  toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  links.addEventListener("click", (e) => {
    if (e.target.closest("a")) setMenu(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) setMenu(false);
  });

  // La barra es transparente solo arriba del todo; al hacer scroll se vuelve sólida.
  const topSentinel = el("div", { "aria-hidden": "true", style: "position:absolute;top:0;left:0;width:1px;height:40px" });
  document.body.prepend(topSentinel);
  new IntersectionObserver(([entry]) => nav.classList.toggle("is-solid", !entry.isIntersecting)).observe(topSentinel);
  new IntersectionObserver(([entry]) => mobileCta.classList.toggle("is-visible", !entry.isIntersecting), {
    rootMargin: "-80px 0px 0px 0px",
  }).observe(hero);

  new IntersectionObserver(
    ([entry]) => mobileCta.classList.toggle("is-hidden", entry.isIntersecting),
    { threshold: 0.2 }
  ).observe($("#contacto"));

  const navLinks = $$('.nav-links a[href^="#"]:not(.nav-cta)');
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  navLinks.forEach((a) => {
    const target = $(a.getAttribute("href"));
    if (target) sectionObserver.observe(target);
  });

  /* ---------- Aparición al hacer scroll ---------- */
  const revealObserver = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          obs.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "0px 0px -8% 0px" }
  );
  const watchReveal = (root = document) => $$(".reveal:not(.is-in)", root).forEach((n) => revealObserver.observe(n));

  /* ---------- Visor (lightbox) ---------- */
  const lb = $("#lightbox");
  const lbImg = $("#lb-img");
  const lbStage = $("#lb-stage");
  const lbCount = $("#lb-count");
  const lbCaption = $("#lb-caption");
  const lbPdf = $("#lb-pdf");
  let lbItems = [];
  let lbIndex = 0;

  function lbShow(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    const item = lbItems[lbIndex];
    lbStage.classList.add("is-loading");
    lbImg.onload = () => lbStage.classList.remove("is-loading");
    lbImg.removeAttribute("src");
    if (item.srcset) {
      lbImg.srcset = item.srcset;
      lbImg.sizes = "100vw";
    } else {
      lbImg.removeAttribute("srcset");
    }
    lbImg.src = item.src;
    lbImg.alt = item.caption || "";
    lbCount.textContent = `${lbIndex + 1} / ${lbItems.length}`;
    lbCaption.textContent = item.caption || "";
    lbPdf.hidden = !item.pdf;
    if (item.pdf) lbPdf.href = item.pdf;
    // Precarga las vecinas para que avanzar sea inmediato.
    [lbIndex + 1, lbIndex - 1].forEach((n) => {
      const next = lbItems[(n + lbItems.length) % lbItems.length];
      const img = new Image();
      if (next.srcset) {
        img.srcset = next.srcset;
        img.sizes = "100vw";
      }
      img.src = next.src;
    });
  }

  function openLightbox(items, index) {
    lbItems = items;
    lb.classList.toggle("is-single", items.length < 2);
    lbShow(index);
    if (!lb.open) lb.showModal();
  }

  lb.addEventListener("click", (e) => {
    const action = e.target.closest("[data-lb]")?.dataset.lb;
    if (action === "close") lb.close();
    else if (action === "prev") lbShow(lbIndex - 1);
    else if (action === "next") lbShow(lbIndex + 1);
    else if (e.target === lbStage || e.target === lb) lb.close();
  });
  lb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") lbShow(lbIndex - 1);
    if (e.key === "ArrowRight") lbShow(lbIndex + 1);
  });
  lb.addEventListener("close", () => {
    lbImg.removeAttribute("src");
    lbImg.removeAttribute("srcset");
  });
  let touchX = null;
  lbStage.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  lbStage.addEventListener("touchend", (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 45) lbShow(lbIndex + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- Fotos destacadas ---------- */
  const destacadasItems = destacadas.map((d) => ({
    src: d.src,
    srcset: `${d.thumb} 720w, ${d.src} ${d.w}w`,
    caption: d.alt,
  }));
  const mosaic = $("#destacadas");
  // La primera destacada ya es la portada; el mosaico muestra las demás.
  destacadas.slice(1).forEach((d, n) => {
    const i = n + 1;
    const btn = el("button", { type: "button", class: "mosaic-item", "aria-label": `Ampliar: ${d.alt}` }, [
      el("img", {
        loading: "lazy",
        src: d.thumb,
        srcset: `${d.thumb} 720w, ${d.src} ${d.w}w`,
        sizes: n === 0 ? "(min-width: 980px) 600px, 100vw" : "(min-width: 980px) 200px, 33vw",
        width: d.w,
        height: d.h,
        alt: d.alt,
        loading: "lazy",
        decoding: "async",
      }),
    ]);
    btn.addEventListener("click", () => openLightbox(destacadasItems, i));
    mosaic.appendChild(btn);
  });

  /* ---------- Plano esquemático (SVG) ---------- */
  (function drawSitePlan() {
    const svg = $("#siteplan");
    if (!svg || !predio) return;
    const ns = "http://www.w3.org/2000/svg";
    const lat0 = predio.centro[0];
    const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
    const ky = 110540;
    const project = ([lat, lng]) => [(lng - predio.centro[1]) * kx, -(lat - lat0) * ky];
    const shapes = predio.poligonos.map((p) => ({ p, pts: p.coords.map(project) }));
    const all = shapes.flatMap((s) => s.pts);
    const xs = all.map((q) => q[0]);
    const ys = all.map((q) => q[1]);
    const pad = 22;
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const w = Math.max(...xs) - minX + pad;
    const h = Math.max(...ys) - minY + pad + 18;
    svg.setAttribute("viewBox", `${minX.toFixed(1)} ${minY.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);

    const grid = document.createElementNS(ns, "g");
    grid.setAttribute("class", "sp-grid");
    for (let x = Math.ceil(minX / 25) * 25; x < minX + w; x += 25) {
      const l = document.createElementNS(ns, "line");
      Object.entries({ x1: x, x2: x, y1: minY, y2: minY + h }).forEach(([k, v]) => l.setAttribute(k, v));
      grid.appendChild(l);
    }
    for (let y = Math.ceil(minY / 25) * 25; y < minY + h; y += 25) {
      const l = document.createElementNS(ns, "line");
      Object.entries({ x1: minX, x2: minX + w, y1: y, y2: y }).forEach(([k, v]) => l.setAttribute(k, v));
      grid.appendChild(l);
    }
    svg.appendChild(grid);

    shapes.forEach(({ p, pts }) => {
      const g = document.createElementNS(ns, "g");
      g.setAttribute("class", "sp-poly");
      g.dataset.poli = p.id;
      g.style.setProperty("--c", p.color);
      const poly = document.createElementNS(ns, "polygon");
      poly.setAttribute("points", pts.map((q) => q.map((n) => n.toFixed(2)).join(",")).join(" "));
      const title = document.createElementNS(ns, "title");
      title.textContent = `${p.nombre} · ${fmt(p.areaM2)} m²`;
      poly.appendChild(title);
      g.appendChild(poly);
      // Etiqueta en el centroide aproximado.
      const cx = pts.reduce((a, q) => a + q[0], 0) / pts.length;
      const cy = pts.reduce((a, q) => a + q[1], 0) / pts.length;
      const badge = document.createElementNS(ns, "circle");
      badge.setAttribute("cx", cx);
      badge.setAttribute("cy", cy);
      badge.setAttribute("r", 7);
      const num = document.createElementNS(ns, "text");
      num.setAttribute("x", cx);
      num.setAttribute("y", cy);
      num.textContent = p.id;
      g.append(badge, num);
      svg.appendChild(g);
    });

    // Barra de escala de 50 m y flecha norte.
    const sx = minX + pad;
    const sy = minY + h - 14;
    const scale = document.createElementNS(ns, "g");
    scale.setAttribute("class", "sp-scale");
    scale.innerHTML = `<rect x="${sx}" y="${sy}" width="25" height="3"/><rect x="${sx + 25}" y="${sy}" width="25" height="3" class="alt"/><text x="${sx}" y="${sy - 4}">0</text><text x="${sx + 50}" y="${sy - 4}" text-anchor="end">50 m</text>`;
    svg.appendChild(scale);
    const north = document.createElementNS(ns, "g");
    north.setAttribute("class", "sp-north");
    const nx = minX + w - pad;
    const ny = minY + pad;
    north.innerHTML = `<path d="M${nx} ${ny - 10} l5 14 -5 -4 -5 4z"/><text x="${nx}" y="${ny + 14}">N</text>`;
    svg.appendChild(north);

    // Vincula tarjetas y polígonos.
    const highlight = (id) => {
      $$(".sp-poly", svg).forEach((g) => g.classList.toggle("is-dim", id != null && g.dataset.poli !== String(id)));
      $$(".poli").forEach((c) => c.classList.toggle("is-active", c.dataset.poli === String(id)));
    };
    $$(".poli").forEach((card) => {
      card.addEventListener("mouseenter", () => highlight(card.dataset.poli));
      card.addEventListener("mouseleave", () => highlight(null));
    });
    $$(".sp-poly", svg).forEach((g) => {
      g.addEventListener("mouseenter", () => highlight(g.dataset.poli));
      g.addEventListener("mouseleave", () => highlight(null));
    });
  })();

  /* ---------- Mapa (Leaflet se carga solo al acercarse) ---------- */
  const mapEl = $("#mapa");
  let map = null;
  let polyLayers = {};
  let groupBounds = null;
  let pendingFocus = null;

  function loadLeaflet() {
    return new Promise((resolve, reject) => {
      if (window.L) return resolve(window.L);
      const css = el("link", {
        rel: "stylesheet",
        href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
        integrity: "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=",
        crossorigin: "",
      });
      const js = el("script", {
        src: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
        integrity: "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=",
        crossorigin: "",
      });
      js.onload = () => resolve(window.L);
      js.onerror = reject;
      document.head.append(css, js);
    });
  }

  function initMap(L) {
    mapEl.innerHTML = "";
    const sat = L.layerGroup([
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Imágenes © Esri",
        maxZoom: 19,
      }),
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, opacity: 0.85 }
      ),
    ]);
    const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    });
    map = L.map(mapEl, { center: predio.centro, zoom: 17, layers: [sat], scrollWheelZoom: false });
    // Evita que el mapa "secuestre" el scroll: el zoom con rueda se activa al hacer clic.
    map.on("click focus", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    const group = L.featureGroup();
    predio.poligonos.forEach((p) => {
      const layer = L.polygon(p.coords, { color: p.color, weight: 3, fillColor: p.fill, fillOpacity: 0.35 })
        .bindPopup(`<strong>${p.nombre}</strong><br>${p.etiqueta}<br>${fmt(p.areaM2)} m² · perímetro ≈ ${p.perimetroM} m`)
        .bindTooltip(`P${p.id}`, { permanent: true, direction: "center", className: "poly-label" });
      layer.addTo(group);
      polyLayers[p.id] = layer;
    });
    group.addTo(map);
    groupBounds = group.getBounds();
    map.fitBounds(groupBounds.pad(0.15));

    $$("[data-layer]").forEach((btn) =>
      btn.addEventListener("click", () => {
        const useSat = btn.dataset.layer === "sat";
        map.removeLayer(useSat ? osm : sat);
        (useSat ? sat : osm).addTo(map);
        $$("[data-layer]").forEach((b) => b.classList.toggle("is-active", b === btn));
      })
    );
    if (pendingFocus) focusPoly(pendingFocus);
  }

  function focusPoly(id) {
    if (!map) {
      pendingFocus = id;
      return;
    }
    $$("[data-focus]").forEach((b) => b.classList.toggle("is-active", b.dataset.focus === String(id)));
    if (id === "all") {
      map.flyToBounds(groupBounds.pad(0.15), { duration: reduceMotion ? 0 : 0.8 });
      return;
    }
    const layer = polyLayers[id];
    map.flyToBounds(layer.getBounds().pad(0.35), { duration: reduceMotion ? 0 : 0.8 });
    layer.openPopup();
  }
  $$("[data-focus]").forEach((btn) => btn.addEventListener("click", () => focusPoly(btn.dataset.focus)));

  if (mapEl && predio) {
    const mapObserver = new IntersectionObserver(
      ([entry], obs) => {
        if (!entry.isIntersecting) return;
        obs.disconnect();
        loadLeaflet()
          .then(initMap)
          .catch(() => {
            mapEl.innerHTML =
              '<div class="map-placeholder"><span>No se pudo cargar el mapa. Usa “Abrir en Google Maps”.</span></div>';
          });
      },
      { rootMargin: "600px 0px" }
    );
    mapObserver.observe(mapEl);
  }

  /* ---------- Planos ---------- */
  const planosItems = planos.map((p, i) => ({
    src: p.src,
    caption: `Lámina ${i + 1} · ${p.titulo}`,
    pdf: p.pdf,
  }));
  const planosGrid = $("#planos-grid");
  planos.forEach((p, i) => {
    const open = el("button", { type: "button", class: "plano-open", "aria-label": `Ver lámina ${i + 1}: ${p.titulo}` }, [
      el("img", { src: p.thumb, width: 520, height: Math.round((520 * p.h) / p.w), alt: "", loading: "lazy", decoding: "async" }),
    ]);
    open.addEventListener("click", () => openLightbox(planosItems, i));
    const meta = el("div", { class: "plano-meta" }, [
      el("span", { class: "plano-num", text: `Lámina ${i + 1}` }),
      el("strong", { text: p.titulo }),
    ]);
    if (p.pdf) {
      const dl = el("a", { class: "plano-pdf", href: p.pdf, download: `Plano-${i + 1}-predio-Colima.pdf` }, [icon("down")]);
      dl.append(" PDF");
      meta.appendChild(dl);
    }
    planosGrid.appendChild(el("article", { class: "plano reveal" }, [open, meta]));
  });

  /* ---------- Galería ---------- */
  const galleryItems = gallery.map((g, i) => ({
    src: g.src,
    srcset: `${g.md} 1024w, ${g.src} ${g.w}w`,
    caption: `Foto ${i + 1} del predio`,
  }));
  const grid = $("#gallery");
  const moreBtn = $("#gallery-more");
  const firstBatch = window.matchMedia("(min-width: 700px)").matches ? 13 : 8;
  let shown = 0;

  function renderGallery(count) {
    const end = Math.min(gallery.length, shown + count);
    const frag = document.createDocumentFragment();
    for (let i = shown; i < end; i++) {
      const g = gallery[i];
      const btn = el("button", { type: "button", class: "g-item", "aria-label": `Ver foto ${i + 1} de ${gallery.length}` }, [
        el("img", {
          src: g.thumb,
          srcset: `${g.thumb} 400w, ${g.md} 1024w`,
          sizes: i === 0 ? "(min-width: 980px) 560px, 100vw" : "(min-width: 980px) 280px, 50vw",
          width: g.w,
          height: g.h,
          alt: `Foto ${i + 1} del predio`,
          loading: "lazy",
          decoding: "async",
        }),
      ]);
      btn.addEventListener("click", () => openLightbox(galleryItems, i));
      frag.appendChild(btn);
    }
    grid.appendChild(frag);
    shown = end;
    moreBtn.hidden = shown >= gallery.length;
    moreBtn.lastChild.textContent = ` Mostrar más fotos (${gallery.length - shown} restantes)`;
  }
  if (gallery.length) {
    renderGallery(firstBatch);
    moreBtn.addEventListener("click", () => renderGallery(24));
    $("#gallery-count").textContent = `Ver las ${gallery.length} fotos`;
    $("#open-all").addEventListener("click", () => openLightbox(galleryItems, 0));
  } else {
    $("#open-all").hidden = true;
  }

  /* ---------- Videos (el archivo solo se descarga al reproducir) ---------- */
  const videosEl = $("#videos");
  videos.forEach((v, i) => {
    const mins = `${Math.floor(v.duracion / 60)}:${String(v.duracion % 60).padStart(2, "0")}`;
    const card = el("button", { type: "button", class: "video-card reveal", "aria-label": `Reproducir video ${i + 1} (${mins})` }, [
      el("img", { src: v.poster, width: 960, height: 712, alt: "", loading: "lazy", decoding: "async" }),
      el("span", { class: "video-play", "aria-hidden": "true" }, [icon("play")]),
      el("span", { class: "video-meta" }, [el("b", { text: `Recorrido ${i + 1}` }), el("span", { text: mins })]),
    ]);
    card.addEventListener("click", () => {
      const video = el("video", {
        src: v.src,
        poster: v.poster,
        controls: "",
        autoplay: "",
        playsinline: "",
        preload: "auto",
        class: "video-card is-playing",
      });
      card.replaceWith(video);
      video.focus();
    });
    videosEl.appendChild(card);
  });

  /* ---------- Contacto ---------- */
  const digits = (s) => String(s || "").replace(/\D/g, "");
  const mensaje = contacto.mensaje || "Hola, me interesa el predio en Colima.";
  const wa = $('[data-contacto="whatsapp"]');
  const tel = $('[data-contacto="telefono"]');
  const mail = $('[data-contacto="email"]');
  if (digits(contacto.whatsapp)) {
    wa.href = `https://wa.me/${digits(contacto.whatsapp)}?text=${encodeURIComponent(mensaje)}`;
    wa.target = "_blank";
    wa.rel = "noopener";
    wa.hidden = false;
  }
  if (digits(contacto.telefono)) {
    tel.href = `tel:${digits(contacto.telefono)}`;
    tel.querySelector("span").textContent = contacto.telefono;
    tel.hidden = false;
  }
  mail.href = `mailto:${contacto.email || ""}?subject=${encodeURIComponent(
    "Interés en predio Colima (antiguas instalaciones del tren)"
  )}&body=${encodeURIComponent(mensaje)}`;

  watchReveal();
})();
