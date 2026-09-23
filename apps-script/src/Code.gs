/**
 * Code.gs — Web App entry points (doGet / doPost) and the action router.
 *
 * Request (POST body JSON or GET query):
 *   { action, payload, token, key, clientIp }
 *   key      – API_PROXY_SECRET shared with the website server. When set, every
 *              request without it is rejected, so the API is reachable only
 *              through the website's server (CORS / origin restriction).
 *   token    – session token (never a role; the role is read from Users).
 *   clientIp – forwarded by the trusted website server, used for rate limits.
 *
 * Response: { success: true, data, message } | { success: false, error, message }
 */

function doGet(e) {
  const p = (e && e.parameter) || {};
  const payload = p.payload ? parseJsonSafe(p.payload, {}) : Object.assign({}, p);
  ['action', 'key', 'token', 'clientIp', 'payload'].forEach(function (k) { delete payload[k]; });
  return jsonOutput(handleRequest('GET', { action: p.action, key: p.key, token: p.token, clientIp: p.clientIp, payload: payload }));
}

function doPost(e) {
  let body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (err) { body = {}; }
  return jsonOutput(handleRequest('POST', body));
}

/** access: public | user | student | admin | setup */
function a(fn, access) { return { fn: fn, access: access || 'public' }; }

function entityAlias(entity, op, extra) {
  return function (p, ctx) {
    const q = Object.assign({}, p, { entity: entity }, extra || {});
    if (op === 'list') return actionAdminList(q, ctx);
    if (op === 'create') return actionAdminSave({ entity: entity, data: p.data || p }, ctx);
    if (op === 'update') return actionAdminSave({ entity: entity, id: p.id, data: p.data, updatedAt: p.updatedAt }, ctx);
    if (op === 'delete') return actionAdminDelete(q, ctx);
    if (op === 'publish') return actionAdminSave({ entity: entity, id: p.id, data: { Status: toBool(p.unpublish) ? 'UNPUBLISHED' : 'PUBLISHED' } }, ctx);
  };
}

