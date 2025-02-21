import { Client, Account, ID } from 'react-native-appwrite';
export const config = {
  endpoint: "https://appwrite.appraisal.dev/v1", // Your API Endpoint
  platform: 'com.elicky.appraisal', // Your platform
  projectId: "67b8f9ce000b488553b2", // Your project ID
  databaseId: "67b8fbb10033d57cff74", // Your database ID
  userCollectionId: "67b8fbc7000db66d2c4a", // Your user collection ID
  appraisedCollectionId: "67b8fc0f0022d73cecb3", // Your appraised collection ID
  storageId: '67b8fdc7001e11054f57'
}



const client = new Client()
.setEndpoint(config.endpoint) // Your API Endpoint
    .setProject(config.projectId)
    .setPlatform(config.platform);
