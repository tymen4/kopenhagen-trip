import { getState, addToPlan, skip, unskip, removeFromPlan, markDone, resetDay, resetAll } from "./storage.js";
import { renderMap } from "./map.js";

let activities = [];
const root = document.getElementById("root");

async function boot() {
  activities = await fetch("data/activities.json").then((r) => r.json());
  // Shuffle activities so the order feels fresh each session
  for (let i = activities.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activities[i], activities[j]] = [activities[j], activities[i]];
  }
  renderHome();
}

// ── HOME ──

function renderHome() {
  const s = getState();
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long", month: "long", day: "numeric",
  });

  root.innerHTML = `
    <div class="home">
      <h1>Copenhagen,<br>together</h1>
      <p class="home-date">${today}</p>
      <button id="start-btn" class="big-btn">Pick activities</button>
      ${s.plan.length > 0 ? `<button id="plan-btn" class="big-btn outline">Today's plan (${s.plan.length})</button>` : ""}
      ${s.done.length > 0 ? `<button id="done-btn" class="link-btn">Already done (${s.done.length})</button>` : ""}
      <button id="reset-day-btn" class="link-btn">New day — reset picks</button>
    </div>
  `;

  document.getElementById("start-btn").addEventListener("click", () => renderSwipe(0));
  if (s.plan.length > 0) {
    document.getElementById("plan-btn").addEventListener("click", renderPlan);
  }
  if (s.done.length > 0) {
    document.getElementById("done-btn").addEventListener("click", renderDoneList);
  }
  document.getElementById("reset-day-btn").addEventListener("click", () => {
    resetDay();
    renderHome();
  });
}

// ── SWIPE CARDS ──

function getAvailableActivities() {
  const s = getState();
  const seen = new Set([...s.done]);
  return activities.filter((a) => !seen.has(a.id));
}

function renderSwipe(index) {
  const available = getAvailableActivities();
  const s = getState();

  if (index >= available.length || available.length === 0) {
    renderEndOfStack();
    return;
  }

  const a = available[index];
  const inPlan = s.plan.includes(a.id);
  const isSkipped = s.skipped.includes(a.id);
  const progress = `${index + 1} / ${available.length}`;

  root.innerHTML = `
    <div class="swipe-screen">
      <div class="swipe-top-bar">
        <button id="back-home-btn" class="icon-btn">✕</button>
        <span class="progress">${progress}</span>
        <button id="plan-peek-btn" class="icon-btn plan-count">${s.plan.length}</button>
      </div>
      <div class="card ${isSkipped ? "card-skipped" : ""} ${inPlan ? "card-added" : ""}" id="swipe-card">
        <div class="card-image" style="${a.photo ? `background-image: url('${a.photo}')` : ""}">
          ${!a.photo ? `<span class="card-letter">${a.name[0]}</span>` : ""}
          <div class="card-gradient"></div>
          <div class="card-info">
            <h2>${a.name}</h2>
            <p class="card-meta">${a.duration} · ${a.cost}${a.time !== "any" ? ` · best ${a.time}` : ""}</p>
          </div>
        </div>
        <div class="card-vibe">
          <p>${a.vibe}</p>
        </div>
      </div>
      <div class="swipe-buttons">
        ${index > 0 ? `<button id="prev-btn" class="round-btn small">←</button>` : `<div></div>`}
        <button id="skip-btn" class="round-btn nope ${isSkipped ? "active" : ""}">✕</button>
        <button id="add-btn" class="round-btn yep ${inPlan ? "active" : ""}">♥</button>
        <button id="next-btn" class="round-btn small">→</button>
      </div>
    </div>
  `;

  document.getElementById("back-home-btn").addEventListener("click", renderHome);
  document.getElementById("plan-peek-btn").addEventListener("click", renderPlan);

  if (index > 0) {
    document.getElementById("prev-btn").addEventListener("click", () => renderSwipe(index - 1));
  }

  document.getElementById("skip-btn").addEventListener("click", () => {
    if (isSkipped) {
      unskip(a.id);
    } else {
      skip(a.id);
    }
    animateCard("left", () => renderSwipe(index + 1));
  });

  document.getElementById("add-btn").addEventListener("click", () => {
    if (inPlan) {
      removeFromPlan(a.id);
    } else {
      addToPlan(a.id);
    }
    animateCard("right", () => renderSwipe(index + 1));
  });

  document.getElementById("next-btn").addEventListener("click", () => {
    renderSwipe(index + 1);
  });

  // Touch swipe support
  let startX = 0;
  let currentX = 0;
  let dragging = false;
  const card = document.getElementById("swipe-card");

  card.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    dragging = true;
    card.style.transition = "none";
  });

  card.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    currentX = e.touches[0].clientX - startX;
    const rotate = currentX * 0.05;
    card.style.transform = `translateX(${currentX}px) rotate(${rotate}deg)`;
    card.style.opacity = Math.max(0.5, 1 - Math.abs(currentX) / 400);
  });

  card.addEventListener("touchend", () => {
    if (!dragging) return;
    dragging = false;
    card.style.transition = "transform 0.3s, opacity 0.3s";

    if (currentX > 100) {
      addToPlan(a.id);
      animateCard("right", () => renderSwipe(index + 1));
    } else if (currentX < -100) {
      skip(a.id);
      animateCard("left", () => renderSwipe(index + 1));
    } else {
      card.style.transform = "";
      card.style.opacity = "1";
    }
    currentX = 0;
  });
}

function animateCard(direction, callback) {
  const card = document.getElementById("swipe-card");
  if (!card) { callback(); return; }
  const x = direction === "right" ? 400 : -400;
  card.style.transition = "transform 0.3s ease, opacity 0.3s ease";
  card.style.transform = `translateX(${x}px) rotate(${x * 0.05}deg)`;
  card.style.opacity = "0";
  setTimeout(callback, 280);
}

function renderEndOfStack() {
  const s = getState();
  root.innerHTML = `
    <div class="end-screen">
      <h2>That's all of them!</h2>
      <p>${s.plan.length > 0 ? `You picked ${s.plan.length} activities.` : "You didn't pick anything yet."}</p>
      ${s.plan.length > 0 ? `<button id="see-plan-btn" class="big-btn">See today's plan</button>` : ""}
      <button id="browse-again-btn" class="big-btn outline">Browse again</button>
      <button id="go-home-btn" class="link-btn">Home</button>
    </div>
  `;

  if (s.plan.length > 0) {
    document.getElementById("see-plan-btn").addEventListener("click", renderPlan);
  }
  document.getElementById("browse-again-btn").addEventListener("click", () => renderSwipe(0));
  document.getElementById("go-home-btn").addEventListener("click", renderHome);
}

// ── PLAN ──

function renderPlan() {
  const s = getState();
  const planActivities = s.plan
    .map((id) => activities.find((a) => a.id === id))
    .filter(Boolean);

  if (planActivities.length === 0) {
    root.innerHTML = `
      <div class="end-screen">
        <h2>No activities picked yet</h2>
        <p>Go swipe some cards!</p>
        <button id="go-swipe-btn" class="big-btn">Pick activities</button>
        <button id="go-home-btn" class="link-btn">Home</button>
      </div>
    `;
    document.getElementById("go-swipe-btn").addEventListener("click", () => renderSwipe(0));
    document.getElementById("go-home-btn").addEventListener("click", renderHome);
    return;
  }

  root.innerHTML = `
    <div class="plan-screen">
      <div class="plan-header">
        <button id="plan-back-btn" class="icon-btn">←</button>
        <h2>Today's plan</h2>
        <button id="add-more-btn" class="icon-btn">+</button>
      </div>
      <div id="plan-map" class="plan-map"></div>
      <ul class="plan-list">
        ${planActivities
          .map(
            (a, i) => `
          <li class="plan-item" data-id="${a.id}">
            <div class="plan-item-head">
              <span class="plan-num">${i + 1}</span>
              <div class="plan-item-info">
                <div class="plan-item-name">${a.name}</div>
                <div class="plan-item-meta">${a.duration} · ${a.cost}</div>
              </div>
            </div>
            <div class="plan-item-actions">
              <a class="maps-link" target="_blank" rel="noopener"
                 href="https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}">Maps</a>
              <button class="done-action" data-id="${a.id}">Done ✓</button>
              <button class="remove-action" data-id="${a.id}">✕</button>
            </div>
          </li>`
          )
          .join("")}
      </ul>
    </div>
  `;

  renderMap(document.getElementById("plan-map"), planActivities);

  document.getElementById("plan-back-btn").addEventListener("click", renderHome);
  document.getElementById("add-more-btn").addEventListener("click", () => renderSwipe(0));

  root.querySelectorAll(".done-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      markDone(btn.dataset.id);
      renderPlan();
    });
  });

  root.querySelectorAll(".remove-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromPlan(btn.dataset.id);
      renderPlan();
    });
  });
}

// ── DONE LIST ──

function renderDoneList() {
  const s = getState();
  const items = s.done
    .map((id) => activities.find((a) => a.id === id))
    .filter(Boolean);

  root.innerHTML = `
    <div class="plan-screen">
      <div class="plan-header">
        <button id="back-btn" class="icon-btn">←</button>
        <h2>Done (${items.length})</h2>
        <button id="reset-all-btn" class="icon-btn" title="Reset all">↺</button>
      </div>
      <ul class="plan-list">
        ${items
          .map(
            (a) => `
          <li class="plan-item done">
            <div class="plan-item-head">
              <span class="plan-num">✓</span>
              <div class="plan-item-info">
                <div class="plan-item-name">${a.name}</div>
              </div>
            </div>
          </li>`
          )
          .join("")}
      </ul>
      ${items.length === 0 ? "<p style='text-align:center;color:var(--muted)'>Nothing done yet</p>" : ""}
    </div>
  `;

  document.getElementById("back-btn").addEventListener("click", renderHome);
  document.getElementById("reset-all-btn").addEventListener("click", () => {
    if (confirm("Reset everything? This clears your done list too.")) {
      resetAll();
      renderHome();
    }
  });
}

boot();
