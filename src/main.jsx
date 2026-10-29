import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Compass, MapPin, Menu, Search, Trophy, X, Pencil, Trash2 } from 'lucide-react';
import './styles.css';

const EVENT_ID = 'kali-puja-2026';
const VOTING_CLOSED = true;
const BASE_URL = import.meta.env.BASE_URL;
function PandalMark({ size = 22, strokeWidth = 1.5, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="m3 10 9-6 9 6"/><path d="M5 9.5V20h14V9.5M3 21h18"/><path d="M9 20v-6h6v6M7.5 8h9"/></svg>;
}
function ThemeMark({ size = 22, strokeWidth = 1.5, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><circle cx="12" cy="12" r="2.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4M5.28 5.28l2.83 2.83m7.78 7.78 2.83 2.83m0-13.44-2.83 2.83m-7.78 7.78-2.83 2.83"/><circle cx="12" cy="12" r="9.5"/></svg>;
}
function PujaMark({ size = 22, strokeWidth = 1.5, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d="M12 3c1.4 2 2.2 3.3 2.2 4.8a2.2 2.2 0 1 1-4.4 0C9.8 6.3 10.6 5 12 3Z"/><path d="M4.5 13h15c-.7 3-3.4 5-7.5 5s-6.8-2-7.5-5Z"/><path d="M6.5 18h11M9 21h6"/></svg>;
}
const CATEGORIES = [
  { id: 'best_pandal', title: 'Best Pandal', subtitle: 'Architecture · imagination · craft', icon: PandalMark, tone: 'gold', description: 'For the pandal that transforms a place into a world of its own.' },
  { id: 'best_puja', title: 'Best Pratima', subtitle: 'Idol · artistry · devotion', icon: PujaMark, tone: 'red', description: 'For the pratima that brings devotion to life through form and craft.' },
  { id: 'best_theme', title: 'Best Theme', subtitle: 'Concept · storytelling · imagination', icon: ThemeMark, tone: 'blue', description: 'For the pandal theme that brings a story to life through imagination and craft.' },
];
const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';
const INSTAGRAM_URL = 'https://www.instagram.com/the_dibrugarh/?utm_source=ig_web_button_share_sheet&obrf=ZDNlZDc0MzIxNw==';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '225466365069-19p02tbr3h2mkfiu3d9rjc18bdm4k86l.apps.googleusercontent.com';
const FESTIVAL_PHOTO = 'https://images.unsplash.com/photo-1760857292318-2b6398e2fc85?auto=format&fit=crop&w=3840&h=2160&q=85';
function googleEmailFromCredential(token) {
  try {
    const segment = String(token || '').split('.')[1];
    if (!segment) return '';
    const encoded = segment.replace(/-/g, '+').replace(/_/g, '/');
    const payloadBytes = Uint8Array.from(atob(encoded + '='.repeat((4 - encoded.length % 4) % 4)), char => char.charCodeAt(0));
    return String(JSON.parse(new TextDecoder().decode(payloadBytes)).email || '').trim();
  } catch { return ''; }
}
function pandalDisplayName(name) {
  const value = String(name || '');
  const sample = /^TEST ONLY\s*[—–-]\s*(.+)$/i.exec(value);
  return { name: sample ? sample[1] : value, isSample: Boolean(sample) };
}
function formatIndianPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : '+91 ' + value;
}
function sortPandalsByName(pandals) {
  return [...pandals].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'en', { sensitivity: 'base', numeric: true }));
}

