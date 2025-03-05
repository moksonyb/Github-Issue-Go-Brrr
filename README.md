# Github Issue Go Brrr 🖨️
 

This TypeScript application listens for GitHub webhook events and prints new issues and pull requests on an ESC/POS-supported Epson thermal printer. It supports both USB and network-connected printers.

![brrr](https://media1.tenor.com/m/E_3IiT0nbvMAAAAd/jerome-powell-money-printer-go-brrr.gif)

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-%23FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/moksony)

<div align="center">
  <img src="https://raw.githubusercontent.com/bmoksony/github-issue-printer/main/img/issue.jpeg" alt="Example of a printed GitHub issue receipt" width="400"/>
  <p><em>Example of a printed GitHub issue receipt</em></p>
</div>

## 🔍 Features

- 🖨️ Print GitHub issues and pull requests on thermal receipt printers
- 🔄 Support for both webhook events and API polling
- 🔎 Repository discovery - find all repositories you have access to
- 🌐 Works with both USB and network-connected printers
- 🐳 Easy deployment with Docker

## ✅ Requirements

- Node.js (v14 or higher) or Docker
- An Epson thermal printer with ESC/POS support (USB or network-connected)
- A publicly accessible URL for GitHub webhooks (if using webhook mode)
- A GitHub Personal Access Token (if using API mode)

## 🚀 Setup

The application supports two modes of operation:
1. **Webhook Mode**: Listens for GitHub webhook events (requires a public URL)
2. **API Mode**: Polls the GitHub API for new issues and pull requests (no public URL needed)

### 💻 Standard Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure your environment variables in the `.env` file:
   - `PORT`: The port for the server (default: 3000)
   - `GITHUB_MODE`: Set to either `webhook` or `api` (default: webhook)
   
   **For Webhook Mode:**
   - `GITHUB_WEBHOOK_SECRET`: A secret key for GitHub webhook verification
   
   **For API Mode:**
   - `GITHUB_API_TOKEN`: Your GitHub Personal Access Token
   - `GITHUB_REPOSITORIES`: Comma-separated list of repositories to monitor (format: owner/repo)
   - `GITHUB_POLLING_INTERVAL`: How often to check for updates in milliseconds (default: 60000)
   
   **For Both Modes:**
   - `GITHUB_ISSUE_ACTIONS`: Comma-separated list of issue/PR actions to process (default: opened,reopened)
   - `GITHUB_COMMIT_ACTIONS`: Comma-separated list of commit actions to process (default: pushed)
   - `PRINTER_TYPE`: Set to either `usb` or `network`
   
   **For USB printers:**
   - `PRINTER_VENDOR_ID`: USB vendor ID of your printer (in hex, e.g., 0x04b8 for Epson)
   - `PRINTER_PRODUCT_ID`: USB product ID of your printer (in hex)
   
   **For Network printers:**
   - `PRINTER_IP`: IP address of your network printer
   - `PRINTER_PORT`: Port of your network printer (usually 9100)

3. Find your printer's details:
   - For USB printers:
     - On Linux: Run `lsusb`
     - On macOS: System Information > USB
     - On Windows: Device Manager > Universal Serial Bus controllers
   - For Network printers:
     - Check your printer's network settings or your router's DHCP client list

4. **For Webhook Mode:** Set up GitHub webhooks:
   - Go to your GitHub repository > Settings > Webhooks > Add webhook
   - Set Payload URL to your server's URL (e.g., `https://your-domain.com/webhook`)
   - Set Content type to `application/json`
   - Set Secret to the same value as `GITHUB_WEBHOOK_SECRET`
   - Select "Let me select individual events" and choose:
     - Issues
     - Pull requests (if you want to print PR events)
     - Pushes (if you want to print commit events)
   - Click "Add webhook"

5. **For API Mode:** Create a GitHub Personal Access Token:
   - Go to GitHub > Settings > Developer settings > Personal access tokens
   - Generate a new token with the following permissions:
     - `repo` scope for private repositories
     - `public_repo` scope for public repositories
   - Copy the token to your `.env` file as `GITHUB_API_TOKEN`
   - Make sure the repositories listed in `GITHUB_REPOSITORIES` exist and are accessible with your token

6. Build and start the application:
   ```
   npm run build
   npm start
   ```
   
   For development:
   ```
   npm run dev
   ```

