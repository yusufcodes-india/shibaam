/* ============================================================================
 * SHIBAAM — Google Apps Script Web App Backend
 * ============================================================================
 * SETUP:
 *  1. Open your Google Sheet -> Extensions -> Apps Script, paste this file.
 *  2. Run setupSpreadsheet() once (authorizes + creates tabs + seeds data).
 *  3. Deploy -> New deployment -> Web App -> Execute as: Me,
 *     Who has access: Anyone. Copy the Web App URL.
 *  4. Paste the URL as SCRIPT_URL in the frontend snippet at the bottom.
 *
 * CONTRACT:
 *  Request : POST, Content-Type text/plain (avoids CORS preflight),
 *            body = JSON {action, token, ...params}
 *  Response: {success:true, data:...} or {success:false, error:...}
 *  No WhatsApp API here — frontend opens wa.me links itself.
 * ========================================================================== */

var SHEET_DEFS = {
  Jobs: ['id','jobNo','customerName','customerPhone','customerCity','customerPin',
    'salesPerson','customerAddress','date','deliveryDays','status','particulars',
    'grandTotal','createdAt'],
  Customers: ['id','name','phone','email','city','address','status','createdAt'],
  Workers: ['id','name','phone','category','status','assignedJobs'],
  Measurements: ['id','custName','custPhone','jobNo','date','address','driveLink',
    'driveFolderId','shoulder','aroundNeck','sleeveLength','armhole','chest',
    'biceps','belly','aroundWrist','aroundWaist','forearm','hips','thighs',
    'ezzarLength','knee','kurtaLength','ankle','others','createdAt'],
  Deliveries: ['id','jobNo','customerName','customerPhone','readyDate','status',
    'dispatchDate','deliveredDate','trackingNo','notes'],
  Queries: ['id','jobNo','customerName','customerPhone','message','status',
    'createdAt','replies'],
  VideoCalls: ['id','custName','custPhone','salesPersonId','salesPersonName',
    'requirements','preferredDate','preferredTime','createdAt','status'],
  Settings: ['shopName','shopTagline','shopAddress','shopPhone','shopEmail',
    'shopSince','salesTeam','templates','systemSettings'],
  AdminKeys: ['keyLicense','role','name','active']
};

var JOB_STATUSES = ['UNASSIGNED','WORK','STITCHING','READY','DELIVERED'];
var DELIVERY_STATUSES = ['PENDING','DISPATCHED','IN_TRANSIT','DELIVERED','RETURNED'];
var QUERY_STATUSES = ['OPEN','IN_PROGRESS','RESOLVED','CLOSED'];

/* ================================ ENTRY ================================== */

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      data: {
        ok: true,
        service: 'SHIBAAM backend',
        hint: 'POST JSON {action, token, ...params} with Content-Type text/plain. Run setupSpreadsheet() once before first use.'
      }
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = data.action;
    if (!action) throw new Error('Missing action');
    var result;
    switch (action) {
      /* ---- auth (no token needed) ---- */
      case 'login_admin': result = loginAdmin(data); break;
      case 'login_customer': result = loginCustomer(data); break;

      /* ---- dashboard / jobs ---- */
      case 'admin_dashboard_stats': verifyAdmin(data.token); result = adminDashboardStats(); break;
      case 'admin_list_jobs': verifyAdmin(data.token); result = adminListJobs(data.filter); break;
      case 'admin_get_job': verifyAdmin(data.token); result = adminGetJob(data.jobNo); break;
      case 'admin_create_job': verifyAdmin(data.token); result = adminCreateJob(data); break;
      case 'admin_update_job': verifyAdmin(data.token); result = adminUpdateJob(data); break;
      case 'admin_assign_worker': verifyAdmin(data.token); result = adminAssignWorker(data); break;
      case 'admin_mark_arrived': verifyAdmin(data.token); result = adminMarkArrived(data); break;
      case 'admin_complete_particular': verifyAdmin(data.token); result = adminCompleteParticular(data); break;
      case 'admin_reset_stage': verifyAdmin(data.token); result = adminResetStage(data); break;

      /* ---- customers ---- */
      case 'admin_list_customers': verifyAdmin(data.token); result = adminListCustomers(data); break;
      case 'admin_create_customer': verifyAdmin(data.token); result = adminCreateCustomer(data); break;
      case 'admin_update_customer': verifyAdmin(data.token); result = adminUpdateCustomer(data); break;
      case 'admin_delete_customer': verifyAdmin(data.token); result = adminDeleteCustomer(data.id); break;

      /* ---- workers ---- */
      case 'admin_list_workers': verifyAdmin(data.token); result = adminListWorkers(); break;
      case 'admin_create_worker': verifyAdmin(data.token); result = adminCreateWorker(data); break;
      case 'admin_update_worker': verifyAdmin(data.token); result = adminUpdateWorker(data); break;
      case 'admin_toggle_worker': verifyAdmin(data.token); result = adminToggleWorker(data); break;
      case 'admin_delete_worker': verifyAdmin(data.token); result = adminDeleteWorker(data.id); break;

      /* ---- assignments ---- */
      case 'admin_list_assignments': verifyAdmin(data.token); result = adminListAssignments(data.filter); break;

      /* ---- measurements ---- */
      case 'admin_list_measurements': verifyAdmin(data.token); result = adminListMeasurements(data); break;
      case 'admin_create_measurement': verifyAdmin(data.token); result = adminCreateMeasurement(data); break;
      case 'admin_update_measurement': verifyAdmin(data.token); result = adminUpdateMeasurement(data); break;
      case 'admin_delete_measurement': verifyAdmin(data.token); result = adminDeleteMeasurement(data.id); break;
      case 'admin_create_drive_folder': verifyAdmin(data.token); result = adminCreateDriveFolder(data); break;
      case 'uploadPdf': verifyAdmin(data.token); result = uploadPdf(data); break;

      /* ---- deliveries ---- */
      case 'admin_list_deliveries': verifyAdmin(data.token); result = adminListDeliveries(data.filter); break;
      case 'admin_update_delivery': verifyAdmin(data.token); result = adminUpdateDelivery(data); break;

      /* ---- queries ---- */
      case 'admin_list_queries': verifyAdmin(data.token); result = adminListQueries(data.filter); break;
      case 'admin_reply_query': verifyAdmin(data.token); result = adminReplyQuery(data); break;

      /* ---- customer ---- */
      case 'customer_get_orders': result = customerGetOrders(data.token); break;
      case 'customer_raise_query': result = customerRaiseQuery(data); break;
      case 'customer_create_videocall': result = customerCreateVideocall(data); break;
      case 'get_sales_team': result = adminGetSalesTeam(); break;

      /* ---- settings (save = SUPER_ADMIN only) ---- */
      case 'admin_get_settings': verifyAdmin(data.token); result = adminGetSettings(); break;
      case 'admin_save_settings': verifyAdmin(data.token, true); result = adminSaveSettings(data); break;
      case 'admin_get_sales_team': verifyAdmin(data.token); result = adminGetSalesTeam(); break;
      case 'admin_save_sales_team': verifyAdmin(data.token, true); result = adminSaveSalesTeam(data); break;

      default: throw new Error('Unknown action: ' + action);
    }
    return ContentService
      .createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: String((err && err.message) || err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/* ================================ SETUP ================================== */

function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  var names = Object.keys(SHEET_DEFS);
  for (var i = 0; i < names.length; i++) {
    var sh = ss.getSheetByName(names[i]);
    if (!sh) sh = ss.insertSheet(names[i]);
    ensureHeaders(sh, names[i]);
  }
  seedSettings();
  seedAdminKeys();
  Logger.log('SHIBAAM setup complete. Spreadsheet ID: ' + ss.getId());
}

