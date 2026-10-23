import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight, ArrowLeft, ArrowRight, Bell, BookOpen, Check, ChevronDown,
  CircleHelp, Clock3, Eye, Glasses, Laptop, LogOut, MapPin, Menu,
  Moon, Plus, Search, ShieldCheck, Smartphone, Sun, Upload, UserRound, Wallet,
  X, MessageCircle, KeyRound, Backpack, Watch, Tag, Package, HeartHandshake
} from "lucide-react";
import { collegeDomain, isCollegeEmail, isSupabaseConfigured, supabase } from "./lib/supabase";

type ItemStatus = "lost" | "found";
type Item = {
  id: string; user_id?: string | null; status: ItemStatus; title: string; category: string;
  description: string; location: string; item_date: string; phone: string;
  image_url?: string | null; created_at?: string; contact_name?: string; contact_email?: string;
};
type Profile = { id: string; username: string; email: string; phone?: string | null };

const categories = [
  "ID cards & access cards", "Glasses & sunglasses", "Keys", "Wallets & purses",
  "Phones & chargers", "Laptops & electronics", "Earbuds & headphones", "Bags & backpacks",
  "Books & notebooks", "Stationery", "Water bottles & lunch boxes", "Clothing",
  "Watches & jewellery", "Sports equipment", "Umbrellas", "Documents",
  "Calculators", "Cards & cash", "Cycles & transport", "Other"
];
const demoItems: Item[] = [
  { id: "demo-1", status: "found", title: "Black-rimmed glasses", category: "Glasses & sunglasses", description: "Black rectangular frame, found near the library reading area.", location: "Central Library", item_date: new Date().toISOString().slice(0,10), phone: "919876543210", contact_name: "Aarav" },
  { id: "demo-2", status: "lost", title: "Blue student ID card", category: "ID cards & access cards", description: "Blue lanyard attached. Please message me if you spot it.", location: "Academic Block B", item_date: new Date().toISOString().slice(0,10), phone: "919812345678", contact_name: "Meera" },
  { id: "demo-3", status: "found", title: "Silver water bottle", category: "Water bottles & lunch boxes", description: "Metal bottle with a small sticker on the side.", location: "Cafeteria", item_date: new Date().toISOString().slice(0,10), phone: "919811223344", contact_name: "Kabir" },
  { id: "demo-4", status: "lost", title: "Wireless earbuds case", category: "Earbuds & headphones", description: "White charging case, no earbuds inside.", location: "Sports complex", item_date: new Date().toISOString().slice(0,10), phone: "919899887766", contact_name: "Ishita" },
  { id: "demo-5", status: "found", title: "Set of two keys", category: "Keys", description: "Two keys on a plain metal ring.", location: "Auditorium entrance", item_date: new Date().toISOString().slice(0,10), phone: "919900112233", contact_name: "Dev" },
  { id: "demo-6", status: "lost", title: "Calculus notebook", category: "Books & notebooks", description: "Green cover with handwritten notes inside.", location: "Lecture Hall 3", item_date: new Date().toISOString().slice(0,10), phone: "919822334455", contact_name: "Ananya" }
];

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join("").toUpperCase() || "S"; }
function dateLabel(value: string) {
  if (!value) return "Date not set";
  return new Date(`${value.slice(0,10)}T12:00:00`).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}