async function apiGet(params) {
  if (!API_URL) throw new Error('Connect the Apps Script URL to load this event’s live pandal list.');
  const url = new URL(API_URL);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error('The festival service is unavailable. Please try again.');
  return response.json();
}
async function apiPost(body) {
  if (!API_URL) throw new Error('Voting is not connected yet. Configure the Apps Script URL to continue.');
  const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' });
  if (!response.ok) throw new Error('The festival service is unavailable. Please try again.');
  return response.json();
}
async function apiVote(body) {
  if (VOTING_CLOSED) throw new Error('Voting has closed. See the top five in each category below.');
  if (!API_URL) throw new Error('Voting is not connected yet. Configure the Apps Script URL to continue.');
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const isProjectPages = BASE_URL !== '/';
  const response = await fetch(isLocal || isProjectPages ? API_URL : '/api/vote', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' });
  if (!response.ok) throw new Error('The festival service is unavailable. Please try again.');
  return response.json();
}
async function voteDeviceContext() {
  const device = {
    userAgent: navigator.userAgent || '',
    screen: window.screen ? `${window.screen.width}x${window.screen.height}` : '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  };
  let deviceFingerprint = '';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 220; canvas.height = 40;
    const context = canvas.getContext('2d');
    if (!context || !window.crypto?.subtle) return { device, deviceFingerprint: '' };
    context.textBaseline = 'top'; context.font = '14px Arial';
    context.fillText('the-dibrugarh-kali-puja-vote-signal', 2, 2);
    let gpu = '';
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      const debug = gl?.getExtension('WEBGL_debug_renderer_info');
      if (debug) gpu = gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) || '';
    } catch {}
    const raw = [device.userAgent, navigator.language || '', device.screen,
      window.screen?.colorDepth || '', device.timezone, navigator.hardwareConcurrency || '',
      gpu, canvas.toDataURL()].join('||');
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    deviceFingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  } catch { deviceFingerprint = ''; }
  return { device, deviceFingerprint };
}
function voteLocation() {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null);
    let finished = false, guard;
    const finish = value => { if (finished) return; finished = true; clearTimeout(guard); resolve(value); };
    guard = setTimeout(() => finish(null), 20000);
    const success = position => finish({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy });
    const retryCoarse = error => {
      if (error?.code === 1 || finished) return finish(null);
      try { navigator.geolocation.getCurrentPosition(success, () => finish(null), { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }); }
      catch { finish(null); }
    };
    try { navigator.geolocation.getCurrentPosition(success, retryCoarse, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }); }
    catch { finish(null); }
  });
}
async function prepareImageUpload(file) {
  if (!file) return {};
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller.');
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read that image. Please choose it again.'));
    reader.readAsDataURL(file);
  });
  const source = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not open that image. Choose another photo.'));
    image.src = String(dataUrl);
  });
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1024;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare that image. Please try again.');
  context.fillStyle = '#100d16';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / source.naturalWidth, canvas.height / source.naturalHeight);
  const width = source.naturalWidth * scale, height = source.naturalHeight * scale;
  context.drawImage(source, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
  const imageBase64 = await new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob) return reject(new Error('Could not prepare that image. Please try again.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Could not prepare that image. Please try again.'));
    reader.readAsDataURL(blob);
  }, 'image/jpeg', 0.9));
  return { imageBase64, imageMimeType: 'image/jpeg', imageFileName: `${file.name.replace(/\.[^.]+$/, '')}.jpg` };
}

