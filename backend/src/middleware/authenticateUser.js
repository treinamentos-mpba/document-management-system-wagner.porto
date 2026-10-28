const { timingSafeEqual } = require('node:crypto');

function tokensMatch(candidate, configuredToken) {
  const candidateBuffer = Buffer.from(candidate);
  const configuredBuffer = Buffer.from(configuredToken);

  return candidateBuffer.length === configuredBuffer.length &&
    timingSafeEqual(candidateBuffer, configuredBuffer);
}

function createAuthenticateUser(users) {
  return (req, res, next) => {
    const authorization = req.get('authorization') || '';
    const match = /^Bearer ([^\s]+)$/i.exec(authorization);

    if (!match) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token de acesso ausente ou inválido.' },
      });
    }

    let owner;
    for (const user of users) {
      if (tokensMatch(match[1], user.token)) {
        owner = user.owner;
      }
    }

    if (!owner) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token de acesso ausente ou inválido.' },
      });
    }

    req.user = { owner };
    next();
  };
}

module.exports = { createAuthenticateUser };