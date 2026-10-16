import { renderDiceBlackjack } from "./games/dice-blackjack.js";
import { audio } from "./audio.js";

const app = document.getElementById("app");
const conn = document.getElementById("conn");
const toastEl = document.getElementById("toast");
const menuBtn = document.getElementById("menu-btn");
const overlay = document.getElementById("overlay");
const SESSION_KEY = "wohni-session";

const store = {
  get() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } },
  set(v) { try { localStorage.setItem(SESSION_KEY, JSON.stringify(v)); } catch {} },
  clear() { try { localStorage.removeItem(SESSION_KEY); } catch {} },
};

let ws;
let games = [];
let room = null;
let me = null;
let retry = 0;
let selectedGameId = null;

const gameRenderers = { "dice-blackjack": renderDiceBlackjack };

function connect() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${proto}://${location.host}`);
  ws.onopen = () => { retry = 0; conn.classList.add("on"); };
  ws.onclose = () => {
    conn.classList.remove("on");
    setTimeout(connect, Math.min(1000 * 2 ** retry++, 8000));
  };
  ws.onmessage = (e) => handle(JSON.parse(e.data));
}

export function send(msg) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  else toast("Keine Verbindung zum Server …");
}

function handle(msg) {
  switch (msg.t) {
    case "hello": {
      games = msg.games;
      const saved = store.get();
      if (saved) send({ t: "resume", code: saved.code, token: saved.token });
      else render();
      break;
    }
    case "joined":
      me = msg.playerId;
      store.set({ code: msg.code, token: msg.token });
      break;
    case "room":
      room = msg.room;
      render();
      break;
    case "resumeFailed":
    case "left":
      store.clear();
      room = me = null;
      closeMenu();
      render();
      if (msg.reason === "kicked") toast("Du wurdest aus dem Raum entfernt.");
      break;
    case "error":
      toast(msg.error);
      break;
  }
}

function toast(text) {
  toastEl.textContent = text;
  toastEl.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => (toastEl.hidden = true), 3000);
}

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c);
  return el;
}

function render() {
  menuBtn.hidden = !room?.game;
  if (menuBtn.hidden) closeMenu();
  if (!room) return app.replaceChildren(homeView());
  if (!room.game) return app.replaceChildren(lobbyView());
  const renderer = gameRenderers[room.game.id];
  app.replaceChildren(renderer({ room, me, send, h, isHost: room.hostId === me, rerender: render }));
}

function homeView() {
  const lastName = localStorage.getItem("wohni-name") ?? "";
  const name = h("input", { id: "name", maxlength: 20, placeholder: "Dein Name", value: lastName, autocomplete: "nickname" });
  const code = h("input", { class: "code", maxlength: 4, placeholder: "CODE", autocapitalize: "characters" });
  const getName = () => {
    const n = name.value.trim();
    if (!n) toast("Bitte gib einen Namen ein.");
    else localStorage.setItem("wohni-name", n);
    return n;
  };
  const codeFromUrl = new URLSearchParams(location.search).get("raum");
  if (codeFromUrl) code.value = codeFromUrl.toUpperCase();

  return h("div", {},
    h("div", { class: "card" }, h("label", { for: "name" }, "Name"), name),
    h("div", { class: "card stack" },
      h("h2", {}, "Neuen Raum erstellen"),
      h("button", { onclick: () => { const n = getName(); if (n) send({ t: "create", name: n }); } }, "Raum erstellen"),
    ),
    h("div", { class: "card" },
      h("h2", {}, "Raum beitreten"),
      code,
      h("button", { class: "secondary", onclick: () => {
        const n = getName();
        if (n) send({ t: "join", name: n, code: code.value.trim() });
      } }, "Beitreten"),
    ),
  );
}

