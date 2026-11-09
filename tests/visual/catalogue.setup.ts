import {
  pendingRecords,
  resetCatalogue,
  sourceProvenance,
  writeCatalogue,
} from './catalogue-support';

export default async function setup(): Promise<void> {
  const records = pendingRecords();
  await resetCatalogue();
  await writeCatalogue(await sourceProvenance(), records, { browser: 'not launched' }, false);
}
