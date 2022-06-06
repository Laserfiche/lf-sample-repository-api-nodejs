import 'dotenv/config';
import { AccessKey } from '@laserfiche/lf-api-client-core';
export const servicePrincipalKey: string = process.env.SERVICE_PRINCIPAL_KEY ?? '';
if (!servicePrincipalKey) {
  throw new Error(`Unable to load SERVICE_PRINCIPAL_KEY from .env`);
}
let accessKeyBase64: string = process.env.DEV_CA_PUBLIC_USE_INTEGRATION_TEST_ACCESS_KEY ?? '';
export const OAuthAccessKey: AccessKey = JSON.parse(atob(accessKeyBase64) ?? '');
if (!accessKeyBase64){
  throw new Error(`Unable to load accessKey from .env`);
}
export const repoId: string = process.env.REPOSITORY_ID_1 ?? '';
