<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
    <title>BrewKeeper</title>
    
    <!-- 1. STYLES (Inline to prevent loading errors) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      :root{ --color-coffee-primary: #6F4E37; --color-coffee-dark: #4B3621; --color-grey-dark: #0f1720; --color-grey-medium: #374151; --color-grey-border: #4B5563; }
      body{ background-color: #0f1720; margin:0; font-family: sans-serif; color: white; -webkit-tap-highlight-color: transparent; }
      #root { width: 100%; min-height: 100vh; }

      /* Safe Mode UI (Plain HTML) */
      #safe-mode {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: #0f1720; z-index: 100;
        transition: opacity 0.5s;
      }
      .safe-card { background: #374151; padding: 2rem; border-radius: 1rem; border: 1px solid #4B5563; max-width: 90%; width: 400px; text-align: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5); }
      .safe-input { width: 100%; padding: 1rem; margin: 1rem 0; border-radius: 0.75rem; background: #1f2937; border: 1px solid #4B5563; color: white; font-size: 1rem; box-sizing: border-box; }
      .safe-btn { background: #6F4E37; color: white; width: 100%; padding: 1rem; border-radius: 0.75rem; border: none; font-size: 1rem; font-weight: bold; cursor: pointer; }
      .safe-btn:disabled { opacity: 0.7; cursor: not-allowed; }
      
      /* React App UI */
      .spinner { 
        border: 4px solid #333; border-top: 4px solid #6F4E37; border-radius: 50%; 
        width: 40px !important; height: 40px !important; 
        animation: spin 1s linear infinite; margin-bottom: 20px; 
      }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      
      .stamp-filled{ background-color:var(--color-coffee-primary) !important; color:#fff !important; border:2px solid var(--color-coffee-dark) !important; }
      .stamp-empty{ background-color:var(--color-grey-medium) !important; color:#9ca3af !important; border:2px solid var(--color-grey-border) !important; }
      
      .activity-payment { color: #34D399; }
      .activity-credit { color: #60A5FA; }
      .activity-redeem { color: #C084FC; }
      .activity-stamp { color: #FBBF24; }
      .amount { color: #d1d5db; font-weight: 800; }
    </style>

    <!-- 2. ROBUST LIBRARIES (jsDelivr) -->
    <script crossorigin src="https://cdn.jsdelivr.net/npm/react@17/umd/react.production.min.js"></script>
    <script crossorigin src="https://cdn.jsdelivr.net/npm/react-dom@17/umd/react-dom.production.min.js"></script>
    <script crossorigin src="https://cdn.jsdelivr.net/npm/@babel/standalone/babel.min.js"></script>
  </head>

  <body>
    
    <!-- SAFE MODE SCREEN (Visible by default, hidden by React if successful) -->
    <div id="safe-mode">
      <div id="safe-content">
        <div class="spinner"></div>
        <p id="safe-status" style="color: #9ca3af; margin-top: 10px;">Loading App...</p>
      </div>
    </div>

    <div id="root"></div>

    <!-- 3. SAFE MODE LOGIC (Plain JS) -->
    <script>
      // If React fails to load in 3 seconds, show manual connect screen
      setTimeout(function() {
        var root = document.getElementById('root');
        if (!root || root.innerHTML === "") {
          showSafeConnect("App took too long to load. Manual Connect:");
        }
      }, 3000);

      function showSafeConnect(msg) {
        var content = document.getElementById('safe-content');
        if(!content) return;
        var existingUrl = localStorage.getItem('https://script.google.com/macros/s/AKfycbyVjrZvU0UNm3zDYKQ-gHblyB7cVx3W8sG7N3dq1W7xPivtw8x7mYUbh9Hbt1-Pxyw9sA/exec') || '';
        
        content.innerHTML = `
          <div class="safe-card">
            <h1 style="font-size: 1.5rem; font-weight: bold; color: white; margin-bottom: 0.5rem;">BrewKeeper</h1>
            <p style="color: #9ca3af; font-size: 0.9rem; margin-bottom: 1rem;">${msg}</p>
            <input id="manual-url" class="safe-input" placeholder="Paste Google Script URL here..." value="${existingUrl}">
            <button onclick="manualSave()" class="safe-btn">Connect & Reload</button>
          </div>
        `;
      }

      function manualSave() {
        var url = document.getElementById('manual-url').value.trim();
        if(!url) return alert("Please enter the URL");
        localStorage.setItem('https://script.google.com/macros/s/AKfycbyVjrZvU0UNm3zDYKQ-gHblyB7cVx3W8sG7N3dq1W7xPivtw8x7mYUbh9Hbt1-Pxyw9sA/exec', url);
        window.location.reload();
      }

      // Check for errors globally
      window.onerror = function(msg) {
        showSafeConnect("Error detected: " + msg);
      };
    </script>

    <!-- 4. REACT APP LOGIC -->
    <script type="text/babel">
      // Verify React loaded
      if (!window.React || !window.ReactDOM) {
        document.getElementById('safe-status').innerText = "React failed to load. Checking connection...";
        throw new Error("React Library Missing");
      }

      const { useState, useEffect } = React;
      const FREE_ITEM_THRESHOLD = 9;
      const EARLY_REDEMPTION_THRESHOLD = 8;
      const LS_KEY = 'https://script.google.com/macros/s/AKfycbyVjrZvU0UNm3zDYKQ-gHblyB7cVx3W8sG7N3dq1W7xPivtw8x7mYUbh9Hbt1-Pxyw9sA/exec';

      // --- MAIN APP COMPONENT ---
      function App() {
        const [connected, setConnected] = useState(false);
        const [customers, setCustomers] = useState([]);
        const [loading, setLoading] = useState(false);
        const [view, setView] = useState('list');
        const [activeId, setActiveId] = useState(null);
        const [searchQuery, setSearchQuery] = useState('');
        
        // Forms
        const [newName, setNewName] = useState('');
        const [amount, setAmount] = useState('');
        const [histDate, setHistDate] = useState('');
        const [delId, setDelId] = useState(null);

        // ON MOUNT: Hide Safe Mode & Check Connection
        useEffect(() => {
          const safeMode = document.getElementById('safe-mode');
          if (safeMode) safeMode.style.display = 'none'; // React took over!

          const savedUrl = localStorage.getItem(LS_KEY);
          if (savedUrl) {
            setConnected(true);
            loadData(savedUrl);
          } else {
            // If no URL, we let the SetupScreen render
          }
        }, []);

        const getUrl = () => localStorage.getItem(LS_KEY);

        const apiCall = async (payload = null, overrideUrl = null) => {
          const url = overrideUrl || getUrl();
          if(!url) throw new Error("Missing URL");
          const options = payload ? { method: 'POST', body: JSON.stringify(payload), headers: {"Content-Type":"text/plain"} } : { method: 'GET' };
          const res = await fetch(url, options);
          if(!res.ok) throw new Error("Network Error");
          const json = await res.json();
          if(json.status === 'error') throw new Error(json.message);
          return json.data;
        };

        const loadData = async (url) => {
          setLoading(true);
          try {
            const data = await apiCall(null, url);
            setCustomers(data || []);
          } catch(e) {
            console.error(e);
            if(confirm("Connection failed. Re-enter URL?")) {
              disconnect();
            }
          } finally {
            setLoading(false);
          }
        };

        const disconnect = () => { localStorage.removeItem(LS_KEY); setConnected(false); setCustomers([]); };

        // --- RENDER HELPERS ---
        const Icon = ({ name, size=24, className='' }) => {
            const icons = {
              coffee: <path d="M17 8h1a4 4 0 1 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-3-4Z M6 1v3 M10 1v3 M14 1v3"/>,
              creditCard: <><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></>,
              plus: <path d="M5 12h14M12 5v14" />,
              minus: <path d="M5 12h14" />,
              chevronLeft: <path d="m15 18-6-6 6-6" />,
              search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
              trash2: <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />,
              gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 4 12 8 12 8s1-4 4.5-4a2.5 2.5 0 0 1 0 5" /><path d="M12 12h.01" /></>,
              wallet: <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></>,
              star: <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />,
              refresh: <path d="M23 4v6h-6M1 20v-6h6" />,
              logOut: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />,
              alertCircle: <><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></>
            };
            return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{icons[name] || <circle cx="12" cy="12" r="10" />}</svg>;
        };

        const Button = ({ children, onClick, variant='primary', className='', disabled=false }) => {
            const base = "px-4 py-3 rounded-xl font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm touch-manipulation";
            const styles = { primary: `bg-[var(--color-coffee-primary)] text-white hover:bg-[var(--color-coffee-dark)]`, secondary: `bg-[var(--color-grey-medium)] text-white border border-[var(--color-grey-border)] hover:bg-stone-600` };
            return <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant] || styles.secondary} ${className}`}>{children}</button>;
        };
        const Card = ({ children, className='' }) => <div className={`bg-[var(--color-grey-medium)] rounded-2xl shadow-lg border border-[var(--color-grey-border)] ${className}`}>{children}</div>;
        const formatDateTime = (iso) => { try { if(!iso) return ''; const d = new Date(iso); return `${d.toLocaleDateString('en-US', {month:'short',day:'numeric'})} ${d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`; } catch(e) { return ''; } };

        // --- ACTIONS ---
        const doAction = async (action, payload={}) => {
          setLoading(true);
          try {
            const newData = await apiCall({ action, ...payload });
            if(newData) { setCustomers(newData); return true; }
          } catch(e) { alert("Error: " + e.message); } finally { setLoading(false); }
          return false;
        };

        // --- SETUP SCREEN ---
        if(!connected) {
          return (
            <div className="min-h-screen flex items-center justify-center p-6">
              <div className="w-full max-w-md space-y-6">
                <div className="text-center">
                   <div className="w-20 h-20 bg-[var(--color-coffee-primary)] rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-xl"><Icon name="coffee" size={40} className="text-white" /></div>
                   <h1 className="text-3xl font-bold text-white">BrewKeeper</h1>
                   <p className="text-gray-400 mt-2">Connect Database</p>
                </div>
                <Card className="p-6">
                   <form onSubmit={(e) => {
                      e.preventDefault();
                      const url = e.target.url.value.trim();
                      if(!url) return;
                      localStorage.setItem(LS_KEY, url);
                      setConnected(true);
                      loadData(url);
                   }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Google Script URL</label>
                        <input name="url" defaultValue={localStorage.getItem(LS_KEY)||''} placeholder="https://script.google.com/.../exec" className="w-full p-4 bg-stone-800 text-white rounded-xl outline-none border border-stone-700 focus:border-[var(--color-coffee-primary)]" />
                      </div>
                      <Button type="submit" variant="primary" className="w-full">Connect</Button>
                   </form>
                </Card>
              </div>
            </div>
          );
        }

        // --- APP SCREENS ---
        const getActive = () => customers.find(c => String(c.id) === String(activeId));

        const handleAdd = async (e) => {
             e.preventDefault(); if(!newName.trim()) return;
             const nc = { id: 'id-'+Date.now(), name:newName.trim(), credit:0, stamps:0, skipNextStamp:false, history:[], createdAt:new Date().toISOString() };
             if(await doAction('add', { data: nc })) { setNewName(''); setActiveId(nc.id); setView('detail'); }
        };

        const handleTx = async (type) => { 
              const c = getActive(); if(!c) return;
              const val = Number(amount);
              let updates = {};
              let entry = { id: Date.now(), date: new Date().toISOString() };
              if(type === 'credit') { if(val <= 0) return; updates = { credit: c.credit + val }; entry = { ...entry, type: 'purchase', subType: 'credit', description: 'Credit Added', amount: val }; } 
              else if(type === 'payment') { if(val <= 0) return; updates = { credit: c.credit - val }; entry = { ...entry, type: 'payment', description: 'Cash Received', amount: -val }; } 
              else if(type === 'stamp') { if(c.stamps >= FREE_ITEM_THRESHOLD) return; if(c.skipNextStamp) { updates = { skipNextStamp: false }; entry = { ...entry, type:'purchase', subType:'stamp_skipped', description:'Stamp Skipped', amount:0 }; } else { updates = { stamps: c.stamps + 1 }; entry = { ...entry, type:'purchase', subType:'stamp_only', description:'Stamp Added', amount:0 }; } } 
              else if(type === 'redeem') { const isEarly = c.stamps < FREE_ITEM_THRESHOLD; updates = { stamps: 0, skipNextStamp: isEarly }; entry = { ...entry, type:'redeem', subType: isEarly ? 'early_free' : 'standard_free', description: isEarly?'Early Free Redeemed':'Free Coffee Redeemed', amount:0 }; } 
              else if(type === 'adjust