function lobbyView() {
  const isHost = room.hostId === me;
  const link = `${location.origin}/?raum=${room.code}`;
  if (!games.some((g) => g.id === selectedGameId)) selectedGameId = games[0]?.id ?? null;

  const memberRow = (m) => h("li", {},
    h("span", {}, m.name, m.id === me ? " (du)" : ""),
    h("span", { class: "member-actions" },
      m.id === room.hostId ? h("span", { class: "tag" }, "Gastgeber") : null,
      !m.connected ? h("span", { class: "tag out" }, "getrennt") : null,
      isHost && m.id !== me
        ? [
            h("button", { class: "mini", title: "Zum Gastgeber machen", "aria-label": `${m.name} zum Gastgeber machen`,
              onclick: () => confirm(`${m.name} zum Gastgeber machen? Du kannst dann nicht mehr starten.`) && send({ t: "makeHost", memberId: m.id }) }, "👑"),
            h("button", { class: "mini danger", title: "Entfernen", "aria-label": `${m.name} entfernen`,
              onclick: () => confirm(`${m.name} aus dem Raum entfernen?`) && send({ t: "kick", memberId: m.id }) }, "✕"),
          ]
        : null),
  );

  const tile = (g) => h("button", {
    class: `tile${g.id === selectedGameId ? " selected" : ""}`,
    "aria-pressed": String(g.id === selectedGameId),
    disabled: !isHost,
    onclick: () => { selectedGameId = g.id; render(); },
  },
    h("span", { class: "tile-icon" }, g.icon),
    h("span", { class: "tile-name" }, g.name),
    h("span", { class: "tile-desc" }, g.description),
    h("span", { class: "tile-meta" }, `${g.minPlayers}–${g.maxPlayers} Spieler`),
  );

  return h("div", {},
    h("div", { class: "card" },
      h("p", { class: "muted", style: "text-align:center;margin:0" }, "Raum-Code"),
      h("div", { class: "roomcode" }, room.code),
      h("p", { class: "muted", style: "text-align:center;word-break:break-all" }, link),
    ),
    h("div", { class: "card" },
      h("h2", {}, `Spieler (${room.members.length})`),
      h("ul", { class: "plain" }, room.members.map(memberRow)),
    ),
    h("div", { class: "card stack" },
      h("h2", {}, "Spiel wählen"),
      h("div", { class: "tiles" }, games.map(tile)),
      isHost
        ? h("button", { onclick: () => send({ t: "start", gameId: selectedGameId }) }, "Spiel starten")
        : h("p", { class: "muted" }, "Warte auf den Gastgeber …"),
      h("button", { class: "danger", onclick: () => send({ t: "leave" }) }, "Raum verlassen"),
    ),
  );
}

// --- Menü im Spiel: Ton, Musik, Lautstärke, Spiel verlassen ---

function closeMenu() {
  overlay.hidden = true;
  overlay.replaceChildren();
}

function openMenu() {
  const cfg = audio.get();
  const volume = h("input", { type: "range", min: 0, max: 100, value: Math.round(cfg.volume * 100), "aria-label": "Lautstärke",
    oninput: () => audio.set({ volume: Number(volume.value) / 100 }) });
  const toggle = (label, key) => {
    const box = h("input", { type: "checkbox", class: "switch", checked: cfg[key], id: `opt-${key}`,
      onchange: () => audio.set({ [key]: box.checked }) });
    return h("div", { class: "menu-row" }, h("label", { for: `opt-${key}` }, label), box);
  };
  const isHost = room?.hostId === me;
  const leaveWarning = isHost
    ? "Spiel verlassen? Du scheidest aus, und die Gastgeber-Rolle geht an jemand anderen."
    : "Spiel verlassen? Du scheidest aus und kannst nicht wieder einsteigen.";

  overlay.replaceChildren(h("div", { class: "sheet", role: "dialog", "aria-label": "Menü" },
    h("div", { class: "sheet-head" }, h("h2", {}, "Menü"),
      h("button", { class: "icon-btn", "aria-label": "Schließen", onclick: closeMenu }, "✕")),
    h("div", { class: "card stack" },
      toggle("Töne", "sfx"),
      toggle("Musik", "music"),
      h("div", { class: "menu-row vol" }, h("label", {}, "Lautstärke"), volume),
    ),
    h("button", { class: "danger", onclick: () => confirm(leaveWarning) && send({ t: "leave" }) }, "Spiel verlassen"),
  ));
  overlay.hidden = false;
}

menuBtn.addEventListener("click", openMenu);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeMenu(); });

render();
connect();
