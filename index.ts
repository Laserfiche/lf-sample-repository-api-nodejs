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
const rootFolderEntryId = 1;
const sampleProjectEdocName = 'JS Sample Project GetDocumentContent';

await main();

async function main(): Promise<void> {
  try {
    const scope = 'repository.Read repository.Write';
    if (authorizationType === authType.CloudAccessKey) {
      _RepositoryApiClient = createCloudRepositoryApiClient(scope);
    } else {
      _RepositoryApiClient = createSelfHostedRepositoryApiClient();
    }
    await getRepositoryName(); //Print repository name
    await getFolder(rootFolderEntryId); //Print root folder name
    await getFolderChildren(rootFolderEntryId); //Print root folder children
    const createFolderEntry = await createFolder(); //Creates a sample project folder
    const tempEdocEntryId = await importDocument(createFolderEntry.id, sampleProjectEdocName); //Imports a document inside the sample project folder
    await setEntryFields(createFolderEntry.id); // Set Entry Fields
    await getFolder(createFolderEntry.id); //Print sample project folder name
    await getFolderChildren(createFolderEntry.id); //Print sample project folder children
    await getEntryFields(createFolderEntry.id); // Print entry Fields
    await getEntryContentType(tempEdocEntryId); // Print Edoc Information
    await searchForImportedDocument(sampleProjectEdocName); //Search for the imported document inside the sample project folder
    await deleteSampleProjectFolder(createFolderEntry.id); // Deletes sample project folder and its contents inside it
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

async function getFolder(folderEntryId: number | undefined): Promise<Entry> {
  const entryResponse: Entry = await _RepositoryApiClient.entriesClient.getEntry({
    repoId: repositoryId,
    entryId: folderEntryId ?? 1,
  });
  const rootFolderName = entryResponse.name && entryResponse.name.length > 0 ? entryResponse.name : '/';
  console.log(`Root Folder Name: '${rootFolderName}'`);
  return entryResponse;
}

async function getFolderChildren(folderEntryId: number| undefined): Promise<Entry[]> {
  const result: ODataValueContextOfIListOfEntry = await _RepositoryApiClient.entriesClient.getEntryListing({
    repoId: repositoryId,
    entryId: folderEntryId ?? 1,
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
  return result;
}

async function importDocument(folderEntryId: number | undefined, sampleProjectFileName: string): Promise<number> {
  let blob: any;
  const obj = { hello: 'world' };
  if (isBrowser()) {
    blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: 'application/json',
    });
  } else {
    blob = new NodeBlob([JSON.stringify(obj, null, 2)], {
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
    parentEntryId: folderEntryId ?? 1,
    fileName: sampleProjectFileName,
    autoRename: true,
    request: request,
    electronicDocument: edoc,
  };
  console.log(`\nImporting a document into the sample project folder...`);
  const response = await _RepositoryApiClient.entriesClient.importDocument({
    ...importDocumentRequest,
  });
  const edocEntryId = response.operations?.entryCreate?.entryId ?? -1;
  return edocEntryId;
}

async function setEntryFields(entryId: number | undefined): Promise<void> {
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
  console.log(`\nSetting Entry Fields in the sample project folder...\n`);
  await _RepositoryApiClient.entriesClient.assignFieldValues({
    repoId: repositoryId,
    entryId: entryId ?? 1,
    fieldsToUpdate: requestBody,
  });
}

async function getEntryFields(setFieldsEntryId: number | undefined): Promise<ODataValueContextOfIListOfFieldValue> {
  const entryFieldResponse: ODataValueContextOfIListOfFieldValue =
    await _RepositoryApiClient.entriesClient.getFieldValues({ repoId: repositoryId, entryId: setFieldsEntryId ?? 1 });
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

async function getEntryContentType(tempEdocEntryId: number): Promise<HttpResponseHead<void>> {
  const documentContentTypeResponse: HttpResponseHead<void> =
    await _RepositoryApiClient.entriesClient.getDocumentContentType({ repoId: repositoryId, entryId: tempEdocEntryId });
  console.log(`Electronic Document Content: ${JSON.stringify(documentContentTypeResponse.headers)}`);
  console.log(
    `Electronic Document Content Type: ${JSON.stringify(documentContentTypeResponse.headers['content-type'])}`
  );
  console.log(
    `Electronic Document Content Length: ${JSON.stringify(documentContentTypeResponse.headers['content-length'])}`
  );
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

async function deleteSampleProjectFolder(sampleProjectFolderEntryId: number | undefined): Promise<void> {
  console.log(`\nDeleting all sample project entries...`);
  await _RepositoryApiClient.entriesClient.deleteEntryInfo({
    repoId: repositoryId,
    entryId: sampleProjectFolderEntryId ?? 1,
  });
  console.log(`\nDeleted all sample project entries\n`);
}

function createCloudRepositoryApiClient(scope: string): IRepositoryApiClient {
  const repositoryApiClient = RepositoryApiClient.createFromAccessKey(servicePrincipalKey, OAuthAccessKey, scope);
  return repositoryApiClient;
}

function createSelfHostedRepositoryApiClient(): IRepositoryApiClient {
  const repositoryApiClient = RepositoryApiClient.createFromUsernamePassword(repositoryId, username, password, baseUrl);
  return repositoryApiClient;
}

async function CreateEntry(
  client: IRepositoryApiClient,
  entryName: string | undefined,
  parentEntryId: number | undefined,
  autoRename = true
): Promise<Entry> {
  const request = new PostEntryChildrenRequest();
  request.entryType = PostEntryChildrenEntryType.Folder;
  request.name = entryName;
  const newEntry = await client.entriesClient.createOrCopyEntry({
    repoId: repositoryId,
    entryId: parentEntryId ?? 1,
    request,
    autoRename,
  });
  return newEntry;
}
