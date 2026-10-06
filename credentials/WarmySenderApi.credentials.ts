import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class WarmySenderApi implements ICredentialType {
	name = 'warmySenderApi';

	displayName = 'WarmySender API';

	icon: Icon = { light: 'file:../icons/warmysender.svg', dark: 'file:../icons/warmysender.dark.svg' };

	documentationUrl = 'https://github.com/fortuneflick/n8n-nodes-warmysender#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'An API key from WarmySender workspace settings. It starts with ws_. Grant only the scopes the workflow needs.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// GET /me answers for any valid key whatever its scopes.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://warmysender.com/api/v1',
			url: '/me',
			method: 'GET',
		},
	};
}
