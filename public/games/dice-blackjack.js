const PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};

// Merkt sich, welche Würfe schon angezeigt wurden, damit nur neue animiert werden.
const seen = new Set();

function die(h, value, { big = false, fresh = false } = {}) {
  return h("div", { class: `die${big ? " big" : ""}${fresh ? " new" : ""}`, "aria-label": String(value) },
    Array.from({ length: 9 }, (_, i) => h("span", { class: `pip${PIPS[value].includes(i) ? " on" : ""}` })));
}

export function renderDiceBlackjack({ room, me, send, h, isHost }) {
  const s = room.game.view;
  const current = s.players[s.currentIndex];
  const myTurn = s.phase === "turn" && current?.id === me;
  const nameOf = (id) => s.players.find((p) => p.id === id)?.name ?? "?";
  const act = (action) => send({ t: "action", action });

  const playerCard = (p) => {
    const hearts = "❤️".repeat(p.lives) + "🖤".repeat(Math.max(0, 4 - p.lives));
    const connected = room.members.find((m) => m.id === p.id)?.connected ?? true;
    const totalClass = p.status === "busted" ? " bust" : p.total === s.target ? " hit21" : "";
    return h("div", { class: `pl${p === current && s.phase === "turn" ? " current" : ""}${p.status === "out" ? " out" : ""}` },
      h("div", { class: "pl-head" },
        h("div", {},
          h("div", { class: "pl-name" }, p.name, p.id === me ? " (du)" : ""),
          h("div", { class: "lives", title: `${p.lives} Leben` }, hearts, " ",
            p.lives === 1 ? h("span", { class: "tag swim" }, "🏊 Schwimmer") : null,
            p.status === "busted" ? h("span", { class: "tag bust" }, "überkauft") : null,
            p.status === "stood" ? h("span", { class: "tag" }, "steht") : null,
            p.status === "out" ? h("span", { class: "tag out" }, "raus") : null,
            !connected ? h("span", { class: "tag out" }, "getrennt") : null),
        ),
        h("div", { class: `total${totalClass}` }, p.status === "out" ? "" : String(p.total)),
      ),
      p.rolls.length
        ? h("div", { class: "rolls" }, p.rolls.map((throwDice, i) => {
            const key = `${s.round}:${p.id}:${i}`;
            const fresh = !seen.has(key);
            seen.add(key);
            return h("div", { class: "throw" }, throwDice.map((v) => die(h, v, { fresh })));
          }))
        : null,
    );
  };

  let controls;
  if (s.phase === "turn") {
    controls = myTurn
      ? h("div", { class: "stack" },
          h("div", { class: "muted", style: "text-align:center" },
            `Deine Summe: ${current.total} – noch ${s.target - current.total} bis ${s.target}`),
          h("div", { class: "row" }, [1, 2, 3].slice(0, s.maxDice).map((n) =>
            h("button", { onclick: () => act({ type: "roll", dice: n }) }, `🎲 ${n}`))),
          h("button", { class: "secondary", disabled: current.rolls.length === 0, onclick: () => act({ type: "stand" }) },
            "Stehen bleiben"),
        )
      : h("div", { class: "card banner" }, h("div", {}, `${current.name} ist am Zug …`));
  } else if (s.phase === "roundOver") {
    const r = s.lastResult;
    controls = h("div", { class: "card banner stack" },
      h("div", { class: "big" }, r.voided
        ? "Alle hätten verloren – die Runde zählt nicht!"
        : `${r.loserIds.map(nameOf).join(", ")} ${r.loserIds.length > 1 ? "verlieren" : "verliert"} ein Leben`),
      r.eliminatedIds.length ? h("div", {}, `${r.eliminatedIds.map(nameOf).join(", ")} ist raus!`) : null,
      h("button", { onclick: () => act({ type: "nextRound" }) }, "Nächste Runde"),
    );
  } else {
    controls = h("div", { class: "card banner stack" },
      h("div", { class: "big" }, `🏆 ${nameOf(s.winnerId)} gewinnt!`),
      isHost
        ? h("button", { onclick: () => send({ t: "lobby" }) }, "Zurück zur Lobby")
        : h("p", { class: "muted" }, "Warte auf den Gastgeber …"),
    );
  }

  return h("div", {},
    h("div", { class: "muted", style: "margin-bottom:8px;display:flex;justify-content:space-between" },
      h("span", {}, `Würfel-Blackjack · Runde ${s.round}`), h("span", {}, `Raum ${room.code}`)),
    h("div", { class: "players" }, s.players.map(playerCard)),
    h("div", { class: "controls" }, controls),
    isHost && s.phase !== "gameOver"
      ? h("button", { class: "danger", style: "margin-top:16px",
          onclick: () => confirm("Spiel für alle abbrechen?") && send({ t: "lobby" }) }, "Spiel abbrechen")
      : null,
  );
}
