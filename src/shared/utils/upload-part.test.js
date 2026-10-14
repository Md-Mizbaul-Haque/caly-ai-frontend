const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isWebUri, buildUploadPart } = require('../lib/uploadPart');

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

describe('buildUploadPart (real bytes on every platform)', () => {
  it('resolves blob:/data: URIs via fetch into a File', async () => {
    const seen = {};
    const fetched = { type: 'image/png' };
    const fetchImpl = async (uri, opts) => {
      seen.uri = uri;
      seen.signal = opts && opts.signal;
      return { blob: async () => fetched };
    };
    function FileImpl(parts, name, opts) {
      this.parts = parts;
      this.name = name;
      this.opts = opts;
    }
    const part = await buildUploadPart('blob:http://localhost:8081/uuid', {
      signal: 'sig',
      fetchImpl,
      FileImpl,
    });
    assert.equal(seen.uri, 'blob:http://localhost:8081/uuid');
    assert.equal(seen.signal, 'sig');
    assert.equal(part.parts[0], fetched);
    assert.equal(part.name, 'meal.jpg');
    assert.equal(part.opts.type, 'image/png');
  });

  it('reads native file:// URIs to bytes and wraps them in a Blob', async () => {
    const seen = {};
    const bytes = new Uint8Array([0xff, 0xd8, 0xff]);
    function FileSystemFileImpl(uri) {
      seen.uri = uri;
      this.bytes = async () => bytes;
    }
    function BlobImpl(parts, opts) {
      this.parts = parts;
      this.opts = opts;
    }
    const part = await buildUploadPart('file:///data/user/0/photo.jpg', {
      FileSystemFileImpl,
      BlobImpl,
    });
    assert.equal(seen.uri, 'file:///data/user/0/photo.jpg');
    assert.equal(part.parts[0], bytes);
    assert.equal(part.opts.type, 'image/jpeg');
  });
});
