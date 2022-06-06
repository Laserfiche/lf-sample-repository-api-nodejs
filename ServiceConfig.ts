import 'dotenv/config';
import { AccessKey} from '@laserfiche/lf-api-client-core';
export const servicePrincipalKey: string =
  process.env.DEV_CA_PUBLIC_USE_TESTOAUTHSERVICEPRINCIPAL_SERVICE_PRINCIPAL_KEY ?? '';
if (!servicePrincipalKey) {
  throw new Error(`Unable to load DEV_CA_PUBLIC_USE_TESTOAUTHSERVICEPRINCIPAL_SERVICE_PRINCIPAL_KEY from .env`);
}
let accessKeyBase64: string = process.env.DEV_CA_PUBLIC_USE_INTEGRATION_TEST_ACCESS_KEY ?? '';
if (!accessKeyBase64){
  throw new Error(`Unable to load accessKeyBase64 from .env`);
}
export const OAuthAccessKey: AccessKey = JSON.parse(Buffer.from(accessKeyBase64, 'base64').toString() ?? '');
export const repoId: string = process.env.DEV_CA_PUBLIC_USE_REPOSITORY_ID_1 ?? '';
