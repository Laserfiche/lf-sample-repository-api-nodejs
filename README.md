# lf-sample-repository-api-nodejs

Sample node service app that connects to a Laserfiche Cloud Repository using a service principal account.
[Sample Code](./index.ts)

### Prerequisites

#### Software Prerequisites

- Visual Studio Code
- Node 14 LTS
- TypeScript
- Git
- Clone this repo on your local machine

#### 1. Create a Service Principal

- Login to account using web access as an administrator
- Using the app picker, go to the account page
- Click on the service principal tab
- Click on the 'Add Service Principal' button to create an account to be used to run this sample service
- Click on 'Create Service Principal Key(s)'
- Save the key for later use

#### 2. Create an OAuth Service App

- Navigate to [Laserfiche Developer Console](https://app.laserfiche.com/devconsole/)
- Click on 'New' -> 'Create a new app'
- Select 'Service', enter a unique name
- Select the app service account to be the one created on step 1
- Click on the 'Authentication' Tab and create a new AccessKey
- Download key as 'base-64 string' for later use

#### 3. Create a .env file

- Using the app picker, go to the 'Repository Administration' page and copy the Repository ID
- In the root directory of this project, create an .env file containing the following lines:

```bash
SERVICE_PRINCIPAL_KEY="<Service Principal Key created from step 1>"

OAUTH_ACCESS_KEY='<base-64 Access Key from step 2>'

REPOSITORY_ID="<Repository ID>"
```

## Build and Run this App

- Open with Visual Studio Code
- On a terminal window, enter the following commands:

```bash
npm i
npm run build
npm run start
```

These commands will install, compile, and execute this program which will print out the repository information in the output window.
