export interface PrinterConfig {
  type: 'usb' | 'network';
  usb?: {
    vendorId: number;
    productId: number;
  };
  network?: {
    host: string;
    port: number;
  };
}

export interface GitHubRepository {
  id: number;
  full_name: string;
  html_url: string;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitHubMilestone {
  id: number;
  number: number;
  title: string;
  description: string | null;
  state: string;
  due_on: string | null;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: string;
  html_url: string;
  user: GitHubUser;
  assignee: GitHubUser | null;
  assignees: GitHubUser[];
  labels: GitHubLabel[];
  milestone: GitHubMilestone | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface GitHubIssueEvent {
  action: string;
  issue: GitHubIssue;
  repository: GitHubRepository;
  sender: GitHubUser;
  assignee?: GitHubUser;
  label?: GitHubLabel;
}

export interface GitHubPullRequestEvent {
  action: string;
  pull_request: GitHubIssue & {
    merged: boolean;
    merge_commit_sha: string | null;
    head: { ref: string; sha: string };
    base: { ref: string; sha: string };
  };
  repository: GitHubRepository;
  sender: GitHubUser;
}

export type GitHubEvent = 
  | GitHubIssueEvent 
  | GitHubPullRequestEvent; 