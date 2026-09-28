/* UF AIAA Experience Map — data layer (Firestore with demo fallback)
   Loaded by index.html and admin.html after firebase-config.js. */
(function(){
  const cfg = window.FIREBASE_CONFIG || {};
  const VERSION = window.FIREBASE_SDK_VERSION || "12.19.0";
  const CDN = `https://www.gstatic.com/firebasejs/${VERSION}/`;
  const DEMO = !cfg.apiKey;

  const FIELDS = ["name","position","type","company","city","state","gradYear","oppYear","email","linkedin","notes","lat","lon"];

  // ---- demo data (fictional; used only while Firebase isn't configured) ----
  const DEMO_ALUMNI = [
    {id:"d1",name:"Alex Rivera",position:"Controls Engineering Intern",type:"Internship",company:"Air Force Research Laboratory",city:"Eglin Air Force Base",state:"Florida",gradYear:"2025",oppYear:"2022",lat:30.4833,lon:-86.5,linkedin:"https://www.linkedin.com/"},
    {id:"d2",name:"Priya Natarajan",position:"GNC Engineer",type:"Full-time",company:"Blue Origin",city:"Kent",state:"Washington",gradYear:"2023",oppYear:"2023",lat:47.3809,lon:-122.2348,email:"priya@example.com"},
    {id:"d3",name:"Marcus Okafor",position:"Propulsion Test Intern",type:"Internship",company:"SpaceX",city:"McGregor",state:"Texas",gradYear:"2026",oppYear:"2024",lat:31.4382,lon:-97.4089},
    {id:"d4",name:"Hannah Lindqvist",position:"Structures Engineer",type:"Full-time",company:"Lockheed Martin Space",city:"Littleton",state:"Colorado",gradYear:"2022",oppYear:"2022",lat:39.6133,lon:-105.0166,linkedin:"https://www.linkedin.com/"},
    {id:"d5",name:"Diego Fuentes",position:"Flight Software Intern",type:"Internship",company:"NASA Kennedy Space Center",city:"Merritt Island",state:"Florida",gradYear:"2027",oppYear:"2025",lat:28.5729,lon:-80.649},
    {id:"d6",name:"Sofia Bianchi",position:"Mission Operations Engineer",type:"Full-time",company:"NASA Kennedy Space Center",city:"Merritt Island",state:"Florida",gradYear:"2021",oppYear:"2021",lat:28.5729,lon:-80.649,email:"sofia@example.com"},
    {id:"d7",name:"Ethan Caldwell",position:"Systems Engineering Intern",type:"Internship",company:"Northrop Grumman",city:"Melbourne",state:"Florida",gradYear:"2026",oppYear:"2025",lat:28.0836,lon:-80.6081},
    {id:"d8",name:"Grace Whitfield",position:"Aerodynamics Engineer",type:"Full-time",company:"Boeing",city:"Huntsville",state:"Alabama",gradYear:"2020",oppYear:"2020",lat:34.7304,lon:-86.5861},
    {id:"d9",name:"Noah Petrakis",position:"Avionics Intern",type:"Internship",company:"Relativity Space",city:"Long Beach",state:"California",gradYear:"2026",oppYear:"2024",lat:33.7701,lon:-118.1937},
    {id:"d10",name:"Maya Thompson",position:"Trajectory Analyst",type:"Full-time",company:"NASA Johnson Space Center",city:"Houston",state:"Texas",gradYear:"2022",oppYear:"2022",lat:29.5502,lon:-95.097},
    {id:"d11",name:"Liam O'Connell",position:"Thermal Engineering Intern",type:"Internship",company:"Rocket Lab",city:"Wallops Island",state:"Virginia",gradYear:"2027",oppYear:"2025",lat:37.9402,lon:-75.4664},
    {id:"d12",name:"Ava Mendes",position:"Mechanical Design Engineer",type:"Full-time",company:"Firefly Aerospace",city:"Cedar Park",state:"Texas",gradYear:"2023",oppYear:"2024",lat:30.5052,lon:-97.8203},
    {id:"d13",name:"Jordan Blake",position:"Test Engineering Intern",type:"Internship",company:"Gulfstream Aerospace",city:"Savannah",state:"Georgia",gradYear:"2026",oppYear:"2024",lat:32.0809,lon:-81.0912},
    {id:"d14",name:"Chloe Adebayo",position:"Guidance Engineer",type:"Full-time",company:"Raytheon",city:"Tucson",state:"Arizona",gradYear:"2021",oppYear:"2021",lat:32.2226,lon:-110.9747},
    {id:"d15",name:"Ryan Kowalski",position:"Launch Operations Intern",type:"Internship",company:"United Launch Alliance",city:"Cape Canaveral",state:"Florida",gradYear:"2025",oppYear:"2023",lat:28.3922,lon:-80.6077},
    {id:"d16",name:"Isabella Moreau",position:"Spacecraft Systems Engineer",type:"Full-time",company:"Jet Propulsion Laboratory",city:"Pasadena",state:"California",gradYear:"2019",oppYear:"2019",lat:34.1478,lon:-118.1445},
  ];
  const DEMO_SUBMISSIONS = [
    {id:"s1",name:"Sample Submission",position:"Structures Intern",type:"Internship",company:"Sierra Space",city:"Louisville",state:"Colorado",gradYear:"2027",oppYear:"2026",email:"sample@ufl.edu",createdAt:new Date().toISOString()},
  ];
  const DEMO_ADMINS = [{id:"you@ufl.edu"}];

  // ---- firebase (lazy) ----
  let fb = null;
  async function firebase(){
    if (DEMO) return null;
    if (fb) return fb;
    const [app, fs, auth] = await Promise.all([
      import(CDN+"firebase-app.js"),
      import(CDN+"firebase-firestore.js"),
      import(CDN+"firebase-auth.js"),
    ]);
    const a = app.initializeApp(cfg);
    fb = { app:a, db:fs.getFirestore(a), auth:auth.getAuth(a), fs, authMod:auth };
    return fb;
  }

  function clean(obj){
    const out = {};
    for (const k of FIELDS){
      let v = obj[k];
      if (v === undefined || v === null) continue;
      if (k==="lat"||k==="lon"){ v = parseFloat(v); if(!Number.isFinite(v)) continue; }
      else { v = String(v).trim(); if(!v) continue; }
      out[k] = v;
    }
    return out;
  }
  function normType(t){
    t = String(t||"").toLowerCase();
    if (t.startsWith("intern")) return "Internship";
    if (t.startsWith("co")) return "Co-op";
    return "Full-time";
  }

  // ---- geocoding (Nominatim, free; ~1 request/second; cached per city) ----
  const geoCache = new Map();
  async function geocode(city, state){
    const q = `${city}, ${state}`.trim();
    if (!city) return null;
    if (geoCache.has(q)) return geoCache.get(q);
    try{
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`;
      const r = await fetch(url, {headers:{"Accept":"application/json"}});
      const j = await r.json();
      const hit = j && j[0] ? {lat:parseFloat(j[0].lat), lon:parseFloat(j[0].lon)} : null;
      geoCache.set(q, hit);
      await new Promise(res=>setTimeout(res,1050));
      return hit;
    }catch(e){ return null; }
  }

  const demoState = { alumni:[...DEMO_ALUMNI], submissions:[...DEMO_SUBMISSIONS], admins:[...DEMO_ADMINS], user:null };
  const uid = () => Math.random().toString(36).slice(2,10);

  // ================= PUBLIC API =================
  window.AIAA = {
    DEMO, FIELDS, normType, geocode,

    async loadAlumni(){
      if (DEMO) return demoState.alumni.map(a=>({...a}));
      const {db, fs} = await firebase();
      const snap = await fs.getDocs(fs.collection(db,"alumni"));
      return snap.docs.map(d=>({id:d.id, ...d.data()}));
    },

    async submitEntry(entry){
      const data = clean(entry); data.type = normType(data.type);
      delete data.lat; delete data.lon;
      if (DEMO){ demoState.submissions.push({id:uid(), ...data, createdAt:new Date().toISOString()}); return true; }
      const {db, fs} = await firebase();
      await fs.addDoc(fs.collection(db,"submissions"), {...data, createdAt: fs.serverTimestamp()});
      return true;
    },

    // ---------- auth (admin) ----------
    async onAuth(cb){
      if (DEMO){ cb(demoState.user); window.AIAA._demoAuthCb = cb; return; }
      const {auth, authMod} = await firebase();
      authMod.onAuthStateChanged(auth, cb);
    },
    async signIn(email, password){
      if (DEMO){ demoState.user = {email}; window.AIAA._demoAuthCb?.(demoState.user); return; }
      const {auth, authMod} = await firebase();
      await authMod.signInWithEmailAndPassword(auth, email, password);
    },
    async createAccount(email, password){
      if (DEMO){ demoState.user = {email}; window.AIAA._demoAuthCb?.(demoState.user); return; }
      const {auth, authMod} = await firebase();
      await authMod.createUserWithEmailAndPassword(auth, email, password);
    },
    async resetPassword(email){
      if (DEMO) return;
      const {auth, authMod} = await firebase();
      await authMod.sendPasswordResetEmail(auth, email);
    },
    async signOut(){
      if (DEMO){ demoState.user = null; window.AIAA._demoAuthCb?.(null); return; }
      const {auth, authMod} = await firebase();
      await authMod.signOut(auth);
    },
    async isAdmin(email){
      if (DEMO) return true;
      const {db, fs} = await firebase();
      try{ const d = await fs.getDoc(fs.doc(db,"admins",email.toLowerCase())); return d.exists(); }
      catch(e){ return false; }
    },

    // ---------- submissions ----------
    async loadSubmissions(){
      if (DEMO) return demoState.submissions.map(s=>({...s}));
      const {db, fs} = await firebase();
      const snap = await fs.getDocs(fs.query(fs.collection(db,"submissions"), fs.orderBy("createdAt","desc")));
      return snap.docs.map(d=>{ const x=d.data(); return {id:d.id, ...x, createdAt:x.createdAt?.toDate?.()?.toISOString?.()||""}; });
    },
    async approveSubmission(sub){
      const data = clean(sub); data.type = normType(data.type);
      delete data.notes; // officer-only; never copied onto the public record
      if (data.lat==null){ const g = await geocode(data.city, data.state); if (g) Object.assign(data,g); }
      if (DEMO){
        demoState.alumni.push({id:uid(), ...data});
        demoState.submissions = demoState.submissions.filter(s=>s.id!==sub.id); return;
      }
      const {db, fs} = await firebase();
      await fs.addDoc(fs.collection(db,"alumni"), {...data, createdAt:fs.serverTimestamp(), updatedAt:fs.serverTimestamp(), source:"submission"});
      await fs.deleteDoc(fs.doc(db,"submissions",sub.id));
    },
    async rejectSubmission(id){
      if (DEMO){ demoState.submissions = demoState.submissions.filter(s=>s.id!==id); return; }
      const {db, fs} = await firebase();
      await fs.deleteDoc(fs.doc(db,"submissions",id));
    },

    // ---------- alumni CRUD ----------
    async saveAlum(entry, {skipGeocode=false}={}){
      const data = clean(entry); data.type = normType(data.type);
      delete data.notes; // public records never carry officer notes
      if (data.lat==null && !skipGeocode){ const g = await geocode(data.city, data.state); if (g) Object.assign(data,g); }
      if (DEMO){
        if (entry.id){ const i = demoState.alumni.findIndex(a=>a.id===entry.id); demoState.alumni[i] = {id:entry.id, ...data}; return entry.id; }
        const id = uid(); demoState.alumni.push({id, ...data}); return id;
      }
      const {db, fs} = await firebase();
      if (entry.id){
        // merge so createdAt/source survive, but explicitly clear fields the officer blanked out
        const patch = {...data, updatedAt:fs.serverTimestamp()};
        for (const k of FIELDS) if (!(k in data)) patch[k] = fs.deleteField();
        await fs.setDoc(fs.doc(db,"alumni",entry.id), patch, {merge:true});
        return entry.id;
      }
      const ref = await fs.addDoc(fs.collection(db,"alumni"), {...data, createdAt:fs.serverTimestamp(), updatedAt:fs.serverTimestamp(), source:"admin"});
      return ref.id;
    },
    async deleteAlum(id){
      if (DEMO){ demoState.alumni = demoState.alumni.filter(a=>a.id!==id); return; }
      const {db, fs} = await firebase();
      await fs.deleteDoc(fs.doc(db,"alumni",id));
    },
    async deleteAllAlumni(){
      if (DEMO){ demoState.alumni = []; return; }
      const {db, fs} = await firebase();
      const snap = await fs.getDocs(fs.collection(db,"alumni"));
      let batch = fs.writeBatch(db), n = 0;
      for (const d of snap.docs){ batch.delete(d.ref); if(++n%400===0){ await batch.commit(); batch = fs.writeBatch(db);} }
      await batch.commit();
    },

    // ---------- officers (admins) ----------
    async loadAdmins(){
      if (DEMO) return demoState.admins.map(a=>({...a}));
      const {db, fs} = await firebase();
      const snap = await fs.getDocs(fs.collection(db,"admins"));
      return snap.docs.map(d=>({id:d.id, ...d.data()}));
    },
    async addAdmin(email, addedBy){
      email = email.trim().toLowerCase();
      if (DEMO){ if(!demoState.admins.find(a=>a.id===email)) demoState.admins.push({id:email}); return; }
      const {db, fs} = await firebase();
      await fs.setDoc(fs.doc(db,"admins",email), {addedBy: addedBy||"", addedAt: fs.serverTimestamp()});
    },
    async removeAdmin(email){
      if (DEMO){ demoState.admins = demoState.admins.filter(a=>a.id!==email); return; }
      const {db, fs} = await firebase();
      await fs.deleteDoc(fs.doc(db,"admins",email));
    },
  };
})();
