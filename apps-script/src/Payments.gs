/**
 * Payments.gs — payment records and a configurable payment gateway.
 *
 * Gateways (Settings → PAYMENT_GATEWAY):
 *   MANUAL   – pay offline; an admin verifies and marks the payment SUCCESS.
 *   RAZORPAY – Razorpay Checkout. Success is recorded only after the
 *              signature is verified with the secret key AND the payment is
 *              confirmed via the Razorpay API, or via a signed webhook.
 *   FREE     – treated like MANUAL for paid items (no online collection).
 * Zero-amount items are marked SUCCESS immediately.
 *
 * Card numbers or other payment credentials are never stored.
 */

function paymentGateway() {
  const g = upper(getSettingValue('PAYMENT_GATEWAY', 'MANUAL'));
  if (g === 'RAZORPAY' && prop(PROP.RAZORPAY_KEY_ID) && prop(PROP.RAZORPAY_KEY_SECRET)) return 'RAZORPAY';
  return 'MANUAL';
}

function createPaymentRecord(o) {
  const amount = Math.max(0, toNumber(o.amount, 0));
  const free = amount <= 0;
  return Db.insert('Payments', {
    Payment_ID: generateID('Payments'),
    User_ID: o.userId || '', Student_ID: o.studentId || '', Event_ID: o.eventId || '', Membership_ID: o.membershipId || '',
    Program_ID: o.programId || '', Registration_ID: o.registrationId || '', Program_Registration_ID: o.programRegistrationId || '',
    Amount: amount, Currency: getSettingValue('DEFAULT_CURRENCY', 'INR'), Payment_Type: o.type,
    Gateway: free ? 'NONE' : paymentGateway(), Transaction_ID: '', Payment_Date: free ? todayKey() : '',
    Payment_Status: free ? 'SUCCESS' : 'PENDING', Gateway_Response_ID: '', Remarks: str(o.remarks).slice(0, 300),
  });
}

function serializePayment(p) {
  if (!p) return null;
  return {
    id: p.Payment_ID, amount: toNumber(p.Amount, 0), currency: p.Currency || 'INR', type: p.Payment_Type, gateway: p.Gateway,
    status: p.Payment_Status, transactionId: p.Transaction_ID, date: toDateKey(p.Payment_Date), remarks: p.Remarks,
    eventId: p.Event_ID, membershipId: p.Membership_ID, programId: p.Program_ID, registrationId: p.Registration_ID,
    createdAt: p.Created_At,
  };
}

function ownPayment(ctx, paymentId) {
  const student = requireStudent(ctx);
  const pay = Db.byId('Payments', str(paymentId));
  if (!pay || pay.Student_ID !== student.Student_ID) fail('NOT_FOUND', 'Payment not found.');
  return pay;
}

function razorpayRequest(method, path, body) {
  const auth = Utilities.base64Encode(prop(PROP.RAZORPAY_KEY_ID) + ':' + prop(PROP.RAZORPAY_KEY_SECRET));
  const opts = { method: method, muteHttpExceptions: true, headers: { Authorization: 'Basic ' + auth }, contentType: 'application/json' };
  if (body) opts.payload = JSON.stringify(body);
  const res = UrlFetchApp.fetch('https://api.razorpay.com/v1' + path, opts);
  const json = parseJsonSafe(res.getContentText(), {});
  if (res.getResponseCode() >= 300) {
    throw new Error('Razorpay ' + path + ' failed: ' + res.getResponseCode() + ' ' + res.getContentText().slice(0, 300));
  }
  return json;
}

/** Starts (or resumes) payment for a pending payment record. */
function actionStartPayment(p, ctx) {
  const pay = ownPayment(ctx, p.paymentId);
  const status = upper(pay.Payment_Status);
  if (status === 'SUCCESS') return { gateway: 'NONE', status: 'SUCCESS', payment: serializePayment(pay) };
  if (status !== 'PENDING') fail('NOT_ALLOWED', 'This payment can no longer be completed.');
  const gateway = paymentGateway();
  if (gateway === 'RAZORPAY') {
    let orderId = pay.Gateway_Order_ID;
    if (!orderId) {
      const order = razorpayRequest('post', '/orders', {
        amount: Math.round(toNumber(pay.Amount) * 100), currency: pay.Currency || 'INR', receipt: pay.Payment_ID,
        notes: { payment_id: pay.Payment_ID, type: pay.Payment_Type },
      });
      orderId = order.id;
      Db.update('Payments', pay.Payment_ID, { Gateway_Order_ID: orderId, Gateway: 'RAZORPAY' });
    }
    return {
      gateway: 'RAZORPAY', keyId: prop(PROP.RAZORPAY_KEY_ID), orderId: orderId, amount: Math.round(toNumber(pay.Amount) * 100),
      currency: pay.Currency || 'INR', name: getSettingValue('SITE_NAME'), description: pay.Remarks,
      prefill: { name: ctx.student.Full_Name, email: ctx.user.Email }, payment: serializePayment(pay),
    };
  }
  if (pay.Gateway !== 'MANUAL') Db.update('Payments', pay.Payment_ID, { Gateway: 'MANUAL' });
  return {
    gateway: 'MANUAL', instructions: getSettingValue('PAYMENT_INSTRUCTIONS'), amount: toNumber(pay.Amount),
    currency: pay.Currency || 'INR', reference: pay.Payment_ID, payment: serializePayment(pay),
  };
}