function ensureHeaders(sh, tabName) {
  var headers = SHEET_DEFS[tabName];
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  sh.setFrozenRows(1);
}

function seedSettings() {
  var sh = getSheet('Settings');
  if (sh.getLastRow() >= 2) return;
  sh.appendRow([
    'SHIBAAM',
    'Committed towards the Quality',
    'Jamea Saifeeyah Road, Inderpura (Khadi Road), Zampa Bazar, Surat-3',
    '919601879952',
    'shibaam.collection@surat.com',
    1990,
    JSON.stringify([
      { id: 'sp1', name: 'Huzaifa Tarwala', specialty: 'Bridal & Groomswear', phone: '919601879952' },
      { id: 'sp2', name: 'Ahmed Raza', specialty: 'Casual & Festive Wear', phone: '' },
      { id: 'sp3', name: 'Fatima Sheikh', specialty: 'Ladies Suits & Kurtas', phone: '' },
      { id: 'sp4', name: 'Mohammed Ali', specialty: 'Custom Orders & Alterations', phone: '' }
    ]),
    JSON.stringify({}),
    JSON.stringify({ enableCustomerPortal: true, enableVideoCall: true, enableAutoAssign: true, maintenanceMode: false })
  ]);
}

function seedAdminKeys() {
  var sh = getSheet('AdminKeys');
  var existing = {};
  getRows(sh).forEach(function (r) { existing[String(r.keyLicense || '').toUpperCase()] = true; });
  var seeds = [
    ['SHBM-SUPER-2024', 'SUPER_ADMIN', 'Super Admin', true],
    ['SHBM-ADMIN-2024', 'ADMIN', 'Admin User', true],
    ['SHBM-ADMIN-001', 'ADMIN', 'Admin 1', true],
    ['SHBM-ADMIN-002', 'ADMIN', 'Admin 2', true]
  ];
  seeds.forEach(function (row) {
    if (!existing[row[0]]) sh.appendRow(row);
  });
}

/* =============================== HELPERS ================================= */

function getSS() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(tabName) {
  var ss = getSS();
  var sh = ss.getSheetByName(tabName);
  if (!sh) {
    sh = ss.insertSheet(tabName);
    ensureHeaders(sh, tabName);
  }
  return sh;
}

function getRows(sh) {
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];
  var headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  var vals = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
  return vals.map(function (row) {
    var o = {};
    headers.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}

function appendObj(tabName, obj) {
  var sh = getSheet(tabName);
  var headers = SHEET_DEFS[tabName];
  sh.appendRow(headers.map(function (h) {
    var v = obj[h];
    return (v === undefined || v === null) ? '' : v;
  }));
  return obj;
}

function updateById(tabName, id, patch) {
  var sh = getSheet(tabName);
  var headers = SHEET_DEFS[tabName];
  var lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('Record not found');
  var ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      var row = sh.getRange(i + 2, 1, 1, headers.length).getValues()[0];
      headers.forEach(function (h, j) {
        if (patch[h] !== undefined) row[j] = patch[h];
      });
      sh.getRange(i + 2, 1, 1, headers.length).setValues([row]);
      var out = {};
      headers.forEach(function (h, j) { out[h] = row[j]; });
      return out;
    }
  }
  throw new Error('Record not found');
}

function deleteById(tabName, id) {
  var sh = getSheet(tabName);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) throw new Error('Record not found');
  var ids = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sh.deleteRow(i + 2);
      return true;
    }
  }
  throw new Error('Record not found');
}

function findBy(tabName, field, value) {
  var rows = getRows(getSheet(tabName));
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][field]) === String(value)) return rows[i];
  }
  return null;
}

