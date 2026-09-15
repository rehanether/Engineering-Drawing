function classifyProviderError(error) {
  const message = `${error?.message || ''} ${error?.lastError?.message || ''} ${error?.cause?.message || ''}`;
  const status = error?.statusCode || error?.lastError?.statusCode || error?.cause?.statusCode;
  if (status === 402 || /do not have access|restricted model|required capabilities: free|insufficient.*credit|credit.*exhausted/i.test(message)) {
    return { status: 503, code: 'AI_MODEL_RESTRICTED', message: 'EDG AI is unavailable because its provider requires capacity or billing configuration. Please contact support. No paid EDG credit was consumed.' };
  }
  if (status === 429 || /rate[- ]limit/i.test(message)) {
    return { status: 503, code: 'AI_CAPACITY', message: 'EDG AI provider capacity is temporarily unavailable. Please try again later. No paid EDG credit was consumed.' };
  }
  return { status: 502, code: 'AI_PROVIDER_ERROR', message: 'The engineering model could not complete this request. No paid EDG credit was consumed.' };
}
module.exports = { classifyProviderError };
