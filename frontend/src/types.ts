export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type JobPriority = "low" | "normal" | "high";

export interface Job {
  id: string;
  job_name: string;
  status: JobStatus;
  priority: JobPriority;
  cpu_cores: number;
  memory_gb: number;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  owner?: string;
  error_message?: string | null;
}

export interface DashboardMetrics {
  total: number;
  running: number;
  completed: number;
  failed: number;
  queued: number;
  successRate: number;
}
