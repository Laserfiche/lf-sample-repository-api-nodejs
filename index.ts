import {
  IRepositoryApiClient,
  RepositoryApiClient,
  Entry,
  ODataValueContextOfIListOfEntry,
  RepositoryInfo,
} from '@laserfiche/lf-repository-api-client';
import { OAuthAccessKey, servicePrincipalKey, repoId } from './ServiceConfig.js';
import 'isomorphic-fetch';

//Create a Laserfiche Repository API Client
const _RepositoryApiClient: IRepositoryApiClient = createRepoAPIClient();
const rootFolderEntryId = 1;

await main();

async function main(): Promise<void> {
  try {
    await getRepoName(); //Print repository name
    await getRootFolder(); //Print root folder name
    await getFolderChildren(rootFolderEntryId); //Print root folder children
  } catch (err) {
    console.error(err);
  }
}

async function getRepoName(): Promise<string> {
  const response: RepositoryInfo[] = await _RepositoryApiClient.repositoriesClient.getRepositoryList({});
  const repoName = response[0].repoName ?? '';
  const repoId = response[0].repoId ?? '';
  console.log(`Repository Name: '${repoName} [${repoId}]'`);
  return repoName;
}

async function getRootFolder(): Promise<Entry> {
  const entryResponse: Entry = await _RepositoryApiClient.entriesClient.getEntry({
    repoId,
    entryId: rootFolderEntryId,
  });
  const rootFolderName = entryResponse.name && entryResponse.name.length > 0 ? entryResponse.name : '/';
  console.log(`Root Folder Name: '${rootFolderName}'`);
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
  for (let i = 0; i < children.length; i++) {
    const child: Entry = children[i];
    console.log(`${i}:[${child.entryType} id:${child.id}] '${child.name}'`);
  }
  return children;
}

function createRepoAPIClient(): IRepositoryApiClient {
  const repositoryApiClient = RepositoryApiClient.createFromAccessKey(servicePrincipalKey, OAuthAccessKey);
  return repositoryApiClient;
}
