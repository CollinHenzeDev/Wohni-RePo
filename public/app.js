import { renderDiceBlackjack } from "./games/dice-blackjack.js";

const app = document.getElementById("app");
const conn = document.getElementById("conn");
const toastEl = document.getElementById("toast");
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
      render();
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
  const select = h("select", { hidden: games.length < 2 },
    games.map((g) => h("option", { value: g.id }, g.name)));
  return h("div", {},
    h("div", { class: "card" },
      h("p", { class: "muted", style: "text-align:center;margin:0" }, "Raum-Code"),
      h("div", { class: "roomcode" }, room.code),
      h("p", { class: "muted", style: "text-align:center;word-break:break-all" }, link),
    ),
    h("div", { class: "card" },
      h("h2", {}, `Spieler (${room.members.length})`),
      h("ul", { class: "plain" }, room.members.map((m) =>
        h("li", {},
          h("span", {}, m.name, m.id === me ? " (du)" : ""),
          h("span", {},
            m.id === room.hostId ? h("span", { class: "tag" }, "Gastgeber") : null,
            !m.connected ? h("span", { class: "tag out" }, "getrennt") : null),
        ))),
    ),
    h("div", { class: "card stack" },
      h("h2", {}, games.length > 1 ? "Spiel wählen" : games[0]?.name ?? "Spiel"),
      select,
      isHost
        ? h("button", { onclick: () => send({ t: "start", gameId: select.value || games[0].id }) }, "Spiel starten")
        : h("p", { class: "muted" }, "Warte auf den Gastgeber …"),
      h("button", { class: "danger", onclick: () => send({ t: "leave" }) }, "Raum verlassen"),
    ),
  );
}

render();
connect();
