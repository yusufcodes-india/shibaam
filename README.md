# SHIBAAM Collection — Portal System

Complete web portal system for SHIBAAM Collection with Admin, Customer, and Measurement management. Uses Google Sheets + Google Apps Script as backend.

---

## 📁 File Structure

```
shibaam/
├── index.html                 # Main portal (Customer & Admin entry)
├── admin-login.html           # Admin Key License login
├── admin.html                 # Admin dashboard with 8 module portals
├── admin-jobs.html            # Clickable job tracker (list → detail → stage mgmt)
├── admin-new-job.html         # Create job orders with WhatsApp + PDF
├── admin-customers.html       # Customer management (CRUD + order history)
├── admin-workers.html         # Worker management (CRUD + categories)
├── admin-assignments.html     # Work/Stitching assignments tracker
├── admin-measurements.html    # Measurement records with Drive links
├── admin-measurement-add.html # Add measurement form (A5 print + PDF + Drive helper)
├── admin-delivery.html        # Delivery tracking (dispatch → transit → delivered)
├── admin-queries.html         # Customer queries with WhatsApp replies
├── admin-settings.html        # Super Admin: shop details, sales team, templates
├── customer.html              # Customer portal (My Orders + New Shopping)
├── customer-orders.html       # Login with Job No., view orders + WhatsApp status
├── customer-shop-video.html   # Book video call, select sales person, requirements
├── logo.png                   # SHIBAAM logo
└── README.md                  # This file
```

---

## 🎨 Design System (Exact Colors)

```css
--brown:#8b4a36;        /* Primary brand */
--brown-dark:#5f3024;   /* Headers, dark text */
--brown-soft:#a9664f;   /* Tags, accents */
--cream:#f7f1e8;        /* Background highlights */
--paper:#fffdf9;        /* Card backgrounds */
--ink:#30251f;          /* Primary text */
--muted:#7d7068;        /* Secondary text */
--line:#eadfd3;         /* Borders, dividers */
--shadow:0 24px 70px rgba(76,48,34,.12);
--radius:24px;          /* Card border-radius */
```

---

## 🚀 Quick Start (Local Testing)

1. **Open `index.html` directly in browser** — all pages work with demo data via localStorage
2. **Demo Login Credentials:**
   - **Admin:** `SHBM-SUPER-2024` (Super Admin), `SHBM-ADMIN-2024` (Admin)
   - **Customer:** Job No. `SHBM-4600`, `SHBM-4601`, `SHBM-4602`

---

## ☁️ Production Setup: Google Apps Script Backend

### 1. Create Google Sheet

Create a new Google Sheet with these tabs/columns:

#### **Tab: `Jobs`**
| Column | Type |
|--------|------|
| id | string (auto) |
| jobNo | string |
| customerName | string |
| customerPhone | string |
| customerCity | string |
| customerPin | string |
| salesPerson | string |
| customerAddress | string |
| date | date |
| status | string (UNASSIGNED/WORK/STITCHING/READY/DELIVERED) |
| particulars | JSON string |
| grandTotal | number |
| createdAt | timestamp |

#### **Tab: `Customers`**
| Column | Type |
|--------|------|
| id | string |
| name | string |
| phone | string |
| email | string |
| city | string |
| address | string |
| status | string (active/inactive/new) |
| createdAt | date |

#### **Tab: `Workers`**
| Column | Type |
|--------|------|
| id | string |
| name | string |
| phone | string |
| category | string (GENTS_WORK/STITCHING/LADIES) |
| status | string (active/inactive) |
| assignedJobs | number |

#### **Tab: `Measurements`**
| Column | Type |
|--------|------|
| id | string |
| custName | string |
| custPhone | string |
| jobNo | string |
| date | date |
| driveLink | string |
| shoulder | string |
| aroundNeck | string |
| sleeveLength | string |
| armhole | string |
| chest | string |
| biceps | string |
| belly | string |
| aroundWrist | string |
| aroundWaist | string |
| forearm | string |
| hips | string |
| thighs | string |
| ezzarLength | string |
| knee | string |
| kurtaLength | string |
| ankle | string |
| others | string |
| createdAt | timestamp |

