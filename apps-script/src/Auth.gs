/**
 * Auth.gs — authentication, sessions and role authorisation.
 *
 * - Passwords are stored only as PBKDF2-HMAC-SHA256 hashes with a per-user salt.
 * - Google sign-in ID tokens are verified server-side (audience + issuer).
 * - Session tokens are random; only their SHA-256 hash is stored.
 * - The role is always read from the Users sheet, never from the client.
 */

const PASSWORD_ITERATIONS = 3000;

function hashPassword(password) {
  const salt = randomToken().slice(0, 32);
  return { hash: pbkdf2Hex(password, salt, PASSWORD_ITERATIONS), salt: salt, iterations: PASSWORD_ITERATIONS };
}

function verifyPassword(user, password) {
  if (!user.Password_Hash || !user.Password_Salt) return false;
  const it = toNumber(user.Password_Iterations, PASSWORD_ITERATIONS) || PASSWORD_ITERATIONS;
  return safeEqual(pbkdf2Hex(password, user.Password_Salt, it), user.Password_Hash);
}

function validatePasswordStrength(pw) {
  pw = String(pw || '');
  if (pw.length < 8) fail('VALIDATION_ERROR', 'Password must be at least 8 characters.');
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) fail('VALIDATION_ERROR', 'Password must contain letters and numbers.');
}

function findUserByEmail(email) {
  const e = str(email).toLowerCase();
  if (!e) return null;
  const rows = Db.all('Users');
  for (let i = 0; i < rows.length; i++) if (str(rows[i].Email).toLowerCase() === e) return rows[i];
  return null;
}

