/**
 * Script to copy assetlinks.json from Render secrets to the build directory
 * This ensures the Digital Asset Links file is available at the correct path
 * without exposing sensitive information in the repository
 */

const fs = require('fs');
const path = require('path');

// Paths
const secretPath = '/etc/secrets/assetlinks.json'; // We upload this file to Render secrets
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
    console.log('Not running in Render environment. Skipping.');
  }
}

// Execute the function
copyAssetLinks();
