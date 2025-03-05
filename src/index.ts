import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import { PrinterService } from './printer-service';
import { GitHubAPIService } from './github-api-service';
import { 
  PrinterConfig, 
  GitHubIssueEvent, 
  GitHubPullRequestEvent, 
  AppConfig, 
  GitHubAPIConfig, 
  GitHubEvent,
  GitHubCommit,
  GitHubCommitEvent
} from './types';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Configure the application
const app = express();
const port = process.env.PORT || 3000;

// Get application mode
const appMode = process.env.GITHUB_MODE?.toLowerCase() === 'api' ? 'api' : 'webhook';

// Get allowed issue actions from environment
const allowedIssueActions = (process.env.GITHUB_ISSUE_ACTIONS || 'opened,reopened')
  .split(',')
  .map(action => action.trim());

// Get allowed commit actions from environment
const allowedCommitActions = (process.env.GITHUB_COMMIT_ACTIONS || 'pushed')
  .split(',')
  .map(action => action.trim());

// Configure app based on mode
const appConfig: AppConfig = {
  mode: appMode,
  allowedIssueActions
};

if (appMode === 'webhook') {
  appConfig.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || '';
  console.log(`Running in webhook mode`);
  console.log(`Configured to process issue actions: ${allowedIssueActions.join(', ')}`);
} else {
  // API mode configuration
  const repositories = (process.env.GITHUB_REPOSITORIES || '')
    .split(',')
    .map(repo => repo.trim())
    .filter(repo => repo.includes('/'));

  if (repositories.length === 0) {
    console.error('No repositories configured for API mode. Please set GITHUB_REPOSITORIES environment variable.');
    process.exit(1);
  }

  const apiConfig: GitHubAPIConfig = {
    token: process.env.GITHUB_API_TOKEN || '',
    repositories,
    pollingInterval: parseInt(process.env.GITHUB_POLLING_INTERVAL || '60000', 10),
    issueActions: allowedIssueActions,
    prActions: allowedIssueActions, // Using the same actions for PRs for simplicity
    commitActions: allowedCommitActions
  };

  if (!apiConfig.token) {
    console.error('GitHub API token is required for API mode. Please set GITHUB_API_TOKEN environment variable.');
    process.exit(1);
  }

  appConfig.api = apiConfig;
  
  console.log(`Running in API polling mode`);
  console.log(`Configured to monitor repositories: ${repositories.join(', ')}`);
  console.log(`Polling interval: ${apiConfig.pollingInterval / 1000} seconds`);
  console.log(`Configured to process issue/PR actions: ${allowedIssueActions.join(', ')}`);
}

// Configure printer based on environment variables
const printerType = process.env.PRINTER_TYPE === 'network' ? 'network' : 'usb';

const printerConfig: PrinterConfig = {
  type: printerType,
};

if (printerType === 'usb') {
  const vendorId = process.env.PRINTER_VENDOR_ID || '';
  const productId = process.env.PRINTER_PRODUCT_ID || '';
  
  if (!vendorId || !productId) {
    console.error('USB printer configuration requires PRINTER_VENDOR_ID and PRINTER_PRODUCT_ID');
    process.exit(1);
  }
  
  printerConfig.usb = {
    vendorId: parseInt(vendorId, 16),
    productId: parseInt(productId, 16)
  };
  
  console.log(`Configured for USB printer: Vendor ID: ${vendorId}, Product ID: ${productId}`);
} else {
  const host = process.env.PRINTER_IP || '';
  const port = process.env.PRINTER_PORT || '';
  
  if (!host || !port) {
    console.error('Network printer configuration requires PRINTER_IP and PRINTER_PORT');
    process.exit(1);
  }
  
  printerConfig.network = {
    host,
    port: parseInt(port, 10)
  };
  
  console.log(`Configured for network printer: IP: ${host}, Port: ${port}`);
}

// Initialize printer service
const printerService = new PrinterService(printerConfig);

// Handle GitHub events
async function handleGitHubEvent(event: GitHubEvent): Promise<void> {
  // Check if the action is allowed based on event type
  if ('issue' in event || 'pull_request' in event) {
    if (!allowedIssueActions.includes(event.action)) {
      console.log(`Ignoring ${event.action} event (not in allowed actions)`);
      return;
    }
  } else if ('commit' in event) {
    if (!allowedCommitActions.includes(event.action)) {
      console.log(`Ignoring ${event.action} commit event (not in allowed actions)`);
      return;
    }
  }

  console.log(`Processing ${event.action} event`);
  
  try {
    const success = await printerService.printEvent(event);
    if (success) {
      console.log('Event printed successfully');
    } else {
      console.error('Failed to print event');
    }
  } catch (error) {
    console.error('Error printing event:', error);
  }
}

