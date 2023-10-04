import {
  IRepositoryApiClient,
  RepositoryApiClient,
  Entry,
  EntryCollectionResponse,
  Repository,
  CreateEntryRequest,
  CreateEntryRequestEntryType,
  FileParameter,
  FieldToUpdate,
  FieldDefinition,
  FieldType,
  SearchEntryRequest,
  RepositoryCollectionResponse,
  ImportEntryRequest,
  StartTaskResponse,
  TaskCollectionResponse,
  SetFieldsRequest,
  FieldCollectionResponse,
  Field,
  CreateMultipartUploadUrlsRequest,
  ImportEntryRequestPdfOptions,
  StartImportUploadedPartsRequest,
  GeneratePagesImageType,
  TaskStatus
} from '@laserfiche/lf-repository-api-client-v2';
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
import * as fsPromise from 'fs/promises';

let _RepositoryApiClient: IRepositoryApiClient;
const rootFolderEntryId = 1;
const sampleProjectDocumentName = 'JS Sample Project GetDocumentContent';
const largeDocumentFilePath = 'testFiles/sample.pdf';

await main();

async function main(): Promise<void> {
  let sampleFolderEntry: Entry | undefined;
  try {
    const scope = 'repository.Read repository.Write';
    if (authorizationType === authType.CloudAccessKey) {
      _RepositoryApiClient = createCloudRepositoryApiClient(scope);
    } else {
      _RepositoryApiClient = createSelfHostedRepositoryApiClient();
    }
    await printAllRepositoryNames();
    await printFolderName(rootFolderEntryId);
    await printFolderChildrenInformation(rootFolderEntryId);
    sampleFolderEntry = await createSampleProjectFolder();
    const importedEntryId = await importDocument(sampleFolderEntry.id, sampleProjectDocumentName);
    await setEntryFields(importedEntryId);
    await printEntryFields(importedEntryId);
    await searchForImportedDocument(sampleProjectDocumentName);
    await importLargeDocument(sampleFolderEntry.id, largeDocumentFilePath);

  } catch (err) {
    console.error(err);
  } finally {
    if (sampleFolderEntry) {
      await deleteSampleProjectFolder(sampleFolderEntry.id);
    }
  }
}

async function printAllRepositoryNames(): Promise<void> {
  const collectionResponse: RepositoryCollectionResponse = (await _RepositoryApiClient.repositoriesClient.listRepositories({}));
  const repositories: Repository[] = collectionResponse.value ?? [];
  repositories.forEach(repository => {
    const repositoryName = repository.name ?? '';
    const repositoryId = repository.id ?? '';
    console.log(`Repository Name: '${repositoryName}' Repository Id: [${repositoryId}]`);
  });
}

async function printFolderName(folderEntryId: number | undefined): Promise<void> {
  const rootFolderEntry: Entry = await _RepositoryApiClient.entriesClient.getEntry({
    repositoryId: repositoryId,
    entryId: folderEntryId ?? 1,
  });
  const rootFolderName = rootFolderEntry.name && rootFolderEntry.name.length > 0 ? rootFolderEntry.name : '/';
  console.log(`Root Folder Name: '${rootFolderName}'`);
}

async function printFolderChildrenInformation(folderEntryId: number| undefined): Promise<void> {
  const collectionResponse: EntryCollectionResponse = await _RepositoryApiClient.entriesClient.listEntries({
    repositoryId: repositoryId,
    entryId: folderEntryId ?? 1,
    orderby: 'name',
    groupByEntryType: true,
  });
  const children: Entry[] = collectionResponse.value ?? [];
  for (let i = 0; i < children.length; i++) {
    const child: Entry = children[i];
    console.log(`${i + 1}: Id: ${child.id} Name: '${child.name}' Type: ${child.entryType}`);
  }
}

