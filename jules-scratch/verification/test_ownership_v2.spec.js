
import { test, expect } from '@playwright/test';

test('Verify discovery and OWNED_CHUNKS population with MCUserJoin', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  // Mock network requests
  await page.route('**/GetPublicAddressByKeyword/MCWorlds**', async route => {
      await route.fulfill({ status: 200, body: '"mock_master_address"' });
  });

  await page.route('**/GetPublicMessagesByAddress/mock_master_address**', async route => {
      await route.fulfill({
          status: 200,
          body: JSON.stringify([{
              TransactionId: 'tx1',
              FromAddress: 'mock_usera_address',
              ToAddress: 'mock_join_address',
              BlockDate: new Date().toISOString()
          }])
      });
  });

  await page.route('**/GetProfileByAddress/mock_usera_address**', async route => {
      await route.fulfill({
          status: 200,
          body: JSON.stringify({ URN: 'UserA', Creators: ['mock_usera_address'] })
      });
  });

  await page.route('**/GetProfileByURN/UserA**', async route => {
      await route.fulfill({
          status: 200,
          body: JSON.stringify({ URN: 'UserA', Creators: ['mock_usera_address'] })
      });
  });

  await page.route('**/GetKeywordByPublicAddress/mock_join_address**', async route => {
      await route.fulfill({ status: 200, body: '"MCUserJoin@WorldA"' });
  });

  await page.goto('http://localhost:8080');

  // Wait for discovery
  await page.waitForTimeout(5000); // Give it time to process

  const result = await page.evaluate(() => {
    const userA = 'UserA';
    const worldA = 'WorldA';

    const spawnData = spawnChunks.get(userA);
    if (!spawnData) return { error: 'UserA not found in spawnChunks' };

    const chunkKey = makeChunkKey(worldA, spawnData.cx, spawnData.cz);
    const ownership = OWNED_CHUNKS.get(chunkKey);

    window.userName = 'UserB';
    const canEdit = checkChunkOwnership(chunkKey, 'UserB');

    // Also check if UserA can edit
    const userACanEdit = checkChunkOwnership(chunkKey, 'UserA');

    return {
        spawnData,
        chunkKey,
        ownership,
        canEdit,
        userACanEdit
    };
  });

  console.log('Result:', result);

  if (result.error) {
      console.log('Error:', result.error);
      expect(result.error).toBeUndefined();
  }

  expect(result.ownership).toBeDefined();
  expect(result.ownership.username).toBe('UserA');
  expect(result.ownership.type).toBe('home');
  expect(result.canEdit).toBe(false);
  expect(result.userACanEdit).toBe(true);
});
