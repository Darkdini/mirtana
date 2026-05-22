// Минимальная реализация WebSocket-сервера на чистом Node.js (RFC 6455).
// Поддерживает только то что нужно: текстовые сообщения, ping/pong.
const crypto = require('crypto');
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function acceptKey(clientKey) {
  return crypto.createHash('sha1').update(clientKey + GUID).digest('base64');
}

// Кадрирование WebSocket-сообщения (server → client)
function encodeFrame(data, opcode = 0x1) {
  const buf = Buffer.from(data);
  const len = buf.length;
  let header;
  if (len < 126) {
    header = Buffer.from([0x80 | opcode, len]);
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  return Buffer.concat([header, buf]);
}

// Парсер входящих кадров
class FrameParser {
  constructor() {
    this.buf = Buffer.alloc(0);
  }
  feed(chunk, onFrame) {
    this.buf = Buffer.concat([this.buf, chunk]);
    while (true) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0], b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let offset = 2;
      if (len === 126) {
        if (this.buf.length < 4) return;
        len = this.buf.readUInt16BE(2); offset = 4;
      } else if (len === 127) {
        if (this.buf.length < 10) return;
        len = Number(this.buf.readBigUInt64BE(2)); offset = 10;
      }
      let mask;
      if (masked) {
        if (this.buf.length < offset + 4) return;
        mask = this.buf.slice(offset, offset + 4);
        offset += 4;
      }
      if (this.buf.length < offset + len) return;
      const data = this.buf.slice(offset, offset + len);
      if (masked) for (let i = 0; i < data.length; i++) data[i] ^= mask[i % 4];
      this.buf = this.buf.slice(offset + len);
      onFrame({ fin, opcode, data });
    }
  }
}

class WSClient {
  constructor(socket) {
    this.socket = socket;
    this.alive = true;
    this.parser = new FrameParser();
    this.onMessage = null;
    this.onClose = null;
    socket.on('data', (chunk) => {
      this.parser.feed(chunk, (frame) => {
        if (frame.opcode === 0x1) {           // text
          if (this.onMessage) this.onMessage(frame.data.toString('utf8'));
        } else if (frame.opcode === 0x8) {    // close
          this.close();
        } else if (frame.opcode === 0x9) {    // ping
          socket.write(encodeFrame(frame.data, 0xA));
        }
      });
    });
    socket.on('close', () => { this.alive = false; if (this.onClose) this.onClose(); });
    socket.on('error', () => { this.alive = false; });
  }
  send(text) {
    if (!this.alive) return;
    try { this.socket.write(encodeFrame(text)); } catch (e) { this.alive = false; }
  }
  close() {
    if (!this.alive) return;
    try { this.socket.write(encodeFrame('', 0x8)); this.socket.end(); } catch {}
    this.alive = false;
  }
}

// Обработчик upgrade: цепляется к существующему http.Server
function attach(server, onConnection) {
  server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) { socket.destroy(); return; }
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      'Sec-WebSocket-Accept: ' + acceptKey(key),
      '', ''
    ].join('\r\n');
    socket.write(responseHeaders);
    const client = new WSClient(socket);
    onConnection(client, req);
  });
}

module.exports = { attach, WSClient };
