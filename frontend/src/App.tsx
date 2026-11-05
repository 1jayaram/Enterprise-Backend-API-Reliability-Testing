import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Bell, Check, ChevronDown,
  CircleHelp, Clock3, Cpu, Database, FileBarChart2, Gauge, HardDrive, LayoutDashboard,
  ListTodo, LogOut, Menu, Plus, RefreshCw, Search, Server, Settings, ShieldCheck,
  Users, X, Zap, Play, Ban, CircleCheck, CircleX, LoaderCircle
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  BarChart, Bar
} from "recharts";
import { api, clearToken, DEMO_MODE, getToken, setToken } from "./api";
import type { Job, JobPriority, JobStatus } from "./types";

type Page = "Overview" | "Workloads" | "Create workload" | "Monitoring" | "Reliability reports" | "Users";
const nav = [
  { label: "Overview" as Page, icon: LayoutDashboard, group: "WORKSPACE" },
  { label: "Workloads" as Page, icon: ListTodo, group: "WORKSPACE" },
  { label: "Create workload" as Page, icon: Plus, group: "WORKSPACE" },
  { label: "Monitoring" as Page, icon: Activity, group: "OPERATIONS" },
  { label: "Reliability reports" as Page, icon: FileBarChart2, group: "OPERATIONS" },
  { label: "Users" as Page, icon: Users, group: "ADMINISTRATION" },
];

const trend = [
  { time: "09:00", requests: 42, errors: 3 }, { time: "10:00", requests: 58, errors: 2 },
  { time: "11:00", requests: 51, errors: 4 }, { time: "12:00", requests: 76, errors: 2 },
  { time: "13:00", requests: 69, errors: 1 }, { time: "14:00", requests: 92, errors: 3 },
  { time: "15:00", requests: 84, errors: 1 }, { time: "16:00", requests: 105, errors: 2 },
];
const statusColor: Record<JobStatus, string> = {
  queued: "yellow", running: "blue", completed: "green", failed: "red", cancelled: "muted",
};

function StatusPill({ status }: { status: JobStatus }) {
  const Icon = status === "completed" ? CircleCheck : status === "failed" ? CircleX : status === "running" ? LoaderCircle : Clock3;
  return <span className={`pill ${statusColor[status]}`}><Icon size={12} />{status}</span>;
}
function Priority({ value }: { value: JobPriority }) {
  return <span className={`priority ${value}`}>{value}</span>;
}
function timeAgo(value: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  return mins < 1 ? "Just now" : mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
}
function shortId(id: string) { return id.length > 13 ? `${id.slice(0, 8)}…` : id; }