async function createSampleProjectFolder(): Promise<Entry> {
  const newEntryName = 'JS sample project folder';
  const request: CreateEntryRequest = new CreateEntryRequest();
  request.entryType = CreateEntryRequestEntryType.Folder;
  request.name = newEntryName;
  request.autoRename = true;
  console.log(`Creating sample project folder...`);
  const newEntry = await _RepositoryApiClient.entriesClient.createEntry({
    repositoryId: repositoryId,
    entryId: rootFolderEntryId,
    request,
  });
  console.log(`Done! Entry Id: ${newEntry.id}`);
  return newEntry;
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
  const request = new ImportEntryRequest();
  request.autoRename = true;
  request.name = sampleProjectFileName;
  const edoc: FileParameter = {
    fileName: sampleProjectFileName,
    data: blob,
  };
  const importDocumentRequest = {
    repositoryId: repositoryId,
    entryId: folderEntryId ?? 1,
    file: edoc,
    request: request,
  };
  console.log(`Importing a document into the sample project folder...`);
  const importedEntry = await _RepositoryApiClient.entriesClient.importEntry({
    ...importDocumentRequest,
  });
  const importedEntryId = importedEntry.id ?? -1;
  console.log(`Done! Entry Id: ${importedEntryId}`);
  return importedEntryId;
}

async function setEntryFields(entryId: number | undefined): Promise<void> {
  let field = null;
  const fieldValue = 'JS sample project set entry value';
  let collectionResponse = await _RepositoryApiClient.fieldDefinitionsClient.listFieldDefinitions({
    repositoryId: repositoryId,
  });
  const fieldDefinitions: FieldDefinition[] | undefined = collectionResponse.value;
  if (!fieldDefinitions) {
    console.log('There is no FieldDefinition available.');
    return;
  } 
  for (let i = 0; i < fieldDefinitions.length; i++) {
    if (
      fieldDefinitions[i].fieldType == FieldType.String &&
      (fieldDefinitions[i].constraint == '' || fieldDefinitions[i].constraint == null) &&
      (fieldDefinitions[i].length ?? -1 >= 1)
    ) {
      field = fieldDefinitions[i];
      break;
    }
  }
  if (!field?.name) {
    console.log(`The FieldDefinition's name is undefined.`);
    return;
  }

  const fieldToUpdate = new FieldToUpdate();
  fieldToUpdate.name = field.name;
  fieldToUpdate.values = [fieldValue];
  const request = new SetFieldsRequest();
  request.fields = [fieldToUpdate];
  console.log(`Setting Entry Fields in the sample project folder...`);
  collectionResponse = await _RepositoryApiClient.entriesClient.setFields({
    repositoryId: repositoryId,
    entryId: entryId ?? 1,
    request: request,
  });
  if (collectionResponse.value) {
    console.log(`Number of fields set on the entry: ${collectionResponse.value.length}`);
  }
}

async function printEntryFields(entryId: number | undefined): Promise<void> {
  const collectionResponse: FieldCollectionResponse =
    await _RepositoryApiClient.entriesClient.listFields({
      repositoryId: repositoryId, 
      entryId: entryId ?? 1 });
  const fields: Field[] | undefined = collectionResponse.value;
  if (!fields) {
    console.log('There is no fields set on the entry.');
    return;
  }
  for (let i = 0; i < fields.length; i++) {
    const field: Field = fields[i];
    console.log(`${i + 1}: Id: ${field.id} Name: '${field.name}' Type: ${field.fieldType} Value: ${JSON.stringify(field.values)}}`);
  }
}


async function searchForImportedDocument(sampleProjectFileName: string): Promise<void> {
  const searchRequest: SearchEntryRequest = new SearchEntryRequest();
  searchRequest.searchCommand = `({LF:Basic ~= "${sampleProjectFileName}", option="DFANLT"})`;
  console.log(`Searching for imported document...`);
  const collectionResponse = await _RepositoryApiClient.simpleSearchesClient.searchEntry({
    repositoryId: repositoryId,
    request: searchRequest,
  });
  console.log(`Search Results:`);
  const searchResults: Entry[] = collectionResponse.value ?? [];
  for (let i = 0; i < searchResults.length; i++) {
    const entry: Entry = searchResults[i];
    console.log(`${i + 1}: Id: ${entry.id} Name: '${entry.name}' Type: ${entry.entryType}`);
  }
}

