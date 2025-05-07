/**
 * Script to copy assetlinks.json from Render secrets to the build directory
 * This ensures the Digital Asset Links file is available at the correct path
 * without exposing sensitive information in the repository
 */

const fs = require('fs');
const path = require('path');

// Paths
const secretPath = '/etc/secrets/assetlinks.json';
const targetDir = path.join(__dirname, '../build/.well-known');
const targetPath = path.join(targetDir, 'assetlinks.json');

// Create function to handle the copy process
function copyAssetLinks() {
  console.log('Checking for assetlinks.json in secrets...');
  
  // Check if we're running in the Render environment
  // Render sets environment variables like RENDER_SERVICE_ID
  if (process.env.RENDER_SERVICE_ID) {
    try {
      // Check if the secret file exists
      if (fs.existsSync(secretPath)) {
        // Create the target directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
          console.log(`Creating directory: ${targetDir}`);
          fs.mkdirSync(targetDir, { recursive: true });
        }
        
        // Copy the file
        fs.copyFileSync(secretPath, targetPath);
        console.log(`Successfully copied assetlinks.json to ${targetPath}`);
      } else {
        console.log('No assetlinks.json found in secrets. Skipping.');
      }
    } catch (error) {
      console.error('Error copying assetlinks.json:', error);
    }
  } else {
    // For local development or other environments
    console.log('Not running in Render environment.');
    
    // Check if there's a local development version for testing
    // First check in the client root folder (where android-settings.json is located)
    const rootAssetLinksPath = path.join(__dirname, '../assetlinks.json');
    const publicAssetLinksPath = path.join(__dirname, '../public/.well-known/assetlinks.json');
    
    // Prioritize the root folder version, then fall back to public folder
    const localAssetLinksPath = fs.existsSync(rootAssetLinksPath) ? rootAssetLinksPath : publicAssetLinksPath;
    if (fs.existsSync(localAssetLinksPath)) {
      // Create the target directory if it doesn't exist
      if (!fs.existsSync(targetDir)) {
        console.log(`Creating directory: ${targetDir}`);
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Copy the local development file
      fs.copyFileSync(localAssetLinksPath, targetPath);
      console.log(`Copied assetlinks.json from ${localAssetLinksPath} to ${targetPath} for testing`);
    } else {
      console.log('No local assetlinks.json found. Skipping setup.');
    }
  }
}

// Execute the function
copyAssetLinks();
