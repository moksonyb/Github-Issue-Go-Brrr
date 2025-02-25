import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import { PrinterService } from './printer-service';
import { PrinterConfig, GitHubIssueEvent, GitHubPullRequestEvent } from './types';

// Load environment variables
dotenv.config();

// Configure the application
const app = express();
const port = process.env.PORT || 3000;
const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || '';

// Get allowed issue actions from environment
const allowedIssueActions = (process.env.GITHUB_ISSUE_ACTIONS || 'opened,reopened')
  .split(',')
  .map(action => action.trim());

console.log(`Configured to process issue actions: ${allowedIssueActions.join(', ')}`);

// Configure printer based on environment variables
const printerType = process.env.PRINTER_TYPE === 'network' ? 'network' : 'usb';

const printerConfig: PrinterConfig = {
  type: printerType,
};

if (printerType === 'usb') {
  printerConfig.usb = {
    vendorId: parseInt(process.env.PRINTER_VENDOR_ID || '0', 16),
    productId: parseInt(process.env.PRINTER_PRODUCT_ID || '0', 16),
  };
} else {
  printerConfig.network = {
    host: process.env.PRINTER_IP || '127.0.0.1',
    port: parseInt(process.env.PRINTER_PORT || '9100', 10),
  };
}

// Create printer service
const printerService = new PrinterService(printerConfig);

// Middleware to parse JSON payloads
app.use(bodyParser.json());

// Verify GitHub webhook signature
function verifySignature(req: express.Request): boolean {
  const signature = req.headers['x-hub-signature-256'] as string;
  if (!signature) {
    return false;
  }
  
  const payload = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', webhookSecret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (error) {
    return false;
  }
}

// GitHub webhook endpoint
app.post('/webhook', async (req: express.Request, res: express.Response) => {
  // Verify webhook signature
  if (!verifySignature(req)) {
    console.error('Invalid webhook signature');
    return res.status(401).send('Unauthorized');
  }
  
  const event = req.headers['x-github-event'] as string;
  
  // Process different event types
  if (event === 'issues') {
    const payload = req.body as GitHubIssueEvent;
    const action = payload.action;
    
    // Check if this is an action we want to process
    if (allowedIssueActions.includes(action)) {
      console.log(`Received ${action} issue event for #${payload.issue.number}`);
      
      const success = await printerService.printEvent(payload);
      if (success) {
        return res.status(200).send('Issue printed successfully');
      } else {
        return res.status(500).send('Error printing issue');
      }
    } else {
      console.log(`Ignoring ${action} issue event (not in allowed actions)`);
    }
  } else if (event === 'pull_request') {
    const payload = req.body as GitHubPullRequestEvent;
    const action = payload.action;
    
    // Check if this is an action we want to process (using same config as issues for now)
    if (allowedIssueActions.includes(action)) {
      console.log(`Received ${action} pull request event for #${payload.pull_request.number}`);
      
      const success = await printerService.printEvent(payload);
      if (success) {
        return res.status(200).send('Pull request printed successfully');
      } else {
        return res.status(500).send('Error printing pull request');
      }
    } else {
      console.log(`Ignoring ${action} pull request event (not in allowed actions)`);
    }
  }
  
  // Acknowledge receipt of other events
  res.status(200).send('Event received');
});

// Start the server
app.listen(port, () => {
  console.log(`GitHub Issue Printer listening at http://localhost:${port}`);
  console.log(`Printer type: ${printerConfig.type}`);
  console.log('Waiting for webhook events...');
}); 