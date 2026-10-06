import type { IDataObject, IDisplayOptions, INodeProperties } from 'n8n-workflow';

type Show = NonNullable<IDisplayOptions['show']>;

// WarmySender lists answer { data, pagination: { has_more, next_cursor } }.
// Return All follows next_cursor until has_more is false, 100 rows a page.
export function cursorPagination(show: Show): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show },
			routing: {
				send: {
					paginate: '={{ $value }}',
					type: 'query',
					property: 'limit',
					value: '100',
				},
				operations: {
					pagination: {
						type: 'generic',
						properties: {
							continue:
								'={{ !!$response.body.pagination?.has_more && !!$response.body.pagination?.next_cursor }}',
							// n8n spreads this over the request options, so a bare qs object would
							// replace the filters; start from the original query ($request.qs).
							request: {
								qs: '={{ Object.assign({}, $request.qs, { limit: 100 }, $response.body && $response.body.pagination && $response.body.pagination.next_cursor ? { cursor: $response.body.pagination.next_cursor } : {}) }}' as unknown as IDataObject,
							},
						},
					},
				},
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			typeOptions: { minValue: 1, maxValue: 100 },
			default: 50,
			description: 'Max number of results to return',
			displayOptions: { show: { ...show, returnAll: [false] } },
			routing: {
				send: { type: 'query', property: 'limit' },
				output: { maxResults: '={{ $value }}' },
			},
		},
	];
}

export const dataRoot = {
	postReceive: [{ type: 'rootProperty' as const, properties: { property: 'data' } }],
};