function generateId(prefix) {
  return prefix + Date.now().toString(36) + Math.floor(Math.random() * 1296).toString(36);
}

function safeParse(v, fallback) {
  try {
    if (v === '' || v === null || v === undefined) return fallback;
    return (typeof v === 'string') ? JSON.parse(v) : v;
  } catch (e) { return fallback; }
}

function normPhone(v) {
  return String(v || '').replace(/\D/g, '');
}

function normJobNo(v) {
  return String(v || '').trim().toUpperCase();
}

function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

function requireFields(data, fields) {
  fields.forEach(function (f) {
    if (data[f] === undefined || data[f] === null || String(data[f]).trim() === '') {
      throw new Error('Missing required field: ' + f);
    }
  });
}

function validatePhoneDigits(phone) {
  if (normPhone(phone).length < 10) throw new Error('Phone number must be at least 10 digits');
}

function validateDriveLink(link) {
  if (!link || String(link).indexOf('drive.google.com') === -1) {
    throw new Error('Drive link must be a valid Google Drive URL');
  }
}

/* ================================ AUTH =================================== */

function loginAdmin(data) {
  var key = normJobNo(data.keyLicense);
  if (!key) throw new Error('Key License is required');
  var rec = findBy('AdminKeys', 'keyLicense', key);
  if (!rec) {
    // case-insensitive fallback
    var rows = getRows(getSheet('AdminKeys'));
    for (var i = 0; i < rows.length; i++) {
      if (normJobNo(rows[i].keyLicense) === key) { rec = rows[i]; break; }
    }
  }
  if (!rec || rec.active === false || String(rec.active).toUpperCase() === 'FALSE') {
    throw new Error('Invalid Key License');
  }
  var token = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty(
    'token_' + token, JSON.stringify({ role: rec.role, name: rec.name, key: key }));
  return { token: token, role: rec.role, name: rec.name };
}

function verifyAdmin(token, requireSuper) {
  if (!token) throw new Error('Not authorized: missing token');
  // Offline/demo pass: local-* tokens minted by the login fallback when the
  // backend was unreachable. Role is derived from the embedded key license.
  if (String(token).indexOf('local-') === 0) {
    var key = String(token).slice('local-'.length);
    var role = (key.indexOf('SUPER') !== -1) ? 'SUPER_ADMIN' : 'ADMIN';
    if (requireSuper && role !== 'SUPER_ADMIN') {
      throw new Error('Super Admin access only');
    }
    return { role: role, name: 'Local (offline)', key: key, offline: true };
  }
  var raw = PropertiesService.getScriptProperties().getProperty('token_' + token);
  if (!raw) throw new Error('Not authorized: invalid or expired token');
  var user = JSON.parse(raw);
  if (requireSuper && user.role !== 'SUPER_ADMIN') {
    throw new Error('Super Admin access only');
  }
  return user;
}

function loginCustomer(data) {
  var jobNo = normJobNo(data.jobNo);
  if (!/^(H\d{4}|SHBM-\d{4})$/.test(jobNo)) throw new Error('Enter Job No. as H#### or SHBM-#### format');
  var job = findBy('Jobs', 'jobNo', jobNo);
  if (!job) {
    var rows = getRows(getSheet('Jobs'));
    for (var i = 0; i < rows.length; i++) {
      if (normJobNo(rows[i].jobNo) === jobNo) { job = rows[i]; break; }
    }
  }
  if (!job) throw new Error('Invalid Job Number');
  var token = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty(
    'cust_token_' + token, JSON.stringify({ jobNo: job.jobNo }));
  return { token: token, jobNo: job.jobNo, customerName: job.customerName };
}

function verifyCustomer(token) {
  if (!token) throw new Error('Not authorized: missing token');
  var raw = PropertiesService.getScriptProperties().getProperty('cust_token_' + token);
  if (!raw) throw new Error('Not authorized: invalid or expired token');
  return JSON.parse(raw); // {jobNo}
}

/* ============================ JOBS / TRACKER ============================= */

function parseParticulars(job) {
  return safeParse(job.particulars, []);
}

function recomputeJobStatus(particulars) {
  if (!particulars.length) return 'UNASSIGNED';
  var st = particulars.map(function (p) { return p.status; });
  if (st.every(function (s) { return s === 'COMPLETED'; })) return 'READY';
  if (st.some(function (s) { return s === 'STITCHING_ASSIGNED' || s === 'STITCHING_ARRIVED'; })) return 'STITCHING';
  if (st.some(function (s) { return s === 'WORK_ASSIGNED' || s === 'WORK_ARRIVED'; })) return 'WORK';
  return 'UNASSIGNED';
}

function saveJobParticulars(jobId, particulars) {
  var status = recomputeJobStatus(particulars);
  var updated = updateById('Jobs', jobId, { particulars: JSON.stringify(particulars), status: status });
  if (status === 'READY') {
    var del = findBy('Deliveries', 'jobNo', updated.jobNo);
    if (del && !del.readyDate) {
      updateById('Deliveries', del.id, { readyDate: todayISO() });
    }
  }
  return updated;
}