/** MANUAL gateway: the student submits their bank/UPI reference for verification. */
function actionSubmitPaymentReference(p, ctx) {
  const pay = ownPayment(ctx, p.paymentId);
  if (upper(pay.Payment_Status) !== 'PENDING') fail('NOT_ALLOWED', 'This payment is not pending.');
  validate(p, { reference: 'required|max:100' });
  Db.update('Payments', pay.Payment_ID, { Transaction_ID: str(p.reference), Remarks: (pay.Remarks + ' | Reference submitted by student').slice(0, 300) });
  return { submitted: true, payment: serializePayment(Db.byId('Payments', pay.Payment_ID)) };
}

/** Razorpay Checkout success handler — verifies the signature server-side. */
function actionVerifyPayment(p, ctx) {
  const pay = ownPayment(ctx, p.paymentId);
  if (upper(pay.Payment_Status) === 'SUCCESS') return { status: 'SUCCESS', payment: serializePayment(pay) };
  if (!pay.Gateway_Order_ID || str(p.razorpay_order_id) !== pay.Gateway_Order_ID) fail('PAYMENT_INVALID', 'Payment could not be verified.');
  const expected = hmacSha256Hex(pay.Gateway_Order_ID + '|' + str(p.razorpay_payment_id), prop(PROP.RAZORPAY_KEY_SECRET));
  if (!safeEqual(expected, str(p.razorpay_signature))) fail('PAYMENT_INVALID', 'Payment could not be verified.');
  let gp = razorpayRequest('get', '/payments/' + encodeURIComponent(str(p.razorpay_payment_id)));
  if (gp.order_id !== pay.Gateway_Order_ID || Number(gp.amount) !== Math.round(toNumber(pay.Amount) * 100)) {
    fail('PAYMENT_INVALID', 'Payment details do not match.');
  }
  if (gp.status === 'authorized') gp = razorpayRequest('post', '/payments/' + gp.id + '/capture', { amount: gp.amount, currency: gp.currency });
  if (gp.status !== 'captured') fail('PAYMENT_PENDING', 'Payment is not complete yet. It will update automatically once confirmed.');
  const updated = markPaymentSuccess(pay.Payment_ID, { transactionId: gp.id, gatewayResponseId: gp.id }, ctx);
  return { status: 'SUCCESS', payment: serializePayment(updated) };
}

/**
 * Razorpay webhook, forwarded by the website server with the raw body and
 * the X-Razorpay-Signature header. The signature is verified here.
 */
function actionPaymentWebhook(p) {
  const secret = prop(PROP.RAZORPAY_WEBHOOK_SECRET);
  if (!secret) fail('NOT_CONFIGURED', 'Webhook secret not configured.');
  const expected = hmacSha256Hex(str(p.rawBody), secret);
  if (!safeEqual(expected, str(p.signature))) fail('FORBIDDEN', 'Invalid signature.');
  const body = parseJsonSafe(p.rawBody, {});
  const entity = body.payload && body.payload.payment ? body.payload.payment.entity : null;
  if (!entity || !entity.order_id) return { ignored: true };
  const pay = Db.findOne('Payments', 'Gateway_Order_ID', entity.order_id);
  if (!pay) return { ignored: true };
  if ((body.event === 'payment.captured' || body.event === 'order.paid') && entity.status === 'captured' &&
      Number(entity.amount) === Math.round(toNumber(pay.Amount) * 100)) {
    markPaymentSuccess(pay.Payment_ID, { transactionId: entity.id, gatewayResponseId: body.event + ':' + entity.id }, null);
    return { processed: true };
  }
  if (body.event === 'payment.failed' && upper(pay.Payment_Status) === 'PENDING') {
    Db.update('Payments', pay.Payment_ID, { Gateway_Response_ID: 'payment.failed:' + entity.id,
      Remarks: (pay.Remarks + ' | Last attempt failed').slice(0, 300) });
  }
  return { processed: true };
}

/**
 * Marks a payment SUCCESS (idempotent) and applies its effects:
 * registration → PAID/CONFIRMED, membership → ACTIVE or awaiting approval,
 * program registration → CONFIRMED.
 */
