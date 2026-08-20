const crypto = require('crypto');

/**
 * Computes SHA-256 hash of a string input or buffer.
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Builds a Merkle Tree from an array of event hashes or event objects.
 * Returns the full tree layer by layer, where tree[0] is leaves, tree[tree.length - 1][0] is root.
 *
 * @param {Array<string>} hashes - Array of event hashes (or leaves)
 * @returns {Object} { root: string|null, layers: Array<Array<string>> }
 */
function buildMerkleTree(hashes) {
  if (!hashes || hashes.length === 0) {
    return { root: null, layers: [] };
  }

  // Ensure all leaves are valid string hashes
  const leaves = hashes.map(h => typeof h === 'string' ? h : String(h));
  const layers = [leaves];

  let currentLayer = leaves;

  while (currentLayer.length > 1) {
    const nextLayer = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      // If odd number of nodes in this layer, duplicate the rightmost node
      const right = (i + 1 < currentLayer.length) ? currentLayer[i + 1] : left;
      const parentHash = sha256(left + right);
      nextLayer.push(parentHash);
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  const root = currentLayer[0] || null;
  return { root, layers };
}

/**
 * Generates an inclusion proof for a leaf at a given index.
 *
 * @param {Array<string>} hashes - Array of event hashes
 * @param {number} leafIndex - Target leaf index
 * @returns {Object} { leaf: string, leafIndex: number, proof: Array<{ position: 'left'|'right', hash: string }>, root: string }
 */
function getMerkleProof(hashes, leafIndex) {
  const { root, layers } = buildMerkleTree(hashes);
  if (!root || leafIndex < 0 || leafIndex >= hashes.length) {
    return null;
  }

  const proof = [];
  let index = leafIndex;

  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const isRightNode = index % 2 === 1;
    const siblingIndex = isRightNode ? index - 1 : index + 1;

    if (siblingIndex < layer.length) {
      proof.push({
        position: isRightNode ? 'left' : 'right',
        hash: layer[siblingIndex]
      });
    } else {
      // Sibling is itself when odd
      proof.push({
        position: 'right',
        hash: layer[index]
      });
    }

    index = Math.floor(index / 2);
  }

  return {
    leaf: hashes[leafIndex],
    leafIndex,
    proof,
    root
  };
}

/**
 * Verifies a Merkle proof against a given root.
 *
 * @param {string} leaf
 * @param {Array<{ position: 'left'|'right', hash: string }>} proof
 * @param {string} expectedRoot
 * @returns {boolean}
 */
function verifyMerkleProof(leaf, proof, expectedRoot) {
  if (!leaf || !proof || !expectedRoot) return false;

  let currentHash = leaf;

  for (const item of proof) {
    if (item.position === 'left') {
      currentHash = sha256(item.hash + currentHash);
    } else {
      currentHash = sha256(currentHash + item.hash);
    }
  }

  return currentHash === expectedRoot;
}

module.exports = {
  buildMerkleTree,
  getMerkleProof,
  verifyMerkleProof
};