function publicUser(user, student) {
  return {
    userId: user.User_ID,
    email: user.Email,
    role: user.Role,
    name: student ? student.Full_Name : (user.Display_Name || user.Email),
    studentId: user.Student_ID || '',
    photoUrl: student ? driveImageUrl(student.Photo_URL, 200) : '',
    needsProfile: user.Role === 'STUDENT' && !user.Student_ID,
  };
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

function createSession(user) {
  const token = randomToken() + randomToken().slice(0, 16);
  const expires = new Date(new Date().getTime() + SESSION_DAYS * 86400000).toISOString();
  Db.insert('Sessions', {
    Session_ID: sha256Hex(token),
    User_ID: user.User_ID,
    Role: user.Role,
    Expires_At: expires,
    Status: 'ACTIVE',
    Created_At: nowIso(),
    Last_Seen_At: nowIso(),
  });
  Db.update('Users', user.User_ID, { Last_Login: nowIso() });
  const student = user.Student_ID ? Db.byId('Students', user.Student_ID) : null;
  return { token: token, expiresAt: expires, user: publicUser(user, student) };
}

/**
 * Resolves a session token into { user, student }. Returns null when the
 * token is missing, expired, revoked or the user is no longer active.
 */
function resolveSession(token) {
  if (!token || String(token).length < 40) return null;
  const hash = sha256Hex(String(token));
  const cache = CacheService.getScriptCache();
  let sess = parseJsonSafe(cache.get('sess:' + hash), null);
  if (!sess) {
    const row = Db.findOne('Sessions', 'Session_ID', hash);
    if (!row) return null;
    sess = { User_ID: row.User_ID, Expires_At: row.Expires_At, Status: row.Status };
    cache.put('sess:' + hash, JSON.stringify(sess), 600);
  }
  if (sess.Status !== 'ACTIVE' || new Date(sess.Expires_At).getTime() < new Date().getTime()) return null;
  const user = Db.byId('Users', sess.User_ID);
  if (!user || upper(user.Status) !== 'ACTIVE') return null;
  const student = user.Student_ID ? Db.byId('Students', user.Student_ID) : null;
  return { user: user, student: student, tokenHash: hash };
}

function revokeSession(tokenHash) {
  const row = Db.findOne('Sessions', 'Session_ID', tokenHash);
  if (row) Db.update('Sessions', row.Session_ID, { Status: 'REVOKED' });
  CacheService.getScriptCache().remove('sess:' + tokenHash);
}

function revokeUserSessions(userId) {
  const cache = CacheService.getScriptCache();
  Db.where('Sessions', function (s) { return s.User_ID === userId && s.Status === 'ACTIVE'; }).forEach(function (s) {
    Db.update('Sessions', s.Session_ID, { Status: 'REVOKED' });
    cache.remove('sess:' + s.Session_ID);
  });
}

/* ------------------------------------------------------------------ */
/* Authorisation guards                                                */
/* ------------------------------------------------------------------ */

function requireUser(ctx) {
  if (!ctx.user) throw new ApiError('UNAUTHORIZED', 'Please sign in to continue.', 401);
  return ctx.user;
}

function requireStudent(ctx) {
  requireUser(ctx);
  if (ctx.user.Role !== 'STUDENT') throw new ApiError('FORBIDDEN', 'This area is for student accounts.', 403);
  if (!ctx.student) throw new ApiError('PROFILE_REQUIRED', 'Please complete your athlete profile first.', 403);
  if (upper(ctx.student.Status) === 'SUSPENDED') throw new ApiError('SUSPENDED', 'Your account is suspended. Please contact the association.', 403);
  return ctx.student;
}

function requireAdmin(ctx) {
  requireUser(ctx);
  if (ctx.user.Role !== 'ADMIN') throw new ApiError('FORBIDDEN', 'You do not have permission to do this.', 403);
  return ctx.user;
}

/** Spec alias: checkAuthorization(ctx, 'ADMIN' | 'STUDENT' | 'USER'). */
function checkAuthorization(ctx, level) {
  if (level === 'ADMIN') return requireAdmin(ctx);
  if (level === 'STUDENT') return requireStudent(ctx);
  if (level === 'USER') return requireUser(ctx);
  return true;
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

function actionRegister(p, ctx) {
  rateLimit('register:' + ctx.clientKey, 10, 3600);
  validate(p, { email: 'required|email|max:200', password: 'required' });
  validatePasswordStrength(p.password);
  const email = str(p.email).toLowerCase();
  const result = withLock(function () {
    Db.refresh('Users');
    if (findUserByEmail(email)) fail('DUPLICATE', 'An account with this email already exists. Please sign in.');
    const unlinked = Db.where('Students', function (s) { return str(s.Email).toLowerCase() === email && !s.User_ID; });
    if (unlinked.length) {
      fail('ACCOUNT_EXISTS', 'An athlete record already exists for this email. Please sign in with Google using this email, or contact the association.');
    }
    const pw = hashPassword(p.password);
    const user = Db.insert('Users', {
      User_ID: generateID('Users'), Email: email, Role: 'STUDENT', Auth_Provider: 'PASSWORD', Auth_Subject_ID: '', Student_ID: '',
      Status: 'ACTIVE', Display_Name: str(p.firstName) + ' ' + str(p.lastName),
      Password_Hash: pw.hash, Password_Salt: pw.salt, Password_Iterations: pw.iterations,
    });
    const student = createStudentRecord(Object.assign({}, p, { email: email }), { userId: user.User_ID, byAdmin: false });
    Db.update('Users', user.User_ID, { Student_ID: student.Student_ID });
    return user;
  });
  writeAuditLog({ user: result, context: ctx.context }, 'REGISTER', 'User', result.User_ID, null, { Email: email });
  clearCacheForSheets(['Students']);
  return createSession(result);
}

function passwordLogin(p, ctx, portal) {
  validate(p, { email: 'required|email', password: 'required' });
  const email = str(p.email).toLowerCase();
  rateLimit('login:' + email, 10, 900);
  rateLimit('login-ip:' + ctx.clientKey, 30, 900);
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(user, p.password)) fail('INVALID_CREDENTIALS', 'Incorrect email or password.');
  if (upper(user.Status) !== 'ACTIVE') fail('SUSPENDED', 'This account is not active. Please contact the association.');
  if (portal === 'admin' && user.Role !== 'ADMIN') fail('INVALID_CREDENTIALS', 'Incorrect email or password.');
  if (portal === 'student' && user.Role === 'ADMIN') fail('USE_ADMIN_LOGIN', 'Administrators must sign in through the admin portal.');
  const session = createSession(user);
  if (user.Role === 'ADMIN') writeAuditLog({ user: user, context: ctx.context }, 'ADMIN_LOGIN', 'User', user.User_ID, null, null);
  return session;
}

function actionLogin(p, ctx) { return passwordLogin(p, ctx, 'student'); }
function actionAdminLogin(p, ctx) { return passwordLogin(p, ctx, 'admin'); }

function verifyGoogleIdToken(idToken) {
  const clientId = prop(PROP.GOOGLE_CLIENT_ID);
  if (!clientId) fail('NOT_CONFIGURED', 'Google sign-in is not configured.');
  const res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) fail('INVALID_CREDENTIALS', 'Google sign-in failed. Please try again.');
  const info = JSON.parse(res.getContentText());
  const issOk = info.iss === 'accounts.google.com' || info.iss === 'https://accounts.google.com';
  if (info.aud !== clientId || !issOk || String(info.email_verified) !== 'true' || Number(info.exp) * 1000 < new Date().getTime()) {
    fail('INVALID_CREDENTIALS', 'Google sign-in could not be verified.');
  }
  return { sub: info.sub, email: str(info.email).toLowerCase(), name: info.name || '' };
}