#### **Tab: `Deliveries`**
| Column | Type |
|--------|------|
| id | string |
| jobNo | string |
| customerName | string |
| customerPhone | string |
| readyDate | date |
| status | string (PENDING/DISPATCHED/IN_TRANSIT/DELIVERED/RETURNED) |
| dispatchDate | date |
| deliveredDate | date |
| trackingNo | string |
| notes | string |

#### **Tab: `Queries`**
| Column | Type |
|--------|------|
| id | string |
| jobNo | string |
| customerName | string |
| customerPhone | string |
| message | string |
| status | string (OPEN/IN_PROGRESS/RESOLVED/CLOSED) |
| createdAt | timestamp |
| replies | JSON string |

#### **Tab: `Settings`** (single row)
| Column | Type |
|--------|------|
| shopName | string |
| shopTagline | string |
| shopAddress | string |
| shopPhone | string |
| shopEmail | string |
| shopSince | number |
| salesTeam | JSON string |
| templates | JSON string |
| systemSettings | JSON string |

---

### 2. Create Google Apps Script

1. In Google Sheet: **Extensions → Apps Script**
2. Delete default code, paste `Code.gs` (see below)
3. **Deploy → New Deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the **Web App URL**

---

### 3. `Code.gs` — Google Apps Script Backend

