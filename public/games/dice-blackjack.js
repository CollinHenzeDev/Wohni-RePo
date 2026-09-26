const PIPS = {
  1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
};
const ANIM_MS = 850;
const MAX_HEARTS = 3;

// Modul-weiter Zustand für die Würfelbecher-Animation.
const revealed = new Set(); // Würfe, deren Becher schon "geöffnet" wurde
const pendingTimers = new Map(); // laufende Becher-Timer, damit nicht doppelt geplant wird
const flipped = new Set(); // Würfe, deren Aufdeck-Animation schon einmal lief
// Wessen Würfelbecher gerade im Aktionsbereich zu sehen ist. Bleibt auf dem Spieler stehen,
// der zuletzt gewürfelt hat, bis dessen letzter Wurf fertig aufgedeckt ist – erst danach
// springt die Anzeige zum nächsten Spieler weiter.
let shownId = null;

function die(h, value, { big = false, fresh = false } = {}) {
  return h("div", { class: `die${big ? " big" : ""}${fresh ? " new" : ""}`, "aria-label": String(value) },
    Array.from({ length: 9 }, (_, i) => h("span", { class: `pip${PIPS[value].includes(i) ? " on" : ""}` })));
}

function heartsRow(lives) {
  const full = Math.min(lives, MAX_HEARTS);
  return "❤️".repeat(full) + "🤍".repeat(MAX_HEARTS - full);
}

const throwKey = (roomCode, round, playerId, i) => `${roomCode}-${round}-${playerId}-${i}`;

function lastThrowKey(roomCode, round, player) {
  return player && player.rolls.length ? throwKey(roomCode, round, player.id, player.rolls.length - 1) : null;
}

/** Fertig gezeigt: entweder es gibt (noch) nichts zu würfeln, oder der letzte Wurf ist aufgedeckt. */
function isDoneShowing(roomCode, round, player) {
  const key = lastThrowKey(roomCode, round, player);
  return key === null || revealed.has(key);
}

/** Deckt neue Würfe eines Spielers zeitverzögert auf (Würfelbecher schütteln, dann zeigen). */
function scheduleReveals(roomCode, round, player, rerender) {
  player.rolls.forEach((_, i) => {
    const key = throwKey(roomCode, round, player.id, i);
    if (revealed.has(key)) return;
    if (i !== player.rolls.length - 1) {
      revealed.add(key); // ältere Würfe beim Neuladen sofort zeigen, ohne Becher-Animation
      return;
    }
    if (!pendingTimers.has(key)) {
      pendingTimers.set(key, setTimeout(() => {
        revealed.add(key);
        pendingTimers.delete(key);
        rerender();
      }, ANIM_MS));
    }
  });
}

function diceRow(h, roomCode, round, player, maxRolls) {
  const items = player.rolls.map((throwDice, i) => {
    const key = throwKey(roomCode, round, player.id, i);
    if (revealed.has(key)) {
      const fresh = !flipped.has(key);
      flipped.add(key);
      return h("div", { class: "throw" }, throwDice.map((v) => die(h, v, { big: true, fresh })));
    }
    return h("div", { class: "cup shaking" }, h("div", { class: "cup-hand" }, "🖐️"), h("div", { class: "cup-body" }));
  });
  const lastKey = lastThrowKey(roomCode, round, player);
  const isRolling = lastKey !== null && !revealed.has(lastKey);
  if (!isRolling) {
    for (let i = player.rolls.length; i < maxRolls; i++) items.push(h("div", { class: "die-slot-empty" }));
  }
  return { row: h("div", { class: "dice-row" }, items), isRolling };
}

function figurePosition(i, n) {
  const angle = (-90 + (360 * i) / n) * (Math.PI / 180);
  const x = 50 + 42 * Math.cos(angle);
  const y = 50 + 38 * Math.sin(angle);
  return `left:${x}%; top:${y}%`;
}

function figure(h, p, i, n, { me, isCurrent }) {
  const el = h("div", { class: "figure" },
    h("div", { class: "fig-lives" }, p.lives <= 0 ? "" : heartsRow(p.lives)),
    h("div", { class: `figure-body${isCurrent ? " figure-current" : ""}` },
      h("div", { class: "figure-head" }), h("div", { class: "figure-torso" })),
    h("div", { class: `fig-name${p.lives <= 0 ? " figure-out" : ""}` }, p.name + (p.id === me ? " (du)" : "")),
  );
  el.setAttribute("style", figurePosition(i, n));
  return el;
}

