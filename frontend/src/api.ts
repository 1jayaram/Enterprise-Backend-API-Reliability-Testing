import type { Job, JobPriority } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
const TOKEN_KEY = "workload_control_access_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body.detail || body.message || `Request failed (${response.status})`;
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const demoJobs: Job[] = [
  { id: "JOB-10482", job_name: "Customer Churn Feature Pipeline", status: "running", priority: "high", cpu_cores: 8, memory_gb: 16, created_at: new Date(Date.now() - 8 * 60000).toISOString(), owner: "jayaram" },
  { id: "JOB-10481", job_name: "Monthly Revenue Aggregation", status: "completed", priority: "normal", cpu_cores: 4, memory_gb: 8, created_at: new Date(Date.now() - 28 * 60000).toISOString(), owner: "analyst01", completed_at: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: "JOB-10480", job_name: "Telemetry Anomaly Detection", status: "queued", priority: "high", cpu_cores: 12, memory_gb: 32, created_at: new Date(Date.now() - 3 * 60000).toISOString(), owner: "jayaram" },
  { id: "JOB-10479", job_name: "Inventory Forecast Batch", status: "failed", priority: "low", cpu_cores: 2, memory_gb: 4, created_at: new Date(Date.now() - 70 * 60000).toISOString(), owner: "ops-team", error_message: "Worker exceeded execution timeout" },
  { id: "JOB-10478", job_name: "Product Recommendation Model", status: "completed", priority: "normal", cpu_cores: 8, memory_gb: 16, created_at: new Date(Date.now() - 110 * 60000).toISOString(), owner: "ml-team" },
];

export const api = {
  health: () => request<{ status: string; service?: string }>("/health"),
  login: (username: string, password: string) =>
    request<{ access_token: string; token_type?: string; user?: { username: string; role?: string } }>("/api/v1/auth/login", {
      method: "POST", body: JSON.stringify({ username, password }),
    }),
  jobs: async (): Promise<Job[]> => {
    if (DEMO_MODE) return [...demoJobs];
    const data = await request<Job[] | { items: Job[]; total?: number }>("/api/v1/jobs");
    return Array.isArray(data) ? data : data.items;
  },
  createJob: async (payload: { job_name: string; cpu_cores: number; memory_gb: number; priority: JobPriority }): Promise<Job> => {
    if (DEMO_MODE) {
      return { ...payload, id: `DEMO-${Math.floor(10000 + Math.random() * 89999)}`, status: "queued", created_at: new Date().toISOString(), owner: "demo-user" };
    }
    return request<Job>("/api/v1/jobs", { method: "POST", body: JSON.stringify(payload) });
  },
  cancelJob: async (id: string): Promise<void> => {
    if (DEMO_MODE) return;
    await request(`/api/v1/jobs/${id}/cancel`, { method: "POST" });
  },
  users: () => request<Array<{ id: string; username: string; email: string; role: string; is_active: boolean }>>("/api/v1/admin/users"),
};

export const demoHealth = { status: "healthy", service: "workload-api" };
