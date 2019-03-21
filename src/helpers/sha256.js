
const crypto = require('crypto');

const sha256 = s => crypto.createHash('sha256').update(s, 'utf8').digest('hex');

module.exports = { sha256 };
