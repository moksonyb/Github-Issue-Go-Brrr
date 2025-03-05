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

export interface GitHubAPIConfig {
  token: string;
  repositories: string[]; // Format: "owner/repo"
  pollingInterval: number; // in milliseconds
  issueActions: string[];
  prActions: string[];
  commitActions: string[]; // Actions for commits (pushed, etc.)
}

export interface AppConfig {
  mode: 'webhook' | 'api';
  webhookSecret?: string;
  api?: GitHubAPIConfig;
  allowedIssueActions: string[];
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

export interface GitHubCommit {
  id: string;
  message: string;
  url: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  tree: {
    sha: string;
    url: string;
  };
  distinct: boolean;
  sha: string;
  html_url: string;
  files?: {
    added: string[];
    modified: string[];
    removed: string[];
  };
}

export interface GitHubCommitEvent {
  action: string;
  commit: GitHubCommit;
  repository: GitHubRepository;
  sender: GitHubUser;
  branch: string;
}

export type GitHubEvent = 
  | GitHubIssueEvent 
  | GitHubPullRequestEvent
  | GitHubCommitEvent; 