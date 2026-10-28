function loadUsers(rawUsers = process.env.DMS_USERS_JSON) {
  if (typeof rawUsers !== 'string' || rawUsers.trim() === '') {
    throw new Error('A variável DMS_USERS_JSON deve conter ao menos um usuário.');
  }

  let users;
  try {
    users = JSON.parse(rawUsers);
  } catch {
    throw new Error('A variável DMS_USERS_JSON deve conter um JSON válido.');
  }

  if (!Array.isArray(users) || users.length === 0) {
    throw new Error('DMS_USERS_JSON deve ser uma lista não vazia de usuários.');
  }

  const owners = new Set();
  const tokens = new Set();

  return users.map((user) => {
    if (
      !user ||
      typeof user.owner !== 'string' ||
      user.owner.trim() === '' ||
      typeof user.token !== 'string' ||
      user.token.trim() === '' ||
      /\s/.test(user.token)
    ) {
      throw new Error('Cada usuário em DMS_USERS_JSON precisa de owner e token válidos.');
    }

    const owner = user.owner.trim();
    if (owners.has(owner) || tokens.has(user.token)) {
      throw new Error('DMS_USERS_JSON não pode conter owners ou tokens duplicados.');
    }

    owners.add(owner);
    tokens.add(user.token);
    return { owner, token: user.token };
  });
}

module.exports = { loadUsers };