export function renderDiceBlackjack({ room, me, send, h, isHost, rerender }) {
  const s = room.game.view;
  const current = s.players[s.currentIndex];
  const myPlayer = s.players.find((p) => p.id === me);
  const nameOf = (id) => s.players.find((p) => p.id === id)?.name ?? "?";
  const act = (action) => send({ t: "action", action });

  // Wer wird gerade im Aktionsbereich gezeigt? Erst weiterspringen, wenn der vorherige
  // Würfelbecher fertig aufgedeckt ist.
  let shownPlayer = s.players.find((p) => p.id === shownId);
  if (s.phase === "turn") {
    if (!shownPlayer) shownPlayer = current;
    if (shownPlayer) scheduleReveals(room.code, s.round, shownPlayer, rerender);
    if (shownPlayer !== current && isDoneShowing(room.code, s.round, shownPlayer)) {
      shownPlayer = current;
      if (shownPlayer) scheduleReveals(room.code, s.round, shownPlayer, rerender);
    }
    shownId = shownPlayer?.id ?? null;
  }

  const table = h("div", { class: "bj-table" },
    h("div", { class: "bj-table-oval" }),
    ...s.players.map((p, i) => figure(h, p, i, s.players.length, { me, isCurrent: p === current && s.phase === "turn" })),
  );

  let actionContent;
  if (s.phase === "turn" && shownPlayer) {
    const { row, isRolling } = diceRow(h, room.code, s.round, shownPlayer, s.maxRolls);
    const myTurn = current?.id === me;
    const canAct = myTurn && shownPlayer === current && !isRolling;
    const rollsLeft = current ? s.maxRolls - current.rolls.length : 0;
    actionContent = h("div", {},
      h("p", { class: "turn-note" }, shownPlayer.id === me ? "Du bist am Zug" : `${shownPlayer.name} ist am Zug …`),
      row,
      canAct
        ? h("div", { class: "stack" },
            h("div", { class: "row" }, [1, 2, 3].slice(0, s.maxDice).map((n) =>
              h("button", { disabled: rollsLeft <= 0, onclick: () => act({ type: "roll", dice: n }) }, `🎲 ${n}`))),
            h("button", { class: "secondary", disabled: current.rolls.length === 0, onclick: () => act({ type: "stand" }) },
              "Stehen bleiben"),
          )
        : null,
    );
  } else if (s.phase === "roundOver") {
    const r = s.lastResult;
    const line = (c) => {
      const verb = c.delta > 0 ? `gewinnt ${c.delta} Leben` : `verliert ${-c.delta} Leben`;
      const why = c.reason === "bust" ? "überkauft" : c.reason === "hit21" ? `genau ${s.target}` : "niedrigste Summe";
      return `${nameOf(c.playerId)} ${verb} (${why})`;
    };
    actionContent = h("div", { class: "banner stack" },
      r.voided
        ? h("div", { class: "big" }, "Alle Übrigen wären ausgeschieden – die Runde zählt nicht!")
        : r.changes.length
          ? h("div", {}, r.changes.map((c) => h("div", {}, line(c))))
          : h("div", { class: "muted" }, "Diesmal ändert sich nichts."),
      r.eliminatedIds.length ? h("div", { class: "big" }, `${r.eliminatedIds.map(nameOf).join(", ")} ${r.eliminatedIds.length > 1 ? "scheiden" : "scheidet"} aus!`) : null,
      isHost
        ? h("button", { onclick: () => act({ type: "nextRound" }) }, "Nächste Runde")
        : h("p", { class: "muted" }, "Warte, bis der Gastgeber die nächste Runde startet …"),
    );
  } else {
    actionContent = h("div", { class: "banner stack" },
      h("div", { class: "big" }, `🏆 ${nameOf(s.winnerId)} gewinnt!`),
      isHost
        ? h("button", { onclick: () => send({ t: "lobby" }) }, "Zurück zur Lobby")
        : h("p", { class: "muted" }, "Warte auf den Gastgeber …"),
    );
  }

  const statRow = myPlayer && myPlayer.lives > 0
    ? h("div", { class: "stat-row" },
        h("div", { class: "stat-corner" },
          h("div", { class: "big-num" }, `${myPlayer.total}/${s.target}`),
          h("div", { class: "sub" }, `${Math.max(0, s.target - myPlayer.total)} Augen zur ${s.target}`),
        ),
      )
    : null;

  return h("div", { class: "bj" },
    table,
    h("div", { class: "bj-actions" },
      statRow,
      actionContent,
      isHost && s.phase !== "gameOver"
        ? h("button", { class: "danger", style: "margin-top:12px",
            onclick: () => confirm("Spiel für alle abbrechen?") && send({ t: "lobby" }) }, "Spiel abbrechen")
        : null,
    ),
  );
}