async function deleteSampleProjectFolder(sampleProjectFolderEntryId: number | undefined): Promise<void> {
  console.log(`Deleting all sample project entries...`);
  const taskResponse: StartTaskResponse = await _RepositoryApiClient.entriesClient.startDeleteEntry({
    repositoryId: repositoryId,
    entryId: sampleProjectFolderEntryId ?? 1,
  });
  const taskId: string = taskResponse.taskId ?? '';
  console.log(`Task Id: ${taskId}`);
  const taskIds = [taskId]; 
  const taskCollectionResopnse: TaskCollectionResponse = await _RepositoryApiClient.tasksClient.listTasks({
    repositoryId: repositoryId,
    taskIds: taskIds
  });
  if (taskCollectionResopnse.value) {
    const taskStatus = taskCollectionResopnse.value[0].status;
    console.log(`Task status: ${taskStatus}`);
  }
}

function createCloudRepositoryApiClient(scope: string): IRepositoryApiClient {
  const repositoryApiClient = RepositoryApiClient.createFromAccessKey(servicePrincipalKey, OAuthAccessKey, scope);
  return repositoryApiClient;
}

function createSelfHostedRepositoryApiClient(): IRepositoryApiClient {
  const repositoryApiClient = RepositoryApiClient.createFromUsernamePassword(repositoryId, username, password, baseUrl);
  return repositoryApiClient;
}

async function importLargeDocument(folderEntryId: number | undefined, filePath: string): Promise<void> {
  const eTags = new Array<string>();
  let dataSource = null;
  try 
  {
    const blob = new NodeBlob([""], {
      type: "application/json",
    });
    const file: FileParameter = {
      fileName: filePath,
      data: blob
    }
    dataSource = await fsPromise.open(file.fileName, 'r');
    const mimeType = "application/pdf";
    const numberOfUrlsRequestedInEachCall = 10;
    let thereAreMoreParts = true;
    let uploadId = null;

    let iteration = 0;
    // Iteratively request URLs and write file parts into the URLs.
    while (thereAreMoreParts) {
      iteration++;
      
      // Step 1: Request a batch of URLs by calling the CreateMultipartUploadUrls API.
      console.log(`Requesting upload URLs...`);
      const requestForURLs = prepareRequestForCreateMultipartUploadUrlsApi(iteration, numberOfUrlsRequestedInEachCall, getFileName(file.fileName), mimeType, uploadId);
      const response = await _RepositoryApiClient.entriesClient.createMultipartUploadUrls({
        repositoryId: repositoryId,
        request: requestForURLs
      });

      if (iteration == 1) {
        uploadId = response.uploadId;
      }
      
      // Step 2: Split the file and write the parts to current batch of URLs.
      console.log(`Writing file parts to upload URLs...`);
      const eTagsForThisIteration = await writeFileParts(dataSource!, response.urls!);
      eTags.push(...eTagsForThisIteration);
      thereAreMoreParts = eTagsForThisIteration.length == numberOfUrlsRequestedInEachCall;
    }    

    // Step 3: File parts are written, and eTags are ready. Call the ImportUploadedParts API.
    console.log(`Starting the import task...`);
    const pdfOptions = new ImportEntryRequestPdfOptions();
    pdfOptions.generatePages = true;
    pdfOptions.generatePagesImageType = GeneratePagesImageType.HighQualityColor;
    pdfOptions.generateText = true;
    pdfOptions.keepPdfAfterImport = true;
    const finalRequest = new StartImportUploadedPartsRequest();
    finalRequest.uploadId = uploadId ?? '';
    finalRequest.partETags = eTags;
    finalRequest.name = getFileName(file.fileName);
    finalRequest.autoRename = true;
    finalRequest.pdfOptions = pdfOptions;

    const taskResponse: StartTaskResponse = await _RepositoryApiClient.entriesClient.startImportUploadedParts({
      repositoryId: repositoryId,
      entryId: folderEntryId ?? 1,
      request: finalRequest
    });
    const taskId: string = taskResponse.taskId ?? '';
    console.log(`Task Id: ${taskId}`);
    const taskIds = [taskId];
    let inProgress = true;
    let attempt = 0;
    const maxAttempt = 5;
    while (inProgress && attempt < maxAttempt) {
      attempt++;
      console.log(`Checking status of the import task...`);
      const taskCollectionResopnse: TaskCollectionResponse = await _RepositoryApiClient.tasksClient.listTasks({
        repositoryId: repositoryId,
        taskIds: taskIds
      });
      if (taskCollectionResopnse.value) {
        const taskProgress = taskCollectionResopnse.value[0];
        const taskStatus = taskProgress.status;
        inProgress = taskStatus == TaskStatus.InProgress;
        console.log(`Task status: ${taskStatus}`);
        if (taskStatus == TaskStatus.Completed) {
          console.log(`Entry Id: ${taskProgress.result?.entryId}`);
        } else if (taskStatus == TaskStatus.Failed){
          console.log(`Errors: ${taskProgress.errors}`);
        } 
      }
    }
  } finally {
    if (dataSource) {
      dataSource.close();
    }
  }
}

