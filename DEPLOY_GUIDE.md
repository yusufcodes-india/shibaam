# SHIBAAM Portal — Detailed Deployment & Operations Guide

## Part 0 — What you have

| Piece | Location | State |
|---|---|---|
| Frontend | `/shibaam/files/*.html` (18 pages) | Wired to backend, works offline via localStorage |
| Backend | `/shibaam/files/Code.gs` (1060 lines) | Live at your Web App URL |
| Database | Your Google Sheet (9 tabs) | Tabs + AdminKeys seeded (proven) |
| Storage | Google Drive (`SHIBAAM Measurements/`) | Auto-created on first folder/PDF action |

All HTML files already contain your live `SCRIPT_URL`. Do not change it
unless you create a brand-new deployment (new URL).

---

## Part 1 — Backend (one-time, mostly done)

- [x] Paste `Code.gs` into Extensions → Apps Script
- [x] Run `setupSpreadsheet()` once (creates 9 tabs, freezes row 1, seeds Settings + 4 AdminKeys)
- [x] Deploy → Web App → Execute as **Me**, Who has access: **Anyone**
- [ ] **After EVERY future Code.gs edit:** Deploy → Manage deployments → ✏️ → **New version** → Deploy.
  Edits do NOT go live otherwise — this is the #1 cause of "my fix didn't work".

Verify live version any time (Terminal):
```bash
URL="https://script.google.com/macros/s/AKfycbzxxOV4Ny28VR7p7YgXkSst-wEe5UpSW8HsjHMXrYEIo3UuDyUv6y_t7Hknq8h6fwtO/exec"
# 1. Backend alive?
curl -s -L "$URL" | head -c 120
# 2. AdminKeys seeded?
curl -s -L "$URL" -H "Content-Type: text/plain" \
  -d '{"action":"login_admin","keyLicense":"SHBM-ADMIN-2024"}'
# 3. Current code version? (expect the H#### message, NOT the SHBM one)
curl -s -L "$URL" -H "Content-Type: text/plain" \
  -d '{"action":"login_customer","jobNo":"ABC"}'
```
> NOTE: do NOT add `-X POST` to these commands. curl's `-X` breaks
> Apps Script redirect replays and returns a Drive "Page not found"
> page even when the deployment is healthy. Browsers are unaffected.

---

## Part 2 — Import your existing customer data (do this next)

Your old sheet columns → Jobs tab columns:

| Your column | Jobs column | Notes |
|---|---|---|
| Job No | `jobNo` | Must look like `H4600` or `SHBM-4600` |
| Name | `customerName` | required |
| Contact No | `customerPhone` | digits only, ≥10 digits |
| City | `customerCity` | optional |
| Pin Code | `customerPin` | optional |
| Sales Person | `salesPerson` | optional |
| Address | `customerAddress` | optional |
| Date | `date` | YYYY-MM-DD |
| Particulars | `particulars` | see below |
| Grand Total | `grandTotal` | number |
| Timestamp | (skip) | — |

Fill these yourself per row:
- `id` — any unique text, e.g. `job1`, `job2`…
- `status` — `UNASSIGNED` for all imported rows
- `deliveryDays` — `45`
- `createdAt` — today's date

**Particulars column:** the tracker needs JSON, e.g.
```json
[{"id":"p1","name":"Surti Saya","category":"LADIES","price":1500,"details":"Zardosi work","notes":"","status":"UNASSIGNED","worker":null,"stitchWorker":null,"urgent":false}]
```
- `category` is `LADIES` (1 stage: Work) or `GENTS` (2 stages: Work → Stitching).
- If you paste plain text instead of JSON, the row imports but the
  tracker shows zero items for it — login still works.

Fastest import path: File → Import → Append to a scratch tab, then
copy columns across, then delete scratch. Or paste row-by-row.

---

## Part 3 — Trial runbook (do in order, tick off)

### T1. Admin login
1. Open `admin-login.html`, enter `SHBM-ADMIN-2024`.
2. Expect redirect to `admin.html`.
3. DevTools → Application → Session Storage → confirm BOTH keys exist:
   `shibaam_admin_key` AND `shibaam_admin_token`.
   - Only `shibaam_admin_key` (no token) = you logged in offline.
     The site still works, but nothing reaches the Sheet.