export default function App() {
  const [page, setPage] = useState<Page>("Overview");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiHealthy, setApiHealthy] = useState<boolean | null>(null);
  const [token, setTokenState] = useState(getToken());
  const [loginOpen, setLoginOpen] = useState(!DEMO_MODE && !getToken());
  const [mobileNav, setMobileNav] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({ job_name: "", cpu_cores: 4, memory_gb: 8, priority: "normal" as JobPriority });

  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const data = await api.jobs();
      setJobs(data);
      if (!DEMO_MODE) {
        try { await api.health(); setApiHealthy(true); } catch { setApiHealthy(false); }
      } else setApiHealthy(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load workloads");
      setApiHealthy(false);
    } finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const metrics = useMemo(() => {
    const total = jobs.length;
    const completed = jobs.filter(j => j.status === "completed").length;
    const failed = jobs.filter(j => j.status === "failed").length;
    const running = jobs.filter(j => j.status === "running").length;
    const queued = jobs.filter(j => j.status === "queued").length;
    return { total, completed, failed, running, queued, successRate: total ? Math.round(completed / total * 100) : 0 };
  }, [jobs]);

  const filteredJobs = useMemo(() => jobs.filter(j => {
    const matchesQuery = `${j.job_name} ${j.id} ${j.owner || ""}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === "all" || j.status === filter);
  }), [jobs, query, filter]);

  const submitJob = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const created = await api.createJob(form);
      setJobs(current => [created, ...current]);
      setForm({ job_name: "", cpu_cores: 4, memory_gb: 8, priority: "normal" });
      setToast("Workload submitted successfully");
      setPage("Workloads");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not submit workload"); }
  };

  const cancelJob = async (job: Job) => {
    try {
      await api.cancelJob(job.id);
      if (DEMO_MODE) setJobs(current => current.map(j => j.id === job.id ? { ...j, status: "cancelled" } : j));
      else await refresh();
      setToast(`Cancellation requested for ${shortId(job.id)}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Cancellation failed"); }
  };

  const doLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      const result = await api.login(String(data.get("username")), String(data.get("password")));
      setToken(result.access_token); setTokenState(result.access_token); setLoginOpen(false);
      setToast("Signed in successfully"); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Sign in failed"); }
  };

  const logout = () => { clearToken(); setTokenState(null); setLoginOpen(true); };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Activity size={21} /></div>
          <div><strong>WORKLOAD<span>CONTROL</span></strong><small>ENTERPRISE OPERATIONS</small></div>
          <button className="icon-btn mobile-close" onClick={() => setMobileNav(false)}><X size={18}/></button>
        </div>
        <div className="workspace-switch"><div className="workspace-avatar">E</div><div><b>Enterprise workspace</b><small>Local environment</small></div><ChevronDown size={15}/></div>
        {["WORKSPACE", "OPERATIONS", "ADMINISTRATION"].map(group => (
          <div className="nav-group" key={group}>
            <div className="nav-label">{group}</div>
            {nav.filter(n => n.group === group).map(item => {
              const Icon = item.icon;
              return <button key={item.label} className={`nav-item ${page === item.label ? "active" : ""}`} onClick={() => { setPage(item.label); setMobileNav(false); }}>
                <Icon size={17}/><span>{item.label}</span>{item.label === "Workloads" && <em>{jobs.length}</em>}
              </button>;
            })}
          </div>
        ))}
        <div className="sidebar-bottom">
          <div className="help-card"><CircleHelp size={17}/><div><b>Need assistance?</b><small>View system documentation</small></div></div>
          <div className="profile"><div className="profile-avatar">JS</div><div className="profile-info"><b>{DEMO_MODE ? "Demo Operator" : "Workspace User"}</b><small>{DEMO_MODE ? "Demo account" : token ? "Authenticated" : "Not signed in"}</small></div><button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={16}/></button></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="top-left"><button className="icon-btn menu-btn" onClick={() => setMobileNav(true)}><Menu size={19}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div></div>
          <div className="top-actions">
            {DEMO_MODE && <span className="demo-tag"><span/> DEMO DATA</span>}
            <span className={`connection ${apiHealthy ? "online" : "offline"}`}><i/> API {apiHealthy ? "Operational" : apiHealthy === false ? "Unavailable" : "Checking"}</span>
            <button className="icon-btn" title="Refresh data" onClick={() => void refresh()}><RefreshCw size={17} className={loading ? "spin" : ""}/></button>
            <button className="icon-btn notification" title="Notifications"><Bell size={17}/><i/></button>
            <div className="top-avatar">JS</div>
          </div>
        </header>

        <div className="page-content">
          {error && <div className="alert"><AlertTriangle size={17}/><span>{error}</span><button onClick={() => setError("")}><X size={16}/></button></div>}
          {DEMO_MODE && <div className="demo-notice"><Zap size={15}/> You are viewing sample data. Set <code>VITE_DEMO_MODE=false</code> in <code>.env</code> to connect to your FastAPI backend.</div>}
          {page === "Overview" && <Overview jobs={jobs} metrics={metrics} loading={loading} onView={() => setPage("Workloads")} onCancel={cancelJob}/>}
          {page === "Workloads" && <Workloads jobs={filteredJobs} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} onCreate={() => setPage("Create workload")} onCancel={cancelJob} loading={loading}/>}
          {page === "Create workload" && <CreateWorkload form={form} setForm={setForm} onSubmit={submitJob} onCancel={() => setPage("Workloads")}/>}
          {page === "Monitoring" && <Monitoring apiHealthy={apiHealthy} metrics={metrics}/>}
          {page === "Reliability reports" && <Reports jobs={jobs} metrics={metrics}/>}
          {page === "Users" && <UsersPage/>}
        </div>
        <footer className="footer"><span>WORKLOAD CONTROL <b>v1.0.0</b></span><span>Enterprise Workload Management Platform <i/> Local environment</span></footer>
      </main>
      {toast && <div className="toast"><Check size={16}/>{toast}</div>}
      {loginOpen && <div className="modal-backdrop"><form className="login-modal" onSubmit={doLogin}><div className="brand-mark large"><ShieldCheck size={25}/></div><h2>Welcome back</h2><p>Sign in to your enterprise workspace.</p><label>Username<input name="username" autoComplete="username" required placeholder="Enter your username"/></label><label>Password<input name="password" type="password" autoComplete="current-password" required placeholder="Enter your password"/></label><button className="primary-btn full" type="submit">Sign in <ArrowUpRight size={16}/></button><small>Authentication is handled by your FastAPI backend.</small><button type="button" className="text-btn" onClick={() => setLoginOpen(false)}>Continue to interface without signing in</button></form></div>}
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function MetricCard({ label, value, note, icon: Icon, trendUp, tone }: any) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className={`metric-icon ${tone}`}><Icon size={18}/></div></div><div className="metric-value">{value}</div><div className="metric-note">{trendUp ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}<span>{note}</span></div></div>;
}
function Overview({ jobs, metrics, loading, onView, onCancel }: { jobs: Job[]; metrics: any; loading: boolean; onView: () => void; onCancel: (j: Job) => void }) {
  return <>
    <PageHeading eyebrow="OPERATIONS OVERVIEW" title="Good evening, Operator" description="Monitor workload execution and platform health from one place." action={<button className="secondary-btn" onClick={() => window.location.reload()}><RefreshCw size={15}/> Refresh overview</button>}/>
    <div className="metric-grid">
      <MetricCard label="Total workloads" value={metrics.total.toLocaleString()} note="Across loaded records" icon={ListTodo} trendUp tone="violet"/>
      <MetricCard label="Currently running" value={metrics.running} note="Active executions" icon={Activity} trendUp tone="blue"/>
      <MetricCard label="Completed workloads" value={metrics.completed} note={`${metrics.successRate}% of loaded jobs`} icon={Check} trendUp tone="green"/>
      <MetricCard label="Failed workloads" value={metrics.failed} note="Require investigation" icon={AlertTriangle} trendUp={false} tone="red"/>
    </div>
    <div className="content-grid">
      <section className="panel chart-panel"><div className="panel-heading"><div><h3>API request activity</h3><p>Request volume over the selected period</p></div><span className="period-select">Today <ChevronDown size={14}/></span></div><div className="chart-legend"><span><i className="legend-blue"/> Requests</span><span><i className="legend-red"/> Errors</span></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend}><defs><linearGradient id="reqFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#668cff" stopOpacity={0.28}/><stop offset="100%" stopColor="#668cff" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#252d3c" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="time" stroke="#7f8ba0" tickLine={false} axisLine={false}/><YAxis stroke="#7f8ba0" tickLine={false} axisLine={false}/><Tooltip contentStyle={{background:"#151c29",border:"1px solid #2b3547",borderRadius:10,color:"#eef2fa"}}/><Area type="monotone" dataKey="requests" stroke="#7295ff" strokeWidth={2.5} fill="url(#reqFill)"/><Area type="monotone" dataKey="errors" stroke="#f17883" strokeWidth={2} fill="transparent"/></AreaChart></ResponsiveContainer></div></section>
      <section className="panel health-panel"><div className="panel-heading"><div><h3>Platform health</h3><p>Service availability snapshot</p></div><span className="live-label"><i/> LIVE</span></div><div className="health-score"><div className="health-ring"><div><strong>99.9</strong><small>HEALTH</small></div></div><div><b>All systems operational</b><p>Core services are responding normally.</p></div></div><div className="service-list"><Service icon={Server} label="API Gateway" state="Operational"/><Service icon={Database} label="PostgreSQL" state="Operational"/><Service icon={Cpu} label="Job Workers" state={metrics.running ? "Processing" : "Idle"}/></div></section>
    </div>
    <section className="panel table-panel"><div className="panel-heading"><div><h3>Recent workloads</h3><p>Latest activity across your workspace</p></div><button className="link-btn" onClick={onView}>View all workloads <ArrowUpRight size={15}/></button></div><JobTable jobs={jobs.slice(0,5)} onCancel={onCancel} loading={loading}/></section>
  </>;
}
function Service({ icon: Icon, label, state }: any) { return <div className="service-row"><div className="service-name"><Icon size={16}/>{label}</div><span><i/>{state}</span></div>; }