```javascript
// ============================================
// SHIBAAM Collection — Google Apps Script Backend
// ============================================

const SHEET_NAME = 'SHIBAAM_Data'; // Your sheet name
const ADMIN_KEYS = {
  'SHBM-SUPER-2024': { role: 'SUPER_ADMIN', name: 'Super Admin' },
  'SHBM-ADMIN-2024': { role: 'ADMIN', name: 'Admin User' },
  'SHBM-ADMIN-001': { role: 'ADMIN', name: 'Admin 1' },
  'SHBM-ADMIN-002': { role: 'ADMIN', name: 'Admin 2' }
};

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    delete data.action;

    let result;
    switch (action) {
      // Auth
      case 'login_admin': result = loginAdmin(data); break;
      case 'login_customer': result = loginCustomer(data); break;

      // Jobs
      case 'admin_dashboard_stats': result = getDashboardStats(); break;
      case 'admin_list_jobs': result = listJobs(data.filter); break;
      case 'admin_get_job': result = getJob(data.jobNo); break;
      case 'admin_create_job': result = createJob(data); break;
      case 'admin_update_job': result = updateJob(data); break;

      // Particulars/Stages
      case 'admin_assign_worker': result = assignWorker(data); break;
      case 'admin_mark_arrived': result = markArrived(data); break;
      case 'admin_complete_particular': result = completeParticular(data); break;
      case 'admin_list_tracker': result = listTracker(); break;

      // Customers
      case 'admin_list_customers': result = listCustomers(); break;
      case 'admin_create_customer': result = createCustomer(data); break;
      case 'admin_update_customer': result = updateCustomer(data); break;
      case 'admin_delete_customer': result = deleteCustomer(data.id); break;
      case 'customer_get_orders': result = getCustomerOrders(data.token); break;
      case 'customer_get_job': result = getCustomerJob(data.token, data.jobNo); break;
      case 'customer_mark_received': result = markCustomerReceived(data.token, data.jobNo); break;

      // Workers
      case 'admin_list_workers': result = listWorkers(); break;
      case 'admin_create_worker': result = createWorker(data); break;
      case 'admin_update_worker': result = updateWorker(data); break;

      // Measurements
      case 'admin_list_measurements': result = listMeasurements(); break;
      case 'createMeasurementFolder': result = createMeasurementFolder(data); break;
      case 'saveMeasurement': result = saveMeasurement(data); break;
      case 'admin_create_measurement': result = createMeasurement(data); break;
      case 'admin_update_measurement': result = updateMeasurement(data); break;
      case 'admin_delete_measurement': result = deleteMeasurement(data.id); break;

      // Deliveries
      case 'admin_list_deliveries': result = listDeliveries(data.filter); break;
      case 'admin_update_delivery': result = updateDelivery(data); break;

      // Queries
      case 'admin_list_queries': result = listQueries(data.filter); break;
      case 'customer_raise_query': result = raiseQuery(data); break;
      case 'admin_update_query': result = updateQuery(data); break;
      case 'get_staff_executives': result = getStaffExecutives(); break;
      case 'customer_video_call': result = createVideoCall(data); break;

      // Settings
      case 'admin_get_settings': result = getSettings(); break;
      case 'admin_save_settings': result = saveSettings(data); break;
      case 'admin_get_sales_team': result = getSalesTeam(); break;
      case 'admin_save_sales_team': result = saveSalesTeam(data); break;

      default: throw new Error('Unknown action: ' + action);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: result }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// AUTH
// ============================================
function loginAdmin(data) {
  const key = (data.keyLicense || '').trim().toUpperCase();
  const user = ADMIN_KEYS[key];
  if (!user) throw new Error('Invalid Key License');
  const token = Utilities.getUuid();
  // Store token in PropertiesService for validation
  PropertiesService.getScriptProperties().setProperty('token_' + token, JSON.stringify(user));
  return { token, role: user.role, name: user.name };
}

function loginCustomer(data) {
  const jobNo = (data.jobNo || '').trim().toUpperCase();
  const sheet = getSheet('Jobs');
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const jobNoIdx = headers.indexOf('jobNo');
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][jobNoIdx] === jobNo) {
      const token = Utilities.getUuid();
      PropertiesService.getScriptProperties().setProperty('cust_token_' + token, jobNo);
      return { token };
    }
  }
  throw new Error('Invalid Job Number');
}

function verifyAdminToken(token) {
  const stored = PropertiesService.getScriptProperties().getProperty('token_' + token);
  if (!stored) throw new Error('Invalid or expired token');
  return JSON.parse(stored);
}

function verifyCustomerToken(token) {
  const jobNo = PropertiesService.getScriptProperties().getProperty('cust_token_' + token);
  if (!jobNo) throw new Error('Invalid or expired token');
  return jobNo;
}

// ============================================
// HELPERS
// ============================================
function getSheet(tabName) {
  const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID'));
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    // Add headers based on tab
    initSheetHeaders(sheet, tabName);
  }
  return sheet;
}

function initSheetHeaders(sheet, tabName) {
  const headers = {
    'Jobs': ['id','jobNo','customerName','customerPhone','customerCity','customerPin','salesPerson','customerAddress','date','status','particulars','grandTotal','createdAt'],
    'Customers': ['id','name','phone','email','city','address','status','createdAt'],
    'Workers': ['id','name','phone','category','status','assignedJobs'],
    'Measurements': ['id','custName','custPhone','jobNo','date','driveLink','shoulder','aroundNeck','sleeveLength','armhole','chest','biceps','belly','aroundWrist','aroundWaist','forearm','hips','thighs','ezzarLength','knee','kurtaLength','ankle','others','createdAt'],
    'Deliveries': ['id','jobNo','customerName','customerPhone','readyDate','status','dispatchDate','deliveredDate','trackingNo','notes'],
    'Queries': ['id','jobNo','customerName','customerPhone','message','status','createdAt','replies'],
    'Settings': ['shopName','shopTagline','shopAddress','shopPhone','shopEmail','shopSince','salesTeam','templates','systemSettings']
  };
  if (headers[tabName]) {
    sheet.getRange(1, 1, 1, headers[tabName].length).setValues([headers[tabName]]);
    sheet.setFrozenRows(1);
  }
}

function getRows(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function appendRow(sheet, obj, headers) {
  const row = headers.map(h => obj[h] ?? '');
  sheet.appendRow(row);
  return obj;
}

function updateRow(sheet, id, obj, headers) {
  const data = sheet.getDataRange().getValues();
  const idIdx = headers.indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === id) {
      headers.forEach((h, j) => {
        if (obj[h] !== undefined) data[i][j] = obj[h];
      });
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([data[i]]);
      return { ...obj, id };
    }
  }
  throw new Error('Record not found');
}

function deleteRow(sheet, id, headers) {
  const data = sheet.getDataRange().getValues();
  const idIdx = headers.indexOf('id');
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] === id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  throw new Error('Record not found');
}

function generateId(prefix) {
  return prefix + Date.now() + Math.floor(Math.random() * 1000);
}

// ============================================
// JOBS
// ============================================
function getDashboardStats() {
  const jobs = getRows(getSheet('Jobs'));
  const queries = getRows(getSheet('Queries'));
  const deliveries = getRows(getSheet('Deliveries'));
  
  return {
    activeJobs: jobs.filter(j => ['UNASSIGNED','WORK','STITCHING'].includes(j.status)).length,
    deliveredJobs: jobs.filter(j => j.status === 'DELIVERED').length,
    pendingAssignments: jobs.filter(j => j.status === 'UNASSIGNED').length,
    pendingWork: jobs.filter(j => j.status === 'WORK').length,
    pendingStitching: jobs.filter(j => j.status === 'STITCHING').length,
    readyForCustomer: jobs.filter(j => j.status === 'READY').length,
    openQueries: queries.filter(q => q.status === 'OPEN').length,
    inProgressQueries: queries.filter(q => q.status === 'IN_PROGRESS').length,
    completedQueries: queries.filter(q => q.status === 'RESOLVED').length
  };
}

function listJobs(filter) {
  const jobs = getRows(getSheet('Jobs'));
  let filtered = jobs;
  if (filter === 'active') filtered = jobs.filter(j => ['UNASSIGNED','WORK','STITCHING'].includes(j.status));
  if (filter === 'delivered') filtered = jobs.filter(j => j.status === 'DELIVERED');
  
  return filtered.map(j => ({
    jobNo: j.jobNo,
    customerName: j.customerName,
    customerPhone: j.customerPhone,
    date: j.date,
    particularCount: JSON.parse(j.particulars || '[]').length,
    status: j.status
  }));
}

function getJob(jobNo) {
  const jobs = getRows(getSheet('Jobs'));
  const job = jobs.find(j => j.jobNo === jobNo);
  if (!job) throw new Error('Job not found');
  
  const particulars = JSON.parse(job.particulars || '[]');
  return { job, customer: job, particulars };
}

function createJob(data) {
  const sheet = getSheet('Jobs');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const job = {
    id: generateId('job'),
    jobNo: data.jobNo,
    customerName: data.name,
    customerPhone: data.contact,
    customerCity: data.city,
    customerPin: data.pinCode,
    salesPerson: data.salesPerson,
    customerAddress: data.address,
    date: data.date,
    status: 'UNASSIGNED',
    particulars: JSON.stringify(data.particulars),
    grandTotal: data.particulars.reduce((sum, p) => sum + (p.price || 0), 0),
    createdAt: new Date().toISOString()
  };
  
  appendRow(sheet, job, headers);
  
  // Auto-create delivery record
  createDeliveryRecord(job);
  
  // Send WhatsApp to customer (if phone provided)
  if (data.contact) sendJobCreatedWhatsApp(data.contact, job);
  
  return job;
}

function createDeliveryRecord(job) {
  const sheet = getSheet('Deliveries');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const delivery = {
    id: generateId('del'),
    jobNo: job.jobNo,
    customerName: job.customerName,
    customerPhone: job.customerPhone,
    readyDate: '',
    status: 'PENDING',
    dispatchDate: '',
    deliveredDate: '',
    trackingNo: '',
    notes: ''
  };
  
  appendRow(sheet, delivery, headers);
}

function sendJobCreatedWhatsApp(phone, job) {
  const cleanPhone = '91' + phone.replace(/\D/g, '').replace(/^91/, '');
  const message = `Thank you for trusting SHIBAAM Collection.

