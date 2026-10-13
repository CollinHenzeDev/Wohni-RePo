/* Wohni Writer – minimaler ZIP-Leser/-Schreiber (ohne Abhängigkeiten).
   Deflate über die Browser-APIs CompressionStream/DecompressionStream ('deflate-raw'). */
(function () {
  'use strict';
  const W = window.W;

  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  async function streamBytes(bytes, stream) {
    const rs = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(rs).arrayBuffer());
  }
  const canDeflate = typeof CompressionStream !== 'undefined';
  const canInflate = typeof DecompressionStream !== 'undefined';

  const dosTime = (d) => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
  const dosDate = (d) => (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;

  const Z = (W.zip = {});

  /** ZIP lesen → Map<Name, {bytes(): Promise<Uint8Array>, size}> */
  Z.read = async function (buffer) {
    const dv = new DataView(buffer);
    const u8 = new Uint8Array(buffer);
    // End of central directory
    let eocd = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('Keine gültige ZIP-/DOCX-Datei (Verzeichnis nicht gefunden).');
    const count = dv.getUint16(eocd + 10, true);
    let off = dv.getUint32(eocd + 16, true);
    const td = new TextDecoder('utf-8');
    const files = new Map();
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(off, true) !== 0x02014b50) break;
      const flags = dv.getUint16(off + 8, true);
      const method = dv.getUint16(off + 10, true);
      const csize = dv.getUint32(off + 20, true);
      const usize = dv.getUint32(off + 24, true);
      const nlen = dv.getUint16(off + 28, true), elen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true);
      const lho = dv.getUint32(off + 42, true);
      const name = td.decode(u8.subarray(off + 46, off + 46 + nlen));
      off += 46 + nlen + elen + clen;
      if (name.endsWith('/')) continue;
      files.set(name, {
        name, size: usize,
        async bytes() {
          const lnl = dv.getUint16(lho + 26, true), lel = dv.getUint16(lho + 28, true);
          const start = lho + 30 + lnl + lel;
          const raw = u8.subarray(start, start + csize);
          if (method === 0) return raw.slice();
          if (method === 8) {
            if (!canInflate) throw new Error('Dieser Browser kann ZIP-Dateien nicht entpacken (DecompressionStream fehlt). Bitte einen aktuellen Browser verwenden.');
            return streamBytes(raw, new DecompressionStream('deflate-raw'));
          }
          throw new Error('Nicht unterstütztes ZIP-Kompressionsverfahren: ' + method);
        },
        async text() { return td.decode(await this.bytes()); },
      });
    }
    return files;
  };

  /** ZIP schreiben. files: [{name, data: string|Uint8Array, store?: bool}] → Blob */
  Z.write = async function (files, mime) {
    const te = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    const now = new Date();
    const t = dosTime(now), d = dosDate(now);
    for (const f of files) {
      const nameB = te.encode(f.name);
      const data = typeof f.data === 'string' ? te.encode(f.data) : f.data;
      const crc = crc32(data);
      let method = 0, comp = data;
      if (!f.store && canDeflate && data.length > 64) {
        try { const c = await streamBytes(data, new CompressionStream('deflate-raw')); if (c.length < data.length) { comp = c; method = 8; } } catch (e) { /* speichern */ }
      }
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, method, true);
      lh.setUint16(10, t, true); lh.setUint16(12, d, true); lh.setUint32(14, crc, true); lh.setUint32(18, comp.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, nameB.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nameB, comp);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, method, true);
      ch.setUint16(12, t, true); ch.setUint16(14, d, true); ch.setUint32(16, crc, true); ch.setUint32(20, comp.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, nameB.length, true); ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nameB);
      offset += 30 + nameB.length + comp.length;
    }
    let csize = 0; central.forEach((c) => { csize += c.length; });
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: mime || 'application/zip' });
  };
})();