function markPaymentSuccess(paymentId, info, ctx) {
  info = info || {};
  const done = withLock(function () {
    Db.refresh('Payments');
    const pay = Db.byId('Payments', paymentId);
    if (!pay) fail('NOT_FOUND', 'Payment not found.');
    if (upper(pay.Payment_Status) === 'SUCCESS') return { pay: pay, already: true };
    const updated = Db.update('Payments', pay.Payment_ID, {
      Payment_Status: 'SUCCESS', Payment_Date: todayKey(), Transaction_ID: info.transactionId || pay.Transaction_ID,
      Gateway_Response_ID: info.gatewayResponseId || pay.Gateway_Response_ID,
      Remarks: info.remarks ? (pay.Remarks + ' | ' + info.remarks).slice(0, 300) : pay.Remarks,
    });
    return { pay: updated, already: false };
  });
  if (done.already) return done.pay;
  const pay = done.pay;
  if (pay.Registration_ID) {
    const reg = Db.byId('Event_Registrations', pay.Registration_ID);
    if (reg) {
      Db.update('Event_Registrations', reg.Registration_ID, { Payment_Status: 'PAID', Registration_Status: 'CONFIRMED' });
      const ev = Db.byId('Events', reg.Event_ID) || {};
      notifyUser(pay.User_ID, 'Payment successful', 'Your payment for ' + (ev.Event_Name || 'the event') + ' was received. Registration ' +
        reg.Registration_Number + ' is confirmed.', 'PAYMENT', reg.Registration_ID);
      clearCacheForSheets(['Event_Registrations']);
    }
  }
  if (pay.Membership_ID) {
    const m = Db.byId('Memberships', pay.Membership_ID);
    if (m) {
      if (toBool(getSettingValue('MEMBERSHIP_AUTO_APPROVE', 'FALSE'))) {
        activateMembership(m, ctx, 'AUTO');
      } else {
        Db.update('Memberships', m.Membership_ID, { Remarks: 'Payment received — awaiting approval' });
        notifyUser(pay.User_ID, 'Payment successful', 'Your membership payment was received and is awaiting approval.', 'PAYMENT', m.Membership_ID);
      }
    }
  }
  if (pay.Program_Registration_ID) {
    const pr = Db.byId('Program_Registrations', pay.Program_Registration_ID);
    if (pr) {
      Db.update('Program_Registrations', pr.Program_Registration_ID, { Status: 'CONFIRMED' });
      const prog = Db.byId('Programs', pr.Program_ID) || {};
      notifyUser(pay.User_ID, 'Program registration confirmed', 'Your payment for ' + (prog.Program_Name || 'the program') +
        ' was received.', 'PROGRAM', pr.Program_Registration_ID);
    }
  }
  writeAuditLog(ctx, 'PAYMENT_SUCCESS', 'Payment', pay.Payment_ID, null, { Payment_Status: 'SUCCESS', Amount: pay.Amount });
  return pay;
}

/** Admin: verify manual payments, record refunds, failures or cancellations. */
function actionAdminUpdatePayment(p, ctx) {
  requireAdmin(ctx);
  const pay = Db.byId('Payments', str(p.paymentId));
  if (!pay) fail('NOT_FOUND', 'Payment not found.');
  const status = upper(p.status);
  if (PAYMENT_STATUSES.indexOf(status) === -1) fail('VALIDATION_ERROR', 'Invalid payment status.');
  if (status === 'SUCCESS') {
    const r = markPaymentSuccess(pay.Payment_ID, { transactionId: str(p.transactionId) || pay.Transaction_ID,
      gatewayResponseId: 'manual:' + ctx.user.User_ID, remarks: str(p.remarks) }, ctx);
    return serializePayment(r);
  }
  const updated = Db.update('Payments', pay.Payment_ID, {
    Payment_Status: status, Transaction_ID: str(p.transactionId) || pay.Transaction_ID,
    Remarks: str(p.remarks) ? (pay.Remarks + ' | ' + str(p.remarks)).slice(0, 300) : pay.Remarks,
  });
  if (pay.Registration_ID) {
    const regPatch = { Payment_Status: status === 'REFUNDED' ? 'REFUNDED' : status };
    if (status === 'REFUNDED' || status === 'CANCELLED') regPatch.Registration_Status = 'CANCELLED';
    Db.update('Event_Registrations', pay.Registration_ID, regPatch);
    clearCacheForSheets(['Event_Registrations']);
  }
  if (status === 'REFUNDED') notifyUser(pay.User_ID, 'Refund processed', 'Your payment ' + pay.Payment_ID + ' has been refunded.', 'PAYMENT', pay.Payment_ID);
  writeAuditLog(ctx, 'UPDATE_PAYMENT', 'Payment', pay.Payment_ID, { Payment_Status: pay.Payment_Status }, { Payment_Status: status });
  return serializePayment(updated);
}
