# n8n-nodes-warmysender

This is an n8n community node. It lets you use [WarmySender](https://warmysender.com) in your n8n workflows.

WarmySender warms up mailboxes and watches deliverability: warmup volume, inbox placement by provider, reputation, email verification and suppression lists. This node brings those numbers and actions into your workflows, and starts workflows when a reply, bounce or unsubscribe comes in.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)
[Version history](#version-history)

## Installation

In n8n, open **Settings → Community Nodes → Install**, enter `n8n-nodes-warmysender` and install. The full steps are in n8n's [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).

## Operations

The package has two nodes.

**WarmySender**

| Resource | Operation | What it does |
|---|---|---|
| Warmup | Get Stats | Warmup health for one mailbox in both directions: volume, reputation, and where its warmup emails landed over the last 14 days, split by receiving provider |
| Warmup | Get Many Stats | The same for every mailbox |
| Warmup | Update Settings | Turn warmup on or off, or change its target daily volume (1–100) or language |
| Mailbox | Get, Get Many | Mailboxes with their connection and warmup status. Filter by address or warmup on/off. |
| Email Verification | Verify Email | Check one address. The answer is valid, invalid, risky (the server accepts every address) or unknown. Unknown is never charged. |
| Email Verification | Get Allowance | How many verifications the workspace has left |
| Suppression | Add | Stop all future email to one or more addresses, with an optional reason |
| Suppression | Get Many | Suppressed addresses and domains |
| Campaign | Get, Get Many | Campaigns with their status and steps |
| Campaign | Get Diagnostics | Why a campaign sent little or nothing: the actions that did not run, grouped by cause, each with a plain-language reason and when it resumes |
| Campaign | Get Sent Emails | The emails one campaign sent |

The WarmySender node can also be used as a tool by n8n's AI Agent node.

**WarmySender Trigger**

Starts a workflow on a reply received, email sent, bounced, opened, clicked or unsubscribed, a prospect suppressed, or a sending limit hit. The trigger registers its own webhook when you activate the workflow, removes it when you deactivate it, and rejects any delivery whose signature does not verify.

## Credentials

1. Sign in at [warmysender.com](https://warmysender.com).
2. In workspace settings, create an API key. It starts with `ws_`. Grant only the scopes your workflow needs:
   - `warmup:read` and `mailboxes:read` for warmup and mailbox reads, `warmup:write` to change warmup settings
   - `verification:write` to verify addresses, `verification:read` for the allowance
   - `suppressions:read` to list the suppression list, `suppressions:write` to add to it
   - `campaigns:read` for campaign reads, diagnostics and sent emails
   - `webhooks:read` and `webhooks:write` for the Trigger
3. In n8n, add a **WarmySender API** credential and paste the key. **Test** reads the key's own details and changes nothing.

## Compatibility

Built with `@n8n/node-cli` 0.51 for the n8n 1.x and 2.x node API (`n8nNodesApiVersion` 1). Tested against n8n 2.42.3. No runtime dependencies.

## Usage

**Verify before you add.** Form or CRM trigger → WarmySender *Verify Email* → IF result is `valid` → add the lead. Set **Idempotency Key** to the lead's ID so a retried step never spends a second credit.

**Honour unsubscribes everywhere.** WarmySender Trigger (*Email Unsubscribed*) → update your CRM. Or the other way: your app's unsubscribe event → WarmySender *Suppression → Add*.

**A daily deliverability check.** Schedule Trigger → *Warmup → Get Many Stats* → IF placement drops → notify.

**Trigger needs https.** WarmySender only delivers webhooks to `https` URLs. n8n Cloud works as is. A self-hosted n8n needs a public https address (set `WEBHOOK_URL`).

**Rate limits** are per workspace, not per key. When throttled, the API answers 429 with `Retry-After`. Turn on **Retry On Fail** in the node settings for long runs.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [WarmySender API reference](https://warmysender.com/api-docs)
* [OpenAPI spec](https://warmysender.com/api/v1/openapi.json)

## Version history

### 0.1.0

First release: Warmup, Mailbox, Email Verification, Suppression and Campaign reads, and the WarmySender Trigger.
