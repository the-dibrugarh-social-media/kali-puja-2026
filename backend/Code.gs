/**
 * Kali Puja 2026 voting API — deploy as a dedicated Apps Script web app.
 * Uses the bound spreadsheet's existing Votes/Pandals sheets. Existing rows
 * without event/category metadata stay visible in storage and are treated as
 * legacy Durga Puja rows for reporting and duplicate checks.
 */
const EVENT_ID = 'kali-puja-2026';
const VOTES_SHEET = 'Votes';
const PANDALS_SHEET = 'Pandals';
const CATEGORIES = ['best_pandal', 'best_puja', 'best_murti'];
const GOOGLE_CLIENT_ID = PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID') || '225466365069-19p02tbr3h2mkfiu3d9rjc18bdm4k86l.apps.googleusercontent.com';
const DRIVE_FOLDER_NAME = 'Kali Puja 2026 - Pandal Photos';
const VOTING_CLOSES_AT = PropertiesService.getScriptProperties().getProperty('KALI_VOTING_CLOSES_AT') || '';
const PANDALS_CACHE_SECONDS = 30;
const COUNTS_CACHE_SECONDS = 5;
const VOTES_HEADERS = ['Timestamp','VoterEmail','VoterType','Pandal_ID','Pandal_Name','DeviceFingerprint','DeviceFlag','Lat','Lng','GPSAccuracy','IP','UserAgent','Screen','Timezone','IPFlag','GPSFlag','Event_ID','Category_ID'];
const PANDAL_HEADERS = ['ID','Name','Area','ImageURL','Active','Event_ID'];

function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function cache_() { return CacheService.getScriptCache(); }
function lock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { ok: false };
  try { return { ok: true, value: fn() }; } finally { lock.releaseLock(); }
}
function safeCell_(value) {
  const text = value == null ? '' : String(value);
  return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
}
function admin_(key) {
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!real || typeof key !== 'string' || key.length !== real.length) return false;
  let diff = 0; for (let i = 0; i < real.length; i++) diff |= key.charCodeAt(i) ^ real.charCodeAt(i);
  return diff === 0;
}
function ensureHeaders_(sheet, headers) {
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  const current = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  headers.forEach(function (header) {
    if (current.indexOf(header) === -1) { sheet.getRange(1, sheet.getLastColumn() + 1).setValue(header); current.push(header); }
  });
}
function sheet_(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  ensureHeaders_(sheet, headers);
  return sheet;
}
function votesSheet_() { return sheet_(VOTES_SHEET, VOTES_HEADERS); }
function pandalsSheet_() { return sheet_(PANDALS_SHEET, PANDAL_HEADERS); }
function headers_(sheet) { return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String); }
function col_(headers, label) { return headers.indexOf(label); }
function normalizeEmail_(value) { return String(value || '').trim().toLowerCase(); }
function normalizePhone_(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.slice(0, 2) === '91') digits = digits.slice(2);
  return /^[6-9]\d{9}$/.test(digits) ? '+91' + digits : '';
}
function verifyGoogleIdToken_(token) {
  if (!token || !GOOGLE_CLIENT_ID) return '';
  try {
    const response = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) return '';
    const info = JSON.parse(response.getContentText());
    if (info.aud !== GOOGLE_CLIENT_ID || Number(info.exp) <= Math.floor(Date.now() / 1000) || !String(info.email_verified).match(/^(true)$/i)) return '';
    const email = normalizeEmail_(info.email);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
  } catch (err) { return ''; }
}
function pandals_(eventId) {
  const key = 'pandals_' + eventId;
  const cached = cache_().get(key); if (cached) return JSON.parse(cached);
  const sheet = pandalsSheet_(), rows = sheet.getDataRange().getValues(), headers = headers_(sheet);
  const id = col_(headers, 'ID'), name = col_(headers, 'Name'), area = col_(headers, 'Area'), image = col_(headers, 'ImageURL'), active = col_(headers, 'Active'), event = col_(headers, 'Event_ID');
  const output = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][id] === '' || rows[i][id] == null) continue;
    const rowEvent = rows[i][event] || 'durga-puja-2026';
    if (String(rowEvent) !== eventId) continue;
    output.push({ id: rows[i][id], name: rows[i][name], area: rows[i][area], img: rows[i][image], active: rows[i][active] === true || rows[i][active] === 'TRUE', eventId: rowEvent });
  }
  cache_().put(key, JSON.stringify(output), PANDALS_CACHE_SECONDS);
  return output;
}
function clearCaches_() {
  const cache = cache_();
  ['pandals_' + EVENT_ID, 'counts_' + EVENT_ID].forEach(key => cache.remove(key));
}
function voteCounts_(eventId) {
  const key = 'counts_' + eventId, cached = cache_().get(key);
  if (cached) return JSON.parse(cached);
  const sheet = votesSheet_(), headers = headers_(sheet), rows = sheet.getDataRange().getValues();
  const eventCol = col_(headers, 'Event_ID'), catCol = col_(headers, 'Category_ID'), pandalCol = col_(headers, 'Pandal_ID'), counts = {};
  CATEGORIES.forEach(category => counts[category] = {});
  for (let i = 1; i < rows.length; i++) {
    // Unlabelled historical rows are legacy Durga records; they are never Kali totals.
    if (String(rows[i][eventCol] || 'durga-puja-2026') !== eventId) continue;
    const category = rows[i][catCol] || 'best_pandal', id = rows[i][pandalCol];
    if (counts[category] && id !== '' && id != null) counts[category][id] = (counts[category][id] || 0) + 1;
  }
  cache_().put(key, JSON.stringify(counts), COUNTS_CACHE_SECONDS);
  return counts;
}
function driveFolder_() {
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(DRIVE_FOLDER_NAME);
}
function saveImage_(base64, mime, name) {
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), mime || 'image/jpeg', name || ('pandal_' + Date.now() + '.jpg'));
  const file = driveFolder_().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}