function whatsappUrl(phone: string, title: string) {
  const number = phone.replace(/\D/g, "");
  const normalized = number.startsWith("0") ? `91${number.slice(1)}` : number;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(`Hi! I saw your ${title} post on CampusKind Lost & Found. Can we coordinate?`)}`;
}

export default function App() {
  const [theme, setTheme] = useState<"dark"|"light">(() => (localStorage.getItem("campuskind-theme") as "dark"|"light") || "dark");
  const [session, setSession] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem("campuskind-visitor") || "null"); } catch { return null; }
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [authReady, setAuthReady] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [items, setItems] = useState<Item[]>(demoItems);
  const [activeTab, setActiveTab] = useState<"all"|"lost"|"found"|"mine">("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const [showForm, setShowForm] = useState(false);
  const [formStatus, setFormStatus] = useState<ItemStatus>("lost");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [formBusy, setFormBusy] = useState(false);
  const [form, setForm] = useState({ title:"", category:categories[0], description:"", location:"", item_date:new Date().toISOString().slice(0,10), phone:"", image_url:"" });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("campuskind-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (session?.user) {
      const user = session.user;
      setProfile({
        id: user.id,
        username: user.user_metadata?.username || user.email.split("@")[0],
        email: user.email,
        phone: user.user_metadata?.phone || "",
      });
      if (supabase) void loadItems();
    } else {
      setProfile(null);
    }
  }, [session?.user?.id]);

  async function loadItems() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setItems(data as Item[]);
    } else if (error) {
      setNotice(`Could not load shared listings: ${error.message}`);
    }
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    setAuthMessage("");

    const email = authEmail.trim().toLowerCase();
    const username = authName.trim();
    const phone = authPhone.trim();

    if (!isCollegeEmail(email)) {
      setAuthMessage(`Use an email ending exactly in @${collegeDomain}.`);
      return;
    }
    if (!username) {
      setAuthMessage("Please enter your name.");
      return;
    }

    setAuthBusy(true);
    try {
      // Save the profile in Supabase as well as this browser. This is a no-auth
      // prototype: checking the domain does not verify ownership of the email.
      if (supabase) {
        const { error } = await supabase
          .from("profiles")
          .upsert(
            { username, email, phone: phone || null },
            { onConflict: "email" }
          );

        if (error) {
          setAuthMessage(`Could not save your profile to Supabase: ${error.message}`);
          return;
        }
      }

      const visitor = {
        user: {
          // Use email as the local visitor identifier; this is not a Supabase auth user ID.
          id: email,
          email,
          user_metadata: { username, phone },
        },
      };
      localStorage.setItem("campuskind-visitor", JSON.stringify(visitor));
      setProfile({ id: email, username, email, phone });
      setSession(visitor);
      setAuthMessage("");
      if (supabase) void loadItems();
    } catch (error: any) {
      setAuthMessage(`Could not save your profile: ${error?.message || "Unexpected error."}`);
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    localStorage.removeItem("campuskind-visitor");
    setSession(null);
    setProfile(null);
    setActiveTab("all");
    setAuthName("");
    setAuthEmail("");
    setAuthPhone("");
  }
  async function saveItem(e: FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.location.trim() || !form.phone.trim()) {
      setNotice("Please complete all required fields."); return;
    }
    if (!/^\+?[0-9\s()-]{8,18}$/.test(form.phone.trim())) { setNotice("Enter a valid phone number with country code if needed."); return; }
    setFormBusy(true); setNotice("");
    const newItem: Item = { id: crypto.randomUUID(), status:formStatus, title:form.title.trim(), category:form.category,
      description:form.description.trim(), location:form.location.trim(), item_date:form.item_date, phone:form.phone.replace(/\D/g,""),
      image_url:form.image_url.trim() || null, contact_name:profile?.username || authName || "You",
      contact_email:profile?.email || authEmail.trim().toLowerCase(), user_id:null };
    try {
      if (supabase) {
        const { error } = await supabase.from("items").insert({
          user_id: null,
          contact_name: newItem.contact_name,
          contact_email: newItem.contact_email,
          status: newItem.status,
          title: newItem.title,
          category: newItem.category,
          description: newItem.description,
          location: newItem.location,
          item_date: newItem.item_date,
          phone: newItem.phone,
          image_url: newItem.image_url,
        });
        if (error) throw error;
        await loadItems();
      } else {
        setItems(prev => [newItem, ...prev]);
      }
      setForm({ title:"", category:categories[0], description:"", location:"", item_date:new Date().toISOString().slice(0,10), phone:profile?.phone || "", image_url:"" });
      setShowForm(false); setActiveTab("all"); setNotice("Your listing is live. Thanks for helping the campus community!");
    } catch (err:any) { setNotice(err.message || "Could not publish listing."); }
    finally { setFormBusy(false); }
  }

  const visibleItems = useMemo(() => items.filter(item => {
    if (activeTab==="lost" && item.status!=="lost") return false;
    if (activeTab==="found" && item.status!=="found") return false;
    if (activeTab==="mine" && item.contact_email?.toLowerCase() !== profile?.email?.toLowerCase()) return false;
    if (categoryFilter!=="All categories" && item.category!==categoryFilter) return false;
    const haystack = `${item.title} ${item.description} ${item.location} ${item.category}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  }), [items, activeTab, categoryFilter, search, profile?.email]);
  const lostCount = items.filter(i=>i.status==="lost").length;
  const foundCount = items.filter(i=>i.status==="found").length;

  if (!authReady) return <div className="loading-screen"><div className="brand-mark">ck</div><p>Getting your campus space ready…</p></div>;

  return (
    <div className="app-shell">
      {!session ? (
        <main className="auth-layout">
          <section className="auth-visual">
            <button type="button" className="auth-topbrand logo-refresh" onClick={() => window.location.reload()} aria-label="Refresh CampusKind" title="Refresh page"><span className="brand-mark">ck</span><span>CampusKind</span><span className="beta-pill">CAMPUS COMMUNITY</span></button>
            <div className="visual-copy">
              <div className="eyebrow"><span className="live-dot"/> MADE FOR YOUR CAMPUS</div>
              <h1>Lost something?<br/><em>Let’s bring it</em><br/>back to you.</h1>
              <p>A little campus kindness goes a long way. Find what’s missing, return what you’ve found, and help your community look out for each other.</p>
              <div className="visual-stats">
                <div><strong>{items.length.toString().padStart(2,"0")}</strong><span>Community posts</span></div>
                <div><strong>{foundCount.toString().padStart(2,"0")}</strong><span>Items found</span></div>
                <div><strong>01</strong><span>Campus, one team</span></div>
              </div>
            </div>
            <div className="floating-item float-one"><Glasses size={20}/><span>Someone found your glasses</span><span className="float-check"><Check size={13}/></span></div>
            <div className="floating-item float-two"><HeartHandshake size={21}/><span>Kindness looks good on you</span></div>
            <div className="visual-bottom"><span>YOUR CAMPUS. YOUR COMMUNITY.</span><span>01 / 03</span></div>
          </section>
          <section className="auth-panel">
            <div className="auth-panel-top"><span className="mobile-brand"><span className="brand-mark">ck</span> CampusKind</span><button className="icon-btn" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label="Toggle theme">{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}</button></div>
            <div className="auth-form-wrap">
              <div className="form-icon"><ShieldCheck size={23}/></div>
              <p className="eyebrow">A SAFE SPACE FOR YOUR CAMPUS</p>
              <h2>Welcome to your<br/>campus community.</h2>
              <p className="muted auth-intro">Sign in with your college email to report an item or help someone find theirs.</p>
              <form onSubmit={login} className="auth-form">
                <label>Your name<input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="e.g. Aanya Sharma" autoComplete="name" required /></label>
                <label>College email address<div className="input-with-icon"><UserRound size={17}/><input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder={`you@${collegeDomain}`} autoComplete="email" required /></div></label>
                <label>Phone number <span className="optional">(optional)</span><div className="input-with-icon"><Smartphone size={17}/><input type="tel" value={authPhone} onChange={e=>setAuthPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" /></div></label>
                <button className="primary-btn full-btn" disabled={authBusy}>{<>Continue <ArrowRight size={17}/></>}</button>
              </form>
              {authMessage && <div className={`auth-message ${authMessage.startsWith("Check")?"success":""}`}>{authMessage}</div>}
              {!isSupabaseConfigured && <div className="demo-notice"><CircleHelp size={16}/><span><strong>Preview mode</strong><br/>The sign-in flow becomes real after you add your Supabase keys. You can explore the interface after setup.</span></div>}
              <p className="terms-note"><ShieldCheck size={14}/> Enter your MUJ email to continue. Email ownership is not verified.</p>
            </div>
            <div className="auth-panel-bottom"><span>© 2026 CampusKind</span><button onClick={()=>setTheme(theme==="dark"?"light":"dark")}>{theme==="dark"?<Sun size={14}/>:<Moon size={14}/>} {theme==="dark"?"Light":"Dark"} mode</button></div>
          </section>
        </main>
      ) : (
        <div className="dashboard-layout">
          <aside className={`sidebar ${mobileMenu?"sidebar-open":""}`}>
            <div className="side-brand"><button type="button" className="side-brand-refresh" onClick={() => window.location.reload()} aria-label="Refresh CampusKind" title="Refresh page" style={{display:"flex",alignItems:"center",gap:"12px",flex:1,minWidth:0,padding:0,border:0,background:"transparent",color:"inherit",textAlign:"left",cursor:"pointer"}}><span className="brand-mark">ck</span><span style={{display:"flex",flexDirection:"column",minWidth:0}}><strong>CampusKind</strong><span>LOST &amp; FOUND</span></span></button><button type="button" className="mobile-close icon-btn" onClick={()=>setMobileMenu(false)} aria-label="Close menu"><X size={19}/></button></div>
            <div className="campus-tag"><span className="campus-symbol">✳</span><div><strong>Your Campus</strong><small>Community space</small></div><ChevronDown size={15}/></div>
            <p className="nav-label">WORKSPACE</p>
            <nav className="side-nav">
              <button className={activeTab==="all"?"active":""} onClick={()=>{setActiveTab("all");setMobileMenu(false)}}><Package size={18}/> All listings <span className="nav-count">{items.length}</span></button>
              <button className={activeTab==="lost"?"active":""} onClick={()=>{setActiveTab("lost");setMobileMenu(false)}}><Search size={18}/> Lost items <span className="nav-count">{lostCount}</span></button>
              <button className={activeTab==="found"?"active":""} onClick={()=>{setActiveTab("found");setMobileMenu(false)}}><Check size={18}/> Found items <span className="nav-count">{foundCount}</span></button>
              <button className={activeTab==="mine"?"active":""} onClick={()=>{setActiveTab("mine");setMobileMenu(false)}}><UserRound size={18}/> My listings</button>
            </nav>
            <p className="nav-label category-nav-label">BROWSE BY CATEGORY</p>
            <div className="category-quick">
              {[["Glasses & sunglasses",Glasses],["ID cards & access cards",ShieldCheck],["Phones & chargers",Smartphone],["Wallets & purses",Wallet],["Keys",KeyRound],["Books & notebooks",BookOpen],["Laptops & electronics",Laptop],["Bags & backpacks",Backpack],["Watches & jewellery",Watch]].map(([label,Icon]:any)=>
                <button key={label} onClick={()=>{setCategoryFilter(label);setActiveTab("all");setMobileMenu(false)}}><Icon size={16}/>{label}</button>
              )}
            </div>
            <div className="sidebar-bottom">
              <div className="help-card"><div className="help-icon"><HeartHandshake size={18}/></div><strong>Small act, big impact.</strong><p>Found something? Be the reason someone’s day gets better.</p><button onClick={()=>{setFormStatus("found");setShowForm(true)}}>Report a found item <ArrowRight size={14}/></button></div>
              <div className="profile-mini"><div className="avatar">{initials(profile?.username || session.user.email || "S")}</div><div className="profile-mini-copy"><strong>{profile?.username || session.user.user_metadata?.username || "Campus member"}</strong><span>{session.user.email}</span></div><button className="icon-btn logout-btn" onClick={signOut} aria-label="Sign out"><LogOut size={17}/></button></div>
            </div>
          </aside>
          {mobileMenu && <button className="mobile-scrim" onClick={()=>setMobileMenu(false)} aria-label="Close menu"/>}
          <main className="main-area">
            <header className="topbar"><div className="topbar-left"><button className="mobile-menu-btn icon-btn" onClick={()=>setMobileMenu(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <strong>{activeTab==="all"?"All listings":activeTab==="mine"?"My listings":activeTab==="lost"?"Lost items":"Found items"}</strong></div></div><div className="topbar-actions"><span className="verified-badge"><ShieldCheck size={14}/> Campus verified</span><button className="icon-btn theme-toggle" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label="Toggle theme">{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}</button><div className="profile-menu-wrap">
              <button type="button" className="avatar top-avatar profile-avatar-button" onClick={() => setProfileMenuOpen(open => !open)} aria-label="Open your profile" aria-expanded={profileMenuOpen} title="Your profile">{initials(profile?.username || "S")}</button>
              {profileMenuOpen && <>
                <button className="profile-menu-dismiss" aria-label="Close profile menu" onClick={() => setProfileMenuOpen(false)} />
                <section className="profile-dropdown" aria-label="Your profile">
                  <div className="profile-dropdown-head"><div className="avatar profile-dropdown-avatar">{initials(profile?.username || "S")}</div><div><strong>My profile</strong><span>CampusKind member</span></div><button type="button" className="profile-close icon-btn" onClick={() => setProfileMenuOpen(false)} aria-label="Close profile"><X size={16}/></button></div>
                  <div className="profile-details">
                    <div><span>Name</span><strong>{profile?.username || session.user.user_metadata?.username || "Not provided"}</strong></div>
                    <div><span>Phone number</span><strong>{profile?.phone || session.user.user_metadata?.phone || "Not provided"}</strong></div>
                    <div><span>Email</span><strong className="profile-email-value">{profile?.email || session.user.email || "Not provided"}</strong></div>
                  </div>
                  <button type="button" className="profile-logout-button" onClick={() => { setProfileMenuOpen(false); void signOut(); }}><LogOut size={16}/> Log out</button>
                </section>
              </>}
            </div></div></header>
            <div className="page-content">
              <section className="welcome-row"><div><div className="eyebrow"><span className="live-dot"/> YOUR CAMPUS, CONNECTED</div><h1>Good {new Date().getHours()<12?"morning":new Date().getHours()<17?"afternoon":"evening"}, <span>{profile?.username || session.user.user_metadata?.username || "there"}</span><span className="wave">✳</span></h1><p className="muted">One community. A thousand little ways to help.</p></div><button className="primary-btn report-top-btn" onClick={()=>{setFormStatus("lost");setShowForm(true)}}><Plus size={18}/> Report an item</button></section>
              <section className="stats-grid">
                <div className="stat-card"><div className="stat-top"><span className="stat-icon neutral"><Package size={18}/></span><span className="stat-tag">CAMPUS-WIDE</span></div><strong>{items.length.toString().padStart(2,"0")}</strong><p>Total listings</p><div className="stat-foot"><span className="stat-dot"/> All active community posts</div></div>
                <div className="stat-card"><div className="stat-top"><span className="stat-icon lost-icon"><Search size={18}/></span><span className="stat-tag">NEEDS HELP</span></div><strong>{lostCount.toString().padStart(2,"0")}</strong><p>Items lost</p><div className="stat-foot"><span className="stat-dot amber"/> Help reunite an owner</div></div>
                <div className="stat-card"><div className="stat-top"><span className="stat-icon found-icon"><HeartHandshake size={18}/></span><span className="stat-tag">GOOD NEWS</span></div><strong>{foundCount.toString().padStart(2,"0")}</strong><p>Items found</p><div className="stat-foot"><span className="stat-dot green"/> Waiting to go home</div></div>
              </section>
              <section className="community-banner"><div className="banner-art"><div className="banner-ring ring-one"/><div className="banner-ring ring-two"/><div className="banner-icon"><HeartHandshake size={27}/></div><span className="spark spark-a">✦</span><span className="spark spark-b">✳</span></div><div className="banner-copy"><span className="banner-label">A LITTLE CAMPUS KINDNESS</span><h3>Lost it? Found it? <em>Make the connection.</em></h3><p>Every listing brings us one step closer to getting something important back where it belongs.</p></div><button className="banner-btn" onClick={()=>{setFormStatus("found");setShowForm(true)}}>I found something <ArrowDownRight size={17}/></button></section>
              <section className="listings-section">
                <div className="section-heading"><div><div className="eyebrow">THE COMMUNITY BOARD</div><h2>{activeTab==="all"?"Latest listings":activeTab==="lost"?"Lost items":activeTab==="found"?"Found items":"Your listings"} <span className="result-count">{visibleItems.length}</span></h2><p className="muted">Little things matter. Let’s find their way home.</p></div><button className="text-btn" onClick={()=>{setActiveTab("all");setCategoryFilter("All categories");setSearch("")}}>View all <ArrowRight size={15}/></button></div>
                <div className="filters-row"><div className="search-box"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search items, places, descriptions…" /><kbd>⌘ K</kbd></div><div className="segmented"><button className={activeTab==="all"?"selected":""} onClick={()=>setActiveTab("all")}>All</button><button className={activeTab==="lost"?"selected":""} onClick={()=>setActiveTab("lost")}>Lost</button><button className={activeTab==="found"?"selected":""} onClick={()=>setActiveTab("found")}>Found</button></div></div>
                {notice && <div className="notice"><Check size={16}/><span>{notice}</span><button onClick={()=>setNotice("")}><X size={15}/></button></div>}
                {visibleItems.length===0 ? <div className="empty-state"><div className="empty-icon"><Search size={24}/></div><h3>No items found</h3><p>Try another search or category, or be the first to post one.</p><button className="primary-btn" onClick={()=>{setFormStatus("lost");setShowForm(true)}}><Plus size={16}/> Create a listing</button></div> :
                  <div className="items-grid">{visibleItems.map((item,index)=><article className="item-card" key={item.id}><div className={`item-art art-${index%6}`}>{item.image_url?<img src={item.image_url} alt={item.title}/>:<ItemIcon category={item.category}/>}<span className={`status-pill ${item.status}`}>{item.status==="lost"?<><Search size={12}/> LOST</>:<><Check size={12}/> FOUND</>}</span><button className="save-item" title="Listing details"><Eye size={16}/></button></div><div className="item-content"><div className="item-category">{item.category}</div><h3>{item.title}</h3><p className="item-description">{item.description}</p><div className="item-meta"><span><MapPin size={14}/>{item.location}</span><span><Clock3 size={14}/>{dateLabel(item.item_date)}</span></div><div className="item-card-bottom"><div className="item-owner"><div className="avatar small-avatar">{initials(item.contact_name || "C")}</div><div><strong>{item.contact_name || "Campus member"}</strong><span>Campus member</span></div></div><a className="whatsapp-btn" href={whatsappUrl(item.phone,item.title)} target="_blank" rel="noreferrer" aria-label={`Contact ${item.contact_name} on WhatsApp`}><MessageCircle size={16}/> WhatsApp</a></div></div></article>)}</div>
                }
              </section>
              <footer className="page-footer"><span>Made with <span className="footer-heart">♥</span> for campus kindness.</span><span><ShieldCheck size={13}/> Be kind. Verify before you meet.</span></footer>
            </div>
          </main>
        </div>
      )}
      {showForm && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowForm(false)}}><section className="report-modal"><div className="modal-head"><div><div className="eyebrow">COMMUNITY CONTRIBUTION</div><h2>Let’s get it back home.</h2><p className="muted">A few details can make someone’s day.</p></div><button className="icon-btn" onClick={()=>setShowForm(false)}><X size={19}/></button></div><div className="form-tabs"><button className={formStatus==="lost"?"form-tab-active":""} onClick={()=>setFormStatus("lost")}><Search size={16}/> I lost something</button><button className={formStatus==="found"?"form-tab-active":""} onClick={()=>setFormStatus("found")}><HeartHandshake size={16}/> I found something</button></div><form className="report-form" onSubmit={saveItem}><div className="form-grid"><label>Item name *<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Black-rimmed glasses" required maxLength={80}/></label><label>Category *<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="wide-field">Description *<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Color, brand, identifying details… (avoid sharing sensitive information)" rows={3} required maxLength={600}/></label><label>Campus location *<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="e.g. Library, Block A" required maxLength={120}/></label><label>Date {formStatus==="lost"?"lost":"found"}<input type="date" value={form.item_date} onChange={e=>setForm({...form,item_date:e.target.value})} max={new Date().toISOString().slice(0,10)}/></label><label>Phone number *<input type="tel" value={form.phone || profile?.phone || authPhone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="+91 98765 43210" required/><small>Used to coordinate return via WhatsApp.</small></label><label>Photo URL <span className="optional">(optional)</span><input type="url" value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} placeholder="https://…"/><small>Paste a publicly accessible image link.</small></label></div><div className="privacy-note"><ShieldCheck size={17}/><span>Your phone number is shown to other campus members so they can coordinate. Only post contact details you’re comfortable sharing.</span></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setShowForm(false)}>Cancel</button><button className="primary-btn" disabled={formBusy}>{formBusy?"Publishing…":<>{formStatus==="lost"?"Post lost item":"Post found item"} <ArrowRight size={16}/></>}</button></div></form></section></div>}
    </div>
  );
}
function ItemIcon({category}:{category:string}) {
  if (category.includes("Glasses")) return <Glasses size={54} strokeWidth={1.25}/>;
  if (category.includes("ID")) return <ShieldCheck size={52} strokeWidth={1.25}/>;
  if (category.includes("Phone") || category.includes("electronics") || category.includes("Earbuds")) return <Smartphone size={52} strokeWidth={1.25}/>;
  if (category.includes("Wallet") || category.includes("cash")) return <Wallet size={52} strokeWidth={1.25}/>;
  if (category.includes("Keys")) return <KeyRound size={52} strokeWidth={1.25}/>;
  if (category.includes("Books") || category.includes("notebooks")) return <BookOpen size={52} strokeWidth={1.25}/>;
  if (category.includes("Bags")) return <Backpack size={52} strokeWidth={1.25}/>;
  if (category.includes("Watch")) return <Watch size={52} strokeWidth={1.25}/>;
  return <Package size={52} strokeWidth={1.25}/>;
}