const ACTIONS = {
  // ---------------- Public ----------------
  getSettings: a(actionGetSettings),
  getHome: a(actionGetHome),
  getAbout: a(actionGetAbout),
  getPage: a(actionGetPage),
  getUpcomingEvents: a(actionGetUpcomingEvents),
  getOngoingEvents: a(actionGetOngoingEvents),
  getPastEvents: a(actionGetPastEvents),
  getEvents: a(actionGetPublicEvents),
  getEvent: a(actionGetEvent),
  getEventCategories: a(actionGetEventCategories),
  getEventResults: a(actionGetEventResults),
  getPrograms: a(actionGetPrograms),
  getProgram: a(actionGetProgram),
  getCertifications: a(actionGetCertifications),
  getGallery: a(actionGetGallery),
  getVideos: a(actionGetVideos),
  getMembershipPlans: a(actionGetMembershipPlans),
  getAnnouncements: a(actionGetAnnouncements),
  getSponsors: a(actionGetSponsors),
  getRankings: a(actionGetRankings),
  submitContact: a(actionSubmitContact),
  verifyMembership: a(actionVerifyMembership),
  verifyCertificate: a(actionVerifyCertificate),
  setupStatus: a(actionSetupStatus),

  // ---------------- Auth ----------------
  register: a(actionRegister),
  login: a(actionLogin),
  adminLogin: a(actionAdminLogin),
  googleLogin: a(actionGoogleLogin),
  logout: a(actionLogout, 'user'),
  me: a(actionGetMe, 'user'),
  completeProfile: a(actionCompleteProfile, 'user'),
  changePassword: a(actionChangePassword, 'user'),
  getNotifications: a(actionGetNotifications, 'user'),
  markNotificationRead: a(actionMarkNotificationRead, 'user'),
  downloadDocument: a(actionDownloadDocument, 'user'),

  // ---------------- Student ----------------
  getStudentProfile: a(actionGetStudentProfile, 'student'),
  updateStudentProfile: a(actionUpdateStudentProfile, 'student'),
  getStudentDashboard: a(actionGetStudentDashboard, 'student'),
  getStudentMembership: a(actionGetStudentMembership, 'student'),
  getStudentEvents: a(actionGetStudentEvents, 'student'),
  getStudentRegistrations: a(actionGetStudentRegistrations, 'student'),
  registerForEvent: a(registerEvent, 'student'),
  cancelMyRegistration: a(actionCancelMyRegistration, 'student'),
  getStudentResults: a(actionGetStudentResults, 'student'),
  getStudentCertificates: a(actionGetStudentCertificates, 'student'),
  getStudentAchievements: a(actionGetStudentAchievements, 'student'),
  getStudentPayments: a(actionGetStudentPayments, 'student'),
  getMyDocuments: a(actionGetMyDocuments, 'student'),
  uploadMyDocument: a(actionUploadMyDocument, 'student'),
  applyMembership: a(actionApplyMembership, 'student'),
  registerForProgram: a(actionRegisterForProgram, 'student'),
  startPayment: a(actionStartPayment, 'student'),
  verifyPayment: a(actionVerifyPayment, 'student'),
  submitPaymentReference: a(actionSubmitPaymentReference, 'student'),

  // ---------------- System (website server only) ----------------
  paymentWebhook: a(actionPaymentWebhook, 'system'),
  runSetup: a(actionRunSetup, 'system'),

  // ---------------- Admin ----------------
  'admin.getAdminDashboard': a(actionGetAdminDashboard, 'admin'),
  'admin.getStudents': a(actionAdminGetStudents, 'admin'),
  'admin.getStudent': a(actionAdminGetStudent, 'admin'),
  'admin.searchStudents': a(actionAdminSearchStudents, 'admin'),
  'admin.createStudent': a(actionAdminCreateStudent, 'admin'),
  'admin.updateStudent': a(actionAdminUpdateStudent, 'admin'),
  'admin.updateStudentStatus': a(actionAdminUpdateStudentStatus, 'admin'),

  'admin.getEvents': a(actionAdminGetEvents, 'admin'),
  'admin.getEvent': a(actionAdminGetEvent, 'admin'),
  'admin.createEvent': a(actionAdminCreateEvent, 'admin'),
  'admin.updateEvent': a(actionAdminUpdateEvent, 'admin'),
  'admin.publishEvent': a(actionAdminPublishEvent, 'admin'),
  'admin.unpublishEvent': a(actionAdminUnpublishEvent, 'admin'),
  'admin.cancelEvent': a(actionAdminCancelEvent, 'admin'),
  'admin.archiveEvent': a(actionAdminArchiveEvent, 'admin'),
  'admin.generateCategories': a(actionAdminGenerateCategories, 'admin'),
  'admin.getEventReport': a(actionAdminGetEventReport, 'admin'),

  'admin.getEventRegistrations': a(actionAdminGetRegistrations, 'admin'),
  'admin.exportEventRegistrations': a(actionAdminExportEventRegistrations, 'admin'),
  'admin.updateRegistration': a(actionAdminUpdateRegistration, 'admin'),
  'admin.assignBibs': a(actionAdminAssignBibs, 'admin'),
  'admin.createRegistration': a(actionAdminCreateRegistration, 'admin'),

  'admin.getPrograms': a(entityAlias('programs', 'list'), 'admin'),
  'admin.createProgram': a(entityAlias('programs', 'create'), 'admin'),
  'admin.updateProgram': a(entityAlias('programs', 'update'), 'admin'),
  'admin.publishProgram': a(entityAlias('programs', 'publish'), 'admin'),

  'admin.getGallery': a(entityAlias('gallery', 'list'), 'admin'),
  'admin.createGalleryItem': a(entityAlias('gallery', 'create'), 'admin'),
  'admin.updateGalleryItem': a(entityAlias('gallery', 'update'), 'admin'),
  'admin.deleteGalleryItem': a(entityAlias('gallery', 'delete', { permanent: true }), 'admin'),

  'admin.getMembershipPlans': a(entityAlias('membershipPlans', 'list'), 'admin'),
  'admin.createMembershipPlan': a(entityAlias('membershipPlans', 'create'), 'admin'),
  'admin.updateMembershipPlan': a(entityAlias('membershipPlans', 'update'), 'admin'),

  'admin.getMemberships': a(actionAdminGetMemberships, 'admin'),
  'admin.createMembership': a(actionAdminCreateMembership, 'admin'),
  'admin.approveMembership': a(actionAdminApproveMembership, 'admin'),
  'admin.rejectMembership': a(actionAdminRejectMembership, 'admin'),
  'admin.renewMembership': a(actionAdminRenewMembership, 'admin'),
  'admin.setMembershipStatus': a(actionAdminSetMembershipStatus, 'admin'),
  'admin.getMembershipReport': a(actionAdminGetMembershipReport, 'admin'),

  'admin.getResults': a(actionAdminGetResults, 'admin'),
  'admin.saveResults': a(actionAdminSaveResults, 'admin'),
  'admin.createResult': a(actionAdminCreateResult, 'admin'),
  'admin.updateResult': a(actionAdminUpdateResult, 'admin'),
  'admin.deleteResult': a(actionAdminDeleteResult, 'admin'),
  'admin.publishResults': a(actionAdminPublishResults, 'admin'),

  'admin.createCertificate': a(actionAdminCreateCertificate, 'admin'),
  'admin.revokeCertificate': a(actionAdminRevokeCertificate, 'admin'),
  'admin.publishCertificate': a(actionAdminPublishCertificate, 'admin'),
  'admin.regenerateCertificate': a(actionAdminRegenerateCertificate, 'admin'),
  'admin.generateEventCertificates': a(actionAdminGenerateEventCertificates, 'admin'),

  'admin.getContactInquiries': a(entityAlias('inquiries', 'list'), 'admin'),
  'admin.updateContactInquiry': a(entityAlias('inquiries', 'update'), 'admin'),
  'admin.getSponsors': a(entityAlias('sponsors', 'list'), 'admin'),
  'admin.updateSponsors': a(function (p, ctx) { return actionAdminSave({ entity: 'sponsors', id: p.id, data: p.data, updatedAt: p.updatedAt }, ctx); }, 'admin'),

  'admin.getPayments': a(actionAdminGetPayments, 'admin'),
  'admin.updatePayment': a(actionAdminUpdatePayment, 'admin'),

  'admin.getReport': a(actionAdminGetReport, 'admin'),
  'admin.export': a(actionAdminExport, 'admin'),

  'admin.list': a(actionAdminList, 'admin'),
  'admin.get': a(actionAdminGet, 'admin'),
  'admin.save': a(actionAdminSave, 'admin'),
  'admin.setStatus': a(actionAdminSetStatus, 'admin'),
  'admin.delete': a(actionAdminDelete, 'admin'),
  'admin.bulkStatus': a(actionAdminBulkStatus, 'admin'),
  'admin.upload': a(actionAdminUpload, 'admin'),

  'admin.getSettings': a(actionAdminGetSettings, 'admin'),
  'admin.updateSettings': a(actionAdminUpdateSettings, 'admin'),
  'admin.setSecret': a(actionAdminSetSecret, 'admin'),
  'admin.clearCache': a(actionAdminClearCache, 'admin'),
  'admin.listAdmins': a(actionAdminListAdmins, 'admin'),
  'admin.createAdmin': a(actionAdminCreateAdmin, 'admin'),
  'admin.setAdminStatus': a(actionAdminSetAdminStatus, 'admin'),
  'admin.deleteSampleData': a(actionAdminDeleteSampleData, 'admin'),
  'admin.createSampleData': a(actionAdminCreateSampleData, 'admin'),
};

