/* global L */

export function renderMap(container, activities) {
  container.innerHTML = "";
  const map = L.map(container, { zoomControl: false, attributionControl: false }).setView(
    [55.6761, 12.5683],
    12
  );
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  const bounds = [];
  activities.forEach((a, i) => {
    const icon = L.divIcon({
      className: "map-pin",
      html: `<span>${i + 1}</span>`,
      iconSize: [28, 28],
    });
    L.marker([a.lat, a.lng], { icon }).addTo(map).bindPopup(a.name);
    bounds.push([a.lat, a.lng]);
  });
  if (bounds.length > 0) map.fitBounds(bounds, { padding: [24, 24] });
  return map;
}
