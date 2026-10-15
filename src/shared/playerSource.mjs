export function playerSource(search) {
  const params = new URLSearchParams(search);
  const detached = params.get('mini') === '1';
  const value = params.get('tabId');
  const tabId = value && /^\d+$/.test(value) ? Number(value) : null;
  return { detached, tabId: Number.isSafeInteger(tabId) && tabId > 0 ? tabId : null };
}
