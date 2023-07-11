import {
  IRepositoryApiClient,
  RepositoryApiClient,
  Entry,
  ODataValueContextOfIListOfEntry,
  RepositoryInfo,
  PostEntryChildrenRequest,
  PostEntryChildrenEntryType,
  PostEntryWithEdocMetadataRequest,
  FileParameter,
  ValueToUpdate,
  FieldToUpdate,
  WFieldInfo,
  WFieldType,
  FieldValue,
  HttpResponseHead,
  ODataValueContextOfIListOfFieldValue,
  SimpleSearchRequest,
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
import { Blob as NodeBlob } from 'buffer';
import { authorizationTypeEnum as authType } from './AuthorizationType.js';
import 'isomorphic-fetch';
import { isBrowser } from '@laserfiche/lf-js-utils/dist/utils/core-utils.js';

let _RepositoryApiClient: IRepositoryApiClient;
let tempSampleProjectFolderId = 0;
let tempEntryFieldId = 0;
let tempEdocEntryId = 0;
const rootFolderEntryId = 1;
const sampleProjectEdocName = 'JS Sample Project GetDocumentContent';

await main();

async function main(): Promise<void> {
  try {
    if (authorizationType === authType.CloudAccessKey) {
      _RepositoryApiClient = createCloudRepositoryApiClient();
    } else {
      _RepositoryApiClient = createSelfHostedRepositoryApiClient();
    }
    await getRepositoryName(); //Print repository name
    await getRootFolder(rootFolderEntryId); //Print root folder name
    await getFolderChildren(rootFolderEntryId); //Print root folder children
    await createFolder(); //Creates a sample project folder
    await importDocument(tempSampleProjectFolderId, sampleProjectEdocName); //Imports a document inside the sample project folder
    await setEntryFields(); // Set Entry Fields
    await getRootFolder(tempSampleProjectFolderId); //Print sample project folder name
    await getFolderChildren(tempSampleProjectFolderId); //Print sample project folder children
    await getEntryFields(); // Print entry Fields
    await getEntryContentType(); // Print Edoc Information
    await searchForImportedDocument(sampleProjectEdocName); //Search for the imported document inside the sample project folder
    await deleteSampleProjectFolder(); // Deletes sample project folder and its contents inside it
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

async function getRootFolder(folderEntryId: number): Promise<Entry> {
  const entryResponse: Entry = await _RepositoryApiClient.entriesClient.getEntry({
    repoId: repositoryId,
    entryId: folderEntryId,
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

async function createFolder(): Promise<Entry> {
  const newEntryName = 'JS sample project folder';
  const request: PostEntryChildrenRequest = new PostEntryChildrenRequest();
  request.entryType = PostEntryChildrenEntryType.Folder;
  request.name = newEntryName;
  console.log(`\nCreating sample project folder...`);
  const result = await _RepositoryApiClient.entriesClient.createOrCopyEntry({
    repoId: repositoryId,
    entryId: rootFolderEntryId,
    request,
    autoRename: true,
  });
  tempSampleProjectFolderId = Number(result.id);
  return result;
}

async function importDocument(folderEntryId: number, sampleProjectFileName: string): Promise<void> {
  let blob: any;
  if (isBrowser()) {
    blob = new Blob([''], {
      type: 'application/json',
    });
  } else {
    blob = new NodeBlob([''], {
      type: 'application/json',
    });
  }
  const request = new PostEntryWithEdocMetadataRequest();
  const edoc: FileParameter = {
    fileName: sampleProjectFileName,
    data: blob,
  };
  const importDocumentRequest = {
    repoId: repositoryId,
    parentEntryId: folderEntryId,
    fileName: sampleProjectFileName,
    autoRename: true,
    request: request,
    electronicDocument: edoc,
  };
  console.log(`\nImporting a document into the sample project folder...`);
  const response = await _RepositoryApiClient.entriesClient.importDocument({
    ...importDocumentRequest,
  });
  tempEdocEntryId = Number(response.operations?.entryCreate?.entryId);
}

async function setEntryFields(): Promise<void> {
  let field = null;
  const fieldValue = 'JS sample project set entry value';
  const fieldDefinitionsResponse = await _RepositoryApiClient.fieldDefinitionsClient.getFieldDefinitions({
    repoId: repositoryId,
  });
  const fieldDefinitions: WFieldInfo[] | undefined = fieldDefinitionsResponse.value;
  if (!fieldDefinitions) {
    throw new Error('fieldDefinitions is undefined');
  }
  for (let i = 0; i < fieldDefinitions.length; i++) {
    if (
      fieldDefinitions[i].fieldType == WFieldType.String &&
      (fieldDefinitions[i].constraint == '' || fieldDefinitions[i].constraint == null) &&
      (fieldDefinitions[i].length ?? -1 >= 1)
    ) {
      field = fieldDefinitions[i];
      break;
    }
  }
  if (!field?.name) {
    throw new Error('field is undefined');
  }
  const value = new ValueToUpdate();
  value.value = fieldValue;
  value.position = 1;
  const name = new FieldToUpdate();
  name.values = [value];
  const requestBody = { [field.name]: name };
  const entry: Entry = await CreateEntry(_RepositoryApiClient, 'JS Sample Project SetFields');
  const num = Number(entry.id);
  tempEntryFieldId = Number(entry.id);
  console.log(`\nSetting Entry Fields in the sample project folder...\n`);
  await _RepositoryApiClient.entriesClient.assignFieldValues({
    repoId: repositoryId,
    entryId: num,
    fieldsToUpdate: requestBody,
  });
}

async function getEntryFields(): Promise<ODataValueContextOfIListOfFieldValue> {
  const entryFieldResponse: ODataValueContextOfIListOfFieldValue =
    await _RepositoryApiClient.entriesClient.getFieldValues({ repoId: repositoryId, entryId: tempEntryFieldId });
  const fieldDefinitions: FieldValue[] | undefined = entryFieldResponse.value;
  if (!fieldDefinitions) {
    throw new Error('fieldDefinitions is undefined');
  }
  console.log(`Entry Field Name: ${fieldDefinitions[0].fieldName}`);
  console.log(`Entry Field Type: ${fieldDefinitions[0].fieldType}`);
  console.log(`Entry Field ID: ${fieldDefinitions[0].fieldId}`);
  console.log(`Entry Field Value: ${JSON.stringify(fieldDefinitions[0].values)}`);
  return entryFieldResponse;
}

async function getEntryContentType(): Promise<HttpResponseHead<void>> {
  const documentContentTypeResponse: HttpResponseHead<void> =
    await _RepositoryApiClient.entriesClient.getDocumentContentType({ repoId: repositoryId, entryId: tempEdocEntryId });
  console.log(`Electronic Document Content: ${JSON.stringify(documentContentTypeResponse.headers)}`);
  return documentContentTypeResponse;
}

async function searchForImportedDocument(sampleProjectFileName: string): Promise<void> {
  const searchRequest: SimpleSearchRequest = new SimpleSearchRequest();
    searchRequest.searchCommand = `({LF:Basic ~= "${sampleProjectFileName}", option="DFANLT"})`;
    console.log(`\nSearching for imported document...`);
    const simpleSearchResponse = await _RepositoryApiClient.simpleSearchesClient.createSimpleSearchOperation({
      repoId: repositoryId,
      request: searchRequest,
    });
    console.log(`\nSearch Results`);
    const searchResults: Entry[] = simpleSearchResponse.value ?? [];
    for (let i = 0; i < searchResults.length; i++) {
      const child: Entry = searchResults[i];
      console.log(`${i}:[${child.entryType} id:${child.id}] '${child.name}'`);
    }
}

async function deleteSampleProjectFolder(): Promise<void> {
  console.log(`\nDeleting all sample project entries...`);
  await _RepositoryApiClient.entriesClient.deleteEntryInfo({
    repoId: repositoryId,
    entryId: tempSampleProjectFolderId,
  });
  console.log(`\nDeleted all sample project entries\n`);
}

function createCloudRepositoryApiClient(): IRepositoryApiClient {
  const repositoryApiClient = RepositoryApiClient.createFromAccessKey(servicePrincipalKey, OAuthAccessKey);
  return repositoryApiClient;
}

function createSelfHostedRepositoryApiClient(): IRepositoryApiClient {
  const repositoryApiClient = RepositoryApiClient.createFromUsernamePassword(repositoryId, username, password, baseUrl);
  return repositoryApiClient;
}

async function CreateEntry(
  client: IRepositoryApiClient,
  entryName: string | undefined,
  parentEntryId: number = tempSampleProjectFolderId,
  autoRename = true
): Promise<Entry> {
  const request = new PostEntryChildrenRequest();
  request.entryType = PostEntryChildrenEntryType.Folder;
  request.name = entryName;
  const newEntry = await client.entriesClient.createOrCopyEntry({
    repoId: repositoryId,
    entryId: parentEntryId,
    request,
    autoRename,
  });
  return newEntry;
}
