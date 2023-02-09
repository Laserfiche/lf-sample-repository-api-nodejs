import {
  IRepositoryApiClient,
  RepositoryApiClient,
  Entry,
  ODataValueContextOfIListOfEntry,
  RepositoryInfo,
} from '@laserfiche/lf-repository-api-client';
import {
  OAuthAccessKey,
  servicePrincipalKey,
  repositoryId,
  authorizationType,
  username,
  password,
  baseUrl,
} from './ServiceConfig.js';
import { authorizationTypeEnum as authType } from './AuthorizationType.js';
import 'isomorphic-fetch';

//Create a Laserfiche Repository API Client
let _RepositoryApiClient: IRepositoryApiClient;
const rootFolderEntryId = 1;

const scope = "repository.Read"; // Scope(s) requested by the app

await main();

async function main(): Promise<void> {
  try {
    if (authorizationType === authType.CloudAccessKey) {
      _RepositoryApiClient = createCloudRepositoryApiClient();
    } else {
      _RepositoryApiClient = createSelfHostedRepositoryApiClient();
    }
    await getRepositoryName(); //Print repository name
    await getRootFolder(); //Print root folder name
    await getFolderChildren(rootFolderEntryId); //Print root folder children
  } catch (err) {
    console.error(err);
  }
}

async function getRepositoryName(): Promise<string> {
  const response: RepositoryInfo[] = await _RepositoryApiClient.repositoriesClient.getRepositoryList({});
  const repoName = response[0].repoName ?? '';
  const repoId = response[0].repoId ?? '';
  console.log(`Repository Name: '${repoName} [${repoId}]'`);
  return repoName;
}

async function getRootFolder(): Promise<Entry> {
  const entryResponse: Entry = await _RepositoryApiClient.entriesClient.getEntry({
    repoId: repositoryId,
    entryId: rootFolderEntryId,
  });
  const rootFolderName = entryResponse.name && entryResponse.name.length > 0 ? entryResponse.name : '/';
  console.log(`Root Folder Name: '${rootFolderName}'`);
  return entryResponse;
}

async function getFolderChildren(folderEntryId: number): Promise<Entry[]> {
  const result: ODataValueContextOfIListOfEntry = await _RepositoryApiClient.entriesClient.getEntryListing({
    repoId: repositoryId,
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

function createCloudRepositoryApiClient(): IRepositoryApiClient {
  const repositoryApiClient = RepositoryApiClient.createFromAccessKey(servicePrincipalKey, OAuthAccessKey, scope);
  return repositoryApiClient;
}

function createSelfHostedRepositoryApiClient(): IRepositoryApiClient {
  const repositoryApiClient = RepositoryApiClient.createFromUsernamePassword(repositoryId, username, password, baseUrl);
  return repositoryApiClient;
}