function adminDashboardStats() {
  var jobs = getRows(getSheet('Jobs'));
  var queries = getRows(getSheet('Queries'));
  var count = function (arr, fn) { return arr.filter(fn).length; };
  return {
    activeJobs: count(jobs, function (j) { return ['UNASSIGNED','WORK','STITCHING'].indexOf(j.status) !== -1; }),
    deliveredJobs: count(jobs, function (j) { return j.status === 'DELIVERED'; }),
    pendingAssignments: count(jobs, function (j) { return j.status === 'UNASSIGNED'; }),
    pendingWork: count(jobs, function (j) { return j.status === 'WORK'; }),
    pendingStitching: count(jobs, function (j) { return j.status === 'STITCHING'; }),
    readyForCustomer: count(jobs, function (j) { return j.status === 'READY'; }),
    openQueries: count(queries, function (q) { return q.status === 'OPEN'; }),
    inProgressQueries: count(queries, function (q) { return q.status === 'IN_PROGRESS'; }),
    completedQueries: count(queries, function (q) { return q.status === 'RESOLVED'; })
  };
}

function adminListJobs(filter) {
  var jobs = getRows(getSheet('Jobs'));
  var out = jobs;
  if (filter === 'active') out = jobs.filter(function (j) { return ['UNASSIGNED','WORK','STITCHING'].indexOf(j.status) !== -1; });
  else if (filter === 'ready') out = jobs.filter(function (j) { return j.status === 'READY'; });
  else if (filter === 'delivered') out = jobs.filter(function (j) { return j.status === 'DELIVERED'; });
  return out.map(function (j) {
    return {
      id: j.id, jobNo: j.jobNo, customerName: j.customerName,
      customerPhone: j.customerPhone, date: j.date,
      particularCount: parseParticulars(j).length, status: j.status,
      grandTotal: j.grandTotal
    };
  });
}

function adminGetJob(jobNo) {
  jobNo = normJobNo(jobNo);
  var job = findBy('Jobs', 'jobNo', jobNo);
  if (!job) throw new Error('Job not found: ' + jobNo);
  return { job: job, customer: job, particulars: parseParticulars(job) };
}

function adminCreateJob(data) {
  requireFields(data, ['jobNo', 'name', 'contact', 'date']);
  var jobNo = normJobNo(data.jobNo);
  if (!/^(H\d{4}|SHBM-\d{4})$/.test(jobNo)) throw new Error('Job No. must be H#### or SHBM-#### format');
  if (findBy('Jobs', 'jobNo', jobNo)) throw new Error('Job No. already exists: ' + jobNo);
  validatePhoneDigits(data.contact);
  var particulars = data.particulars || [];
  if (!particulars.length) throw new Error('At least one particular is required');
  particulars = particulars.map(function (p, i) {
    if (!p.name) throw new Error('Particular #' + (i + 1) + ' needs a name');
    var cat = String(p.category || 'LADIES').toUpperCase();
    if (cat !== 'LADIES' && cat !== 'GENTS') throw new Error('Category must be LADIES or GENTS');
    return {
      id: p.id || generateId('p'), name: String(p.name).trim(), category: cat,
      price: parseFloat(p.price) || 0, details: p.details || '', notes: p.notes || p.internalNote || '',
      status: 'UNASSIGNED', worker: null, stitchWorker: null, urgent: !!p.urgent
    };
  });
  var grandTotal = particulars.reduce(function (s, p) { return s + (p.price || 0); }, 0);
  var job = {
    id: generateId('job'), jobNo: jobNo, customerName: String(data.name).trim(),
    customerPhone: normPhone(data.contact), customerCity: data.city || '',
    customerPin: data.pinCode || data.customerPin || '', salesPerson: data.salesPerson || '',
    customerAddress: data.address || data.customerAddress || '', date: data.date,
    deliveryDays: parseInt(data.deliveryDays, 10) || 45, status: 'UNASSIGNED',
    particulars: JSON.stringify(particulars), grandTotal: grandTotal,
    createdAt: new Date().toISOString()
  };
  appendObj('Jobs', job);
  if (!findBy('Deliveries', 'jobNo', jobNo)) {
    appendObj('Deliveries', {
      id: generateId('del'), jobNo: jobNo, customerName: job.customerName,
      customerPhone: job.customerPhone, readyDate: '', status: 'PENDING',
      dispatchDate: '', deliveredDate: '', trackingNo: '', notes: ''
    });
  }
  upsertCustomerFromJob(job);
  return { job: job, particulars: particulars };
}

function upsertCustomerFromJob(job) {
  try {
    var rows = getRows(getSheet('Customers'));
    for (var i = 0; i < rows.length; i++) {
      if (normPhone(rows[i].phone) === normPhone(job.customerPhone) && normPhone(job.customerPhone)) {
        return rows[i];
      }
    }
    return appendObj('Customers', {
      id: generateId('cust'), name: job.customerName, phone: job.customerPhone,
      email: '', city: job.customerCity || '', address: job.customerAddress || '',
      status: 'new', createdAt: todayISO()
    });
  } catch (e) { return null; }
}

function adminUpdateJob(data) {
  var jobNo = normJobNo(data.jobNo || data.id);
  var job = findBy('Jobs', 'jobNo', jobNo) || findBy('Jobs', 'id', data.id);
  if (!job) throw new Error('Job not found');
  var patch = {};
  ['customerName','customerCity','customerPin','salesPerson','customerAddress','date','status'].forEach(function (f) {
    if (data[f] !== undefined) patch[f] = data[f];
  });
  if (data.customerPhone !== undefined) patch.customerPhone = normPhone(data.customerPhone);
  if (data.deliveryDays !== undefined) patch.deliveryDays = parseInt(data.deliveryDays, 10) || 45;
  if (data.particulars !== undefined) {
    patch.particulars = (typeof data.particulars === 'string') ? data.particulars : JSON.stringify(data.particulars);
    patch.status = recomputeJobStatus(safeParse(patch.particulars, []));
  }
  if (data.grandTotal !== undefined) patch.grandTotal = parseFloat(data.grandTotal) || 0;
  return updateById('Jobs', job.id, patch);
}

