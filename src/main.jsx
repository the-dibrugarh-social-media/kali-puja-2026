import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown, Compass, MapPin, Menu, Search, Trophy, X } from 'lucide-react';
import './styles.css';

const EVENT_ID = 'kali-puja-2026';
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
const PUJA_FACTS = [
  'Kali Puja is also known as Shyama Puja.',
  'It is observed on Kartik Amavasya, the new-moon night.',
  'Red hibiscus is a familiar offering to Maa Kali.',
  'Pandal artistry, lamps and shared prayer bring the night to life.',
  'The observance often falls on the same night as Diwali.',
  'Midnight is a sacred hour for Kali Puja prayers.',
  'Some communities keep vigil in prayer through the night.',
  'Idol immersion can mark the close of the celebrations.',
];
const CATEGORIES = [
  { id: 'best_pandal', title: 'Best Pandal', subtitle: 'Architecture · imagination · craft', icon: PandalMark, tone: 'gold', description: 'For the pandal that transforms a place into a world of its own.' },
  { id: 'best_puja', title: 'Best Puja', subtitle: 'Tradition · welcome · atmosphere', icon: PujaMark, tone: 'red', description: 'For the puja that brings the community together with warmth and care.' },
  { id: 'best_theme', title: 'Best Theme', subtitle: 'Concept · storytelling · imagination', icon: ThemeMark, tone: 'blue', description: 'For the pandal theme that brings a story to life through imagination and craft.' },
];
const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';
const INSTAGRAM_URL = 'https://www.instagram.com/the_dibrugarh/?utm_source=ig_web_button_share_sheet&obrf=ZDNlZDc0MzIxNw==';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '225466365069-19p02tbr3h2mkfiu3d9rjc18bdm4k86l.apps.googleusercontent.com';
const FESTIVAL_PHOTO = 'https://images.unsplash.com/photo-1760857292318-2b6398e2fc85?auto=format&fit=crop&w=3840&h=2160&q=85';
const DIYA_PHOTO = 'https://images.unsplash.com/photo-1605292356183-a77d0a9c9d1d?auto=format&fit=crop&w=1800&h=1200&q=82';
const PUJA_PHOTOS = [
  { src: DIYA_PHOTO, alt: 'A diya flame glowing in the dark' },
  { src: 'https://images.unsplash.com/photo-1669393969283-1aaeebfc2ea2?auto=format&fit=crop&w=1800&h=1200&q=82', alt: 'A lit clay diya surrounded by warm festival lights' },
  { src: 'https://images.unsplash.com/photo-1606285461069-80ba562575dd?auto=format&fit=crop&w=1800&h=1200&q=82', alt: 'Rows of glowing diyas on a dark surface' },
];
function pandalDisplayName(name) {
  const value = String(name || '');
  const sample = /^TEST ONLY\s*[—–-]\s*(.+)$/i.exec(value);
  return { name: sample ? sample[1] : value, isSample: Boolean(sample) };
}
function formatIndianPhone(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : '+91 ' + value;
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
  return { imageBase64: String(dataUrl).split(',')[1], imageMimeType: file.type, imageFileName: file.name };
}