function App() {
  const siteBasePath = BASE_URL.replace(/\/+$/, '');
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const isAdminRoute = currentPath === '/admin' || currentPath === `${siteBasePath}/admin`;
  const [pandals, setPandals] = useState([]), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState(''), [area, setArea] = useState('All areas'), [section, setSection] = useState('discover'), [mobileOpen, setMobileOpen] = useState(false);
  const [selected, setSelected] = useState(null), [category, setCategory] = useState(null), [step, setStep] = useState('pandal'), [identityType, setIdentityType] = useState('phone'), [phone, setPhone] = useState(''), [idToken, setIdToken] = useState(''), [rulesAccepted, setRulesAccepted] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const [leaderboard, setLeaderboard] = useState({}), [resultsUnavailable, setResultsUnavailable] = useState(false);
  const [voteOpen, setVoteOpen] = useState(false), [googleReady, setGoogleReady] = useState(false), [googleLoadFailed, setGoogleLoadFailed] = useState(false), [googleEmail, setGoogleEmail] = useState('');
  const [adminKey, setAdminKey] = useState(''), [adminUnlocked, setAdminUnlocked] = useState(false), [adminPandals, setAdminPandals] = useState([]);
  const [adminBusy, setAdminBusy] = useState(false), [adminError, setAdminError] = useState(''), [adminNotice, setAdminNotice] = useState('');
  const [adminName, setAdminName] = useState(''), [adminArea, setAdminArea] = useState(''), [adminImageFile, setAdminImageFile] = useState(null);
  const [editingPandalId, setEditingPandalId] = useState(null), [editName, setEditName] = useState(''), [editArea, setEditArea] = useState(''), [editImageFile, setEditImageFile] = useState(null);
  const adminImageInput = useRef(null), editImageInput = useRef(null), voteRedirectTimer = useRef(null), googleButtonRef = useRef(null), googleInitialized = useRef(false);
  const [locationChoice, setLocationChoice] = useState('undecided'), [gpsLocation, setGpsLocation] = useState(null), [locationBusy, setLocationBusy] = useState(false);
  const clearAdminImage = () => { setAdminImageFile(null); if (adminImageInput.current) adminImageInput.current.value = ''; };
  const clearEditImage = () => { setEditImageFile(null); if (editImageInput.current) editImageInput.current.value = ''; };

  async function refresh() {
    setLoading(true); setLoadError('');
    try { const data = await apiGet({ pandals: '1', eventId: EVENT_ID }); if (data.status !== 'success') throw new Error(data.message || 'Could not load pandals.'); setPandals(sortPandalsByName((data.pandals || []).filter(p => p.active))); }
    catch (e) { setLoadError(e.message); setPandals([]); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    refresh();
    const updateResults = () => apiGet({ results: '1', eventId: EVENT_ID }).then(d => { setLeaderboard(d.counts || {}); setResultsUnavailable(false); }).catch(() => setResultsUnavailable(true));
    updateResults();
    const timer = window.setInterval(updateResults, 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!voteOpen) return undefined;
    const handleEscape = event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (busy) return;
      setVoteOpen(false);
      setSelected(null);
      setCategory(null);
      setError('');
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [voteOpen, busy]);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible')); return; }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.01, rootMargin: '0px 0px -20px 0px' });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  const areas = useMemo(() => ['All areas', ...new Set(pandals.map(p => p.area).filter(Boolean))], [pandals]);
  const filtered = useMemo(() => { const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean); return pandals.filter(p => (area === 'All areas' || p.area === area) && terms.every(t => `${p.name} ${p.area} ${p.keywords || ''}`.toLowerCase().includes(t))); }, [pandals, query, area]);
  const selectedDisplay = pandalDisplayName(selected?.name);
  const selectedArea = selected?.area ? (/dibrugarh/i.test(selected.area) ? selected.area : `Dibrugarh · ${selected.area}`) : 'Dibrugarh';
  const goTo = id => { setSection(id); setMobileOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };
  const openVote = () => { if (voteRedirectTimer.current) window.clearTimeout(voteRedirectTimer.current); voteRedirectTimer.current = null; setVoteOpen(true); setSelected(null); setQuery(''); setArea('All areas'); setCategory(null); setStep('pandal'); setDone(false); setRulesAccepted(false); setLocationChoice('undecided'); setGpsLocation(null); setLocationBusy(false); setError(''); };
  const closeVote = () => { if (voteRedirectTimer.current) window.clearTimeout(voteRedirectTimer.current); voteRedirectTimer.current = null; setVoteOpen(false); setSelected(null); setCategory(null); setStep('pandal'); setError(''); };
  const selectGoogle = () => { setIdentityType('google'); setIdToken(''); setGoogleEmail(''); setError(''); };
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true;
    script.onload = () => setGoogleReady(true);
    script.onerror = () => setGoogleLoadFailed(true);
    document.head.appendChild(script);
    return () => { script.onload = null; script.onerror = null; script.remove(); };
  }, []);
  useEffect(() => {
    if (!googleReady || !GOOGLE_CLIENT_ID || !window.google?.accounts?.id || !googleButtonRef.current || step !== 'auth' || identityType !== 'google') return;
    const googleId = window.google.accounts.id;
    if (!googleInitialized.current) {
      googleId.initialize({ client_id: GOOGLE_CLIENT_ID, callback: response => {
        if (!response?.credential) { setError('Google sign-in did not return an account. Please try again.'); return; }
        setIdToken(response.credential); setGoogleEmail(googleEmailFromCredential(response.credential)); setError('');
      } });
      googleInitialized.current = true;
    }
    googleButtonRef.current.replaceChildren();
    googleId.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: 260 });
  }, [googleReady, step, identityType]);
  const submit = async () => {
    setBusy(true); setError('');
    try {
      let gps = gpsLocation;
      if (locationChoice === 'undecided') {
        setLocationChoice('requesting'); setLocationBusy(true);
        gps = await voteLocation();
        setGpsLocation(gps); setLocationChoice(gps ? 'shared' : 'declined'); setLocationBusy(false);
      }
      const { device, deviceFingerprint } = await voteDeviceContext();
      const data = await apiVote({ eventId: EVENT_ID, categoryId: category.id, pandalId: selected.id, ...(identityType === 'google' ? { idToken } : { phone }), rulesAccepted, device, deviceFingerprint, ...(gps ? { gps } : {}) });
      if (data.status === 'success') {
        setDone(true);
        apiGet({ results: '1', eventId: EVENT_ID }).then(results => {
          if (results.status === 'success') { setLeaderboard(results.counts || {}); setResultsUnavailable(false); }
        }).catch(() => setResultsUnavailable(true));
        voteRedirectTimer.current = window.setTimeout(() => {
          voteRedirectTimer.current = null;
          closeVote();
          goTo('results');
        }, 1800);
      }
      else if (data.status === 'duplicate') throw new Error('Your vote was rejected because duplicate voting is not allowed.');
      else throw new Error(data.message || 'Your vote could not be recorded.');
    } catch (e) { setError(e.message); } finally { setBusy(false); setLocationBusy(false); }
  };
  async function adminRequest(body, key = adminKey) {
    const data = await apiPost({ ...body, key, eventId: EVENT_ID });
    if (data.status !== 'success') {
      if (/unknown admin action/i.test(data.message || '')) throw new Error('The Apps Script deployment is outdated. Replace its Code.gs with this project’s backend/Code.gs, then deploy a new web app version.');
      throw new Error(data.message || 'The admin request could not be completed.');
    }
    return data;
  }
  async function loadAdminPandals(key = adminKey) {
    const data = await adminRequest({ action: 'getAdminPandals' }, key);
    const sortedPandals = sortPandalsByName(data.pandals || []);
    setAdminPandals(sortedPandals);
    return sortedPandals;
  }
  async function unlockAdmin(e) {
    e?.preventDefault(); setAdminBusy(true); setAdminError(''); setAdminNotice('');
    try { await loadAdminPandals(); setAdminUnlocked(true); setAdminNotice('Organizer access unlocked for this tab.'); }
    catch (err) { setAdminError(err.message); }
    finally { setAdminBusy(false); }
  }
  async function runAdminAction(body, successMessage) {
    setAdminBusy(true); setAdminError(''); setAdminNotice('');
    try {
      await adminRequest(body);
      await loadAdminPandals();
      await refresh();
      setAdminNotice(successMessage);
      return true;
    } catch (err) { setAdminError(err.message); return false; }
    finally { setAdminBusy(false); }
  }
  async function submitPandal(e) {
    e.preventDefault(); const form = e.currentTarget; setAdminError('');
    try {
      const image = await prepareImageUpload(adminImageFile);
      const ok = await runAdminAction({ action: 'addPandal', name: adminName, area: adminArea, ...image }, 'Pandal added to the live event. Its image was saved to Drive.');
      if (ok) { setAdminName(''); setAdminArea(''); setAdminImageFile(null); form.reset(); }
    } catch (err) { setAdminError(err.message); }
  }
  function startEdit(p) { setEditingPandalId(String(p.id)); setEditName(p.name || ''); setEditArea(p.area || ''); setEditImageFile(null); setAdminError(''); setAdminNotice(''); }
  async function submitEdit(e, p) {
    e.preventDefault();
    try {
      const image = await prepareImageUpload(editImageFile);
      const ok = await runAdminAction({ action: 'updatePandal', id: p.id, name: editName, area: editArea, ...image }, `${editName.trim()} updated.`);
      if (ok) { setEditingPandalId(null); setEditImageFile(null); }
    } catch (err) { setAdminError(err.message); }
  }
  async function removePandalImage(p) {
    setAdminBusy(true); setAdminError(''); setAdminNotice('');
    try {
      await adminRequest({ action: 'updatePandal', id: p.id, name: p.name, area: p.area, removeImage: true });
      const latest = await loadAdminPandals();
      const updated = latest.find(item => String(item.id) === String(p.id));
      if (String(updated?.img || '').trim()) throw new Error('The voting service still returns the old image. Deploy the latest backend/Code.gs in Apps Script, then try removing it again.');
      await refresh();
      setAdminNotice(`${p.name} image removed.`);
    } catch (err) { setAdminError(err.message); }
    finally { setAdminBusy(false); }
  }
  async function deletePandal(p) {
    if (!window.confirm(`Permanently delete “${p.name}” from the pandal list? This cannot be undone. Existing votes remain in the results sheet.`)) return;
    await runAdminAction({ action: 'deletePandal', id: p.id }, `${p.name} deleted.`);
  }
  async function createDemoPandals() {
    setAdminBusy(true); setAdminError(''); setAdminNotice('');
    const demos = [
      { name: 'TEST ONLY — Demo Pandal A', area: 'Dibrugarh · Test Area' },
      { name: 'TEST ONLY — Demo Pandal B', area: 'Dibrugarh · Test Area' },
    ];
    try {
      for (const demo of demos) {
        const existing = adminPandals.find(p => p.name === demo.name);
        if (existing?.active) continue;
        if (existing) await adminRequest({ action: 'setPandalActive', id: existing.id, active: true });
        else await adminRequest({ action: 'addPandal', ...demo });
      }
      await loadAdminPandals(); await refresh();
      setAdminNotice('Demo pandals are active. Deactivate them after your checks; test votes will remain in the results unless removed from the sheet.');
    } catch (err) { setAdminError(err.message); try { await loadAdminPandals(); await refresh(); } catch {} }
    finally { setAdminBusy(false); }
  }
  function lockAdmin() { setAdminKey(''); setAdminUnlocked(false); setAdminPandals([]); setAdminError(''); setAdminNotice('Organizer access locked.'); }

  return <>
    <header className="topbar"><a className="brand" href={isAdminRoute ? BASE_URL : '#top'} onClick={e => { if (!isAdminRoute) { e.preventDefault(); goTo('top'); } }}><img src={`${BASE_URL}dibrugarh-logo.png`} alt="The Dibrugarh"/><span><small>The_Dibrugarh presents</small><b>Kali Puja <i>2026</i></b></span></a>

      {isAdminRoute ? <a className="nav-cta admin-back" href={BASE_URL}>Back to festival <ArrowRight size={15}/></a> : <><nav className={mobileOpen ? 'nav open' : 'nav'} aria-label="Main navigation"><button className="nav-home" onClick={() => goTo('top')}>Home</button><button onClick={() => goTo('discover')}>All Pujas</button><button onClick={() => goTo('results')}>Winners</button><button className="nav-vote" onClick={() => goTo(VOTING_CLOSED ? 'results' : 'discover')}>{VOTING_CLOSED ? 'See Top 5' : 'Vote Now'} <ArrowRight size={15}/></button></nav>

      <button className="menu-toggle" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</button></>}
    </header>
    <main id={isAdminRoute ? 'admin-page' : 'top'}>
      {!isAdminRoute && <>
      <section className="hero">

        <div className="hero-art" aria-hidden="true"><img className="hero-photo" src={FESTIVAL_PHOTO} alt="" fetchPriority="high"/><div className="sun-ring ring-one"/><div className="sun-ring ring-two"/><div className="mandala">✳︎</div><span className="ember e1"/><span className="ember e2"/><span className="ember e3"/><span className="ember e4"/></div>
        <div className="hero-copy"><p className="eyebrow hero-presenter"><span/> KALI PUJA · DIBRUGARH 2026 <span/></p><h1 className="hero-brand-title">The_Dibrugarh</h1><p className="hero-event-title">Kali Puja Awards <em>2026</em></p><p className="hero-text">Voting has closed. Explore the city’s pandals and celebrate this year’s winners.</p><figure className="hero-maa-art"><img src={`${BASE_URL}kali-maa-painting.png`} alt="Maa Kali with her weapons and garland" fetchPriority="high"/></figure></div>

        <div className="hero-seal"><span className="seal-top">KARTIK AMAVASYA</span><span className="seal-symbol">ॐ</span><span className="seal-bottom">KALI PUJA</span></div>
        <div className="hero-bottom"><span>THE FESTIVAL · DIBRUGARH 2026</span><span>CELEBRATE THE CITY</span></div>
      </section>

      <div className="city-ribbon" aria-label={VOTING_CLOSED ? 'Voting has closed. Explore the final results.' : 'Choose a category and cast your vote'}><div className="ribbon-track"><div className="ribbon-group" aria-hidden="true"><span>BEST PANDAL · BEST PRATIMA · BEST THEME</span><i>✳︎</i><span>{VOTING_CLOSED ? 'VOTING HAS CLOSED' : 'CAST YOUR VOTE'}</span><i>✳︎</i><span>{VOTING_CLOSED ? 'TOP FIVE IN EACH CATEGORY' : 'ONE VOTE IN EACH CATEGORY'}</span><i>✳︎</i><span>FIND A PANDAL IN DIBRUGARH</span><i>✳︎</i></div><div className="ribbon-group" aria-hidden="true"><span>BEST PANDAL · BEST PRATIMA · BEST THEME</span><i>✳︎</i><span>{VOTING_CLOSED ? 'VOTING HAS CLOSED' : 'CAST YOUR VOTE'}</span><i>✳︎</i><span>{VOTING_CLOSED ? 'TOP FIVE IN EACH CATEGORY' : 'ONE VOTE IN EACH CATEGORY'}</span><i>✳︎</i><span>FIND A PANDAL IN DIBRUGARH</span><i>✳︎</i></div></div></div>
      <section className="discover section-pad reveal" id="discover"><div className="section-kicker"><span>THE FESTIVAL · FINAL RESULTS</span></div><div className="discover-heading"><div><p className="eyebrow dark-eyebrow">VOTING HAS CLOSED</p><h2>Celebrate Dibrugarh’s <em>winners.</em></h2></div><p>Explore this year’s pandals and see the top five in each award category.</p></div><div className="discover-vote-row"><button className="button button-vote discover-vote" onClick={openVote}>Explore Pandals <ArrowRight size={19}/><span>See this year’s entries</span></button></div></section>
      <section className="leaderboard section-pad reveal" id="results"><div className="section-kicker"><span>FINAL RESULTS · THE PEOPLE’S CHOICE</span><span>TOP FIVE · FINAL LEADERBOARD</span></div><div className="section-heading"><h2 className="leaderboard-title">The<br/><em>winners.</em></h2><p className="leaderboard-description"><strong>TOP 5 IN EACH CATEGORY</strong><br/>Every vote celebrates the artists and communities behind the festival.</p></div><div className="leader-tabs">{CATEGORIES.map(c => { const ranked = Object.entries(leaderboard[c.id] || {}).sort((a, b) => b[1] - a[1]).slice(0, 5); return <div key={c.id}><span>{c.title}</span>{resultsUnavailable ? <strong>Live results are not connected yet</strong> : ranked.length ? <ol className="rank-list">{ranked.map(([id, count], index) => { const entry = pandals.find(p => String(p.id) === String(id)); return <li key={id}><i>{String(index + 1).padStart(2, '0')}</i><div className="rank-entry"><b>{entry?.name || 'Pandal'}</b><small><MapPin size={12}/>{entry?.address || entry?.locality || entry?.area || 'Dibrugarh'}</small></div><strong>{count} {count === 1 ? 'vote' : 'votes'}</strong></li>; })}</ol> : <strong className="rank-empty">No votes recorded yet</strong>}</div>; })}</div></section>

      <section className="instagram-spotlight section-pad reveal" id="the-dibrugarh"><div className="instagram-spotlight-copy"><p className="eyebrow"><span/> THE CITY BEYOND THE PANDALS <span/></p><h2>Keep celebrating<br/><em>Dibrugarh.</em></h2><p>Local stories, celebrations and everyday moments from the city.</p></div><a className="instagram-visit" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Visit the_dibrugarh on Instagram"><span className="instagram-logo-frame"><svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><rect x="8" y="8" width="84" height="84" rx="24"/><circle cx="50" cy="50" r="21"/><circle cx="75" cy="26" r="5" fill="currentColor"/></svg><img className="instagram-brand-mark" src={`${BASE_URL}dibrugarh-social-mark.png`} alt="The Dibrugarh logo"/></span><span className="instagram-handle"><svg className="instagram-social-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/><circle cx="17.5" cy="6.8" r="1.2" fill="currentColor"/></svg> @the_dibrugarh</span></a></section>
      <section className="intro section-pad reveal" id="about"><div className="section-kicker"><span>THE NIGHT OF MA KALI · FESTIVAL FACTS</span></div><div className="intro-grid"><h2>On the new moon,<br/><em>lamps awaken.</em></h2><div><p className="intro-body">On Kartik Amavasya, communities gather to honour Maa Kali. Explore the pandals, artistry and traditions that bring this sacred night to life in Dibrugarh.</p><p className="intro-note">Red hibiscus and lamps are among familiar offerings; customs differ across communities. <a className="tradition-link" href="https://www.incredibleindia.gov.in/en/festivals-and-events/kali-puja" target="_blank" rel="noreferrer">Explore the tradition <ArrowRight size={13}/></a></p></div></div></section>
      </>}
      {isAdminRoute && <section className="admin section-pad" id="admin"><div className="section-kicker"><span>ORGANIZER ACCESS</span><span>PRIVATE TOOLS</span></div><div className="admin-heading"><div><p className="eyebrow dark-eyebrow">THE DIBRUGARH · ADMIN</p><h2>Manage your<br/><em>pandal list.</em></h2></div><p>Add entries, create clearly marked demo pandals, or deactivate listings after the event.</p></div>
        {!adminUnlocked ? <form className="admin-gate" onSubmit={unlockAdmin}><label htmlFor="admin-key">ADMIN PASSWORD</label><div className="admin-key-row"><input id="admin-key" type="password" autoComplete="current-password" value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder="Enter admin password"/><button className="button button-gold" disabled={!adminKey.trim() || adminBusy}>{adminBusy ? 'Checking…' : 'Unlock admin'} <ArrowRight size={15}/></button></div><p>Your password stays in this tab’s memory and is sent securely to the voting service. It is not saved in the site.</p></form> : <><div className="admin-toolbar"><button className="admin-lock" onClick={lockAdmin}>Lock admin</button></div><div className="admin-grid"><form className="admin-form" onSubmit={submitPandal}><h3>Add a pandal</h3><label>PANDAL NAME<input required maxLength={100} value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Community pandal name"/></label><label>AREA<input maxLength={100} value={adminArea} onChange={e => setAdminArea(e.target.value)} placeholder="Locality in Dibrugarh"/></label><label>UPLOAD IMAGE TO DRIVE <span>OPTIONAL</span><input ref={adminImageInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setAdminImageFile(e.target.files?.[0] || null)}/>{adminImageFile && <span className="upload-selected"><span title={adminImageFile.name}>{adminImageFile.name}</span><button className="admin-toggle delete" type="button" disabled={adminBusy} onClick={e => { e.preventDefault(); e.stopPropagation(); clearAdminImage(); }}>Cancel upload</button></span>}<small className="upload-help">JPG, PNG or WebP · Up to 5 MB · Saved as a square tile without cropping the photo in your Google Drive pandal folder</small></label><button className="button button-gold" disabled={adminBusy || !adminName.trim()}>{adminBusy ? 'Saving…' : 'Add to live list'} <ArrowRight size={15}/></button></form><div className="admin-demo"><span className="admin-label">SAFE TEST LABELS</span><h3>Need to test voting?</h3><p>Add two entries named “TEST ONLY” to the live list. They will be visible to visitors; deactivate them when you’re done. Any test votes remain in the results until you remove them from the Votes sheet.</p><button className="button button-outline" disabled={adminBusy} onClick={createDemoPandals}>{adminBusy ? 'Working…' : 'Create 2 demo pandals'} <ArrowRight size={15}/></button></div></div><div className="admin-list"><div className="admin-list-heading"><h3>Event pandals</h3><span>{adminPandals.length} LISTINGS</span></div>{adminPandals.length ? adminPandals.map(p => <div className="admin-row" key={p.id}>{String(editingPandalId) === String(p.id) ? <form className="admin-edit-form" onSubmit={e => submitEdit(e,p)}><strong>EDIT PANDAL · ID {p.id}</strong><label>PANDAL NAME<input required maxLength={100} value={editName} onChange={e => setEditName(e.target.value)}/></label><label>AREA<input maxLength={100} value={editArea} onChange={e => setEditArea(e.target.value)}/></label><label className="edit-image-field">REPLACE IMAGE <span>OPTIONAL</span>{p.img && <span className="current-image-row"><img src={p.img} alt={`Current pandal image for ${p.name}`}/><button className="admin-toggle delete" type="button" disabled={adminBusy || !!editImageFile} onClick={e => { e.preventDefault(); e.stopPropagation(); removePandalImage(p); }}>Remove image</button></span>}<input ref={editImageInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setEditImageFile(e.target.files?.[0] || null)}/>{editImageFile && <span className="upload-selected"><span title={editImageFile.name}>{editImageFile.name}</span><button className="admin-toggle delete" type="button" disabled={adminBusy} onClick={e => { e.preventDefault(); e.stopPropagation(); clearEditImage(); }}>Cancel upload</button></span>}<small className="upload-help">Choose a replacement, or remove the current image. Photos are fitted inside a square frame without cropping on save. Leave empty to keep the current image. The Remove image button removes it immediately.</small></label><div className="admin-edit-actions"><button className="admin-toggle" type="submit" disabled={adminBusy || !editName.trim()}>{adminBusy ? 'Saving…' : 'Save changes'}</button><button className="admin-toggle" type="button" disabled={adminBusy} onClick={() => setEditingPandalId(null)}>Cancel</button></div></form> : <><div><div className="admin-pandal-title"><strong>{p.name}</strong><span>{p.area || 'Dibrugarh'}</span></div><small>ID {p.id}</small></div><span className={p.active ? 'admin-status active' : 'admin-status'}>{p.active ? 'ACTIVE' : 'INACTIVE'}</span><div className="admin-actions"><button className="admin-toggle edit" disabled={adminBusy} onClick={() => startEdit(p)}><Pencil size={13}/> Edit</button><button className={`admin-toggle ${p.active ? 'deactivate' : 'reactivate'}`} disabled={adminBusy} onClick={() => runAdminAction({ action: 'setPandalActive', id: p.id, active: !p.active }, p.active ? `${p.name} deactivated.` : `${p.name} reactivated.`)}>{p.active ? 'Deactivate' : 'Reactivate'}</button><button className="admin-toggle delete" disabled={adminBusy} onClick={() => deletePandal(p)}><Trash2 size={13}/> Delete</button></div></>}</div>) : <p className="admin-empty">No Kali Puja pandals are listed yet.</p>}</div></>}
        {adminError && <p className="admin-feedback error" role="alert">{adminError}</p>}{adminNotice && <p className="admin-feedback" role="status">{adminNotice}</p>}
      </section>}
      {!isAdminRoute && <footer className="footer"><div className="footer-brand"><img src={`${BASE_URL}dibrugarh-logo.png`} alt="The Dibrugarh"/><span>KALI PUJA <i>2026</i></span></div><p>A night of devotion.<br/>A celebration shared.</p><div className="footer-bottom"><span>© 2026 The Dibrugarh · Festival experience</span><button onClick={() => goTo('top')}>Back to top ↑</button><span className="footer-credit">Developed with love by <a href="https://www.instagram.com/zeelabs.tech?srtk=MW9uN2NpZjExazdrZQ%3D%3D&amp;utm_source=qr" target="_blank" rel="noopener noreferrer">zeelabs.tech</a> <span aria-hidden="true">♥</span></span></div></footer>}
    </main>
    {voteOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closeVote(); }}><section className="vote-modal" role="dialog" aria-modal="true" aria-labelledby="vote-title"><button className="modal-close" onClick={closeVote} aria-label="Close"><X/></button><img className="vote-popup-brand" src={`${BASE_URL}dibrugarh-social-mark.png`} alt="The Dibrugarh on Instagram and Facebook"/>{done ? <div className="success-view" role="status" aria-live="polite"><div className="success-mark"><Check size={32}/></div><p className="eyebrow dark-eyebrow">YOUR VOICE IS COUNTED</p><h2>Thank you for<br/><em>celebrating.</em></h2><p>Your <b>{category.title}</b> vote for <b>{selectedDisplay.name}</b> is now part of Dibrugarh’s celebration.</p><button className="button button-dark" onClick={() => { closeVote(); goTo('results'); }}>See live leaderboard <ArrowRight size={16}/></button></div> : <><div className="modal-progress"><span className={step === 'pandal' ? 'active' : 'complete'}/>{!VOTING_CLOSED && <><span className={step === 'category' ? 'active' : step === 'auth' ? 'complete' : ''}/><span className={step === 'auth' ? 'active' : ''}/></>}</div><div className="modal-step-caption"><span>0{step === 'pandal' ? 1 : VOTING_CLOSED ? 2 : step === 'category' ? 2 : 3} / 0{VOTING_CLOSED ? 2 : 3}</span><span>{step === 'pandal' ? 'FIND A PANDAL' : VOTING_CLOSED ? 'VOTING CLOSED' : step === 'category' ? 'CHOOSE AN AWARD' : 'YOUR VOTER DETAILS'}</span></div><p className="eyebrow dark-eyebrow">{VOTING_CLOSED ? 'CELEBRATE DIBRUGARH · 2026' : 'CAST YOUR VOTE · DIBRUGARH'}</p><h2 id="vote-title">{step === 'pandal' ? 'Find your' : step === 'closed' ? 'Voting is' : step === 'category' ? 'Choose an' : 'Cast your'}<br/><em>{step === 'pandal' ? 'pandal.' : step === 'closed' ? 'closed.' : step === 'category' ? 'award.' : 'vote.'}</em></h2>{step !== 'pandal' && <div className="selected-pandal"><span>{selectedDisplay.isSample ? 'SAMPLE PANDAL' : 'YOUR SELECTED PANDAL'}</span><strong>{selectedDisplay.name}</strong><small><MapPin size={12}/>{selectedArea}</small></div>}
      {step === 'pandal' && <><p className="modal-hint">Search the Dibrugarh listings and select the pandal you want to celebrate.</p><label className="modal-pandal-search"><Search size={18}/><input autoFocus aria-label="Search pandals" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search pandal or locality"/><span className="area-filter"><MapPin size={14}/><select aria-label="Filter by area" value={area} onChange={e => setArea(e.target.value)}>{areas.map(a => <option key={a}>{a}</option>)}</select><ChevronDown size={14}/></span></label><div className="modal-pandal-results">{loading ? <p>Finding the city’s pandals…</p> : loadError ? <p>{loadError}</p> : filtered.length ? filtered.map(p => <button key={p.id} onClick={() => { setSelected(p); setStep(VOTING_CLOSED ? 'closed' : 'category'); setError(''); }}><span><b>{p.name}</b><small><MapPin size={12}/>{p.area || 'Dibrugarh'}</small></span><ArrowRight size={17}/></button>) : <p>{query ? 'No pandals match that search.' : 'No active pandals are listed yet.'}</p>}</div></>}
      {step === 'closed' && <><p className="modal-hint">Voting for Kali Puja 2026 has ended. Thank you for celebrating the pandals of Dibrugarh.</p><button className="button button-dark closed-modal-results" onClick={() => { closeVote(); goTo('results'); }}>See the top five <ArrowRight size={16}/></button><button className="back-button closed-modal-back" onClick={() => setStep('pandal')}><ArrowLeft size={15}/> Choose another pandal</button></>}
      {step === 'category' && <><p className="modal-hint">Choose an award for this pandal. You can vote once in each category.</p><div className="modal-categories">{CATEGORIES.map(c => <button key={c.id} onClick={() => { setCategory(c); setError(''); setStep('auth'); }} className={category?.id === c.id ? `selected ${c.tone}` : c.tone}><c.icon size={18}/><span><b>{c.title}</b><small>{c.subtitle}</small></span>{category?.id === c.id && <Check size={16}/>}</button>)}</div></>}
      {step === 'auth' && <><p className="modal-hint">Voting for <b>{category?.title}</b>. Continue with Google or enter your Indian mobile number.</p><div className="auth-options"><button className={identityType === 'phone' ? 'auth-option active-auth' : 'auth-option'} onClick={() => { setIdentityType('phone'); setError(''); }}><span className="phone-icon">+91</span>Mobile number</button><button className={identityType === 'google' ? 'auth-option active-auth' : 'auth-option'} onClick={selectGoogle}><span className="google-g">G</span>Google</button></div>{identityType === 'phone' ? <label className="phone-field"><span>INDIAN MOBILE NUMBER</span><div><b>+91</b><input inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d\s-]/g, '').slice(0, 14))}/></div></label> : <div className="google-login-panel"><div ref={googleButtonRef} className="google-button-slot"/><p className="google-note">{googleEmail ? <>Signed in as <strong>{googleEmail}</strong></> : idToken ? 'Google account connected.' : !GOOGLE_CLIENT_ID ? 'Google sign-in is not configured. Use your mobile number instead.' : googleLoadFailed ? 'Google sign-in could not load. Check your connection or use your mobile number.' : !googleReady ? 'Loading secure Google sign-in…' : 'Choose your Google account to continue.'}</p></div>}<div className="vote-duplicate-warning" role="note"><strong>VOTE INTEGRITY NOTICE</strong><span>Duplicate or fake votes may be removed at the site owners’ discretion. Fake votes will not be counted.</span></div><label className="rules-check"><input type="checkbox" checked={rulesAccepted} onChange={e => setRulesAccepted(e.target.checked)}/><span>I confirm this is my vote and accept one vote per category.</span></label><div className="modal-actions"><button className="back-button" onClick={() => setStep('pandal')}><ArrowLeft size={15}/> Change pandal</button><button className={busy ? 'button button-dark submitting' : 'button button-dark'} aria-busy={busy} disabled={busy || !rulesAccepted || identityType === 'phone' && phone.replace(/\D/g, '').length < 10 || identityType === 'google' && !idToken} onClick={submit}>{busy ? <><span className="button-spinner"/>{locationBusy ? 'Waiting for location permission…' : 'Submitting vote…'}</> : <>Cast my vote <Check size={16}/></>}</button></div></>}
      {error && <p className={/^Your vote was rejected because duplicate voting/.test(error) ? 'form-error form-error-loud' : 'form-error'} role="alert">{error}</p>}</>}</section></div>}
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
