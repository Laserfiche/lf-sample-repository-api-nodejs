import 'dotenv/config';
import { ClientCredentialsGrantHandler,  ClientCredentialsOptions, AccessKey, createClientCredentialsHandler} from '@laserfiche/lf-oauth-api-client';
import { Client, ClientOptions } from '@laserfiche/lf-repository-api-client';

let repoBaseUrl = "http://api.a.clouddev.laserfiche.com/repository";

// Initialize our custom client with our base URL
let options: ClientOptions = {
    beforeFetchRequestAsync: beforeFetchRequestAsync,
    afterFetchResponseAsync: afterFetchResponseAsync
}
let client = new Client(options, repoBaseUrl);

// Set our repository and entry ids
let repoId: string = "r-76c66368";
let entryId: number = 1;
let accessToken: string = "";

async function getAccessToken() : Promise<string> {
    // Retrieve an access token and set it as the bearer token in the Authorization header
    console.log("Retrieving access token...");

    // Import our access and service principal keys 
    let testKey = process.env.ACCESS_KEY ?? ""; // Remember to JSON.parse your stringified access key
    let testServicePrincipalKey = process.env.SERVICE_PRINCIPAL_KEY ?? "";

    let credentials = createClientCredentialsHandler(testKey, testServicePrincipalKey);

    let token = await credentials.getAccessToken();
    if (token) {
        console.log("Access token retrieved: " + token?.access_token);
        return token.access_token;
    } else {
        console.error("No access token retrieved.");
        return "";
    }
}

async function beforeFetchRequestAsync(url: string, request: RequestInit): Promise<string> {
    console.log("Before fetch request for: ", url);
    return accessToken;
}

async function afterFetchResponseAsync(url: string, response: Response, request: RequestInit) : Promise<boolean> {
    console.log("After fetch request for: ", url);
    // On 401, get a new access token
    if (response.status === 401) {
        accessToken = await getAccessToken();
        return true;
    }
    return false;
}

async function getEntries() {
    try { 
        // Get our access token
        accessToken = await getAccessToken();
        // Retrieve an entry from the repository
        let response = await client.getEntryListing(repoId, entryId);
        console.log("Retrieving repository entry...");
        console.log(response);
    } catch(err) {
        console.error(err);
    }
}

getEntries();