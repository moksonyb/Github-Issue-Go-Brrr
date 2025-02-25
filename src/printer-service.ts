import escpos = require('escpos');
import { PrinterConfig, GitHubIssueEvent, GitHubPullRequestEvent, GitHubEvent } from './types';
import { EpsonQRCode, QRModel, QRErrorCorrectionLevel } from './epson-qrcode';

// These require statements are needed because of how escpos is structured
// eslint-disable-next-line @typescript-eslint/no-var-requires
const USB = require('escpos-usb');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Network = require('escpos-network');

// Register the adapters
escpos.USB = USB;
escpos.Network = Network;

export class PrinterService {
  private config: PrinterConfig;

  constructor(config: PrinterConfig) {
    this.config = config;
  }

  public async printEvent(event: GitHubEvent): Promise<boolean> {
    try {
      const device = this.getDevice();
      const printer = new escpos.Printer(device);

      return new Promise<boolean>((resolve) => {
        device.open((err: Error) => {
          if (err) {
            console.error('Error opening printer device:', err);
            resolve(false);
            return;
          }

          // Determine event type and print accordingly
          if ('issue' in event) {
            this.printIssueEvent(printer, event);
          } else if ('pull_request' in event) {
            this.printPullRequestEvent(printer, event);
          }

          console.log(`Printed GitHub event`);
          resolve(true);
        });
      });
    } catch (error) {
      console.error('Error printing event:', error);
      return false;
    }
  }

  private printIssueEvent(printer: any, event: GitHubIssueEvent): void {
    const issue = event.issue;
    const repo = event.repository;
    const action = event.action;

    // Format the header based on the action
    let header = 'GitHub Issue';
    if (action === 'opened') {
      header = 'New GitHub Issue';
    } else if (action === 'reopened') {
      header = 'Reopened GitHub Issue';
    } else if (action === 'closed') {
      header = 'Closed GitHub Issue';
    } else if (action === 'assigned') {
      header = 'Assigned GitHub Issue';
    } else {
      header = `GitHub Issue (${action})`;
    }

    // Get assignees text
    const assigneesText = issue.assignees && issue.assignees.length > 0
      ? issue.assignees.map(a => a.login).join(', ')
      : 'None';

    // Print the issue
    printer
      .font('a')
      .align('ct')
      .style('b')
      .size(1, 1)
      .text(header)
      .text('------------------------')
      .align('lt')
      .style('normal')
      .size(0, 0)
      .text(`Repository: ${repo.full_name}`)
      .text(`Issue #${issue.number}: ${issue.title}`)
      .text(`Created by: ${issue.user.login}`)
      .text(`Assigned to: ${assigneesText}`)
      .text(`Status: ${issue.state}`)
      .text('\n')
      .text('Description:')
      .text('------------------------')
      .text(issue.body || 'No description')
      .text('------------------------')
      .text(`URL: ${issue.html_url}`)
      .text('\n')
      .align('ct')
      // Use the custom QR code implementation with smaller size
      .raw(EpsonQRCode.generate(issue.html_url, {
        model: QRModel.Model2,
        size: 5,
        errorCorrectionLevel: QRErrorCorrectionLevel.M
      }))
      .text('\n')
      .align('lt')
      .text(`Printed: ${new Date().toLocaleString()}`)
      .cut()
      .close();
  }

  private printPullRequestEvent(printer: any, event: GitHubPullRequestEvent): void {
    const pr = event.pull_request;
    const repo = event.repository;
    const action = event.action;

    // Format the header based on the action
    let header = 'GitHub Pull Request';
    if (action === 'opened') {
      header = 'New GitHub Pull Request';
    } else if (action === 'reopened') {
      header = 'Reopened GitHub Pull Request';
    } else if (action === 'closed') {
      if (pr.merged) {
        header = 'Merged GitHub Pull Request';
      } else {
        header = 'Closed GitHub Pull Request';
      }
    } else {
      header = `GitHub Pull Request (${action})`;
    }

    // Get assignees text
    const assigneesText = pr.assignees && pr.assignees.length > 0
      ? pr.assignees.map(a => a.login).join(', ')
      : 'None';

    // Print the pull request
    printer
      .font('a')
      .align('ct')
      .style('b')
      .size(1, 1)
      .text(header)
      .text('------------------------')
      .align('lt')
      .style('normal')
      .size(0, 0)
      .text(`Repository: ${repo.full_name}`)
      .text(`PR #${pr.number}: ${pr.title}`)
      .text(`Created by: ${pr.user.login}`)
      .text(`Assigned to: ${assigneesText}`)
      .text(`Status: ${pr.merged ? 'Merged' : pr.state}`)
      .text(`Branch: ${pr.head.ref} → ${pr.base.ref}`)
      .text('\n')
      .text('Description:')
      .text('------------------------')
      .text(pr.body || 'No description')
      .text('------------------------')
      .text(`URL: ${pr.html_url}`)
      .text('\n')
      .align('ct')
      // Use the custom QR code implementation with smaller size
      .raw(EpsonQRCode.generate(pr.html_url, {
        model: QRModel.Model2,
        size: 5,
        errorCorrectionLevel: QRErrorCorrectionLevel.M
      }))
      .text('\n')
      .align('lt')
      .text(`Printed: ${new Date().toLocaleString()}`)
      .cut()
      .close();
  }

  private getDevice(): any {
    if (this.config.type === 'usb' && this.config.usb) {
      return new escpos.USB(
        this.config.usb.vendorId,
        this.config.usb.productId
      );
    } else if (this.config.type === 'network' && this.config.network) {
      return new escpos.Network(
        this.config.network.host,
        this.config.network.port
      );
    } else {
      throw new Error('Invalid printer configuration');
    }
  }
} 