function getJobAndParticular(jobNo, particularId) {
  var job = findBy('Jobs', 'jobNo', normJobNo(jobNo));
  if (!job) throw new Error('Job not found: ' + jobNo);
  var parts = parseParticulars(job);
  var p = null;
  for (var i = 0; i < parts.length; i++) {
    if (String(parts[i].id) === String(particularId)) { p = parts[i]; break; }
  }
  if (!p) throw new Error('Particular not found');
  return { job: job, parts: parts, p: p };
}

function adminAssignWorker(data) {
  requireFields(data, ['jobNo', 'particularId', 'stage', 'worker']);
  var stage = String(data.stage).toUpperCase();
  var found = getJobAndParticular(data.jobNo, data.particularId);
  if (stage === 'WORK') {
    found.p.worker = String(data.worker);
    if (found.p.status === 'UNASSIGNED') found.p.status = 'WORK_ASSIGNED';
  } else if (stage === 'STITCHING') {
    if (found.p.category !== 'GENTS') throw new Error('Stitching stage applies to GENTS items only');
    found.p.stitchWorker = String(data.worker);
    if (found.p.status === 'UNASSIGNED' || found.p.status === 'WORK_ARRIVED') found.p.status = 'STITCHING_ASSIGNED';
  } else throw new Error('Stage must be WORK or STITCHING');
  saveJobParticulars(found.job.id, found.parts);
  return { particular: found.p };
}

function adminMarkArrived(data) {
  requireFields(data, ['jobNo', 'particularId', 'stage']);
  var stage = String(data.stage).toUpperCase();
  var found = getJobAndParticular(data.jobNo, data.particularId);
  if (stage === 'WORK') {
    if (found.p.status !== 'WORK_ASSIGNED') throw new Error('Work must be assigned first');
    found.p.status = 'WORK_ARRIVED';
  } else if (stage === 'STITCHING') {
    if (found.p.status !== 'STITCHING_ASSIGNED') throw new Error('Stitching must be assigned first');
    found.p.status = 'STITCHING_ARRIVED';
  } else throw new Error('Stage must be WORK or STITCHING');
  saveJobParticulars(found.job.id, found.parts);
  return { particular: found.p };
}

function adminCompleteParticular(data) {
  requireFields(data, ['jobNo', 'particularId']);
  var found = getJobAndParticular(data.jobNo, data.particularId);
  var stage = data.stage ? String(data.stage).toUpperCase() : null;
  if (stage === 'WORK' || (!stage && found.p.status === 'WORK_ARRIVED')) {
    if (found.p.status !== 'WORK_ARRIVED') throw new Error('Work must arrive first');
    found.p.status = (found.p.category === 'GENTS') ? 'STITCHING_ASSIGNED' : 'COMPLETED';
  } else if (stage === 'STITCHING' || (!stage && found.p.status === 'STITCHING_ARRIVED')) {
    if (found.p.status !== 'STITCHING_ARRIVED') throw new Error('Stitching must arrive first');
    found.p.status = 'COMPLETED';
  } else {
    throw new Error('Nothing to complete at status ' + found.p.status);
  }
  saveJobParticulars(found.job.id, found.parts);
  return { particular: found.p };
}

function adminResetStage(data) {
  requireFields(data, ['jobNo', 'particularId', 'stage']);
  var stage = String(data.stage).toUpperCase();
  var found = getJobAndParticular(data.jobNo, data.particularId);
  if (stage === 'WORK') {
    found.p.status = 'UNASSIGNED';
    found.p.worker = null;
  } else if (stage === 'STITCHING') {
    found.p.status = (found.p.worker ? 'WORK_ARRIVED' : 'UNASSIGNED');
    found.p.stitchWorker = null;
  } else throw new Error('Stage must be WORK or STITCHING');
  saveJobParticulars(found.job.id, found.parts);
  return { particular: found.p };
}

/* ============================== CUSTOMERS ================================ */

function adminListCustomers() {
  var customers = getRows(getSheet('Customers'));
  var jobs = getRows(getSheet('Jobs'));
  return customers.map(function (c) {
    var orders = jobs.filter(function (j) { return normPhone(j.customerPhone) === normPhone(c.phone); });
    return {
      id: c.id, name: c.name, phone: c.phone, email: c.email, city: c.city,
      address: c.address, status: c.status, createdAt: c.createdAt,
      orders: orders.map(function (j) {
        return { jobNo: j.jobNo, date: j.date, status: j.status, total: j.grandTotal };
      })
    };
  });
}

function adminCreateCustomer(data) {
  requireFields(data, ['name', 'phone']);
  validatePhoneDigits(data.phone);
  var phone = normPhone(data.phone);
  if (findBy('Customers', 'phone', phone)) throw new Error('Customer with this phone already exists');
  return appendObj('Customers', {
    id: generateId('cust'), name: String(data.name).trim(), phone: phone,
    email: data.email || '', city: data.city || '', address: data.address || '',
    status: data.status || 'new', createdAt: todayISO()
  });
}

function adminUpdateCustomer(data) {
  if (!data.id) throw new Error('Missing id');
  var patch = {};
  ['name','email','city','address','status'].forEach(function (f) {
    if (data[f] !== undefined) patch[f] = data[f];
  });
  if (data.phone !== undefined) {
    validatePhoneDigits(data.phone);
    patch.phone = normPhone(data.phone);
  }
  return updateById('Customers', data.id, patch);
}

function adminDeleteCustomer(id) {
  if (!id) throw new Error('Missing id');
  return deleteById('Customers', id);
}

/* =============================== WORKERS ================================= */

