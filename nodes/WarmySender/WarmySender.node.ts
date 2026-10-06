import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import {
	campaignDescription,
	mailboxDescription,
	suppressionDescription,
	verificationDescription,
	warmupDescription,
} from './resources';
import { withRefusals } from './shared/refusal';

export class WarmySender implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'WarmySender',
		name: 'warmySender',
		icon: { light: 'file:../../icons/warmysender.svg', dark: 'file:../../icons/warmysender.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description:
			'Email warmup and deliverability: mailbox health, inbox placement, email verification, suppression lists and campaign diagnostics',
		defaults: {
			name: 'WarmySender',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'warmySenderApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: 'https://warmysender.com/api/v1',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			ignoreHttpStatusErrors: true,
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Campaign', value: 'campaign' },
					{ name: 'Email Verification', value: 'verification' },
					{ name: 'Mailbox', value: 'mailbox' },
					{ name: 'Suppression', value: 'suppression' },
					{ name: 'Warmup', value: 'warmup' },
				],
				default: 'warmup',
			},
			...withRefusals([
				...warmupDescription,
				...mailboxDescription,
				...verificationDescription,
				...suppressionDescription,
				...campaignDescription,
			]),
		],
	};
}
