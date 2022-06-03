import 'dotenv/config';
import { AccessKey } from '@laserfiche/lf-api-client-core';
export const servicePrincipalKey: string = process.env.SERVICE_PRINCIPAL_KEY ?? '';
if (!servicePrincipalKey) {
  throw new Error(`Unable to load SERVICE_PRINCIPAL_KEY from .env`);
}
let accessKey: string = process.env.OAUTH_ACCESS_KEY ?? '';
if (!accessKey){
  throw new Error(`Unable to load accessKey from .env`);
}
export const OAuthAccessKey: AccessKey = JSON.parse(atob(accessKey) ?? '');
export const repoId: string = process.env.REPOSITORY_ID_1 ?? '';