function actionGoogleLogin(p, ctx) {
  rateLimit('glogin-ip:' + ctx.clientKey, 30, 900);
  const g = verifyGoogleIdToken(str(p.credential));
  const portal = p.portal === 'admin' ? 'admin' : 'student';
  const user = withLock(function () {
    Db.refresh('Users');
    let u = Db.findOne('Users', 'Auth_Subject_ID', g.sub) || findUserByEmail(g.email);
    if (u) {
      if (!u.Auth_Subject_ID) u = Db.update('Users', u.User_ID, { Auth_Subject_ID: g.sub, Auth_Provider: u.Auth_Provider || 'GOOGLE' });
      return u;
    }
    if (portal === 'admin') fail('INVALID_CREDENTIALS', 'This Google account is not an administrator.');
    u = Db.insert('Users', {
      User_ID: generateID('Users'), Email: g.email, Role: 'STUDENT', Auth_Provider: 'GOOGLE', Auth_Subject_ID: g.sub,
      Student_ID: '', Status: 'ACTIVE', Display_Name: g.name,
    });
    // Google verifies email ownership, so an admin-created athlete record with the same email is linked.
    const existing = Db.where('Students', function (s) { return str(s.Email).toLowerCase() === g.email && !s.User_ID; })[0];
    if (existing) {
      Db.update('Students', existing.Student_ID, { User_ID: u.User_ID });
      u = Db.update('Users', u.User_ID, { Student_ID: existing.Student_ID });
    }
    return u;
  });
  if (upper(user.Status) !== 'ACTIVE') fail('SUSPENDED', 'This account is not active. Please contact the association.');
  if (portal === 'admin' && user.Role !== 'ADMIN') fail('INVALID_CREDENTIALS', 'This Google account is not an administrator.');
  if (portal === 'student' && user.Role === 'ADMIN') fail('USE_ADMIN_LOGIN', 'Administrators must sign in through the admin portal.');
  return createSession(user);
}

/** For Google accounts that do not have an athlete profile yet. */
function actionCompleteProfile(p, ctx) {
  const user = requireUser(ctx);
  if (user.Role !== 'STUDENT') fail('FORBIDDEN', 'Only student accounts have athlete profiles.');
  if (user.Student_ID) fail('DUPLICATE', 'Your profile is already complete.');
  const student = withLock(function () {
    const s = createStudentRecord(Object.assign({}, p, { email: user.Email }), { userId: user.User_ID, byAdmin: false });
    Db.update('Users', user.User_ID, { Student_ID: s.Student_ID });
    return s;
  });
  clearCacheForSheets(['Students']);
  return publicUser(Db.byId('Users', user.User_ID), student);
}

function actionLogout(p, ctx) {
  if (ctx.tokenHash) revokeSession(ctx.tokenHash);
  return { loggedOut: true };
}

function actionGetMe(p, ctx) {
  requireUser(ctx);
  return publicUser(ctx.user, ctx.student);
}

function actionChangePassword(p, ctx) {
  const user = requireUser(ctx);
  validate(p, { newPassword: 'required' });
  validatePasswordStrength(p.newPassword);
  if (user.Password_Hash && !verifyPassword(user, p.currentPassword)) fail('INVALID_CREDENTIALS', 'Your current password is incorrect.');
  const pw = hashPassword(p.newPassword);
  Db.update('Users', user.User_ID, { Password_Hash: pw.hash, Password_Salt: pw.salt, Password_Iterations: pw.iterations,
    Auth_Provider: user.Auth_Provider === 'GOOGLE' ? 'GOOGLE+PASSWORD' : 'PASSWORD' });
  writeAuditLog(ctx, 'CHANGE_PASSWORD', 'User', user.User_ID, null, null);
  return { changed: true };
}
