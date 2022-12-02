import 'dotenv/config';
import { authorizationTypeEnum as authType } from './AuthorizationType.js';
import { AccessKey, createFromBase64EncodedAccessKey } from '@laserfiche/lf-api-client-core';
const authorizationType: authType = (process.env.AUTHORIZATION_TYPE ?? authType.None) as authType;
let servicePrincipalKey: string;
let OAuthAccessKey: AccessKey;
let accessKeyBase64: string;
let username: string;
let password: string;
let baseUrl: string;
if (!authorizationType) {
  throw new Error(`Unable to load AUTHORIZATION_TYPE from .env`);
}
var repositoryId: string = process.env.REPOSITORY_ID ?? '';
if (authorizationType === authType.CloudAccessKey) {
  servicePrincipalKey = process.env.SERVICE_PRINCIPAL_KEY ?? '';
  accessKeyBase64 = process.env.ACCESS_KEY ?? '';
  OAuthAccessKey = createFromBase64EncodedAccessKey(accessKeyBase64 ?? '');
} else if (authorizationType === authType.APIServerUsernamePassword) {
  username = process.env.APISERVER_USERNAME ?? '';
  password = process.env.APISERVER_PASSWORD ?? '';
  baseUrl = process.env.APISERVER_REPOSITORY_API_BASE_URL ?? '';
} else {
  throw new Error(
    `"Invalid value for 'AUTHORIZATION_TYPE'. It can only be 'CLOUD_ACCESS_KEY' or 'API_SERVER_USERNAME_PASSWORD'."`
  );
}
export { OAuthAccessKey, servicePrincipalKey, repositoryId, authorizationType, username, password, baseUrl };