function responseError_(message, status) { return json_({ status: status || 'error', message: message }); }

function doGet(e) {
  try {
    const p = e && e.parameter || {}, eventId = String(p.eventId || EVENT_ID);
    if (p.pandals === '1') return json_({ status: 'success', eventId: eventId, pandals: pandals_(eventId).filter(item => item.active) });
    if (p.results === '1') return json_({ status: 'success', eventId: eventId, counts: voteCounts_(eventId), updatedAt: new Date().toISOString() });
    return json_({ status: 'success', eventId: EVENT_ID, categories: CATEGORIES });
  } catch (err) { return responseError_(String(err)); }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return responseError_('No data received.');
    const data = JSON.parse(e.postData.contents);
    if (data.action && data.action !== 'vote') return adminAction_(data);
    if (String(data.eventId || '') !== EVENT_ID) return responseError_('This event is not accepting votes.');
    if (VOTING_CLOSES_AT && Date.now() > new Date(VOTING_CLOSES_AT).getTime()) return responseError_('Voting has closed.');
    const categoryId = String(data.categoryId || '');
    if (CATEGORIES.indexOf(categoryId) < 0) return responseError_('Choose one of the available voting categories.');
    if (data.pandalId == null || data.pandalId === '') return responseError_('No pandal selected.');
    if (data.rulesAccepted !== true) return responseError_('Please accept the voting rules to submit your vote.');
    const voterId = data.idToken ? verifyGoogleIdToken_(data.idToken) : normalizePhone_(data.phone);
    const voterType = data.idToken ? 'google' : 'phone';
    if (!voterId) return responseError_(data.idToken ? 'Google sign-in could not be verified. Please sign in again.' : 'Please enter a valid 10-digit Indian mobile number.');
    const pandal = pandals_(EVENT_ID).find(item => String(item.id) === String(data.pandalId) && item.active);
    if (!pandal) return responseError_('That pandal is not available for voting.');
    const gps = data.gps || {}, lat = Number(gps.lat), lng = Number(gps.lng);
    const hasGps = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const device = data.device || {}, fp = /^[a-f0-9]{64}$/.test(String(data.deviceFingerprint || '')) ? String(data.deviceFingerprint) : '';
    const ip = /^[0-9a-fA-F:.]{3,45}$/.test(String(data.ip || '')) ? String(data.ip) : '';
    const outcome = lock_(function () {
      const sheet = votesSheet_(), headers = headers_(sheet), rows = sheet.getDataRange().getValues();
      const voterCol = col_(headers, 'VoterEmail'), eventCol = col_(headers, 'Event_ID'), categoryCol = col_(headers, 'Category_ID');
      for (let i = 1; i < rows.length; i++) {
        const rowEvent = String(rows[i][eventCol] || 'durga-puja-2026');
        const rowCategory = String(rows[i][categoryCol] || 'best_pandal');
        if (rowEvent === EVENT_ID && rowCategory === categoryId && normalizeEmail_(rows[i][voterCol]) === voterId) return { duplicate: true };
      }
      const last = rows.length;
      const ipHits = ip ? rows.slice(1).filter(r => r[col_(headers, 'IP')] === ip).length : 0;
      const gpsHits = hasGps ? rows.slice(1).filter(r => Number.isFinite(Number(r[col_(headers, 'Lat')])) && Math.abs(Number(r[col_(headers, 'Lat')]) - lat) < 0.0005 && Math.abs(Number(r[col_(headers, 'Lng')]) - lng) < 0.0005).length : 0;
      const row = new Array(headers.length).fill('');
      const put = (name, value) => { const index = col_(headers, name); if (index >= 0) row[index] = value; };
      put('Timestamp', new Date()); put('VoterEmail', safeCell_(voterId)); put('VoterType', voterType); put('Pandal_ID', pandal.id); put('Pandal_Name', safeCell_(pandal.name));
      put('DeviceFingerprint', fp); put('Lat', hasGps ? lat : ''); put('Lng', hasGps ? lng : ''); put('GPSAccuracy', Number.isFinite(Number(gps.accuracy)) ? Math.round(Number(gps.accuracy)) : ''); put('IP', ip);
      put('UserAgent', safeCell_(String(device.userAgent || '').slice(0, 300))); put('Screen', safeCell_(String(device.screen || '').slice(0, 30))); put('Timezone', safeCell_(String(device.timezone || '').slice(0, 60)));
      put('IPFlag', ipHits >= 3 ? 'IP_FLAGGED' : ''); put('GPSFlag', gpsHits >= 3 ? 'GPS_FLAGGED' : ''); put('Event_ID', EVENT_ID); put('Category_ID', categoryId);
      sheet.appendRow(row);
      if (voterType === 'phone') sheet.getRange(sheet.getLastRow(), voterCol + 1).setNumberFormat('@').setValue(voterId);
      SpreadsheetApp.flush();
      return { duplicate: false, row: last + 1 };
    });
    if (!outcome.ok) return responseError_('The voting service is busy. Please try again shortly.');
    if (outcome.value.duplicate) return responseError_('You have already voted in this category.', 'duplicate');
    clearCaches_();
    return json_({ status: 'success', message: 'Vote recorded.', eventId: EVENT_ID, categoryId: categoryId });
  } catch (err) { return responseError_(String(err)); }
}

