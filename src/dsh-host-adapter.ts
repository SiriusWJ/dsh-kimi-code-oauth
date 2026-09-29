export function createDshHostAdapter(context: unknown): { context: unknown; assertCompatible(): void } { return { context, assertCompatible() {} }; }