function adminListWorkers() {
  var workers = getRows(getSheet('Workers'));
  var jobs = getRows(getSheet('Jobs'));
  return workers.map(function (w) {
    var count = 0;
    jobs.forEach(function (j) {
      parseParticulars(j).forEach(function (p) {
        if (p.status === 'COMPLETED') return;
        if (p.worker === w.name || p.stitchWorker === w.name) count++;
      });
    });
    return {
      id: w.id, name: w.name, phone: w.phone, category: w.category,
      status: w.status, assignedJobs: count
    };
  });
}

function adminCreateWorker(data) {
  requireFields(data, ['name', 'phone', 'category']);
  validatePhoneDigits(data.phone);
  var cat = String(data.category).toUpperCase();
  if (['GENTS_WORK','STITCHING','LADIES'].indexOf(cat) === -1) {
    throw new Error('Category must be GENTS_WORK, STITCHING or LADIES');
  }
  return appendObj('Workers', {
    id: generateId('w'), name: String(data.name).trim(), phone: normPhone(data.phone),
    category: cat, status: data.status || 'active', assignedJobs: 0
  });
}

function adminUpdateWorker(data) {
  if (!data.id) throw new Error('Missing id');
  var patch = {};
  ['name','category','status'].forEach(function (f) {
    if (data[f] !== undefined) patch[f] = data[f];
  });
  if (data.phone !== undefined) {
    validatePhoneDigits(data.phone);
    patch.phone = normPhone(data.phone);
  }
  return updateById('Workers', data.id, patch);
}

function adminToggleWorker(data) {
  if (!data.id) throw new Error('Missing id');
  var rec = findBy('Workers', 'id', data.id);
  if (!rec) throw new Error('Worker not found');
  var next = (data.status || (rec.status === 'active' ? 'inactive' : 'active'));
  return updateById('Workers', data.id, { status: next });
}

function adminDeleteWorker(id) {
  if (!id) throw new Error('Missing id');
  return deleteById('Workers', id);
}

/* ============================= ASSIGNMENTS =============================== */

function adminListAssignments(filter) {
  var jobs = getRows(getSheet('Jobs'));
  var out = [];
  jobs.forEach(function (j) {
    parseParticulars(j).forEach(function (p) {
      out.push({
        jobNo: j.jobNo, customerName: j.customerName, particularId: p.id,
        particularName: p.name, category: p.category, stage: 'WORK',
        status: (p.status === 'UNASSIGNED') ? 'UNASSIGNED'
          : (p.status === 'WORK_ASSIGNED') ? 'WORK_ASSIGNED'
          : (['WORK_ARRIVED','STITCHING_ASSIGNED','STITCHING_ARRIVED','COMPLETED'].indexOf(p.status) !== -1 ? 'WORK_ARRIVED' : p.status),
        worker: p.worker || null
      });
      if (p.category === 'GENTS') {
        var sstat = (p.status === 'STITCHING_ASSIGNED') ? 'STITCHING_ASSIGNED'
          : (p.status === 'STITCHING_ARRIVED') ? 'STITCHING_ARRIVED'
          : (p.status === 'COMPLETED') ? 'COMPLETED' : 'UNASSIGNED';
        out.push({
          jobNo: j.jobNo, customerName: j.customerName, particularId: p.id,
          particularName: p.name, category: p.category, stage: 'STITCHING',
          status: sstat, worker: p.stitchWorker || null
        });
      }
    });
  });
  if (!filter || filter === 'all') return out;
  var f = String(filter).toLowerCase();
  if (f === 'work') return out.filter(function (a) { return a.stage === 'WORK'; });
  if (f === 'stitching') return out.filter(function (a) { return a.stage === 'STITCHING'; });
  if (f === 'unassigned') return out.filter(function (a) { return a.status === 'UNASSIGNED'; });
  if (f === 'completed') return out.filter(function (a) { return a.status === 'COMPLETED'; });
  return out;
}

/* ============================= MEASUREMENTS ============================== */

var MEASURE_FIELDS = ['shoulder','aroundNeck','sleeveLength','armhole','chest',
  'biceps','belly','aroundWrist','aroundWaist','forearm','hips','thighs',
  'ezzarLength','knee','kurtaLength','ankle'];

function adminListMeasurements(data) {
  data = data || {};
  var rows = getRows(getSheet('Measurements'));
  var q = String(data.search || '').toLowerCase();
  if (q) {
    rows = rows.filter(function (m) {
      return [m.custName, m.jobNo, m.custPhone, m.date].join(' ').toLowerCase().indexOf(q) !== -1;
    });
  }
  if (data.filter === 'linked') rows = rows.filter(function (m) { return String(m.driveLink || '').trim() !== ''; });
  if (data.filter === 'pending') rows = rows.filter(function (m) { return String(m.driveLink || '').trim() === ''; });
  return rows;
}

function buildMeasurement(data, isUpdate) {
  var obj = {};
  if (!isUpdate) requireFields(data, ['custName', 'custPhone', 'date']);
  if (data.custName !== undefined) obj.custName = String(data.custName).trim();
  if (data.custPhone !== undefined) {
    validatePhoneDigits(data.custPhone);
    obj.custPhone = normPhone(data.custPhone);
  }
  if (data.jobNo !== undefined) obj.jobNo = normJobNo(data.jobNo);
  if (data.date !== undefined) obj.date = data.date;
  if (data.address !== undefined) obj.address = data.address;
  if (data.driveLink !== undefined) {
    if (!isUpdate || String(data.driveLink).trim() !== '') validateDriveLink(data.driveLink);
    obj.driveLink = String(data.driveLink || '').trim();
  }
  if (data.driveFolderId !== undefined) obj.driveFolderId = data.driveFolderId;
  MEASURE_FIELDS.forEach(function (f) {
    if (data[f] !== undefined) obj[f] = String(data[f] || '').trim();
  });
  if (data.others !== undefined) obj.others = data.others;
  return obj;
}

