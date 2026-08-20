const crypto = require('crypto');

// Generate a default master carrier Ed25519 key pair for demonstration/system signatures
const { publicKey: DEFAULT_PUBLIC_KEY, privateKey: DEFAULT_PRIVATE_KEY } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

/**
 * Generates an Ed25519 keypair for a carrier or captain.
 * @returns {Object} { publicKey: string, privateKey: string }
 */
function generateCarrierKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  return { publicKey, privateKey };
}

/**
 * Signs an event payload or raw string using an Ed25519 private key.
 *
 * @param {string|Object} data - Event payload or raw data
 * @param {string} [privateKeyPem] - Ed25519 private key in PEM format
 * @returns {string} Base64 encoded digital signature
 */
function signEventPayload(data, privateKeyPem = DEFAULT_PRIVATE_KEY) {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data || {});
  const signature = crypto.sign(null, Buffer.from(dataString), privateKeyPem);
  return signature.toString('base64');
}

/**
 * Verifies an Ed25519 digital signature.
 *
 * @param {string|Object} data - Original event payload or raw data
 * @param {string} signatureBase64 - Base64 encoded digital signature
 * @param {string} [publicKeyPem] - Ed25519 public key in PEM format
 * @returns {boolean} True if signature is valid and authentic
 */
function verifyEventSignature(data, signatureBase64, publicKeyPem = DEFAULT_PUBLIC_KEY) {
  if (!signatureBase64 || !publicKeyPem) return false;
  try {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data || {});
    const isValid = crypto.verify(
      null,
      Buffer.from(dataString),
      publicKeyPem,
      Buffer.from(signatureBase64, 'base64')
    );
    return isValid;
  } catch (err) {
    return false;
  }
}

module.exports = {
  DEFAULT_PUBLIC_KEY,
  DEFAULT_PRIVATE_KEY,
  generateCarrierKeyPair,
  signEventPayload,
  verifyEventSignature
};