### T2. Create a job (write path)
1. `admin.html` → New Job. Fill Name / Date / Contact / 1 particular / price.
2. Job No. auto-fills (`H4604`…). Click **Save**.
3. Expect green "Saved! Job order recorded to your Google Sheet."
   (“Saved locally (backend unreachable…)" = token/network problem.)
4. Check the Sheet: new row in **Jobs** + auto row in **Deliveries**
   (status PENDING) + customer upserted in **Customers**.

### T3. Tracker (stage machine)
1. `admin.html` → Manage Jobs → click the new job.
2. Assign worker → status `WORK_ASSIGNED`; Mark Arrived → `WORK_ARRIVED`;
   Mark Complete → `COMPLETED` (Ladies) or `STITCHING_ASSIGNED` (Gents).
3. Refresh the page — stages must persist (they're re-read from the Sheet).
4. `admin.html` → Assignments shows the same stages flattened.

### T4. Customer view
1. `customer.html` → My Orders → enter the test Job No.
2. Expect the order with progress pills matching T3's stages.
3. Move the job a stage in admin, reload customer page — pills must follow.
4. "Ask About Status" opens WhatsApp with a pre-filled status message.

### T5. Measurement + Drive
1. Measurements → **Add Measurement** (opens `admin-measurement-add.html`).
2. Fill Name / Phone / Date → **Save & Create Drive Link**.
3. Expect toast "Measurement saved & Drive folder created".
4. Check Drive: `SHIBAAM Measurements/SHIBAAM_<Name>_<Job>_<Date>/`.
5. Back in Measurements list, the Drive link opens the folder.

### T6. New Job extras
1. **Save as PDF** downloads the job-order PDF.
2. **Send Job Link on WhatsApp** opens wa.me with:
   `Hello <name>, your SHIBAAM job <jobNo> is saved. Track here:
   <SITE_URL>/customer-orders.html?job=<jobNo> Total Rs.<total>.`
3. **Print** prints the A5-friendly form.

### T7. Delivery + Queries + Workers + Settings
- Delivery: move a READY job PENDING → DISPATCHED → DELIVERED;
  DELIVERED also flips the job to DELIVERED.
- Queries: raise one as customer (WhatsApp buttons log it),
  reply + resolve it as admin.
- Workers: add → toggle → delete; reload → stays deleted.
- Settings (SUPER key `SHBM-SUPER-2024` only): edit shop + sales team.

---

## Part 4 — Going live (site hosting)

1. Host the `files/` folder on Vercel/Netlify (static, no build step).
2. Set your real domain in `admin-new-job.html`:
   `const SITE_URL = 'https://YOUR-DOMAIN';` (one place, top of script).
3. Re-test T4's WhatsApp link — it must open your live
   `customer-orders.html?job=<jobNo>`.
4. Optional hardening later: restrict the Web App to "Anyone with
   Google account" is NOT recommended (breaks customer access);
   real hardening = rotate AdminKeys periodically via the AdminKeys tab.

---

## Part 5 — Troubleshooting matrix

| Symptom | Cause | Fix |
|---|---|---|
| `Unknown action: X` | Old deployment live | Redeploy → New version |
| `Not authorized: …token` | Logged in offline / session expired | Log out, log in online |
| `Invalid Key License` (valid key) | `setupSpreadsheet()` never ran | Run it, then retry login |
| `Enter Job No. as H####…` (valid H-no) | Old code live | Redeploy → New version |
| `Invalid Job Number` (right format) | Row missing in Jobs tab | Import the row (Part 2) |
| `Job No. already exists` | Duplicate `jobNo` | Use next number |
| Saves say "Saved locally…" | No token or no network | Check T1 step 3 + connection |
| curl shows Drive "Page not found" | `-X POST` breaks redirect replay | Drop `-X`, keep `-L` (browser unaffected) |
| Drive folder not created | Drive scope not granted | Re-run any function in editor, accept prompts, redeploy |
| Deleted worker/item reappears | Server still holds it (or demo defaults with empty Sheet) | Delete via UI when online; demo rows vanish once Sheet has data |
| Customer sees old stages | Browser cache / stale session | Hard reload; check Sheet row actually changed |

---

## Part 6 — Key references (no need to memorize)

- Admin demo keys: `SHBM-SUPER-2024` (super), `SHBM-ADMIN-2024` / `-001` / `-002`
- Customer login: any `jobNo` present in Jobs tab (`H####` or `SHBM-####`)
- Local fallback keys (browser-only): `shibaam_jobs`, `shibaam_measurements`,
  `shibaam_workers`, `shibaam_queries`, `shibaam_sales_team`, `shibaam_settings`
- Session keys: `shibaam_admin_key` (+`shibaam_admin_token` when online),
  `shibaam_customer_jobno` (+`shibaam_customer_token` when online)
- backend write targets: Sheet tabs; PDFs/folders: Drive `SHIBAAM Measurements/`