function JobTable({ jobs, onCancel, loading }: { jobs: Job[]; onCancel: (j: Job) => void; loading: boolean }) {
  if (loading) return <div className="empty-state">Loading workloads…</div>;
  if (!jobs.length) return <div className="empty-state">No workloads found. Create your first workload to get started.</div>;
  return <div className="table-scroll"><table><thead><tr><th>WORKLOAD</th><th>STATUS</th><th>PRIORITY</th><th>RESOURCES</th><th>SUBMITTED</th><th>OWNER</th><th/></tr></thead><tbody>{jobs.map(job => <tr key={job.id}><td><div className="job-name">{job.job_name}<small>{shortId(job.id)}</small></div></td><td><StatusPill status={job.status}/></td><td><Priority value={job.priority}/></td><td><span className="resource"><Cpu size={13}/>{job.cpu_cores} CPU</span><span className="resource"><HardDrive size={13}/>{job.memory_gb} GB</span></td><td>{timeAgo(job.created_at)}</td><td>{job.owner || "—"}</td><td>{["queued","running"].includes(job.status) && <button className="row-action" title="Cancel workload" onClick={() => onCancel(job)}><Ban size={15}/></button>}</td></tr>)}</tbody></table></div>;
}
function Workloads({ jobs, query, setQuery, filter, setFilter, onCreate, onCancel, loading }: any) {
  return <><PageHeading eyebrow="WORKSPACE / JOB QUEUE" title="Workloads" description="Inspect, filter and manage workload executions." action={<button className="primary-btn" onClick={onCreate}><Plus size={16}/> New workload</button>}/><section className="panel table-panel"><div className="toolbar"><div className="search-box"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by workload, ID or owner…"/></div><select value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All statuses</option><option value="queued">Queued</option><option value="running">Running</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select></div><JobTable jobs={jobs} onCancel={onCancel} loading={loading}/><div className="table-foot">Showing {jobs.length} workload record(s)</div></section></>;
}
function CreateWorkload({ form, setForm, onSubmit, onCancel }: any) {
  const update = (key: string, value: string | number) => setForm((f: any) => ({ ...f, [key]: value }));
  return <><PageHeading eyebrow="WORKSPACE / NEW JOB" title="Submit a workload" description="Configure compute requirements and enqueue a new execution."/><div className="form-layout"><form className="panel workload-form" onSubmit={onSubmit}><div className="form-section-title"><div className="section-icon"><Zap size={17}/></div><div><h3>Workload configuration</h3><p>Provide the workload details below.</p></div></div><label>Workload name<input required minLength={3} maxLength={100} value={form.job_name} onChange={e => update("job_name",e.target.value)} placeholder="e.g. Customer data transformation"/></label><div className="form-two"><label>CPU cores<input type="number" min="1" max="128" required value={form.cpu_cores} onChange={e => update("cpu_cores",Number(e.target.value))}/><small>Number of virtual CPU cores requested.</small></label><label>Memory (GB)<input type="number" min="1" max="512" required value={form.memory_gb} onChange={e => update("memory_gb",Number(e.target.value))}/><small>Maximum memory allocation.</small></label></div><label>Execution priority<select value={form.priority} onChange={e => update("priority",e.target.value)}><option value="low">Low — Background execution</option><option value="normal">Normal — Standard queue</option><option value="high">High — Prioritised queue</option></select></label><div className="form-actions"><button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button><button className="primary-btn" type="submit"><Play size={15}/> Submit workload</button></div></form><aside className="panel info-panel"><div className="section-icon"><ShieldCheck size={18}/></div><h3>Submission safeguards</h3><p>Workloads are validated by the backend before entering the queue.</p><ul><li><Check size={14}/> Resource limits validated server-side</li><li><Check size={14}/> Authenticated user ownership</li><li><Check size={14}/> Idempotency support (backend dependent)</li><li><Check size={14}/> Execution status persisted in PostgreSQL</li></ul><div className="info-note"><AlertTriangle size={15}/> Actual scheduling and execution require a worker service to be implemented and running.</div></aside></div></>;
}
function Monitoring({ apiHealthy, metrics }: any) {
  return <><PageHeading eyebrow="OPERATIONS / TELEMETRY" title="System monitoring" description="Observe API availability, workload activity and service health."/><div className="metric-grid"><MetricCard label="API availability" value={apiHealthy ? "Online" : "Unknown"} note="Health endpoint check" icon={Activity} trendUp tone="green"/><MetricCard label="Queued jobs" value={metrics.queued} note="Awaiting execution" icon={Clock3} trendUp tone="yellow"/><MetricCard label="Active workers" value={metrics.running} note="Running workloads" icon={Cpu} trendUp tone="blue"/><MetricCard label="Failed jobs" value={metrics.failed} note="Review failure details" icon={AlertTriangle} trendUp={false} tone="red"/></div><div className="content-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h3>Request throughput</h3><p>Illustrative telemetry until metrics endpoint is connected</p></div></div><div className="chart-wrap tall"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}><CartesianGrid stroke="#252d3c" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="time" stroke="#7f8ba0" tickLine={false} axisLine={false}/><YAxis stroke="#7f8ba0" tickLine={false} axisLine={false}/><Tooltip contentStyle={{background:"#151c29",border:"1px solid #2b3547",borderRadius:10}}/><Bar dataKey="requests" fill="#7295ff" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></section><section className="panel health-panel"><div className="panel-heading"><div><h3>Infrastructure</h3><p>Connected platform components</p></div></div><div className="service-list expanded"><Service icon={Server} label="FastAPI application" state={apiHealthy ? "Healthy" : "Unreachable"}/><Service icon={Database} label="PostgreSQL database" state="Backend status required"/><Service icon={Cpu} label="Worker process" state="Backend status required"/></div><p className="muted-note">For real CPU, memory, latency and error-rate telemetry, expose a protected backend metrics endpoint and connect it here.</p></section></div></>;
}
function Reports({ jobs, metrics }: any) {
  return <><PageHeading eyebrow="QUALITY / RELIABILITY" title="Reliability reports" description="A central view of workload outcomes and QA evidence."/><div className="metric-grid"><MetricCard label="Observed jobs" value={metrics.total} note="Current API result set" icon={ListTodo} trendUp tone="violet"/><MetricCard label="Completion rate" value={`${metrics.successRate}%`} note="Completed / observed" icon={Check} trendUp tone="green"/><MetricCard label="Failure count" value={metrics.failed} note="Requires triage" icon={AlertTriangle} trendUp={false} tone="red"/><MetricCard label="Queued + running" value={metrics.queued + metrics.running} note="Not yet terminal" icon={Gauge} trendUp tone="blue"/></div><div className="content-grid"><section className="panel report-card"><div className="report-icon"><ShieldCheck size={20}/></div><h3>API automation</h3><p>Pytest + HTTPX test suite results.</p><div className="report-meta"><span>Test run status</span><b>Connect CI report</b></div><div className="report-meta"><span>Coverage</span><b>Not connected</b></div><button className="secondary-btn" disabled>View test report</button></section><section className="panel report-card"><div className="report-icon blue"><Gauge size={20}/></div><h3>Performance testing</h3><p>Locust load, stress, spike and endurance testing.</p><div className="report-meta"><span>Latest run</span><b>Not connected</b></div><div className="report-meta"><span>Requests / sec</span><b>—</b></div><button className="secondary-btn" disabled>View Locust report</button></section></div><section className="panel table-panel"><div className="panel-heading"><div><h3>Failure review queue</h3><p>Workloads with failed execution status</p></div></div><JobTable jobs={jobs.filter((j: Job) => j.status === "failed")} onCancel={() => {}} loading={false}/></section><div className="demo-notice"><AlertTriangle size={15}/> Test counts, coverage and Locust statistics are intentionally not fabricated. Connect your generated JUnit XML, coverage and Locust reports to populate this section.</div></>;
}
function UsersPage() {
  return <><PageHeading eyebrow="ADMINISTRATION / ACCESS" title="User management" description="Review accounts and role-based access to the workload platform."/><div className="panel placeholder-panel"><div className="placeholder-icon"><Users size={25}/></div><h3>Admin users endpoint not connected</h3><p>Connect <code>GET /api/v1/admin/users</code> and enforce admin-only access in FastAPI to populate this page. Do not expose user records to ordinary users.</p></div></>;
}
