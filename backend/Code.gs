/**
 * Kali Puja 2026 voting API — deploy as a dedicated Apps Script web app.
 * Uses the bound spreadsheet's existing Votes/Pandals sheets. Existing rows
 * without event/category metadata stay visible in storage and are treated as
 * legacy Durga Puja rows for reporting and duplicate checks.
 */
const EVENT_ID = 'kali-puja-2026';
const VOTES_SHEET = 'Votes';
const PANDALS_SHEET = 'Pandals';
const CATEGORIES = ['best_pandal', 'best_puja', 'best_theme'];
// Guardrails: one device fingerprint per award category (up to three event votes).
// Matching IP + nearby GPS is flagged red for review; that shared signal alone is not a rejection.
// A matching device or browser profile combined with the same IP + nearby GPS is rejected.
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
function gpsNear_(latA, lngA, latB, lngB) {
  const values = [latA, lngA, latB, lngB].map(Number);
  if (!values.every(Number.isFinite)) return false;
  const radians = value => value * Math.PI / 180;
  const dLat = radians(values[2] - values[0]), dLng = radians(values[3] - values[1]);
  const a = Math.min(1, Math.sin(dLat / 2) ** 2 + Math.cos(radians(values[0])) * Math.cos(radians(values[2])) * Math.sin(dLng / 2) ** 2);
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) <= 75;
}
function normalizeIp_(value) {
  let ip = String(value || '').trim().toLowerCase();
  if (ip.indexOf('::ffff:') === 0) ip = ip.slice(7);
  return /^[0-9a-f:.]{3,45}$/.test(ip) ? ip : '';
}
function flagMatchedRows_(sheet, headers, allRows, matches, field) {
  const index = col_(headers, field);
  const flagValue = { IPFlag: 'IP_FLAGGED', GPSFlag: 'GPS_FLAGGED', DeviceFlag: 'DEVICE_FLAGGED' }[field];
  if (!flagValue) return;
  if (index < 0) return;
  matches.forEach(row => {
    const rowIndex = allRows.indexOf(row);
    if (rowIndex > 0) markFlagCell_(sheet, rowIndex + 1, index + 1, flagValue);
  });
}
function markFlagCell_(sheet, rowIndex, columnIndex, flagValue) {
  sheet.getRange(rowIndex, columnIndex).setValue(flagValue).setBackground('#f4cccc').setFontColor('#990000');
}
function normalizePhone_(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.slice(0, 2) === '91') digits = digits.slice(2);
  if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.slice(1);
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
function trashDriveImage_(url) {
  const match = String(url || '').match(/\/d\/([A-Za-z0-9_-]+)/);
  if (!match) return;
  try { DriveApp.getFileById(match[1]).setTrashed(true); } catch (err) { console.warn('Could not trash replaced pandal image: ' + err); }
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
    const hasGps = gps.lat !== '' && gps.lat != null && gps.lng !== '' && gps.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    const device = data.device || {}, fp = /^[a-f0-9]{64}$/.test(String(data.deviceFingerprint || '')) ? String(data.deviceFingerprint) : '';
    const ip = normalizeIp_(data.ip);
    if (!ip) return responseError_('Your IP address could not be verified. This vote was not recorded. Please use the official voting site and try again.');
    if (!fp) return responseError_('This device could not be verified. Please enable a secure browser and try again.');
    const outcome = lock_(function () {
      const sheet = votesSheet_(), headers = headers_(sheet), rows = sheet.getDataRange().getValues();
      const voterCol = col_(headers, 'VoterEmail'), eventCol = col_(headers, 'Event_ID'), categoryCol = col_(headers, 'Category_ID');
      const eventRows = rows.slice(1).filter(r => String(r[eventCol] || 'durga-puja-2026') === EVENT_ID);
      const categoryRows = eventRows.filter(r => String(r[categoryCol] || 'best_pandal') === categoryId);
      const userAgent = String(device.userAgent || '').slice(0, 300), screen = String(device.screen || '').slice(0, 30), timezone = String(device.timezone || '').slice(0, 60);
      const ipCol = col_(headers, 'IP'), latCol = col_(headers, 'Lat'), lngCol = col_(headers, 'Lng');
      const fingerprintCol = col_(headers, 'DeviceFingerprint'), uaCol = col_(headers, 'UserAgent'), screenCol = col_(headers, 'Screen'), timezoneCol = col_(headers, 'Timezone');
      const ipMatches = ipCol >= 0 ? categoryRows.filter(r => normalizeIp_(r[ipCol]) === ip) : [];
      const gpsMatches = hasGps && latCol >= 0 && lngCol >= 0 ? categoryRows.filter(r => gpsNear_(r[latCol], r[lngCol], lat, lng)) : [];
      const deviceMatches = fingerprintCol >= 0 ? categoryRows.filter(r => String(r[fingerprintCol] || '') === fp) : [];
      const hasProfile = !!(userAgent && screen && timezone && uaCol >= 0 && screenCol >= 0 && timezoneCol >= 0);
      const profileMatches = hasProfile ? categoryRows.filter(r => String(r[uaCol] || '') === userAgent && String(r[screenCol] || '') === screen && String(r[timezoneCol] || '') === timezone) : [];
      const sameVoterMatches = categoryRows.filter(r => normalizeEmail_(r[voterCol]) === voterId);
      // Pair IP and GPS on the same earlier vote. This combination is a red review flag;
      // shared network/location alone does not reject a voter.
      const networkLocationMatches = hasGps
        ? categoryRows.filter(r => ipCol >= 0 && normalizeIp_(r[ipCol]) === ip && latCol >= 0 && lngCol >= 0 && gpsNear_(r[latCol], r[lngCol], lat, lng))
        : [];
      const profileMatchSet = new Set(profileMatches);
      const sameNetworkLocationDevice = networkLocationMatches.some(r =>
        (fingerprintCol >= 0 && String(r[fingerprintCol] || '') === fp) || profileMatchSet.has(r));
      const duplicate = sameVoterMatches.length > 0 || deviceMatches.length > 0 || sameNetworkLocationDevice;
      if (networkLocationMatches.length > 0) {
        flagMatchedRows_(sheet, headers, rows, networkLocationMatches, 'IPFlag');
        flagMatchedRows_(sheet, headers, rows, networkLocationMatches, 'GPSFlag');
      }
      if (duplicate) {
        flagMatchedRows_(sheet, headers, rows, deviceMatches.concat(profileMatches), 'DeviceFlag');
        SpreadsheetApp.flush();
        return { duplicate: true, reason: sameVoterMatches.length ? 'account' : 'device' };
      }
      const last = rows.length;
      const row = new Array(headers.length).fill('');
      const put = (name, value) => { const index = col_(headers, name); if (index >= 0) row[index] = value; };
      put('Timestamp', new Date()); put('VoterEmail', safeCell_(voterId)); put('VoterType', voterType); put('Pandal_ID', pandal.id); put('Pandal_Name', safeCell_(pandal.name));
      put('DeviceFingerprint', fp); put('DeviceFlag', ''); put('Lat', hasGps ? lat : ''); put('Lng', hasGps ? lng : ''); put('GPSAccuracy', hasGps && Number.isFinite(Number(gps.accuracy)) ? Math.round(Number(gps.accuracy)) : ''); put('IP', ip);
      put('UserAgent', safeCell_(userAgent)); put('Screen', safeCell_(screen)); put('Timezone', safeCell_(timezone));
      put('IPFlag', networkLocationMatches.length > 0 || ipMatches.length >= 2 ? 'IP_FLAGGED' : ''); put('GPSFlag', networkLocationMatches.length > 0 || gpsMatches.length >= 2 ? 'GPS_FLAGGED' : ''); put('Event_ID', EVENT_ID); put('Category_ID', categoryId);
      sheet.appendRow(row);
      [['IPFlag', row[col_(headers, 'IPFlag')]], ['GPSFlag', row[col_(headers, 'GPSFlag')]], ['DeviceFlag', row[col_(headers, 'DeviceFlag')]]].forEach(([field, value]) => {
        const index = col_(headers, field);
        if (value && index >= 0) markFlagCell_(sheet, sheet.getLastRow(), index + 1, value);
      });
      if (voterType === 'phone') sheet.getRange(sheet.getLastRow(), voterCol + 1).setNumberFormat('@').setValue(voterId);
      SpreadsheetApp.flush();
      return { duplicate: false, row: last + 1 };
    });
    if (!outcome.ok) return responseError_('The voting service is busy. Please try again shortly.');
    if (outcome.value.duplicate) return responseError_(outcome.value.reason === 'account' ? 'This account has already voted in this category.' : 'This device has already voted in this category, or the same device, IP and location were used together. Duplicate votes are not accepted.', 'duplicate');
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
  if (data.action === 'updatePandal') {
    const name = String(data.name || '').trim(); if (!name) return responseError_('Pandal name is required.');
    const result = lock_(function () {
      const sheet = pandalsSheet_(), headers = headers_(sheet), rows = sheet.getDataRange().getValues();
      const idCol = col_(headers, 'ID'), eventCol = col_(headers, 'Event_ID');
      for (let i = 1; i < rows.length; i++) if (String(rows[i][idCol]) === String(data.id) && String(rows[i][eventCol]) === EVENT_ID) {
        const rowNumber = i + 1, imageCol = col_(headers, 'ImageURL');
        sheet.getRange(rowNumber, col_(headers, 'Name') + 1).setValue(safeCell_(name));
        sheet.getRange(rowNumber, col_(headers, 'Area') + 1).setValue(safeCell_(String(data.area || '').trim()));
        const currentImage = String(rows[i][imageCol] || '');
        let nextImage = currentImage;
        if (data.imageBase64) nextImage = saveImage_(data.imageBase64, data.imageMimeType, data.imageFileName);
        else if (data.removeImage === true) nextImage = '';
        if (nextImage !== currentImage) {
          sheet.getRange(rowNumber, imageCol + 1).setValue(nextImage);
          if (currentImage) trashDriveImage_(currentImage);
        }
        return true;
      }
      return false;
    });
    if (!result.ok) return responseError_('The service is busy. Try again.'); if (!result.value) return responseError_('Pandal not found.');
    cache_().remove('pandals_' + EVENT_ID); return json_({ status: 'success' });
  }
  if (data.action === 'deletePandal') {
    const result = lock_(function () {
      const sheet = pandalsSheet_(), headers = headers_(sheet), rows = sheet.getDataRange().getValues();
      const idCol = col_(headers, 'ID'), eventCol = col_(headers, 'Event_ID');
      for (let i = 1; i < rows.length; i++) if (String(rows[i][idCol]) === String(data.id) && String(rows[i][eventCol]) === EVENT_ID) { sheet.deleteRow(i + 1); return true; }
      return false;
    });
    if (!result.ok) return responseError_('The service is busy. Try again.'); if (!result.value) return responseError_('Pandal not found.');
    cache_().remove('pandals_' + EVENT_ID); return json_({ status: 'success' });
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
