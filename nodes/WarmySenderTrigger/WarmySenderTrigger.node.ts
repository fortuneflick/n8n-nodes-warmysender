import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type IHttpRequestMethods,
	type IHttpRequestOptions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';

const BASE_URL = 'https://warmysender.com/api/v1';

// WarmySender signs with a millisecond timestamp and rejects anything older
// than five minutes; the receiver applies the same window.
const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

function isNotFound(error: unknown): boolean {
	const failure = error as { httpCode?: string | number; response?: { status?: number } };
	return String(failure.httpCode) === '404' || failure.response?.status === 404;
}

async function warmySenderRequest(
	this: IHookFunctions,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	headers?: IDataObject,
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${BASE_URL}${path}`,
		json: true,
		...(body ? { body } : {}),
		...(headers ? { headers } : {}),
	};
	return (await this.helpers.httpRequestWithAuthentication.call(
		this,
		'warmySenderApi',
		options,
	)) as IDataObject;
}

// Header: t=<unix milliseconds>,v1=<hex>. HMAC-SHA256 of the webhook secret
// over `${t}.${rawBody}`.
export function verifySignature(
	secret: string,
	header: string,
	rawBody: string,
	nowMs = Date.now(),
): boolean {
	let timestamp: number | undefined;
	let signature: string | undefined;
	for (const part of header.split(',')) {
		const eq = part.indexOf('=');
		if (eq === -1) continue;
		const key = part.slice(0, eq).trim();
		const value = part.slice(eq + 1).trim();
		if (key === 't') timestamp = Number.parseInt(value, 10);
		else if (key === 'v1' && value !== '') signature = value;
	}
	if (timestamp === undefined || !Number.isFinite(timestamp) || timestamp <= 0 || !signature) return false;
	if (Math.abs(nowMs - timestamp) > SIGNATURE_TOLERANCE_MS) return false;
	const expected = Buffer.from(
		createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex'),
		'hex',
	);
	const provided = Buffer.from(signature, 'hex');
	return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export class WarmySenderTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WarmySender Trigger',
		name: 'warmySenderTrigger',
		icon: { light: 'file:../../icons/warmysender.svg', dark: 'file:../../icons/warmysender.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts the workflow when WarmySender reports a reply, bounce, open, click or unsubscribe',
		defaults: {
			name: 'WarmySender Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'warmySenderApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'WarmySender only delivers to https URLs, so this trigger needs an n8n instance reachable over https. The API key needs the webhooks:read and webhooks:write scopes.',
				name: 'httpsNotice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: ['reply.received'],
				description: 'The events that start this workflow',
				options: [
					{ name: 'Email Bounced', value: 'email.bounced' },
					{ name: 'Email Clicked', value: 'email.clicked' },
					{ name: 'Email Opened', value: 'email.opened' },
					{ name: 'Email Sent', value: 'email.sent' },
					{ name: 'Email Unsubscribed', value: 'email.unsubscribed' },
					{ name: 'Limit Hit', value: 'limit.hit', description: 'A sending limit was reached' },
					{ name: 'Prospect Suppressed', value: 'prospect.suppressed' },
					{ name: 'Reply Received', value: 'reply.received' },
					{ name: 'Test Event', value: 'webhook.test', description: 'Sent when you test the webhook from WarmySender' },
				],
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const webhookId = staticData.webhookId as string | undefined;
				if (!webhookId) return false;
				// There is no single-webhook GET; find ours in the list.
				const list = await warmySenderRequest.call(this, 'GET', '/webhooks');
				const endpoints = (list.data as IDataObject[] | undefined) ?? [];
				const ours = endpoints.find((endpoint) => endpoint.id === webhookId);
				if (ours && ours.url === this.getNodeWebhookUrl('default') && ours.isActive !== false) {
					return true;
				}
				delete staticData.webhookId;
				delete staticData.webhookSecret;
				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const url = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events', []) as string[];
				const created = await warmySenderRequest.call(
					this,
					'POST',
					'/webhooks',
					{ url, events },
					{ 'Idempotency-Key': randomUUID() },
				);
				const endpoint = (created.data as IDataObject | undefined) ?? {};
				if (!endpoint.id || !endpoint.secret) return false;
				const staticData = this.getWorkflowStaticData('node');
				staticData.webhookId = endpoint.id as string;
				staticData.webhookSecret = endpoint.secret as string;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node');
				const webhookId = staticData.webhookId as string | undefined;
				if (webhookId) {
					try {
						await warmySenderRequest.call(this, 'DELETE', `/webhooks/${webhookId}`);
					} catch (error) {
						// Already gone is fine. Anything else is a real failure.
						if (!isNotFound(error)) throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				}
				delete staticData.webhookId;
				delete staticData.webhookSecret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const request = this.getRequestObject();
		const secret = this.getWorkflowStaticData('node').webhookSecret as string | undefined;
		const header = this.getHeaderData()['x-warmy-signature'];
		const rawBody = request.rawBody ? request.rawBody.toString('utf8') : JSON.stringify(request.body);

		if (!secret || typeof header !== 'string' || !verifySignature(secret, header, rawBody)) {
			this.getResponseObject().status(401).send('Signature did not verify');
			return { noWebhookResponse: true };
		}

		return {
			workflowData: [this.helpers.returnJsonArray(this.getBodyData() as IDataObject)],
		};
	}
}