Your job has been successfully created.

*Job No:* ${job.jobNo}
*Date:* ${new Date(job.date).toLocaleDateString('en-IN')}
*Sales Person:* ${job.salesPerson || 'Not assigned'}

*Items:*
${JSON.parse(job.particulars).map((p, i) => `${i+1}. ${p.name} (${p.category}) - ₹${p.price}`).join('\n')}

*Grand Total:* ₹${job.grandTotal}

*Your Key License / Job No:* ${job.jobNo}
Track your order: https://your-domain.vercel.app/customer-orders.html

For queries: 9601879952 / 7984986113

Thank you for choosing SHIBAAM Collection.`;
  
  // Log for manual sending (Apps Script can't directly send WhatsApp)
  console.log('WhatsApp to ' + cleanPhone + ': ' + message);
}

// ============================================
// CUSTOMERS
// ============================================
function listCustomers() {
  return getRows(getSheet('Customers'));
}

function createCustomer(data) {
  const sheet = getSheet('Customers');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const customer = {
    id: generateId('cust'),
    name: data.name,
    phone: data.phone,
    email: data.email || '',
    city: data.city || '',
    address: data.address || '',
    status: data.status || 'new',
    createdAt: new Date().toISOString().split('T')[0]
  };
  appendRow(sheet, customer, headers);
  return customer;
}

// ============================================
// WORKERS
// ============================================
function listWorkers() {
  return getRows(getSheet('Workers'));
}

function createWorker(data) {
  const sheet = getSheet('Workers');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const worker = {
    id: generateId('w'),
    name: data.name,
    phone: data.phone,
    category: data.category,
    status: data.status || 'active',
    assignedJobs: 0
  };
  appendRow(sheet, worker, headers);
  return worker;
}

// ============================================
// MEASUREMENTS
// ============================================
function listMeasurements() {
  return getRows(getSheet('Measurements'));
}

function createMeasurement(data) {
  const sheet = getSheet('Measurements');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const measurement = {
    id: generateId('meas'),
    custName: data.custName,
    custPhone: data.custPhone,
    jobNo: data.jobNo || '',
    date: data.date,
    driveLink: data.driveLink,
    shoulder: data.shoulder || '',
    aroundNeck: data.aroundNeck || '',
    sleeveLength: data.sleeveLength || '',
    armhole: data.armhole || '',
    chest: data.chest || '',
    biceps: data.biceps || '',
    belly: data.belly || '',
    aroundWrist: data.aroundWrist || '',
    aroundWaist: data.aroundWaist || '',
    forearm: data.forearm || '',
    hips: data.hips || '',
    thighs: data.thighs || '',
    ezzarLength: data.ezzarLength || '',
    knee: data.knee || '',
    kurtaLength: data.kurtaLength || '',
    ankle: data.ankle || '',
    others: data.others || '',
    createdAt: new Date().toISOString()
  };
  
  appendRow(sheet, measurement, headers);
  return measurement;
}

// ============================================
// DRIVE FOLDER CREATION
// ============================================
function createMeasurementFolder(data) {
  const { custName, jobNo, date } = data;
  
  // Create folder name: SHIBAAM_CustomerName_JobNo_Date
  const folderName = `SHIBAAM_${custName.replace(/[^a-zA-Z0-9]/g, '_')}_${jobNo}_${date}`;
  
  // Get or create root SHIBAAM folder
  let rootFolder = getOrCreateRootFolder('SHIBAAM Measurements');
  
  // Create customer folder inside root
  const folder = rootFolder.createFolder(folderName);
  
  // Set sharing to "Anyone with link can view"
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Get folder URL
  const folderUrl = folder.getUrl();
  const folderId = folder.getId();
  
  console.log('Created Drive folder:', folderName, folderUrl);
  
  return { folderUrl, folderId, success: true };
}

function getOrCreateRootFolder(name) {
  const folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(name);
}

// ============================================
// SAVE MEASUREMENT (with Drive folder link)
// ============================================
function saveMeasurement(data) {
  const sheet = getSheet('Measurements');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const measurement = {
    id: generateId('meas'),
    custName: data.custName,
    custPhone: data.custPhone,
    jobNo: data.jobNo || '',
    date: data.date,
    driveLink: data.driveLink,
    shoulder: data.shoulder || '',
    aroundNeck: data.aroundNeck || '',
    sleeveLength: data.sleeveLength || '',
    armhole: data.armhole || '',
    chest: data.chest || '',
    biceps: data.biceps || '',
    belly: data.belly || '',
    aroundWrist: data.aroundWrist || '',
    aroundWaist: data.aroundWaist || '',
    forearm: data.forearm || '',
    hips: data.hips || '',
    thighs: data.thighs || '',
    ezzarLength: data.ezzarLength || '',
    knee: data.knee || '',
    kurtaLength: data.kurtaLength || '',
    ankle: data.ankle || '',
    others: data.others || '',
    createdAt: new Date().toISOString()
  };
  
  appendRow(sheet, measurement, headers);
  return { recordId: measurement.id, success: true };
}

// ============================================
// DELIVERIES
// ============================================
function listDeliveries(filter) {
  const deliveries = getRows(getSheet('Deliveries'));
  if (!filter || filter === 'all') return deliveries;
  return deliveries.filter(d => d.status.toLowerCase() === filter.toLowerCase());
}

function updateDelivery(data) {
  const sheet = getSheet('Deliveries');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return updateRow(sheet, data.id, data, headers);
}

// ============================================
// QUERIES
// ============================================
function listQueries() {
  return getRows(getSheet('Queries')).reverse(); // newest first
}

function raiseQuery(data) {
  const sheet = getSheet('Queries');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  const query = {
    id: generateId('q'),
    jobNo: data.jobNo,
    customerName: data.name, // would come from token
    customerPhone: data.phone,
    message: data.message,
    status: 'OPEN',
    createdAt: new Date().toISOString(),
    replies: JSON.stringify([])
  };
  
  appendRow(sheet, query, headers);
  return query;
}

function updateQuery(data) {
  const sheet = getSheet('Queries');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return updateRow(sheet, data.id, data, headers);
}

function getStaffExecutives() {
  const settings = getSettings();
  return settings.salesTeam || [];
}

// ============================================
// SETTINGS
// ============================================
function getSettings() {
  const sheet = getSheet('Settings');
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return getDefaultSettings();
  const headers = rows[0];
  const data = rows[1];
  const obj = {};
  headers.forEach((h, i) => {
    try { obj[h] = JSON.parse(data[i]); } catch { obj[h] = data[i]; }
  });
  return obj;
}

function getDefaultSettings() {
  return {
    shopName: 'SHIBAAM Collection',
    shopTagline: 'Committed towards the Quality',
    shopAddress: 'Jamea Saifeeyah Road, Inderpura (Khadi Road), Zampa Bazar, Surat-3',
    shopPhone: '919601879952',
    shopEmail: 'shibaam.collection@surat.com',
    shopSince: 1990,
    salesTeam: [
      { id: 'sp1', name: 'Huzaifa Tarwala', specialty: 'Bridal & Groomswear', phone: '919601879952' },
      { id: 'sp2', name: 'Ahmed Raza', specialty: 'Casual & Festive Wear', phone: '' },
      { id: 'sp3', name: 'Fatima Sheikh', specialty: 'Ladies Suits & Kurtas', phone: '' },
      { id: 'sp4', name: 'Mohammed Ali', specialty: 'Custom Orders & Alterations', phone: '' }
    ],
    templates: {},
    systemSettings: { enableCustomerPortal: true, enableVideoCall: true, enableAutoAssign: true, maintenanceMode: false }
  };
}

function saveSettings(data) {
  const sheet = getSheet('Settings');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Stringify objects
  const rowData = {};
  headers.forEach(h => {
    if (typeof data[h] === 'object') rowData[h] = JSON.stringify(data[h]);
    else rowData[h] = data[h];
  });
  
  if (sheet.getLastRow() < 2) {
    sheet.appendRow(headers.map(h => rowData[h] ?? ''));
  } else {
    sheet.getRange(2, 1, 1, headers.length).setValues([headers.map(h => rowData[h] ?? '')]);
  }
  return data;
}

function getSalesTeam() {
  const settings = getSettings();
  return settings.salesTeam || [];
}

function saveSalesTeam(data) {
  const settings = getSettings();
  settings.salesTeam = data.salesTeam || [];
  return saveSettings(settings);
}

// ============================================
// SETUP
// ============================================
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());
  
  // Create all tabs
  ['Jobs', 'Customers', 'Workers', 'Measurements', 'Deliveries', 'Queries', 'Settings']
    .forEach(name => {
      let sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
        initSheetHeaders(sheet, name);
      }
    });
  
  // Initialize default settings
  const settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet.getLastRow() < 2) {
    const defaults = getDefaultSettings();
    const headers = settingsSheet.getRange(1, 1, 1, settingsSheet.getLastColumn()).getValues()[0];
    settingsSheet.appendRow(headers.map(h => {
      if (typeof defaults[h] === 'object') return JSON.stringify(defaults[h]);
      return defaults[h] ?? '';
    }));
  }
  
  console.log('Setup complete. Spreadsheet ID:', ss.getId());
}
```