function adminAction_(data) {
  if (!admin_(data.key)) return responseError_('Invalid admin key.');
  if (data.action === 'getAdminPandals') {
    const sheet = pandalsSheet_(), headers = headers_(sheet), rows = sheet.getDataRange().getValues(), eventId = String(data.eventId || EVENT_ID);
    const values = rows.slice(1).filter(row => String(row[col_(headers, 'Event_ID')] || 'durga-puja-2026') === eventId).map(row => ({
      id: row[col_(headers, 'ID')], name: row[col_(headers, 'Name')], area: row[col_(headers, 'Area')], img: row[col_(headers, 'ImageURL')],
      active: row[col_(headers, 'Active')] === true || String(row[col_(headers, 'Active')]).toUpperCase() === 'TRUE', eventId: eventId
    }));
    return json_({ status: 'success', pandals: values });
  }
  if (data.action === 'getAdminVotes') {
    const sheet = votesSheet_(), headers = headers_(sheet), rows = sheet.getDataRange().getValues(), eventId = String(data.eventId || EVENT_ID);
    const values = rows.slice(1).filter(row => String(row[col_(headers, 'Event_ID')] || 'durga-puja-2026') === eventId).map(row => ({
      timestamp: row[col_(headers, 'Timestamp')], voterId: row[col_(headers, 'VoterEmail')], voterType: row[col_(headers, 'VoterType')],
      pandalId: row[col_(headers, 'Pandal_ID')], pandalName: row[col_(headers, 'Pandal_Name')], categoryId: row[col_(headers, 'Category_ID')] || 'best_pandal',
      deviceFlag: row[col_(headers, 'DeviceFlag')], ipFlag: row[col_(headers, 'IPFlag')], gpsFlag: row[col_(headers, 'GPSFlag')]
    }));
    return json_({ status: 'success', votes: values });
  }
  if (data.action === 'addPandal') {
    const name = String(data.name || '').trim(); if (!name) return responseError_('Pandal name is required.');
    const imageUrl = String(data.imageUrl || '').trim();
    const image = data.imageBase64 ? saveImage_(data.imageBase64, data.imageMimeType, data.imageFileName) : (/^https?:\/\//i.test(imageUrl) ? imageUrl.slice(0, 2048) : '');
    const result = lock_(function () {
      const sheet = pandalsSheet_(), headers = headers_(sheet), rows = sheet.getDataRange().getValues();
      const idCol = col_(headers, 'ID'), ids = rows.slice(1).map(r => Number(r[idCol]) || 0), id = Math.max(0, ...ids) + 1, row = new Array(headers.length).fill('');
      row[col_(headers, 'ID')] = id; row[col_(headers, 'Name')] = safeCell_(name); row[col_(headers, 'Area')] = safeCell_(String(data.area || '').trim()); row[col_(headers, 'ImageURL')] = image; row[col_(headers, 'Active')] = true; row[col_(headers, 'Event_ID')] = EVENT_ID;
      sheet.appendRow(row); return id;
    });
    if (!result.ok) return responseError_('The service is busy. Try again.');
    cache_().remove('pandals_' + EVENT_ID); return json_({ status: 'success', id: result.value });
  }
  if (data.action === 'setPandalActive') {
    const result = lock_(function () {
      const sheet = pandalsSheet_(), headers = headers_(sheet), rows = sheet.getDataRange().getValues(), idCol = col_(headers, 'ID'), eventCol = col_(headers, 'Event_ID');
      for (let i = 1; i < rows.length; i++) if (String(rows[i][idCol]) === String(data.id) && String(rows[i][eventCol]) === EVENT_ID) { sheet.getRange(i + 1, col_(headers, 'Active') + 1).setValue(data.active === true); return true; }
      return false;
    });
    if (!result.ok) return responseError_('The service is busy. Try again.'); if (!result.value) return responseError_('Pandal not found.');
    cache_().remove('pandals_' + EVENT_ID); return json_({ status: 'success' });
  }
  return responseError_('Unknown admin action.');
}

/** Run once from the Apps Script editor after adding script properties. */
function initializeKaliPuja2026() {
  votesSheet_(); pandalsSheet_(); clearCaches_();
  Logger.log('Sheets are ready. Add Kali Puja pandals with the authorized addPandal action.');
}