// Set up based on mode
if (appConfig.mode === 'webhook') {
  // Webhook mode setup
  app.use(bodyParser.json());

  // GitHub webhook endpoint
  app.post('/webhook', (req, res) => {
    // Verify webhook signature
    if (!verifySignature(req)) {
      console.error('Invalid webhook signature');
      return res.status(401).send('Invalid signature');
    }

    const event = req.header('X-GitHub-Event');
    
    if (event === 'issues') {
      const issueEvent = req.body as GitHubIssueEvent;
      handleGitHubEvent(issueEvent);
    } else if (event === 'pull_request') {
      const prEvent = req.body as GitHubPullRequestEvent;
      handleGitHubEvent(prEvent);
    } else if (event === 'push') {
      // Handle push events (commits)
      try {
        // Extract the relevant information from the push event
        const pushEvent = req.body;
        const repository = pushEvent.repository;
        const sender = pushEvent.sender;
        const branch = pushEvent.ref.replace('refs/heads/', '');
        
        // Process each commit in the push
        for (const commitData of pushEvent.commits) {
          const commit: GitHubCommit = {
            id: commitData.id,
            sha: commitData.id,
            message: commitData.message,
            url: commitData.url,
            html_url: commitData.url.replace('api.github.com/repos', 'github.com').replace('/commits/', '/commit/'),
            author: {
              name: commitData.author.name,
              email: commitData.author.email,
              date: commitData.timestamp
            },
            committer: {
              name: commitData.committer.name,
              email: commitData.committer.email,
              date: commitData.timestamp
            },
            tree: {
              sha: '',  // Not available in webhook payload
              url: ''   // Not available in webhook payload
            },
            distinct: commitData.distinct,
            files: {
              added: commitData.added || [],
              modified: commitData.modified || [],
              removed: commitData.removed || []
            }
          };
          
          // Create a commit event
          const commitEvent: GitHubCommitEvent = {
            action: 'pushed',
            commit,
            repository,
            sender,
            branch
          };
          
          // Only process distinct commits (not already processed)
          if (commit.distinct) {
            handleGitHubEvent(commitEvent);
          }
        }
      } catch (error) {
        console.error('Error processing push event:', error);
      }
    } else {
      console.log(`Ignoring unsupported event type: ${event}`);
    }

    res.status(200).send('Event received');
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  // Start the server
  app.listen(port, () => {
    console.log(`Webhook server listening on port ${port}`);
  });
} else if (appConfig.mode === 'api' && appConfig.api) {
  // API mode setup
  const apiService = new GitHubAPIService(appConfig.api);
  
  // Start polling
  (async () => {
    try {
      await apiService.startPolling(handleGitHubEvent);
    } catch (error) {
      console.error('Failed to start API polling:', error);
      process.exit(1);
    }
  })();
  
  // Set up a minimal server for health checks and status
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
  
  app.get('/status', (req, res) => {
    res.status(200).json({
      mode: 'api',
      repositories: appConfig.api?.repositories || [],
      pollingInterval: appConfig.api?.pollingInterval || 0,
      allowedIssueActions: allowedIssueActions,
      allowedCommitActions: allowedCommitActions
    });
  });
  
  // Add endpoint to list repositories (only in API mode)
  app.get('/repositories', async (req, res) => {
    try {
      // Get query parameters with defaults
      const affiliation = (req.query.affiliation as string) || 'owner,collaborator,organization_member';
      const sort = (req.query.sort as 'created' | 'updated' | 'pushed' | 'full_name') || 'full_name';
      const direction = (req.query.direction as 'asc' | 'desc') || 'asc';
      const perPage = parseInt(req.query.per_page as string || '100', 10);
      
      const repositories = await apiService.listUserRepositories(affiliation, sort, direction, perPage);
      
      // Add information about which repositories are currently being monitored
      const monitoredRepos = appConfig.api?.repositories || [];
      const enhancedRepositories = repositories.map(repo => ({
        ...repo,
        is_monitored: monitoredRepos.includes(repo.full_name)
      }));
      
      res.status(200).json({
        count: repositories.length,
        currently_monitoring: monitoredRepos,
        repositories: enhancedRepositories
      });
    } catch (error: any) {
      console.error('Error in /repositories endpoint:', error.message);
      res.status(500).json({ 
        error: 'Failed to list repositories',
        message: error.message
      });
    }
  });
  
  // Add endpoint to add a repository to the monitoring list
  app.post('/repositories/monitor', bodyParser.json(), async (req, res) => {
    try {
      if (!req.body.repository) {
        return res.status(400).json({ error: 'Repository name is required' });
      }
      
      const repoToAdd = req.body.repository;
      
      // Validate that the repository exists and is accessible
      if (!appConfig.api) {
        return res.status(500).json({ error: 'API configuration not available' });
      }
      
      // Create a temporary config with just this repository
      const tempConfig = { ...appConfig.api, repositories: [repoToAdd] };
      const tempService = new GitHubAPIService(tempConfig);
      
      try {
        const validRepos = await tempService.validateRepositories();
        
        if (validRepos.length === 0) {
          return res.status(404).json({ 
            error: 'Repository not found or not accessible',
            message: `Could not access repository: ${repoToAdd}`
          });
        }
        
        // Add to the monitored repositories if not already there
        if (!appConfig.api.repositories.includes(repoToAdd)) {
          appConfig.api.repositories.push(repoToAdd);
          console.log(`Added repository to monitoring list: ${repoToAdd}`);
        }
        
        res.status(200).json({ 
          success: true, 
          message: `Repository ${repoToAdd} is now being monitored`,
          currently_monitoring: appConfig.api.repositories
        });
      } catch (error: any) {
        return res.status(400).json({ 
          error: 'Failed to validate repository',
          message: error.message
        });
      }
    } catch (error: any) {
      console.error('Error adding repository to monitor:', error.message);
      res.status(500).json({ 
        error: 'Failed to add repository',
        message: error.message
      });
    }
  });
  
  // Add debug endpoint to check commit monitoring
  app.get('/debug/commits', async (req, res) => {
    try {
      // Get the repository from query parameter
      const repo = req.query.repo as string;
      const force = req.query.force === 'true';
      
      if (!repo || !repo.includes('/')) {
        return res.status(400).json({
          error: 'Invalid repository format. Use owner/repo format.'
        });
      }
      
      // Get the last checked time for this repository
      const lastChecked = apiService.getLastCheckedCommits(repo);
      
      // If force=true and the repository is monitored, check for new commits
      let newCommits = [];
      if (force && appConfig.api?.repositories.includes(repo)) {
        console.log(`Force checking for new commits in ${repo}`);
        newCommits = await apiService.checkForNewCommits(repo);
        
        // Process any new commits found
        for (const event of newCommits) {
          await handleGitHubEvent(event);
        }
      }
      
      // Get recent commits for this repository
      const [owner, repoName] = repo.split('/');
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repoName}/commits`,
        {
          headers: {
            'Authorization': `token ${appConfig.api?.token}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          params: {
            per_page: 5 // Get the 5 most recent commits
          }
        }
      );
      
      res.status(200).json({
        repository: repo,
        last_checked: lastChecked ? lastChecked.toISOString() : null,
        is_monitored: appConfig.api?.repositories.includes(repo) || false,
        force_check: force,
        new_commits_found: newCommits.length,
        recent_commits: response.data.map((commit: any) => ({
          sha: commit.sha,
          message: commit.commit.message.split('\n')[0], // First line of commit message
          author: commit.commit.author.name,
          date: commit.commit.author.date,
          url: commit.html_url
        }))
      });
    } catch (error) {
      console.error('Error in debug/commits endpoint:', error);
      res.status(500).json({
        error: 'Failed to get commit information'
      });
    }
  });
  
  // Start the server (just for health checks)
  app.listen(port, () => {
    console.log(`Health check server listening on port ${port}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down...');
    apiService.stopPolling();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('Shutting down...');
    apiService.stopPolling();
    process.exit(0);
  });
}

function verifySignature(req: express.Request): boolean {
  if (appConfig.mode !== 'webhook' || !appConfig.webhookSecret) {
    return false;
  }
  
  const signature = req.header('X-Hub-Signature-256');
  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', appConfig.webhookSecret);
  const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
  
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
} 