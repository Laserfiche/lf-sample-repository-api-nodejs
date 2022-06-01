import {
  IRepositoryApiClient,
  RepositoryApiClient,
  Entry,
  ODataValueContextOfIListOfEntry,
} from '@laserfiche/lf-repository-api-client';
import { OAuthAccessKey, servicePrincipalKey, repoId, baseUrlDebug } from './ServiceConfig.js';

const _RepositoryApiClient: IRepositoryApiClient = createRepoAPIClient();
const rootFolderEntryId: number = 1;

await main();

async function main(): Promise<void> {
  const rootFolder: Entry = await getRootFolder();
  const rootFolderChildren: Entry[] = await getFolderChildren(rootFolderEntryId);
}

async function getRootFolder(): Promise<Entry> {
  let entryResponse: Entry = await _RepositoryApiClient.entriesClient.getEntry({
    repoId,
    entryId: rootFolderEntryId,
  });
  console.log(`Root Folder Name: ${entryResponse.name}`);
  return entryResponse;
}

async function getFolderChildren(folderEntryId: number): Promise<Entry[]> {
  const result: ODataValueContextOfIListOfEntry = await _RepositoryApiClient.entriesClient.getEntryListing({
    repoId,
    entryId: folderEntryId,
    orderby: 'name',
    groupByEntryType: true,
  });
  const children: Entry[] = result.value ?? [];
  for (let i = 0; i < children.length;i++) {
    let child:Entry = children[i];
    console.log(`${i}:[${child.entryType}] ${child.name}`);
  }
  return children;
}

function createRepoAPIClient(): IRepositoryApiClient {
  const repositoryApiClient = RepositoryApiClient.create(
    servicePrincipalKey,
    JSON.stringify(OAuthAccessKey)
  );
  return repositoryApiClient;
}