function App() {
  const siteBasePath = BASE_URL.replace(/\/+$/, '');
  const currentPath = window.location.pathname.replace(/\/+$/, '') || '/';
  const isAdminRoute = currentPath === '/admin' || currentPath === `${siteBasePath}/admin`;
  const [pandals, setPandals] = useState([]), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState(''), [area, setArea] = useState('All areas'), [section, setSection] = useState('discover'), [mobileOpen, setMobileOpen] = useState(false);
  const [selected, setSelected] = useState(null), [category, setCategory] = useState(null), [step, setStep] = useState('category'), [identityType, setIdentityType] = useState('phone'), [phone, setPhone] = useState(''), [idToken, setIdToken] = useState(''), [rulesAccepted, setRulesAccepted] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false);
  const [leaderboard, setLeaderboard] = useState({}), [resultsUnavailable, setResultsUnavailable] = useState(false);
  const [factIndex, setFactIndex] = useState(0), [photoIndex, setPhotoIndex] = useState(0);
  const [adminKey, setAdminKey] = useState(''), [adminUnlocked, setAdminUnlocked] = useState(false), [adminPandals, setAdminPandals] = useState([]);
  const [adminBusy, setAdminBusy] = useState(false), [adminError, setAdminError] = useState(''), [adminNotice, setAdminNotice] = useState('');
  const [adminName, setAdminName] = useState(''), [adminArea, setAdminArea] = useState(''), [adminImageFile, setAdminImageFile] = useState(null);
  const [locationChoice, setLocationChoice] = useState('undecided'), [gpsLocation, setGpsLocation] = useState(null), [locationBusy, setLocationBusy] = useState(false);

  async function refresh() {
    setLoading(true); setLoadError('');
    try { const data = await apiGet({ pandals: '1', eventId: EVENT_ID }); if (data.status !== 'success') throw new Error(data.message || 'Could not load pandals.'); setPandals((data.pandals || []).filter(p => p.active)); }
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
    if (!selected) return undefined;
    const handleEscape = event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (busy) return;
      setSelected(null);
      setCategory(null);
      setError('');
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [selected, busy]);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible')); return; }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setFactIndex(index => (index + 1) % PUJA_FACTS.length), 4500);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setPhotoIndex(index => (index + 1) % PUJA_PHOTOS.length), 6000);
    return () => window.clearInterval(timer);
  }, []);
  const areas = useMemo(() => ['All areas', ...new Set(pandals.map(p => p.area).filter(Boolean))], [pandals]);
  const filtered = useMemo(() => { const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean); return pandals.filter(p => (area === 'All areas' || p.area === area) && terms.every(t => `${p.name} ${p.area} ${p.keywords || ''}`.toLowerCase().includes(t))); }, [pandals, query, area]);
  const selectedDisplay = pandalDisplayName(selected?.name);
  const selectedArea = selected?.area ? (/dibrugarh/i.test(selected.area) ? selected.area : `Dibrugarh · ${selected.area}`) : 'Dibrugarh';
  const goTo = id => { setSection(id); setMobileOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };
  const openVote = p => { setSelected(p); setCategory(null); setStep('category'); setDone(false); setRulesAccepted(false); setLocationChoice('undecided'); setGpsLocation(null); setLocationBusy(false); setError(''); };
  const closeVote = () => { setSelected(null); setCategory(null); setError(''); };
  const startGoogle = () => {
    setIdentityType('google'); setError('');
    if (!GOOGLE_CLIENT_ID) { setError('Google sign-in needs the configured client ID. You can use mobile number instead.'); return; }
    if (!window.google?.accounts?.id) { setError('Google sign-in is still loading. Please try again in a moment.'); return; }
    window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: response => { setIdToken(response.credential); setStep('auth'); } });
    window.google.accounts.id.prompt();
  };
  useEffect(() => { const script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; document.head.appendChild(script); return () => script.remove(); }, []);
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
      if (data.status === 'success') setDone(true);
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
    setAdminPandals(data.pandals || []);
    return data.pandals || [];
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
      {isAdminRoute ? <a className="nav-cta admin-back" href={BASE_URL}>Back to festival <ArrowRight size={15}/></a> : <><nav className={mobileOpen ? 'nav open' : 'nav'}><button onClick={() => goTo('discover')}>Discover pandals</button><button onClick={() => goTo('results')}>Awards & leaderboard</button><button onClick={() => goTo('about')}>About Kali Puja</button><button className="nav-cta" onClick={() => goTo('discover')}>Search pandals <ArrowRight size={15}/></button></nav>
      <button className="menu-toggle" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X/> : <Menu/>}</button></>}
    </header>
    <main id={isAdminRoute ? 'admin-page' : 'top'}>
      {!isAdminRoute && <>
      <section className="hero">
        <div className="hero-art" aria-hidden="true"><img className="hero-photo" src={FESTIVAL_PHOTO} alt="" fetchPriority="high"/><div className="sun-ring ring-one"/><div className="sun-ring ring-two"/><svg className="mandala" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><circle cx="100" cy="100" r="86"/><circle cx="100" cy="100" r="62"/><circle cx="100" cy="100" r="18"/><path d="M100 14v68m0 36v68M14 100h68m36 0h68M39.2 39.2 87.3 87.3m25.4 25.4 48.1 48.1m0-121.6-48.1 48.1M87.3 112.7l-48.1 48.1"/><path d="m100 38 10 52 52 10-52 10-10 52-10-52-52-10 52-10z"/></svg><span className="ember e1"/><span className="ember e2"/><span className="ember e3"/><span className="ember e4"/></div>
        <div className="hero-copy"><p className="eyebrow hero-presenter"><span/> KALI PUJA · DIBRUGARH 2026 <span/></p><h1 className="hero-brand-title">The_Dibrugarh</h1><p className="hero-event-title">Kali Puja Awards <em>2026</em></p><p className="hero-text">Celebrating Dibrugarh’s pandals, puja traditions and creative themes. Explore the entries and cast your vote.</p><div className="hero-actions"><button className="button button-gold" onClick={() => goTo('discover')}>Explore pandals <ArrowRight size={17}/></button><button className="text-link" onClick={() => goTo('about')}>About the Puja <ArrowDown size={15}/></button></div><div className="hero-meta"><span className="meta-line"/> Kartik Amavasya · Night worship · Community pandals</div></div>
        <div className="hero-seal"><span className="seal-top">KARTIK AMAVASYA</span><span className="seal-symbol">ॐ</span><span className="seal-bottom">KALI PUJA</span></div>
        <div className="hero-bottom"><span>01 — THE FESTIVAL</span><span>SCROLL TO DISCOVER <ChevronDown size={13}/></span></div>
      </section>
      <div className="city-ribbon" aria-label="Choose a category and cast your vote"><div className="ribbon-track"><div className="ribbon-group" aria-hidden="true"><span>BEST PANDAL · BEST PUJA · BEST THEME</span><i>✳︎</i><span>CAST YOUR VOTE</span><i>✳︎</i><span>ONE VOTE IN EACH CATEGORY</span><i>✳︎</i><span>FIND A PANDAL IN DIBRUGARH</span><i>✳︎</i></div><div className="ribbon-group" aria-hidden="true"><span>BEST PANDAL · BEST PUJA · BEST THEME</span><i>✳︎</i><span>CAST YOUR VOTE</span><i>✳︎</i><span>ONE VOTE IN EACH CATEGORY</span><i>✳︎</i><span>FIND A PANDAL IN DIBRUGARH</span><i>✳︎</i></div></div></div>
      <section className="discover section-pad reveal" id="discover"><div className="section-kicker"><span>FIND YOUR FESTIVAL</span><span>02 / 05</span></div><div className="discover-heading"><div><p className="eyebrow dark-eyebrow">YOUR LOCAL PUJA TRAIL</p><h2>Find a <em>pandal.</em></h2></div><p>Search by pandal or locality.<br/>Choose a favourite and cast your vote.</p></div>
        <div className="search-row"><label className="searchbox"><Search size={19}/><input aria-label="Search pandals" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search pandal name or locality"/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={16}/></button>}</label><label className="area-select"><MapPin size={16}/><select aria-label="Filter by area" value={area} onChange={e => setArea(e.target.value)}>{areas.map(a => <option key={a}>{a}</option>)}</select><ChevronDown size={15}/></label></div>
        {loading ? <div className="state-panel"><span className="spinner"/><p>Finding the city’s pandals…</p></div> : loadError ? <div className="state-panel error-panel"><Compass size={25}/><h3>Live pandal list not connected</h3><p>{loadError}</p><button className="button button-dark" onClick={refresh}>Try again <ArrowRight size={16}/></button></div> : filtered.length === 0 ? <div className="state-panel"><Compass size={26}/><h3>{query ? 'No pandals match that search.' : 'Pandal listings are on their way.'}</h3><p>{query ? 'Try another name or area.' : 'There are no active Kali Puja entries in the live list yet.'}</p>{query && <button className="text-link dark-link" onClick={() => { setQuery(''); setArea('All areas'); }}>Clear search <X size={14}/></button>}</div> : <div className="pandal-grid">{filtered.map((p, i) => <article className="pandal-card" key={p.id} role="button" tabIndex={0} aria-label={`Open voting for ${p.name}`} onClick={() => openVote(p)} onKeyDown={e => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openVote(p); } }}><div className="pandal-image">{p.img ? <img src={p.img} alt={p.name} loading="lazy"/> : <div className={`image-fallback fallback-${i % 3}`}><img className="pandal-placeholder-art" src={`${BASE_URL}kali-maa-face.jpeg`} alt={`Close crop of Maa Kali’s face from the supplied painting for ${p.name}`} loading="lazy"/></div>}<span className="pandal-no">{String(i + 1).padStart(2, '0')}</span></div><div className="pandal-info"><div><h3>{p.name}</h3><p><MapPin size={13}/>{p.area || 'Dibrugarh'}</p></div><span className="pandal-card-arrow" aria-hidden="true"><ArrowRight size={17}/></span></div></article>)}</div>}
      </section>
      <section className="leaderboard section-pad reveal" id="results"><div className="section-kicker"><span>THE PEOPLE’S CHOICE</span><span>03 / 05 · TOP FIVE · LIVE LEADERBOARD</span></div><div className="section-heading"><h2 className="leaderboard-title">Celebrating<br/><em>devotion.</em></h2><p className="leaderboard-description"><strong>TOP 5 · THREE AWARDS</strong><br/>Every vote celebrates the people behind the puja.</p></div><div className="leader-tabs">{CATEGORIES.map(c => { const ranked = Object.entries(leaderboard[c.id] || {}).sort((a, b) => b[1] - a[1]).slice(0, 5); return <div key={c.id}><span>{c.title}</span>{resultsUnavailable ? <strong>Live results are not connected yet</strong> : ranked.length ? <ol className="rank-list">{ranked.map(([id, count], index) => { const entry = pandals.find(p => String(p.id) === String(id)); return <li key={id}><i>{String(index + 1).padStart(2, '0')}</i><div className="rank-entry"><b>{entry?.name || 'Pandal'}</b><small><MapPin size={12}/>{entry?.address || entry?.locality || entry?.area || 'Dibrugarh'}</small></div><strong>{count} {count === 1 ? 'vote' : 'votes'}</strong></li>; })}</ol> : <strong className="rank-empty">No votes recorded yet</strong>}</div>; })}</div></section>
      <section className="instagram-spotlight section-pad reveal" id="the-dibrugarh"><div className="instagram-spotlight-copy"><p className="eyebrow"><span/> THE CITY BEYOND THE PANDALS <span/></p><h2>Keep celebrating<br/><em>Dibrugarh.</em></h2><p>Local stories, celebrations and everyday moments from the city.</p></div><a className="instagram-visit" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Visit the_dibrugarh on Instagram"><svg className="instagram-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true"><defs><linearGradient id="instagram-logo-gradient" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse"><stop stopColor="#FFB347"/><stop offset=".48" stopColor="#F13B76"/><stop offset="1" stopColor="#8B43D5"/></linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="5" stroke="url(#instagram-logo-gradient)" strokeWidth="2"/><circle cx="12" cy="12" r="4" stroke="url(#instagram-logo-gradient)" strokeWidth="2"/><circle cx="17.6" cy="6.6" r="1.15" fill="url(#instagram-logo-gradient)"/></svg><span className="instagram-handle">the_dibrugarh</span><ArrowRight size={20}/></a></section>
      <section className="intro section-pad reveal" id="about"><div className="section-kicker"><span>THE NIGHT OF MA KALI · FESTIVAL FACTS</span><span>05 / 05</span></div><div className="intro-grid"><h2>On the new moon,<br/><em>lamps awaken.</em></h2><div><p className="intro-body">On Kartik Amavasya, communities gather to honour Maa Kali. Explore the pandals, artistry and traditions that bring this sacred night to life in Dibrugarh.</p><div className="fact-card" aria-live="polite"><div className="fact-card-label"><span>PUJA FACTS</span><span>{String(factIndex + 1).padStart(2, '0')} / {String(PUJA_FACTS.length).padStart(2, '0')}</span></div><p key={factIndex} className="fact-card-text">{PUJA_FACTS[factIndex]}</p><div className="fact-progress" aria-hidden="true">{PUJA_FACTS.map((_, i) => <span key={i} className={i === factIndex ? 'active' : ''}/>)}</div></div><p className="intro-note">Red hibiscus and lamps are among familiar offerings; customs differ across communities. <a className="tradition-link" href="https://www.incredibleindia.gov.in/en/festivals-and-events/kali-puja" target="_blank" rel="noreferrer">Explore the tradition <ArrowRight size={13}/></a></p><figure className="intro-photo" aria-label="Festival lights"><div className="intro-photo-stack">{PUJA_PHOTOS.map((photo, i) => <img key={photo.src} className={i === photoIndex ? 'active' : ''} src={photo.src} alt={photo.alt} loading="lazy"/>)}</div><div className="photo-caption"><span>LIGHTS OF KALI PUJA</span><span>{String(photoIndex + 1).padStart(2, '0')} / {String(PUJA_PHOTOS.length).padStart(2, '0')}</span></div><button className="photo-prev" aria-label="Previous festival photo" onClick={() => setPhotoIndex(i => (i + PUJA_PHOTOS.length - 1) % PUJA_PHOTOS.length)}><ArrowLeft size={14}/></button><button className="photo-next" aria-label="Next festival photo" onClick={() => setPhotoIndex(i => (i + 1) % PUJA_PHOTOS.length)}><ArrowRight size={14}/></button></figure></div></div></section>
      </>}
      {isAdminRoute && <section className="admin section-pad" id="admin"><div className="section-kicker"><span>ORGANIZER ACCESS</span><span>PRIVATE TOOLS</span></div><div className="admin-heading"><div><p className="eyebrow dark-eyebrow">THE DIBRUGARH · ADMIN</p><h2>Manage your<br/><em>pandal list.</em></h2></div><p>Add entries, create clearly marked demo pandals, or deactivate listings after the event.</p></div>
        {!adminUnlocked ? <form className="admin-gate" onSubmit={unlockAdmin}><label htmlFor="admin-key">ADMIN PASSWORD</label><div className="admin-key-row"><input id="admin-key" type="password" autoComplete="current-password" value={adminKey} onChange={e => setAdminKey(e.target.value)} placeholder="Enter admin password"/><button className="button button-gold" disabled={!adminKey.trim() || adminBusy}>{adminBusy ? 'Checking…' : 'Unlock admin'} <ArrowRight size={15}/></button></div><p>Your password stays in this tab’s memory and is sent securely to the voting service. It is not saved in the site.</p></form> : <><div className="admin-toolbar"><button className="admin-lock" onClick={lockAdmin}>Lock admin</button></div><div className="admin-grid"><form className="admin-form" onSubmit={submitPandal}><h3>Add a pandal</h3><label>PANDAL NAME<input required maxLength={100} value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Community pandal name"/></label><label>AREA<input maxLength={100} value={adminArea} onChange={e => setAdminArea(e.target.value)} placeholder="Locality in Dibrugarh"/></label><label>UPLOAD IMAGE TO DRIVE <span>OPTIONAL</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setAdminImageFile(e.target.files?.[0] || null)}/><small className="upload-help">JPG, PNG or WebP · Up to 5 MB · Saved in your Google Drive pandal folder</small></label><button className="button button-gold" disabled={adminBusy || !adminName.trim()}>{adminBusy ? 'Saving…' : 'Add to live list'} <ArrowRight size={15}/></button></form><div className="admin-demo"><span className="admin-label">SAFE TEST LABELS</span><h3>Need to test voting?</h3><p>Add two entries named “TEST ONLY” to the live list. They will be visible to visitors; deactivate them when you’re done. Any test votes remain in the results until you remove them from the Votes sheet.</p><button className="button button-outline" disabled={adminBusy} onClick={createDemoPandals}>{adminBusy ? 'Working…' : 'Create 2 demo pandals'} <ArrowRight size={15}/></button></div></div><div className="admin-list"><div className="admin-list-heading"><h3>Event pandals</h3><span>{adminPandals.length} LISTINGS</span></div>{adminPandals.length ? adminPandals.map(p => <div className="admin-row" key={p.id}><div><strong>{p.name}</strong><span>{p.area || 'Dibrugarh'} · ID {p.id}</span></div><span className={p.active ? 'admin-status active' : 'admin-status'}>{p.active ? 'ACTIVE' : 'INACTIVE'}</span><button className={`admin-toggle ${p.active ? 'deactivate' : 'reactivate'}`} disabled={adminBusy} onClick={() => runAdminAction({ action: 'setPandalActive', id: p.id, active: !p.active }, p.active ? `${p.name} deactivated.` : `${p.name} reactivated.`)}>{p.active ? 'Deactivate' : 'Reactivate'}</button></div>) : <p className="admin-empty">No Kali Puja pandals are listed yet.</p>}</div></>}
        {adminError && <p className="admin-feedback error" role="alert">{adminError}</p>}{adminNotice && <p className="admin-feedback" role="status">{adminNotice}</p>}
      </section>}
      {!isAdminRoute && <footer className="footer"><div className="footer-brand"><img src={`${BASE_URL}dibrugarh-logo.png`} alt="The Dibrugarh"/><span>KALI PUJA <i>2026</i></span></div><p>A night of devotion.<br/>A celebration shared.</p><div className="footer-bottom"><span>© 2026 The Dibrugarh · Festival experience</span><button onClick={() => goTo('top')}>Back to top ↑</button></div></footer>}
    </main>
    {selected && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) closeVote(); }}><section className="vote-modal" role="dialog" aria-modal="true" aria-labelledby="vote-title"><button className="modal-close" onClick={closeVote} aria-label="Close"><X/></button>{done ? <div className="success-view" role="status" aria-live="polite"><div className="success-mark"><Check size={32}/></div><p className="eyebrow dark-eyebrow">YOUR VOICE IS COUNTED</p><h2>Thank you for<br/><em>celebrating.</em></h2><p>Your <b>{category.title}</b> vote for <b>{selectedDisplay.name}</b> is now part of Dibrugarh’s celebration.</p><button className="button button-dark" onClick={closeVote}>Back to the city <ArrowRight size={16}/></button></div> : <><div className="modal-progress"><span className={step === 'category' ? 'active' : 'complete'}/><span className={step === 'auth' ? 'active' : ''}/></div><div className="modal-step-caption"><span>0{step === 'category' ? 1 : 2} / 02</span><span>{step === 'category' ? 'CHOOSE AN AWARD' : 'YOUR VOTER DETAILS'}</span></div><p className="eyebrow dark-eyebrow">CAST YOUR VOTE · DIBRUGARH</p><h2 id="vote-title">{step === 'category' ? 'Choose an' : 'Cast your'}<br/><em>{step === 'category' ? 'award.' : 'vote.'}</em></h2><div className="selected-pandal"><span>{selectedDisplay.isSample ? 'SAMPLE PANDAL' : 'YOUR SELECTED PANDAL'}</span><strong>{selectedDisplay.name}</strong><small><MapPin size={12}/>{selectedArea}</small></div>
      {step === 'category' && <><p className="modal-hint">Choose an award for this pandal. You can vote once in each category.</p><div className="modal-categories">{CATEGORIES.map(c => <button key={c.id} onClick={() => { setCategory(c); setError(''); setStep('auth'); }} className={category?.id === c.id ? `selected ${c.tone}` : c.tone}><c.icon size={18}/><span><b>{c.title}</b><small>{c.subtitle}</small></span>{category?.id === c.id && <Check size={16}/>}</button>)}</div></>}
      {step === 'auth' && <><p className="modal-hint">Voting for <b>{category?.title}</b>. Continue with Google or enter your Indian mobile number.</p><div className="auth-options"><button className={identityType === 'phone' ? 'auth-option active-auth' : 'auth-option'} onClick={() => { setIdentityType('phone'); setError(''); }}><span className="phone-icon">+91</span>Mobile number</button><button className={identityType === 'google' ? 'auth-option active-auth' : 'auth-option'} onClick={startGoogle}><span className="google-g">G</span>Google</button></div>{identityType === 'phone' ? <label className="phone-field"><span>INDIAN MOBILE NUMBER</span><div><b>+91</b><input inputMode="tel" autoComplete="tel-national" placeholder="98765 43210" value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d\s-]/g, '').slice(0, 14))}/></div></label> : <p className="google-note">Complete Google’s secure sign-in prompt to continue.</p>}<div className="vote-duplicate-warning" role="note"><strong>VOTE INTEGRITY NOTICE</strong><span>Duplicate or fake votes may be removed at the site owners’ discretion. Fake votes will not be counted.</span></div><label className="rules-check"><input type="checkbox" checked={rulesAccepted} onChange={e => setRulesAccepted(e.target.checked)}/><span>I confirm this is my vote and accept one vote per category.</span></label><div className="modal-actions"><button className="back-button" onClick={() => setStep('category')}><ArrowLeft size={15}/> Awards</button><button className={busy ? 'button button-dark submitting' : 'button button-dark'} aria-busy={busy} disabled={busy || !rulesAccepted || identityType === 'phone' && phone.replace(/\D/g, '').length < 10 || identityType === 'google' && !idToken} onClick={submit}>{busy ? <><span className="button-spinner"/>{locationBusy ? 'Waiting for location permission…' : 'Submitting vote…'}</> : <>Cast my vote <Check size={16}/></>}</button></div></>}
      {error && <p className={/^Your vote was rejected because duplicate voting/.test(error) ? 'form-error form-error-loud' : 'form-error'} role="alert">{error}</p>}</>}</section></div>}
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