function prepareRequestForCreateMultipartUploadUrlsApi(iteration: number, numberOfUrlsRequestedInEachCall: number, fileName: string, mimeType: string, uploadId? : string | null): CreateMultipartUploadUrlsRequest {
  const parameters = (iteration == 1) ? {
    startingPartNumber: 1,
    numberOfParts: numberOfUrlsRequestedInEachCall,
    fileName: fileName,
    mimeType: mimeType
  } : {
    uploadId: uploadId,
    startingPartNumber: (iteration - 1) * numberOfUrlsRequestedInEachCall + 1,
    numberOfParts: numberOfUrlsRequestedInEachCall,
  };
  return CreateMultipartUploadUrlsRequest.fromJS(parameters);
}

function getFileName(filePath: string): string {
  let fileName = filePath;
  const index = filePath.lastIndexOf('/');
  if (index >= 0) {
    fileName = filePath.substring(index + 1);
  }
  return fileName;
}
  
async function writeFileParts(source: any, urls: string[]): Promise<string[]> {
  const partSizeInMB = 5;
  const eTags = new Array<string>(urls.length);
  let writtenParts = 0;
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const [partData, endOfFileReached] = await readOnePart(source, partSizeInMB);

    if (endOfFileReached) {
      // There has been no more data to write.
      break;
    }
    const eTag = await writeFilePart(partData, url);
    writtenParts++;
    eTags[i] = eTag;
  }
  return eTags.slice(0, writtenParts);
}

async function readOnePart(file: fsPromise.FileHandle, partSizeInMB: number): Promise<[Uint8Array, boolean]> {
  const bufferSizeInBytes = partSizeInMB * 1024 * 1024;
  const buffer = new Uint8Array(bufferSizeInBytes);
  const readResult = await file.read(buffer, 0, bufferSizeInBytes);
  const endOfFileReached = readResult.bytesRead == 0;
  const partData = readResult.buffer.subarray(0, readResult.bytesRead);
  return [partData, endOfFileReached];
}

async function writeFilePart(part: Uint8Array, url: string): Promise<string> {
  let eTag = "";
  const response = await fetch(url, {
    method: 'PUT',
    body: part,
    headers: {'Content-Type': 'application/octet-stream'} });

  if (response.ok && response.body !== null && response.status == 200) {
    eTag = response.headers.get("ETag")!;
    if (eTag) {
      eTag = eTag.substring(1, eTag.length - 1); // Remove heading and trailing double-quotation
    }
  } 
  return eTag;
}
