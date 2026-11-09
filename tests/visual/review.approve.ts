import { test } from '@playwright/test';

import { promoteReferences } from './review-promotion';

test('promotes only explicitly owner-approved candidate bytes', async () => {
  const path = process.env.TOYBOX_APPROVAL_FILE;
  if (path === undefined || path === '') throw new Error('Set TOYBOX_APPROVAL_FILE to the reviewed selection JSON');
  const files = promoteReferences(path);
  await test.info().attach('promoted-selection', { body: JSON.stringify(files, null, 2), contentType: 'application/json' });
});