function adminCreateMeasurement(data) {
  var obj = buildMeasurement(data, false);
  if (!obj.driveLink) throw new Error('Google Drive link is required');
  obj.id = generateId('meas');
  obj.createdAt = new Date().toISOString();
  if (obj.driveFolderId === undefined) obj.driveFolderId = '';
  appendObj('Measurements', obj);
  return obj;
}

function adminUpdateMeasurement(data) {
  if (!data.id) throw new Error('Missing id');
  return updateById('Measurements', data.id, buildMeasurement(data, true));
}

function adminDeleteMeasurement(id) {
  if (!id) throw new Error('Missing id');
  return deleteById('Measurements', id);
}

function getDriveRoot() {
  var props = PropertiesService.getScriptProperties();
  var rootId = props.getProperty('DRIVE_ROOT_FOLDER_ID');
  if (rootId) {
    try { return DriveApp.getFolderById(rootId); } catch (e) { /* recreate below */ }
  }
  var found = DriveApp.getFoldersByName('SHIBAAM Measurements');
  var folder = found.hasNext() ? found.next() : DriveApp.createFolder('SHIBAAM Measurements');
  props.setProperty('DRIVE_ROOT_FOLDER_ID', folder.getId());
  return folder;
}

function adminCreateDriveFolder(data) {
  requireFields(data, ['custName', 'date']);
  var jobNo = normJobNo(data.jobNo || 'NEW');
  var safeName = String(data.custName).replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  var folderName = 'SHIBAAM_' + safeName + '_' + jobNo + '_' + data.date;
  var folder = getDriveRoot().createFolder(folderName);
  try {
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log('setSharing failed: ' + e);
  }
  var out = { folderUrl: folder.getUrl(), folderId: folder.getId(), success: true };
  if (data.measurementId) {
    try {
      updateById('Measurements', data.measurementId, {
        driveLink: out.folderUrl, driveFolderId: out.folderId
      });
    } catch (e) { Logger.log('measurement link-back failed: ' + e); }
  }
  return out;
}

function uploadPdf(data) {
  requireFields(data, ['filename', 'pdfBase64']);
  var blob = Utilities.newBlob(
    Utilities.base64Decode(String(data.pdfBase64).replace(/\s/g, '')),
    'application/pdf', String(data.filename));
  var parent = getDriveRoot();
  try {
    var pdfs = parent.getFoldersByName('SHIBAAM Job PDFs');
    parent = pdfs.hasNext() ? pdfs.next() : parent.createFolder('SHIBAAM Job PDFs');
  } catch (e) { Logger.log('pdf subfolder failed: ' + e); }
  var file = parent.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log('pdf setSharing failed: ' + e);
  }
  return { url: file.getUrl(), fileId: file.getId() };
}

/* ============================== DELIVERIES =============================== */

function adminListDeliveries(filter) {
  var rows = getRows(getSheet('Deliveries'));
  if (!filter || filter === 'all') return rows;
  var f = String(filter).toUpperCase();
  return rows.filter(function (d) { return String(d.status).toUpperCase() === f; });
}

function adminUpdateDelivery(data) {
  if (!data.id) throw new Error('Missing id');
  var patch = {};
  ['status','dispatchDate','deliveredDate','trackingNo','notes','readyDate'].forEach(function (f) {
    if (data[f] !== undefined) patch[f] = data[f];
  });
  if (patch.status && DELIVERY_STATUSES.indexOf(String(patch.status).toUpperCase()) === -1) {
    throw new Error('Invalid delivery status');
  }
  if (patch.status) patch.status = String(patch.status).toUpperCase();
  var updated = updateById('Deliveries', data.id, patch);
  if (updated.status === 'DELIVERED') {
    var job = findBy('Jobs', 'jobNo', updated.jobNo);
    if (job && job.status !== 'DELIVERED') updateById('Jobs', job.id, { status: 'DELIVERED' });
  }
  return updated;
}

/* =============================== QUERIES ================================= */

function adminListQueries(filter) {
  var rows = getRows(getSheet('Queries'));
  rows.sort(function (a, b) { return String(b.createdAt) > String(a.createdAt) ? 1 : -1; });
  if (!filter || filter === 'all') return rows.map(parseQueryRow);
  var f = String(filter).toUpperCase();
  return rows.filter(function (q) { return String(q.status).toUpperCase() === f; }).map(parseQueryRow);
}

function parseQueryRow(q) {
  return {
    id: q.id, jobNo: q.jobNo, customerName: q.customerName,
    customerPhone: q.customerPhone, message: q.message, status: q.status,
    createdAt: q.createdAt, replies: safeParse(q.replies, [])
  };
}

function adminReplyQuery(data) {
  if (!data.id) throw new Error('Missing id');
  if (!data.replyText && !data.newStatus) throw new Error('Nothing to update');
  var q = findBy('Queries', 'id', data.id);
  if (!q) throw new Error('Query not found');
  var replies = safeParse(q.replies, []);
  if (data.replyText) {
    replies.push({ by: data.by || 'Admin', text: String(data.replyText), at: new Date().toISOString() });
  }
  var patch = { replies: JSON.stringify(replies) };
  if (data.newStatus) {
    if (QUERY_STATUSES.indexOf(String(data.newStatus).toUpperCase()) === -1) throw new Error('Invalid query status');
    patch.status = String(data.newStatus).toUpperCase();
  }
  return parseQueryRow(updateById('Queries', data.id, patch));
}