### 🐳 Docker Deployment

The application can be easily deployed using Docker:

1. Create a `.env` file with your configuration (see above for required variables)

2. Build and run using Docker Compose:
   ```
   docker-compose up -d
   ```

   This will:
   - Build the Docker image
   - Start the container in detached mode
   - Expose port 3000 for webhook requests or health checks
   - Configure the application using your environment variables

3. For USB printer support:
   - Uncomment the `devices` and `privileged` sections in `docker-compose.yml`
   - Ensure your host system has the necessary USB permissions

4. View logs:
   ```
   docker-compose logs -f
   ```

5. Stop the service:
   ```
   docker-compose down
   ```

### 🔧 Manual Docker Deployment

If you prefer to use Docker without Docker Compose:

1. Build the Docker image:
   ```
   docker build -t github-issue-printer .
   ```

2. Run the container:
    
   ```
   docker run -d \
     --name github-issue-printer \
     -p 3000:3000 \
     -e GITHUB_MODE=webhook \
     -e GITHUB_WEBHOOK_SECRET=your_secret \
     -e PRINTER_TYPE=network \
     -e PRINTER_IP=192.168.1.2 \
     -e PRINTER_PORT=9100 \
     github-issue-printer
   ```
    *(Update the IP address to your printer's IP address)*   

   For API mode:
   ```
   docker run -d \
     --name github-issue-printer \
     -p 3000:3000 \
     -e GITHUB_MODE=api \
     -e GITHUB_API_TOKEN=your_github_token \
     -e GITHUB_REPOSITORIES=owner/repo1,owner/repo2 \
     -e GITHUB_POLLING_INTERVAL=60000 \
     -e GITHUB_ISSUE_ACTIONS=opened,reopened \
     -e GITHUB_COMMIT_ACTIONS=pushed \
     -e PRINTER_TYPE=network \
     -e PRINTER_IP=192.168.1.2 \
     -e PRINTER_PORT=9100 \
     github-issue-printer
   ```

   For USB printer support, add:
   ```
   --device /dev/bus/usb:/dev/bus/usb \
   --privileged \
   ```

## 📋 Supported Events

The application can print the following GitHub events:

### 🐛 Issues
- ✨ New issues
- 🔄 Reopened issues
- ✅ Closed issues
- 👤 Assigned issues
- And more (configurable via `GITHUB_ISSUE_ACTIONS`)

### 🔀 Pull Requests
- ✨ New pull requests
- 🔄 Reopened pull requests
- 🔗 Merged pull requests
- ✅ Closed pull requests
- And more (configurable via `GITHUB_ISSUE_ACTIONS`)

### 💻 Commits
- ✨ New commits
- And more (configurable via `GITHUB_COMMIT_ACTIONS`)

## ⚙️ Customization

### Event Actions

You can customize which events trigger printing by modifying the environment variables:

#### Issues and Pull Requests
Modify the `GITHUB_ISSUE_ACTIONS` environment variable. For example:
- `opened,reopened` (default): Only print new and reopened issues/PRs
- `opened,reopened,closed`: Also print when issues/PRs are closed
- `opened,reopened,closed,assigned`: Also print when issues/PRs are assigned

#### Commits
Modify the `GITHUB_COMMIT_ACTIONS` environment variable. For example:
- `pushed` (default): Print new commits

### Repositories (API Mode)

In API mode, you can specify which repositories to monitor by setting the `GITHUB_REPOSITORIES` environment variable to a comma-separated list of repositories in the format `owner/repo`. For example:
- `octocat/hello-world`: Monitor a single repository
- `octocat/hello-world,microsoft/vscode`: Monitor multiple repositories

The application will validate each repository on startup to ensure it exists and is accessible with your token. Only valid repositories will be monitored.

### Polling Interval (API Mode)

In API mode, you can adjust how frequently the application checks for new issues and pull requests by setting the `GITHUB_POLLING_INTERVAL` environment variable (in milliseconds). For example:
- `60000`: Check every minute (default)
- `300000`: Check every 5 minutes
- `3600000`: Check every hour

### Repository Discovery (API Mode)

In API mode, you can use the repository discovery feature to find all repositories you have access to, including private repositories where you're a member:

1. Access the `/repositories` endpoint (e.g., http://localhost:3000/repositories)
2. This will return a JSON list of all repositories your GitHub token has access to, including:
   - Repositories you own
   - Private repositories where you're a collaborator
   - Organization repositories where you're a member

3. You can filter the results using query parameters:
   - `affiliation`: Filter by your relationship to the repository (comma-separated values):
     - `owner`: Repositories that you own
     - `collaborator`: Repositories that you have been added to as a collaborator
     - `organization_member`: Repositories that you have access to through an organization membership
   - `sort`: Sort repositories by (`created`, `updated`, `pushed`, or `full_name`)
   - `direction`: Sort direction (`asc` or `desc`)
   - `per_page`: Number of results per page (max 100)

Examples:
- All repositories: `http://localhost:3000/repositories`
- Only repositories you own: `http://localhost:3000/repositories?affiliation=owner`
- Only repositories where you're a collaborator: `http://localhost:3000/repositories?affiliation=collaborator`
- Only organization repositories: `http://localhost:3000/repositories?affiliation=organization_member`
- Repositories you own or are a collaborator on: `http://localhost:3000/repositories?affiliation=owner,collaborator`

This makes it easy to find repositories to monitor without having to manually look them up on GitHub.

#### Adding Repositories to Monitor

You can dynamically add repositories to your monitoring list using the API:

```bash
curl -X POST http://localhost:3000/repositories/monitor \
  -H "Content-Type: application/json" \
  -d '{"repository": "owner/repo-name"}'
```

This will:
1. Validate that the repository exists and is accessible with your token
2. Add it to your monitoring list if valid
3. Return the updated list of monitored repositories

**Note on Private Repositories**: To access private repositories, your GitHub token must have the correct permissions:
- For private repositories you own: `repo` scope
- For private repositories where you're a collaborator: `repo` scope
- For private organization repositories: `repo` scope

If you're having trouble accessing private repositories, verify that your token has the `repo` scope and not just `public_repo`.

## 🔍 Troubleshooting

- Make sure your printer is connected and powered on
- For USB printers, verify that the vendor and product IDs are correct
- For network printers, ensure the IP address and port are correct
- For webhook mode, check that your webhook URL is publicly accessible
- For webhook mode, ensure your webhook secret matches the one in your `.env` file
- Check the console logs for any error messages

### API Mode Troubleshooting

- **404 Not Found errors**: This usually means the repository doesn't exist or your token doesn't have access to it. Check:
  - Repository name is correct (case-sensitive)
  - Repository exists and hasn't been deleted or renamed
  - Your token has the correct permissions (`repo` for private repos, `public_repo` for public repos)
  - You are a collaborator on the repository or have read access

- **401 Unauthorized errors**: This means your token is invalid or expired. Check:
  - Token is correctly copied to the `.env` file (no extra spaces)
  - Token hasn't expired (GitHub tokens can expire)
  - Token has the necessary permissions

- **No repositories found**: If all repositories fail validation, the application will log an error and exit. Check:
  - Repository format is correct (`owner/repo`)
  - At least one repository is accessible with your token

- **Check repository status**: You can visit `/status` endpoint (e.g., http://localhost:3000/status) to see the current configuration.

- **Debug commit monitoring**: If commits aren't being detected, you can use the debug endpoint to check the last time commits were checked and see recent commits:
  ```
  http://localhost:3000/debug/commits?repo=owner/repo
  ```
  This will show:
  - When the repository was last checked for commits
  - Whether the repository is being monitored
  - The 5 most recent commits in the repository
  
  You can also force a check for new commits by adding `force=true`:
  ```
  http://localhost:3000/debug/commits?repo=owner/repo&force=true
  ```
  This will:
  - Check for new commits in the repository
  - Print any new commits found
  - Return the number of new commits found

### 🐳 Docker-specific Troubleshooting

- If using a USB printer, ensure the container has access to USB devices
- Check container logs: `docker logs github-issue-printer`
- Verify network settings if using a network printer
- Ensure your container can reach the printer's IP address

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>If you find this project useful, consider buying me a coffee!</p>
  <a href="https://buymeacoffee.com/moksony">
    <img src="https://www.buymeacoffee.com/assets/img/guidelines/download-assets-sm-1.svg" alt="Buy Me A Coffee" height="50">
  </a>
</div>