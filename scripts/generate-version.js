#!/usr/bin/env node

/**
 * This script generates a version.json file with the current Git commit SHA
 * Run this script before building the app to ensure the version file is up-to-date
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to the public directory where we'll store the version file
const PUBLIC_DIR = path.resolve(__dirname, '../public');
const VERSION_FILE = path.join(PUBLIC_DIR, 'version.json');

try {
  // Get the current Git commit SHA
  const gitSha = execSync('git rev-parse HEAD', { cwd: path.resolve(__dirname, '..') }).toString().trim();
  const shortSha = gitSha.substring(0, 7); // Short version of SHA
  
  // Get package version
  const packageJson = require('../package.json');
  const version = packageJson.version || '1.0.0';
  
  // Create version data
  const versionData = {
    version,
    gitSha,
    shortSha,
    timestamp: new Date().toISOString(),
    buildTime: new Date().toISOString()
  };
  
  // Write to version.json file
  fs.writeFileSync(VERSION_FILE, JSON.stringify(versionData, null, 2));
  
  console.log(`✅ Version file created at ${VERSION_FILE}`);
  console.log(`   Version: ${version}`);
  console.log(`   Git SHA: ${gitSha}`);
  console.log(`   Short SHA: ${shortSha}`);
  console.log(`   Timestamp: ${versionData.timestamp}`);
  console.log(`   Build Time: ${versionData.buildTime}`);
  
} catch (error) {
  console.error('❌ Error generating version file:', error.message);
  
  // Create a fallback version file if Git command fails
  const fallbackData = {
    version: require('../package.json').version || '1.0.0',
    gitSha: 'unknown',
    shortSha: 'unknown',
    timestamp: new Date().toISOString(),
    buildTime: new Date().toISOString(),
    error: 'Could not retrieve Git SHA'
  };
  
  fs.writeFileSync(VERSION_FILE, JSON.stringify(fallbackData, null, 2));
  console.log(`⚠️ Created fallback version file at ${VERSION_FILE}`);
}
