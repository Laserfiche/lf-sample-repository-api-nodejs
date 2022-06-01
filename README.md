# lf-sample-repository-api-nodejs

Retrieve entries from a Laserfiche repository using the Laserfiche API and the client credentials flow.

### How to run the sample app locally

#### 1. Create a Service app on the [Laserfiche Developer Console](https://app.laserfiche.com/devconsole/)
Ensure that the Service app is properly configured with a valid Service Principal and at least one access key.

#### 2. Create an .env file 
In your root directory, create an empty .env file which will store the Service Principal Key, OAUTH_ACCESS_KEY, and RepoId

#### 3. Create a couple process variables in the .env file 
Add the corresponding credentials from the service app you created in step 1 using the same format as this example below:

```typescript
SERVICE_PRINCIPAL_KEY:string//the service principal value should  

OAUTH_ACCESS_KEY='{"customerId":string,"domain":string,"clientId":string,"jwk":{"kty":"EC","crv":"P-256","use":"sig","kid":string,"x":string,"y":string,"d":string}}'

REPOSITORY_ID_1:string
```
#### 4. Install npm dependencies 
```bash
npm i
```
#### 5. Build this Project 
```bash
npm run build
```
#### 6. Run this project
```bash
npm run start
```

#### How the sample project works 
#### Example: Retrieving a Repository Entry
#### 1. Create a RepoAPIClient by passing in the .env process variables to the constructor

```typescript
    import {
        RepositoryApiClient
    } from '@laserfiche/lf-repository-api-client';

    const repositoryApiClient = RepositoryApiClient.create(
        process.env.SERVICE_PRINCIPAL_KEY,
        process.env.OAUTH_ACCESS_KEY
    );
```
If successful, this will set an access token as the bearer token in the Authorization header and you can now make authorized requests to the Laserfiche API.

#### 2. Retrieve and print out a Repository Entry by calling the getEntry method from the entry interface of that instance
```typescript
    const rootFolderEntryId: number = 1;
    let entryResponse: Entry = await repositoryApiClient.entriesClient.getEntry({
        process.env.REPOSITORY_ID_1,
        entryId: rootFolderEntryId,
    });
    console.log(`Root Folder Name: ${entryResponse.name}`);
```


