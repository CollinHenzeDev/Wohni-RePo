import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { Rooms, gameList, type Room } from "./rooms.ts";

const PORT = Number(process.env.PORT ?? 3000);
const PUBLIC_DIR = fileURLToPath(new URL("../public/", import.meta.url));
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

const http = createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", "http://x").pathname;
  const file = normalize(join(PUBLIC_DIR, path === "/" ? "index.html" : path));
  if (!file.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" }).end(body);
  } catch {
    res.writeHead(404).end("Nicht gefunden");
  }
});

const rooms = new Rooms();
/** Offene Verbindungen je Raum-Mitglied. */
const sockets = new Map<string, Set<WebSocket>>();

function broadcast(room: Room) {
  for (const m of room.members) {
    for (const ws of sockets.get(m.id) ?? []) send(ws, { t: "room", room: rooms.view(room, m.id) });
  }
}

function send(ws: WebSocket, msg: unknown) {
  ws.send(JSON.stringify(msg));
}

const wss = new WebSocketServer({ server: http });

wss.on("connection", (ws) => {
  let room: Room | undefined;
  let memberId: string | undefined;

  send(ws, { t: "hello", games: gameList() });

  const attach = (r: Room, member: { id: string; token: string; connected: boolean }) => {
    room = r;
    memberId = member.id;
    member.connected = true;
    if (!sockets.has(member.id)) sockets.set(member.id, new Set());
    sockets.get(member.id)!.add(ws);
    send(ws, { t: "joined", code: r.code, playerId: member.id, token: member.token });
    broadcast(r);
  };

  ws.on("message", (raw) => {
    let msg: any;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }
    const fail = (error: string) => send(ws, { t: "error", error });
    const name = typeof msg.name === "string" ? msg.name.trim().slice(0, 20) : "";

    switch (msg.t) {
      case "create": {
        if (!name) return fail("Bitte gib einen Namen ein.");
        const { room: r, member } = rooms.create(name);
        return attach(r, member);
      }
      case "join": {
        if (!name) return fail("Bitte gib einen Namen ein.");
        const res = rooms.join(String(msg.code ?? ""), name);
        return res.ok ? attach(res.value.room, res.value.member) : fail(res.error);
      }
      case "resume": {
        const res = rooms.resume(String(msg.code ?? ""), String(msg.token ?? ""));
        return res.ok ? attach(res.value.room, res.value.member) : send(ws, { t: "resumeFailed" });
      }
    }

    if (!room || !memberId) return fail("Du bist in keinem Raum.");
    const r = room;
    const id = memberId;
    const done = (res: { ok: true } | { ok: false; error: string }) => (res.ok ? broadcast(r) : fail(res.error));

    switch (msg.t) {
      case "start":
        return done(rooms.start(r, id, String(msg.gameId)));
      case "action":
        return done(rooms.act(r, id, msg.action));
      case "lobby":
        return done(rooms.backToLobby(r, id));
      case "leave": {
        const res = rooms.leave(r, id);
        if (!res.ok) return fail(res.error);
        sockets.get(id)?.delete(ws);
        room = memberId = undefined;
        send(ws, { t: "left" });
        return broadcast(r);
      }
    }
  });

  ws.on("close", () => {
    if (!room || !memberId) return;
    const set = sockets.get(memberId);
    set?.delete(ws);
    if (set && set.size === 0) {
      sockets.delete(memberId);
      const member = room.members.find((m) => m.id === memberId);
      if (member) member.connected = false;
      broadcast(room);
    }
  });
});

http.listen(PORT, () => {
  console.log(`Wohni-Spiele läuft auf Port ${PORT}`);
  console.log(`  Auf diesem Gerät:  http://localhost:${PORT}`);
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) console.log(`  Im WLAN/Netzwerk:  http://${a.address}:${PORT}`);
    }
  }
});