/* ===================== CUSTOMER ACTIONS / VIDEO CALLS ===================== */

function getJobByToken(token) {
  var sess = verifyCustomer(token);
  var job = findBy('Jobs', 'jobNo', sess.jobNo);
  if (!job) throw new Error('Order not found');
  return job;
}

function customerGetOrders(token) {
  var job = getJobByToken(token);
  var phone = normPhone(job.customerPhone);
  var jobs = getRows(getSheet('Jobs')).filter(function (j) {
    return normPhone(j.customerPhone) === phone;
  });
  return jobs.map(function (j) {
    var parts = parseParticulars(j);
    return {
      jobNo: j.jobNo, date: j.date, status: j.status,
      customerName: j.customerName, particularCount: parts.length,
      particulars: parts.map(function (p) {
        return { id: p.id, name: p.name, category: p.category, details: p.details, status: p.status };
      })
    };
  });
}

function customerRaiseQuery(data) {
  if (!data.message || !String(data.message).trim()) throw new Error('Message is required');
  var job = getJobByToken(data.token);
  return parseQueryRow(appendObj('Queries', {
    id: generateId('q'), jobNo: job.jobNo, customerName: job.customerName,
    customerPhone: job.customerPhone, message: String(data.message).trim(),
    status: 'OPEN', createdAt: new Date().toISOString(), replies: JSON.stringify([])
  }));
}

function customerCreateVideocall(data) {
  requireFields(data, ['custName', 'custPhone', 'requirements']);
  validatePhoneDigits(data.custPhone);
  var team = adminGetSalesTeam();
  var spName = '';
  if (data.salesPersonId) {
    for (var i = 0; i < team.length; i++) {
      if (team[i].id === data.salesPersonId) { spName = team[i].name; break; }
    }
  }
  return appendObj('VideoCalls', {
    id: generateId('vc'), custName: String(data.custName).trim(),
    custPhone: normPhone(data.custPhone), salesPersonId: data.salesPersonId || '',
    salesPersonName: spName || data.salesPersonName || '',
    requirements: String(data.requirements).trim(),
    preferredDate: data.preferredDate || '', preferredTime: data.preferredTime || '',
    createdAt: new Date().toISOString(), status: 'PENDING'
  });
}

/* =============================== SETTINGS ================================ */

function parseSettingsRow(row) {
  return {
    shopName: row.shopName || '', shopTagline: row.shopTagline || '',
    shopAddress: row.shopAddress || '', shopPhone: row.shopPhone || '',
    shopEmail: row.shopEmail || '', shopSince: row.shopSince || 1990,
    salesTeam: safeParse(row.salesTeam, []),
    templates: safeParse(row.templates, {}),
    systemSettings: safeParse(row.systemSettings, {})
  };
}

function adminGetSettings() {
  var rows = getRows(getSheet('Settings'));
  if (!rows.length) return parseSettingsRow({});
  return parseSettingsRow(rows[0]);
}

function adminSaveSettings(data) {
  var sh = getSheet('Settings');
  var patch = {};
  ['shopName','shopTagline','shopAddress','shopEmail'].forEach(function (f) {
    if (data[f] !== undefined) patch[f] = data[f];
  });
  if (data.shopPhone !== undefined) patch.shopPhone = normPhone(data.shopPhone);
  if (data.shopSince !== undefined) patch.shopSince = parseInt(data.shopSince, 10) || 1990;
  if (data.salesTeam !== undefined) {
    patch.salesTeam = (typeof data.salesTeam === 'string') ? data.salesTeam : JSON.stringify(data.salesTeam);
  }
  if (data.templates !== undefined) {
    patch.templates = (typeof data.templates === 'string') ? data.templates : JSON.stringify(data.templates);
  }
  if (data.systemSettings !== undefined) {
    patch.systemSettings = (typeof data.systemSettings === 'string') ? data.systemSettings : JSON.stringify(data.systemSettings);
  }
  if (sh.getLastRow() < 2) {
    var headers = SHEET_DEFS.Settings;
    sh.appendRow(headers.map(function (h) { return patch[h] !== undefined ? patch[h] : ''; }));
  } else {
    var current = sh.getRange(2, 1, 1, SHEET_DEFS.Settings.length).getValues()[0];
    var row = SHEET_DEFS.Settings.map(function (h, i) {
      return patch[h] !== undefined ? patch[h] : current[i];
    });
    sh.getRange(2, 1, 1, SHEET_DEFS.Settings.length).setValues([row]);
  }
  return adminGetSettings();
}

function adminGetSalesTeam() {
  return adminGetSettings().salesTeam || [];
}

function adminSaveSalesTeam(data) {
  var team = data.salesTeam || data.team;
  if (!Array.isArray(team)) throw new Error('salesTeam must be an array');
  team.forEach(function (m, i) {
    if (!m.name) throw new Error('Sales member #' + (i + 1) + ' needs a name');
    m.id = m.id || generateId('sp');
    m.specialty = m.specialty || '';
    m.phone = m.phone ? normPhone(m.phone) : '';
  });
  adminSaveSettings({ salesTeam: team });
  return team;
}

/* ============================================================================
 * FRONTEND SNIPPET — paste into each HTML file, set SCRIPT_URL to your
 * deployed Web App URL:
 *
 * const SCRIPT_URL="PASTE_URL";
 * async function api(action,payload){
 *   payload=payload||{}; payload.action=action;
 *   const r=await fetch(SCRIPT_URL,{method:"POST",
 *     headers:{"Content-Type":"text/plain"},body:JSON.stringify(payload)});
 *   const j=await r.json();
 *   if(!j.success) throw new Error(j.error);
 *   return j.data;
 * }
 * ========================================================================== */
