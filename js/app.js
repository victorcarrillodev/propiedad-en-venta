(function () {
  const predio = window.PREDIO;
  const gallery = window.GALLERY || [];
  const videos = window.VIDEOS || [];

  const sat = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { attribution: "Teselas © Esri", maxZoom: 19 }
  );
  const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 19,
  });

  const map = L.map("mapa", {
    center: predio.centro,
    zoom: 17,
    layers: [sat],
  });

  const group = L.featureGroup();
  predio.poligonos.forEach((p) => {
    const layer = L.polygon(p.coords, {
      color: p.color,
      weight: 3,
      fillColor: p.fill,
      fillOpacity: 0.38,
    }).bindPopup(
      `<strong>${p.nombre}</strong><br>${p.etiqueta}<br>${p.areaM2.toLocaleString("es-MX")} m²`
    );
    layer.addTo(group);
  });
  group.addTo(map);
  map.fitBounds(group.getBounds().pad(0.18));
  setTimeout(() => map.invalidateSize(), 250);

  document.getElementById("btn-sat").addEventListener("click", () => {
    map.removeLayer(osm);
    if (!map.hasLayer(sat)) sat.addTo(map);
  });
  document.getElementById("btn-osm").addEventListener("click", () => {
    map.removeLayer(sat);
    if (!map.hasLayer(osm)) osm.addTo(map);
  });

  let index = 0;
  const slide = document.getElementById("slide");
  const meta = document.getElementById("g-meta");
  const thumbs = document.getElementById("thumbs");

  function show(i) {
    if (!gallery.length) return;
    index = (i + gallery.length) % gallery.length;
    const src = gallery[index];
    slide.src = encodeURI(src);
    meta.textContent = `${index + 1} / ${gallery.length}`;
    thumbs.querySelectorAll("button").forEach((b, n) => {
      b.classList.toggle("active", n === index);
    });
  }

  gallery.forEach((src, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    const img = document.createElement("img");
    img.src = encodeURI(src);
    img.alt = `Miniatura ${i + 1}`;
    img.loading = "lazy";
    btn.appendChild(img);
    btn.addEventListener("click", () => show(i));
    thumbs.appendChild(btn);
  });

  document.querySelector(".g-nav.prev").addEventListener("click", () => show(index - 1));
  document.querySelector(".g-nav.next").addEventListener("click", () => show(index + 1));
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(index - 1);
    if (e.key === "ArrowRight") show(index + 1);
  });
  show(0);

  const videosEl = document.getElementById("videos");
  videos.forEach((src) => {
    const v = document.createElement("video");
    v.src = encodeURI(src);
    v.controls = true;
    v.preload = "metadata";
    videosEl.appendChild(v);
  });
})();
