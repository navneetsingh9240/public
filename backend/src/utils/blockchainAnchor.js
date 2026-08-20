const crypto = require('crypto');

/**
 * Simulates anchoring a Merkle Root or Aggregate State Hash to a public blockchain (e.g. Polygon / Ethereum / Hedera Hashgraph).
 *
 * @param {string} aggregateId - Container ID
 * @param {string} merkleRoot - Root SHA-256 hash of event chain
 * @param {number} totalEvents - Count of events anchored
 * @returns {Object} Anchor receipt details
 */
function anchorToBlockchain(aggregateId, merkleRoot, totalEvents) {
  if (!aggregateId || !merkleRoot) {
    throw new Error('aggregateId and merkleRoot are required for blockchain anchoring.');
  }

  // Generate deterministic transaction hash and block details based on root and timestamp
  const timestamp = new Date().toISOString();
  const txHash = '0x' + crypto.createHash('sha256').update(aggregateId + merkleRoot + timestamp).digest('hex');
  const blockNumber = Math.floor(18000000 + Math.random() * 500000);
  const network = 'Polygon PoS Mainnet';
  const contractAddress = '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063';
  const explorerUrl = `https://polygonscan.com/tx/${txHash}`;

  return {
    aggregateId,
    merkleRoot,
    totalEvents,
    txHash,
    blockNumber,
    network,
    contractAddress,
    explorerUrl,
    timestamp
  };
}

module.exports = {
  anchorToBlockchain
};
