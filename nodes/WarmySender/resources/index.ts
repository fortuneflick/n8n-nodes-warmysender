import type { INodeProperties } from 'n8n-workflow';
import { cursorPagination, dataRoot } from '../shared/pagination';

// Every WarmySender response wraps its payload in `data`; each operation
// unwraps it so the next node sees the record itself.

const mailboxIdParam = (operations: string[], resource: string): INodeProperties => ({
	displayName: 'Mailbox ID',
	name: 'mailboxId',
	type: 'string',
	default: '',
	required: true,
	description: 'The mailbox’s ID, from Mailbox → Get Many',
	displayOptions: { show: { resource: [resource], operation: operations } },
});

const campaignIdParam: INodeProperties = {
	displayName: 'Campaign ID',
	name: 'campaignId',
	type: 'string',
	default: '',
	required: true,
	description: 'The campaign’s ID, from Campaign → Get Many',
	displayOptions: { show: { resource: ['campaign'], operation: ['get', 'getDiagnostics', 'getSentEmails'] } },
};

export const mailboxDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['mailbox'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get mailbox',
				description: 'Get one mailbox with its connection and warmup status',
				routing: {
					request: { method: 'GET', url: '=/mailboxes/{{$parameter.mailboxId}}' },
					output: dataRoot,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many mailboxes',
				description: 'List the mailboxes in your workspace',
				routing: {
					request: { method: 'GET', url: '/mailboxes' },
					output: dataRoot,
				},
			},
		],
		default: 'getAll',
	},
	mailboxIdParam(['get'], 'mailbox'),
	...cursorPagination({ resource: ['mailbox'], operation: ['getAll'] }),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { resource: ['mailbox'], operation: ['getAll'] } },
		options: [
			{
				displayName: 'Email Address',
				name: 'email_address',
				type: 'string',
				placeholder: 'e.g. name@email.com',
				default: '',
				routing: { send: { type: 'query', property: 'email_address' } },
			},
			{
				displayName: 'Warmup Enabled',
				name: 'warmup_enabled',
				type: 'boolean',
				default: true,
				description: 'Whether to return only mailboxes with warmup on (or only with it off)',
				routing: { send: { type: 'query', property: 'warmup_enabled' } },
			},
		],
	},
];

export const warmupDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['warmup'] } },
		options: [
			{
				name: 'Get Many Stats',
				value: 'getAllStats',
				action: 'Get warmup stats for many mailboxes',
				description: 'Warmup volume, inbox placement and reputation for every mailbox',
				routing: {
					request: { method: 'GET', url: '/warmup/stats' },
					output: dataRoot,
				},
			},
			{
				name: 'Get Stats',
				value: 'getStats',
				action: 'Get warmup stats for mailbox',
				description:
					'Warmup health for one mailbox: volume, inbox placement by provider over 14 days, and reputation',
				routing: {
					request: { method: 'GET', url: '=/warmup/stats/{{$parameter.mailboxId}}' },
					output: dataRoot,
				},
			},
			{
				name: 'Update Settings',
				value: 'updateSettings',
				action: 'Update warmup settings for mailbox',
				description: 'Turn warmup on or off, or change its target volume or language',
				routing: {
					request: { method: 'PATCH', url: '=/warmup/settings/{{$parameter.mailboxId}}' },
					output: dataRoot,
				},
			},
		],
		default: 'getStats',
	},
	mailboxIdParam(['getStats', 'updateSettings'], 'warmup'),
	...cursorPagination({ resource: ['warmup'], operation: ['getAllStats'] }),
	{
		displayName: 'Settings',
		name: 'settings',
		type: 'collection',
		placeholder: 'Add Setting',
		default: {},
		displayOptions: { show: { resource: ['warmup'], operation: ['updateSettings'] } },
		options: [
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'e.g. en',
				description: 'Language new warmup emails are written in',
				routing: { send: { type: 'body', property: 'language' } },
			},
			{
				displayName: 'Target Daily Volume',
				name: 'warmup_target_daily_volume',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 100 },
				default: 40,
				description: 'Warmup emails per day once fully ramped',
				routing: { send: { type: 'body', property: 'warmup_target_daily_volume' } },
			},
			{
				displayName: 'Warmup Enabled',
				name: 'warmup_enabled',
				type: 'boolean',
				default: true,
				description: 'Whether warmup runs for this mailbox. Turning it on needs a connected mailbox.',
				routing: { send: { type: 'body', property: 'warmup_enabled' } },
			},
		],
	},
];