/** Public read actions that may be called with GET (cache-friendly). */
const GET_ALLOWED = ['getSettings', 'getHome', 'getAbout', 'getPage', 'getUpcomingEvents', 'getOngoingEvents', 'getPastEvents', 'getEvents', 'getEvent',
  'getEventCategories', 'getEventResults', 'getPrograms', 'getProgram', 'getCertifications', 'getGallery', 'getVideos', 'getMembershipPlans',
  'getAnnouncements', 'getSponsors', 'getRankings', 'verifyMembership', 'verifyCertificate', 'setupStatus'];

/** Clears per-execution memoisation (each Apps Script request normally starts fresh). */
function resetRequestState() {
  Db.refresh();
  resetSettingsMemo();
  _folderMemo = null;
  _lockDepth = 0;
}

/** Spec alias: validates the request envelope and returns the action definition. */
function validateRequest(method, req) {
  if (!req || typeof req !== 'object') throw new ApiError('BAD_REQUEST', 'Invalid request.');
  const action = str(req.action);
  if (!/^[A-Za-z.]{2,60}$/.test(action) || !Object.prototype.hasOwnProperty.call(ACTIONS, action)) throw new ApiError('UNKNOWN_ACTION', 'Unknown action.', 404);
  const secret = prop(PROP.API_PROXY_SECRET);
  if (secret && !safeEqual(secret, str(req.key))) throw new ApiError('FORBIDDEN', 'Access denied.', 403);
  if (method === 'GET' && GET_ALLOWED.indexOf(action) === -1) throw new ApiError('METHOD_NOT_ALLOWED', 'Use POST for this action.', 405);
  const def = ACTIONS[action];
  if (def.access === 'system' && !secret) throw new ApiError('FORBIDDEN', 'Configure API_PROXY_SECRET first.', 403);
  if (req.payload !== undefined && (typeof req.payload !== 'object' || req.payload === null || Array.isArray(req.payload))) {
    throw new ApiError('BAD_REQUEST', 'Invalid request payload.');
  }
  return def;
}

function handleRequest(method, req) {
  resetRequestState();
  const action = str(req && req.action);
  const ctx = { user: null, student: null, tokenHash: null, clientKey: 'anon', context: '' };
  try {
    const def = validateRequest(method, req);
    if (def.access !== 'public' && def.access !== 'system' && action !== 'setupStatus' && !isInitialized()) {
      throw new ApiError('NOT_CONFIGURED', 'The system has not been set up yet.', 503);
    }
    ctx.clientKey = str(req.clientIp).slice(0, 64) || 'anon';
    ctx.context = (method + ' ' + action + ' ' + (req.clientIp ? 'ip:' + str(req.clientIp).slice(0, 64) : '')).trim();
    if (req.token) {
      const sess = resolveSession(str(req.token));
      if (sess) { ctx.user = sess.user; ctx.student = sess.student; ctx.tokenHash = sess.tokenHash; }
    }
    if (def.access === 'user') requireUser(ctx);
    if (def.access === 'student') requireStudent(ctx);
    if (def.access === 'admin') requireAdmin(ctx);
    const data = def.fn(req.payload || {}, ctx);
    return { success: true, data: data === undefined ? null : data, message: 'Success' };
  } catch (err) {
    if (err instanceof ApiError) {
      return { success: false, error: err.code, message: err.message, status: err.status };
    }
    logError(action, err, ctx);
    return { success: false, error: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.', status: 500 };
  }
}
