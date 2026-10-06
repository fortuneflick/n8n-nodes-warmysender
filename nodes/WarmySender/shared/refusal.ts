import {
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeProperties,
	type JsonObject,
} from 'n8n-workflow';

// Every WarmySender refusal carries { error: { code, message, ... } }.
// n8n's default would headline a generic "request is invalid" sentence; this
// puts WarmySender's own message first and the fix right under it.
export async function surfaceRefusal(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode < 400) return items;
	const body = (response.body ?? {}) as IDataObject;
	const refusal = (typeof body.error === 'object' && body.error !== null ? body.error : {}) as IDataObject;
	const message =
		(refusal.message as string | undefined) ??
		(body.message as string | undefined) ??
		`WarmySender answered ${response.statusCode}`;
	const description = [
		refusal.fix as string | undefined,
		refusal.code ? `Code: ${String(refusal.code)}.` : undefined,
		refusal.docs_url as string | undefined,
	]
		.filter((part) => part)
		.join(' ');
	throw new NodeApiError(this.getNode(), body as JsonObject, {
		message,
		description,
		httpCode: String(response.statusCode),
	});
}

// Put surfaceRefusal first in every operation's postReceive, ahead of any
// rootProperty unwrap, so an error body is never mistaken for data.
export function withRefusals(properties: INodeProperties[]): INodeProperties[] {
	return properties.map((property) => {
		if (property.name !== 'operation' || !property.options) return property;
		return {
			...property,
			options: property.options.map((option) => {
				if (!('routing' in option) || !option.routing) return option;
				const existing = option.routing.output?.postReceive ?? [];
				return {
					...option,
					routing: {
						...option.routing,
						output: {
							...option.routing.output,
							postReceive: [surfaceRefusal, ...existing],
						},
					},
				};
			}),
		};
	});
}