export const verificationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['verification'] } },
		options: [
			{
				name: 'Get Allowance',
				value: 'getAllowance',
				action: 'Get remaining verification allowance',
				description: 'How many verifications your workspace has left',
				routing: {
					request: { method: 'GET', url: '/verification/allowance' },
					output: dataRoot,
				},
			},
			{
				name: 'Verify Email',
				value: 'verify',
				action: 'Verify email address',
				description:
					'Check one address: valid, invalid, risky (the server accepts every address) or unknown. Unknown is never charged.',
				routing: {
					request: { method: 'POST', url: '/verification/verify' },
					output: dataRoot,
				},
			},
		],
		default: 'verify',
	},
	{
		displayName: 'Email',
		name: 'email',
		type: 'string',
		placeholder: 'e.g. name@email.com',
		default: '',
		required: true,
		displayOptions: { show: { resource: ['verification'], operation: ['verify'] } },
		routing: { send: { type: 'body', property: 'email' } },
	},
	{
		displayName: 'Idempotency Key',
		name: 'idempotencyKey',
		type: 'string',
		default: '',
		description:
			'A unique value for this check, such as a lead ID. If n8n retries the step, the same key returns the first result and does not spend a second credit.',
		displayOptions: { show: { resource: ['verification'], operation: ['verify'] } },
		routing: { request: { headers: { 'Idempotency-Key': '={{ $value || undefined }}' } } },
	},
];

export const suppressionDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['suppression'] } },
		options: [
			{
				name: 'Add',
				value: 'add',
				action: 'Add addresses to suppression list',
				description: 'Stop all future email to these addresses, for example after an unsubscribe',
				routing: {
					request: { method: 'POST', url: '/prospects/suppress' },
					output: dataRoot,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many suppression entries',
				description: 'List suppressed addresses and domains',
				routing: {
					request: { method: 'GET', url: '/suppressions' },
					output: dataRoot,
				},
			},
		],
		default: 'add',
	},
	{
		displayName: 'Emails',
		name: 'emails',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'e.g. name@email.com, other@email.com',
		description: 'One address, or several separated by commas',
		displayOptions: { show: { resource: ['suppression'], operation: ['add'] } },
		routing: {
			send: {
				type: 'body',
				property: 'emails',
				value: '={{ String($value).split(",").map((address) => address.trim()).filter((address) => address) }}',
			},
		},
	},
	{
		displayName: 'Reason',
		name: 'reason',
		type: 'string',
		default: '',
		placeholder: 'e.g. unsubscribed by reply',
		description: 'Stored with each entry',
		displayOptions: { show: { resource: ['suppression'], operation: ['add'] } },
		routing: { send: { type: 'body', property: 'reason', value: '={{ $value || undefined }}' } },
	},
	...cursorPagination({ resource: ['suppression'], operation: ['getAll'] }),
	{
		displayName: 'Type',
		name: 'type',
		type: 'options',
		default: '',
		description: 'Only entries of this type',
		displayOptions: { show: { resource: ['suppression'], operation: ['getAll'] } },
		options: [
			{ name: 'All', value: '' },
			{ name: 'Domain', value: 'domain' },
			{ name: 'Email', value: 'email' },
		],
		routing: { send: { type: 'query', property: 'type', value: '={{ $value || undefined }}' } },
	},
];

export const campaignDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['campaign'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get campaign',
				description: 'Get one campaign with its steps',
				routing: {
					request: { method: 'GET', url: '=/campaigns/{{$parameter.campaignId}}' },
					output: dataRoot,
				},
			},
			{
				name: 'Get Diagnostics',
				value: 'getDiagnostics',
				action: 'Explain why campaign sent little or nothing',
				description:
					'The actions that did not run in a recent window, grouped by cause, each with a plain-language reason and when it resumes',
				routing: {
					request: { method: 'GET', url: '=/campaigns/{{$parameter.campaignId}}/skipped-actions' },
					output: dataRoot,
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many campaigns',
				description: 'List campaigns with their status',
				routing: {
					request: { method: 'GET', url: '/campaigns' },
					output: dataRoot,
				},
			},
			{
				name: 'Get Sent Emails',
				value: 'getSentEmails',
				action: 'Get emails campaign sent',
				description: 'List the emails one campaign has sent',
				routing: {
					request: { method: 'GET', url: '/emails/sent', qs: { campaignId: '={{$parameter.campaignId}}' } },
					output: dataRoot,
				},
			},
		],
		default: 'getAll',
	},
	campaignIdParam,
	...cursorPagination({ resource: ['campaign'], operation: ['getAll', 'getSentEmails'] }),
];
