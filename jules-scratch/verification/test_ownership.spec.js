
import { test, expect } from '@playwright/test';

test('Verify OWNED_CHUNKS population and enforcement', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  await page.goto('http://localhost:8080');

  // Mock necessary globals and functions
  await page.evaluate(async () => {
    // Mock API responses
    window.GetPublicAddressByKeyword = async (key) => {
        if (key === 'MCWorlds') return 'mock_master_address';
        if (key === 'UserA@WorldA') return 'mock_usera_address';
        return null;
    };

    window.GetPublicMessagesByAddress = async (addr) => {
        if (addr === 'mock_master_address') {
            return [{
                TransactionId: 'tx1',
                FromAddress: 'mock_usera_address',
                ToAddress: 'mock_join_address', // Needs to resolve to MCUserJoin@WorldA
                BlockDate: new Date().toISOString()
            }];
        }
        return [];
    };

    window.GetProfileByAddress = async (addr) => {
        if (addr === 'mock_usera_address') return { URN: 'UserA', Creators: ['mock_usera_address'] };
        return null;
    };

    window.GetProfileByURN = async (urn) => {
        if (urn === 'UserA') return { URN: 'UserA', Creators: ['mock_usera_address'] };
        return null;
    };

    window.GetKeywordByPublicAddress = async (addr) => {
        if (addr === 'mock_join_address') return 'MCUserJoin@WorldA';
        return null;
    };

    // Trigger the discovery logic manually (since we might have missed the load event or want to force it)
    // But the DOMContentLoaded listener is async IIFE.
    // We can wait for the "Discovered worlds" log or just check knownUsers/spawnChunks after a delay.
  });

  // Wait for discovery to potentially run
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const userA = 'UserA';
    const worldA = 'WorldA';

    // Check if spawnChunks has UserA
    const spawnData = spawnChunks.get(userA);
    if (!spawnData) return { error: 'UserA not found in spawnChunks' };

    // Calculate expected chunk key
    const chunkKey = makeChunkKey(worldA, spawnData.cx, spawnData.cz);

    // Check OWNED_CHUNKS
    const ownership = OWNED_CHUNKS.get(chunkKey);

    // Verify if current user (which is null/anonymous initially) can edit
    // We mock `userName` to be 'UserB'
    window.userName = 'UserB';
    const canEdit = checkChunkOwnership(chunkKey, 'UserB');

    return {
        spawnData,
        chunkKey,
        ownership,
        canEdit
    };
  });

  console.log('Result:', result);

  if (result.error) {
      console.log('Error:', result.error);
      // Fail if discovery failed (which is a prerequisite)
      expect(result.error).toBeUndefined();
  }

  // Expect ownership to exist
  expect(result.ownership).toBeDefined();
  expect(result.ownership.username).toBe('UserA');
  expect(result.ownership.type).toBe('home');

  // Expect UserB cannot edit UserA's home chunk
  expect(result.canEdit).toBe(false);
});
