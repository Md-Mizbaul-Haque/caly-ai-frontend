const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

/* global Buffer:readonly */

const { isWebUri, buildMultipartBody, readPhotoBytes, buildMultipartPayload } = require('../lib/uploadPart');

describe('isWebUri (upload branch decision)', () => {
  it('matches blob: and data: only', () => {
    assert.equal(isWebUri('blob:http://localhost:8081/uuid'), true);
    assert.equal(isWebUri('data:image/jpeg;base64,xx'), true);
    assert.equal(isWebUri('file:///data/user/0/photo.jpg'), false);
    assert.equal(isWebUri('content://media/photo'), false);
    assert.equal(isWebUri(null), false);
    assert.equal(isWebUri(undefined), false);
  });
});

const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];

describe('buildMultipartBody (deterministic wire format)', () => {
  it('emits exact RFC 7578 bytes with filename, content-type, and intact photo bytes', () => {
    const photo = new Uint8Array([...JPEG_MAGIC, 0x41, 0x42]);
    const { body, contentType, boundary } = buildMultipartBody(
      { field: 'image', filename: 'meal.jpg', mime: 'image/jpeg', bytes: photo },
      'TESTBOUNDARY'
    );
    assert.ok(body instanceof Uint8Array, 'body must be raw bytes (accepted natively without a serializer)');
    assert.equal(contentType, 'multipart/form-data; boundary=TESTBOUNDARY');
    assert.equal(boundary, 'TESTBOUNDARY');
    // Independently constructed expectation (Node Buffer, not the builder).
    const expected = Buffer.concat([
      Buffer.from('--TESTBOUNDARY\r\nContent-Disposition: form-data; name="image"; filename="meal.jpg"\r\nContent-Type: image/jpeg\r\n\r\n', 'ascii'),
      Buffer.from(photo),
      Buffer.from('\r\n--TESTBOUNDARY--\r\n', 'ascii'),
    ]);
    assert.deepEqual(Buffer.from(body), expected);
  });

  it('generates a boundary when none is given and embeds it consistently', () => {
    const a = buildMultipartBody({ field: 'image', filename: 'meal.jpg', mime: 'image/jpeg', bytes: new Uint8Array([1]) });
    const b = buildMultipartBody({ field: 'image', filename: 'meal.jpg', mime: 'image/jpeg', bytes: new Uint8Array([1]) });
    assert.ok(a.boundary.length >= 16, 'boundary must be non-trivial');
    assert.notEqual(a.boundary, b.boundary, 'boundaries must differ per body');
    assert.ok(a.contentType.includes(a.boundary), 'header boundary must match body boundary');
    assert.ok(Buffer.from(a.body).toString('ascii').includes(a.boundary));
  });
});

describe('readPhotoBytes (bytes on every platform)', () => {
  it('resolves blob:/data: URIs through fetch', async () => {
    const seen = {};
    const fetchImpl = async (uri, opts) => {
      seen.uri = uri;
      seen.signal = opts && opts.signal;
      return { arrayBuffer: async () => new Uint8Array([9, 9]).buffer };
    };
    const out = await readPhotoBytes('blob:http://localhost:8081/u', { signal: 'sig', fetchImpl });
    assert.equal(seen.uri, 'blob:http://localhost:8081/u');
    assert.equal(seen.signal, 'sig');
    assert.deepEqual(Array.from(out), [9, 9]);
  });

  it('reads native file:// URIs via the injected filesystem File', async () => {
    const seen = {};
    function FileSystemFileImpl(uri) {
      seen.uri = uri;
      this.arrayBuffer = async () => new Uint8Array([0xff, 0xd8]).buffer;
    }
    const out = await readPhotoBytes('file:///a/photo.jpg', { FileSystemFileImpl });
    assert.equal(seen.uri, 'file:///a/photo.jpg');
    assert.deepEqual(Array.from(out), [0xff, 0xd8]);
  });
});

describe('buildMultipartPayload (one call per upload)', () => {
  it('combines bytes + body for a file:// photo with filename meal.jpg', async () => {
    function FileSystemFileImpl() {
      this.arrayBuffer = async () => new Uint8Array([0xff, 0xd8, 0xff]).buffer;
    }
    const { body, contentType } = await buildMultipartPayload('file:///a/photo.jpg', { FileSystemFileImpl, boundary: 'B1' });
    const text = Buffer.from(body).toString('binary');
    assert.ok(text.includes('filename="meal.jpg"'), 'multer only creates req.file for parts WITH a filename');
    assert.ok(text.includes('Content-Type: image/jpeg'), 'multer fileFilter requires an image/* content type');
    assert.ok(contentType === 'multipart/form-data; boundary=B1');
    // JPEG magic survives byte-for-byte.
    const raw = Buffer.from(body);
    const magic = [0xff, 0xd8, 0xff];
    let found = false;
    for (let i = 0; i + 3 <= raw.length; i++) {
      if (raw[i] === magic[0] && raw[i + 1] === magic[1] && raw[i + 2] === magic[2]) { found = true; break; }
    }
    assert.equal(found, true, 'photo bytes must be embedded intact');
  });
});