---

### 4. Connect Frontend to Apps Script

In each HTML file, replace the Supabase config with:

```javascript
// Replace at top of each admin/customer HTML file
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

async function api(action, payload) {
  payload = payload || {};
  payload.action = action;
  
  const response = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error || 'Request failed');
  return result.data;
}
```

---

## 📱 WhatsApp Integration

All WhatsApp buttons use `https://wa.me/PHONE?text=ENCODED_MESSAGE` pattern.
- **Shop WhatsApp:** `919601879952` (configured in Settings)
- **Customer messages** auto-generated with job details, timestamps, status
- **Admin replies** open WhatsApp with pre-filled response

---

## 🖨️ Print / PDF Features

- **A5 optimized** print styles in `admin-measurement-add.html`, `admin-new-job.html`
- **PDF generation** via `html2pdf.js` (CDN included)
- **Print buttons** on all detail pages

---

## 🔐 Admin Key Licenses (Demo)

| Key | Role |
|-----|------|
| `SHBM-SUPER-2024` | Super Admin (Settings access) |
| `SHBM-ADMIN-2024` | Admin |
| `SHBM-ADMIN-001` | Admin |
| `SHBM-ADMIN-002` | Admin |

Add more in `ADMIN_KEYS` object in `Code.gs`.

---

## 📦 Deployment Checklist

- [ ] Create Google Sheet with all tabs
- [ ] Deploy Apps Script as Web App (Anyone access)
- [ ] Update `APPS_SCRIPT_URL` in all HTML files
- [ ] Run `setupSpreadsheet()` once in Apps Script
- [ ] Test admin login → create job → customer views order
- [ ] Deploy HTML files to Vercel/Netlify/Firebase Hosting
- [ ] Update WhatsApp message URLs with your deployed domain
- [ ] Configure custom domain (optional)

---

## 🌐 Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set `vercel.json` for SPA routing:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## 📞 Support

- **Shop WhatsApp:** +91 96018 79952
- **Email:** shibaam.collection@surat.com
- **Address:** Jamea Saifeeyah Road, Inderpura, Zampa Bazar, Surat-395003

---

**Built for SHIBAAM Collection** · Since 1990 · Committed towards Quality