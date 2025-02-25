[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-%23FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/moksony)
# Github Issue Go Brrr 🖨️
 

This TypeScript application listens for GitHub webhook events and prints new issues and pull requests on an ESC/POS-supported Epson thermal printer. It supports both USB and network-connected printers.

![brrr](https://media1.tenor.com/m/E_3IiT0nbvMAAAAd/jerome-powell-money-printer-go-brrr.gif)


## ✅ Requirements

- Node.js (v14 or higher) or Docker
- An Epson thermal printer with ESC/POS support (USB or network-connected)
- A publicly accessible URL for GitHub webhooks (you can use ngrok for testing)

## 📸 Pictures
<div align="center">
  <img src="https://raw.githubusercontent.com/moksonyb/Github-Issue-Go-Brrr/refs/heads/main/img/issue.jpeg" alt="Example of a printed GitHub issue receipt" height="400"/>
  <p><em>Example of a printed GitHub issue receipt</em></p>
</div>

## 🚀 Setup

### 💻 Standard Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure your environment variables in the `.env` file:
   - `PORT`: The port for the webhook server (default: 3000)
   - `GITHUB_WEBHOOK_SECRET`: A secret key for GitHub webhook verification
   - `GITHUB_ISSUE_ACTIONS`: Comma-separated list of issue/PR actions to process (default: opened,reopened)
   - `PRINTER_TYPE`: Set to either `usb` or `network`
   
   For USB printers:
   - `PRINTER_VENDOR_ID`: USB vendor ID of your printer (in hex, e.g., 0x04b8 for Epson)
   - `PRINTER_PRODUCT_ID`: USB product ID of your printer (in hex)
   
   For Network printers:
   - `PRINTER_IP`: IP address of your network printer
   - `PRINTER_PORT`: Port of your network printer (usually 9100)

3. Find your printer's details:
   - For USB printers:
     - On Linux: Run `lsusb`
     - On macOS: System Information > USB
     - On Windows: Device Manager > Universal Serial Bus controllers
   - For Network printers:
     - Check your printer's network settings or your router's DHCP client list

4. Set up GitHub webhooks:
   - Go to your GitHub repository > Settings > Webhooks > Add webhook
   - Set Payload URL to your server's URL (e.g., `https://your-domain.com/webhook`)
   - Set Content type to `application/json`
   - Set Secret to the same value as `GITHUB_WEBHOOK_SECRET`
   - Select "Let me select individual events" and choose:
     - Issues
     - Pull requests (if you want to print PR events)
   - Click "Add webhook"

5. Build and start the application:
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
   - Expose port 3000 for webhook requests
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
     -e GITHUB_WEBHOOK_SECRET=your_secret \
     -e PRINTER_TYPE=network \
     -e PRINTER_IP=192.168.1.2 \
     -e PRINTER_PORT=9100 \
     github-issue-printer
   ```
    *(Update the ip address to your printer's ip address)*   

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

## ⚙️ Customization

You can customize which events trigger printing by modifying the `GITHUB_ISSUE_ACTIONS` environment variable. For example:
- `opened,reopened` (default): Only print new and reopened issues/PRs
- `opened,reopened,closed`: Also print when issues/PRs are closed
- `opened,reopened,closed,assigned`: Also print when issues/PRs are assigned

## 🔍 Troubleshooting

- Make sure your printer is connected and powered on
- For USB printers, verify that the vendor and product IDs are correct
- For network printers, ensure the IP address and port are correct
- Check that your webhook URL is publicly accessible
- Ensure your webhook secret matches the one in your `.env` file
- Check the console logs for any error messages

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
