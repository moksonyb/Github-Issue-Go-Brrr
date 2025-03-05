import axios from 'axios';
import { GitHubAPIConfig, GitHubIssueEvent, GitHubPullRequestEvent, GitHubEvent, GitHubCommitEvent, GitHubCommit } from './types';

export class GitHubAPIService {
  private config: GitHubAPIConfig;
  private lastCheckedIssues: Map<string, Date>;
  private lastCheckedPRs: Map<string, Date>;
  private lastCheckedCommits: Map<string, Date>;
  private pollingInterval: NodeJS.Timeout | null = null;
  private validRepositories: string[] = [];

  constructor(config: GitHubAPIConfig) {
    this.config = config;
    this.lastCheckedIssues = new Map();
    this.lastCheckedPRs = new Map();
    this.lastCheckedCommits = new Map();
  }

  /**
   * Lists repositories that the authenticated user has access to
   * @param affiliation Optional filter for repository affiliation (owner, collaborator, organization_member)
   * @param sort Optional sort field (created, updated, pushed, full_name)
   * @param direction Optional sort direction (asc, desc)
   * @param perPage Optional number of results per page (max 100)
   * @returns Array of repository objects
   */
  public async listUserRepositories(
    affiliation: string = 'owner,collaborator,organization_member',
    sort: 'created' | 'updated' | 'pushed' | 'full_name' = 'full_name',
    direction: 'asc' | 'desc' = 'asc',
    perPage: number = 100
  ): Promise<any[]> {
    try {
      // Use the /user/repos endpoint to get all repositories the user has access to
      // This includes private repositories where the user is a member
      const response = await axios.get('https://api.github.com/user/repos', {
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${this.config.token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        },
        params: {
          affiliation, // Use affiliation instead of type
          sort,
          direction,
          per_page: perPage
        }
      });

      console.log(`Found ${response.data.length} repositories for the authenticated user`);
      
      // Map the response to a more concise format with relevant information
      return response.data.map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        html_url: repo.html_url,
        description: repo.description,
        updated_at: repo.updated_at,
        permissions: repo.permissions, // Include permissions to show what access the user has
        owner: {
          login: repo.owner.login,
          avatar_url: repo.owner.avatar_url
        },
        // Add additional fields to help users identify repositories
        visibility: repo.visibility,
        // Determine relationship based on owner login
        relationship: repo.owner.login === this.getUsername(this.config.token) 
          ? 'owner' 
          : (repo.owner.type === 'Organization' ? 'organization_member' : 'collaborator')
      }));
    } catch (error: any) {
      console.error('Error listing user repositories:', error.response?.data || error.message);
      throw new Error(`Failed to list repositories: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Extract username from token (for basic comparison only)
   * This is a simple helper method and not a secure way to get the username
   */
  private getUsername(token: string): string {
    try {
      // Try to extract username from token payload if it's a JWT
      // This is just a heuristic and may not work for all token types
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload.login || '';
      }
      return '';
    } catch (e) {
      return '';
    }
  }

  public async validateRepositories(): Promise<string[]> {
    console.log('Validating repositories...');
    this.validRepositories = [];
    
    for (const repo of this.config.repositories) {
      try {
        const [owner, repoName] = repo.split('/');
        
        // Check if repository exists and is accessible
        const response = await axios.get(
          `https://api.github.com/repos/${owner}/${repoName}`,
          {
            headers: {
              'Authorization': `token ${this.config.token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          }
        );
        
        if (response.status === 200) {
          console.log(`✅ Repository ${repo} is valid and accessible`);
          this.validRepositories.push(repo);
          this.lastCheckedIssues.set(repo, new Date());
          this.lastCheckedPRs.set(repo, new Date());
        }
      } catch (error: any) {
        if (error.response && error.response.status === 404) {
          console.error(`❌ Repository ${repo} not found or not accessible with current token`);
        } else if (error.response && error.response.status === 401) {
          console.error(`❌ Authentication failed for ${repo}. Check your token permissions.`);
        } else {
          console.error(`❌ Error validating repository ${repo}:`, error.message);
        }
      }
    }
    
    if (this.validRepositories.length === 0) {
      console.error('No valid repositories found. Please check your configuration and token permissions.');
    } else {
      console.log(`Found ${this.validRepositories.length} valid repositories to monitor.`);
    }
    
    return this.validRepositories;
  }

  public async startPolling(callback: (event: GitHubEvent) => Promise<void>): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    
    // Validate repositories before starting to poll
    await this.validateRepositories();
    
    if (this.validRepositories.length === 0) {
      console.error('Cannot start polling: No valid repositories found.');
      return;
    }

    this.pollingInterval = setInterval(async () => {
      try {
        for (const repo of this.validRepositories) {
          // Check for new issues
          const issues = await this.checkForNewIssues(repo);
          for (const event of issues) {
            await callback(event);
          }

          // Check for new pull requests
          const prs = await this.checkForNewPullRequests(repo);
          for (const event of prs) {
            await callback(event);
          }
          
          // Check for new commits
          const commits = await this.checkForNewCommits(repo);
          for (const event of commits) {
            await callback(event);
          }
        }
      } catch (error) {
        console.error('Error polling GitHub API:', error);
      }
    }, this.config.pollingInterval);

    console.log(`Started polling GitHub API for ${this.validRepositories.length} repositories every ${this.config.pollingInterval / 1000} seconds`);
  }

  public stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('Stopped polling GitHub API');
    }
  }

  /**
   * Gets the last time commits were checked for a repository
   * @param repo Repository in owner/repo format
   * @returns Date object or null if repository has not been checked
   */
  public getLastCheckedCommits(repo: string): Date | null {
    return this.lastCheckedCommits.get(repo) || null;
  }

  private async checkForNewIssues(repo: string): Promise<GitHubIssueEvent[]> {
    const [owner, repoName] = repo.split('/');
    const lastChecked = this.lastCheckedIssues.get(repo) || new Date();
    const since = lastChecked.toISOString();
    
    // Update last checked time
    this.lastCheckedIssues.set(repo, new Date());

    try {
      // First check if the repository exists and is accessible
      const repoResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repoName}`,
        {
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      const repository = repoResponse.data;
      
      // Now get the issues
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repoName}/issues`,
        {
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          params: {
            state: 'all',
            since,
            sort: 'updated',
            direction: 'desc'
          }
        }
      );

      const events: GitHubIssueEvent[] = [];

      for (const issue of response.data) {
        // Skip pull requests (they have a pull_request property)
        if (issue.pull_request) continue;

        // Determine the action based on issue state and updated_at
        let action = 'updated';
        
        if (new Date(issue.created_at).getTime() > lastChecked.getTime()) {
          action = 'opened';
        } else if (issue.state === 'closed' && issue.closed_at && new Date(issue.closed_at).getTime() > lastChecked.getTime()) {
          action = 'closed';
        } else if (issue.state === 'open' && issue.closed_at) {
          action = 'reopened';
        }

        // Skip if the action is not in the allowed list
        if (!this.config.issueActions.includes(action)) {
          continue;
        }

        // Create event object
        const event: GitHubIssueEvent = {
          action,
          issue,
          repository,
          sender: issue.user
        };

        events.push(event);
      }

      return events;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        console.error(`Repository ${repo} not found or not accessible. Removing from valid repositories.`);
        this.validRepositories = this.validRepositories.filter(r => r !== repo);
      } else {
        console.error(`Error checking for new issues in ${repo}:`, error.message);
      }
      return [];
    }
  }

  private async checkForNewPullRequests(repo: string): Promise<GitHubPullRequestEvent[]> {
    const [owner, repoName] = repo.split('/');
    const lastChecked = this.lastCheckedPRs.get(repo) || new Date();
    const since = lastChecked.toISOString();
    
    // Update last checked time
    this.lastCheckedPRs.set(repo, new Date());

    try {
      // First check if the repository exists and is accessible
      const repoResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repoName}`,
        {
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      const repository = repoResponse.data;
      
      // Now get the pull requests
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repoName}/pulls`,
        {
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          params: {
            state: 'all',
            sort: 'updated',
            direction: 'desc'
          }
        }
      );

      const events: GitHubPullRequestEvent[] = [];

      for (const pr of response.data) {
        // Only process PRs updated after last check
        if (new Date(pr.updated_at).getTime() <= lastChecked.getTime()) {
          continue;
        }

        // Determine the action based on PR state and updated_at
        let action = 'updated';
        
        if (new Date(pr.created_at).getTime() > lastChecked.getTime()) {
          action = 'opened';
        } else if (pr.state === 'closed') {
          if (pr.merged) {
            action = 'closed';
          } else {
            action = 'closed';
          }
        } else if (pr.state === 'open' && pr.merged_at === null) {
          action = 'reopened';
        }

        // Skip if the action is not in the allowed list
        if (!this.config.prActions.includes(action)) {
          continue;
        }

        // Create event object
        const event: GitHubPullRequestEvent = {
          action,
          pull_request: {
            ...pr,
            merged: Boolean(pr.merged_at)
          },
          repository,
          sender: pr.user
        };

        events.push(event);
      }

      return events;
    } catch (error: any) {
      if (error.response && error.response.status === 404) {
        console.error(`Repository ${repo} not found or not accessible. Removing from valid repositories.`);
        this.validRepositories = this.validRepositories.filter(r => r !== repo);
      } else {
        console.error(`Error checking for new pull requests in ${repo}:`, error.message);
      }
      return [];
    }
  }

  public async checkForNewCommits(repo: string): Promise<GitHubCommitEvent[]> {
    const [owner, repoName] = repo.split('/');
    const lastChecked = this.lastCheckedCommits.get(repo) || new Date();
    const since = lastChecked.toISOString();
    
    // Update last checked time
    this.lastCheckedCommits.set(repo, new Date());

    try {
      // Get commits since last check using the GitHub REST API
      // Reference: https://docs.github.com/en/rest/commits/commits
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repoName}/commits`,
        {
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          params: {
            since,
            per_page: 10 // Limit to 10 most recent commits
          }
        }
      );

      // Get repository info for branch name
      const repoResponse = await axios.get(
        `https://api.github.com/repos/${owner}/${repoName}`,
        {
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );
      
      const repository = repoResponse.data;
      const defaultBranch = repository.default_branch || 'main';
      
      const events: GitHubCommitEvent[] = [];

      // Process each commit
      for (const commitData of response.data) {
        // Map the GitHub API response to our GitHubCommit interface
        const commit: GitHubCommit = {
          id: commitData.sha,
          sha: commitData.sha,
          message: commitData.commit.message,
          url: commitData.url,
          html_url: commitData.html_url,
          author: {
            name: commitData.commit.author.name,
            email: commitData.commit.author.email,
            date: commitData.commit.author.date
          },
          committer: {
            name: commitData.commit.committer.name,
            email: commitData.commit.committer.email,
            date: commitData.commit.committer.date
          },
          tree: {
            sha: commitData.commit.tree.sha,
            url: commitData.commit.tree.url
          },
          distinct: true
        };

        // Fetch the commit details to get the file changes
        try {
          const commitDetails = await axios.get(
            `https://api.github.com/repos/${owner}/${repoName}/commits/${commitData.sha}`,
            {
              headers: {
                Authorization: `token ${this.config.token}`,
                Accept: 'application/vnd.github.v3+json'
              }
            }
          );

          // Extract file changes
          if (commitDetails.data.files) {
            const added: string[] = [];
            const modified: string[] = [];
            const removed: string[] = [];

            for (const file of commitDetails.data.files) {
              if (file.status === 'added') {
                added.push(file.filename);
              } else if (file.status === 'modified') {
                modified.push(file.filename);
              } else if (file.status === 'removed') {
                removed.push(file.filename);
              }
            }

            commit.files = { added, modified, removed };
          }
        } catch (error) {
          console.error(`Error fetching details for commit ${commitData.sha}:`, error);
        }

        // Only process commits that match our configured actions
        const action = 'pushed';
        if (this.config.commitActions.includes(action)) {
          // Determine which branch this commit is on
          // For simplicity, we'll use the default branch
          // In a more advanced implementation, you could query the branches API
          const branch = defaultBranch;
          
          // Create the event
          const sender = commitData.author ? {
            login: commitData.author.login,
            id: commitData.author.id,
            avatar_url: commitData.author.avatar_url
          } : {
            login: commit.author.name,
            id: 0,
            avatar_url: ''
          };
          
          events.push({
            action,
            commit,
            repository,
            sender,
            branch
          });
          
          console.log(`Found new commit: ${commit.sha.substring(0, 7)} by ${commit.author.name} in ${repo}`);
        }
      }

      return events;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        if (error.response.status === 404) {
          console.error(`Repository not found: ${repo}`);
          // Remove from valid repositories
          this.validRepositories = this.validRepositories.filter(r => r !== repo);
        } else if (error.response.status === 401) {
          console.error(`Authentication failed for repository: ${repo}`);
        } else {
          console.error(`Error checking commits for ${repo}:`, error.response.status, error.response.statusText);
        }
      } else {
        console.error(`Error checking commits for ${repo}:`, error);
      }
      return [];
    }
  }
} 