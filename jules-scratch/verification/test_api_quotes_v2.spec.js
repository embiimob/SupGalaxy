
import { test, expect } from '@playwright/test';

test('Verify API handles quoted strings correctly', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await page.goto('http://localhost:8080');

  const result = await page.evaluate(async () => {
    // Mock fetch to return quoted strings
    const originalFetch = window.fetch;
    window.fetch = async (url) => {
        console.log('Fetch URL:', url);
        if (url.includes('GetPublicAddressByKeyword')) {
            return {
                ok: true,
                text: async () => '"mock_address"' // Return quoted string
            };
        }
        if (url.includes('GetPublicMessagesByAddress')) {
             // Check if the address in URL has quotes encoded (%22)
             if (url.includes('%22')) {
                 console.error('FAIL: URL contains encoded quotes');
                 return { ok: false };
             }
             return {
                 ok: true,
                 json: async () => ([{ TransactionId: '123', Message: 'test' }])
             };
        }
        return { ok: false };
    };

    // Call the function
    const addr = await GetPublicAddressByKeyword('testkey');

    // Call messages to see if it uses clean address
    await GetPublicMessagesByAddress(addr);

    return addr;
  });

  console.log('Returned address:', result);
  // The address should NOT have quotes if the fix works
  expect(result).toBe('mock_address');
  expect(result).not.toContain('"');
});
