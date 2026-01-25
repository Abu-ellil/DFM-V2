const { machineIdSync } = require('node-machine-id');
const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');
const crypto = require('crypto');

const LICENSE_FILE = join(__dirname, '.license');

// Must match the website's secret key
const SECRET_KEY = process.env.LICENSE_SECRET_KEY || 'DateFactory2024SecretKey#$%^&*()!@#';

function getMachineId() {
  try {
    const id = machineIdSync();
    // Shorten to 16 characters to match the trial request website requirement
    return id.substring(0, 16).toUpperCase();
  } catch (error) {
    console.error('Error getting machine ID:', error);
    throw error;
  }
}

function getLicenseInfo() {
  try {
    if (!existsSync(LICENSE_FILE)) {
      return { licensed: false, machineId: getMachineId() };
    }

    const data = JSON.parse(readFileSync(LICENSE_FILE, 'utf-8'));
    return {
      licensed: true,
      machineId: data.machineId,
      licenseKey: data.licenseKey,
      factoryName: data.factoryName,
      activatedAt: data.activatedAt,
      expiryDate: data.expiryDate
    };
  } catch (error) {
    console.error('Error getting license info:', error);
    return { licensed: false, machineId: getMachineId() };
  }
}

/**
 * Validate license key format and verify it matches the current machine
 * Format: XXXX-XXXX-XXXX-XXXX-DD (DD = duration code: 4D, 1Y, etc.)
 */
function validateLicense(licenseKey) {
  try {
    const currentMachineId = getMachineId();

    if (!licenseKey || licenseKey.trim().length === 0) {
      console.log('License validation failed: Empty key');
      return false;
    }

    const parts = licenseKey.split('-');
    // Expected format: XXXX-XXXX-XXXX-XXXX-DD (5 parts)
    if (parts.length !== 5) {
      console.log('License validation failed: Invalid format, expected 5 parts, got', parts.length);
      return false;
    }

    // Extract duration code (last part)
    const durationCode = parts[4];

    // Reconstruct the key part (first 4 parts)
    const keyPart = parts.slice(0, 4).join('');

    // Generate expected hash for this machine
    const data = currentMachineId + '|' + durationCode + '|' + SECRET_KEY;
    const expectedHash = crypto.createHash('sha256').update(data).digest('hex').substring(0, 16).toUpperCase();

    // Verify the key matches
    if (keyPart !== expectedHash) {
      console.log('License validation failed: Key mismatch');
      console.log('Expected:', expectedHash);
      console.log('Got:', keyPart);
      return false;
    }

    // Check if license has expired
    const licenseFile = existsSync(LICENSE_FILE) ? JSON.parse(readFileSync(LICENSE_FILE, 'utf-8')) : null;
    if (licenseFile && licenseFile.expiryDate) {
      const expiryDate = new Date(licenseFile.expiryDate);
      const now = new Date();
      if (now > expiryDate) {
        console.log('License validation failed: License expired on', expiryDate);
        return false;
      }
    }

    console.log('License validation successful');
    return true;
  } catch (error) {
    console.error('Error validating license:', error);
    return false;
  }
}

/**
 * Calculate expiry date based on duration code
 */
function calculateExpiryDate(durationCode) {
  const now = new Date();

  // Parse duration code (e.g., "4D" = 4 days, "1Y" = 1 year)
  const match = durationCode.match(/^(\d+)([DY])$/);
  if (!match) {
    // Default to 1 year if format is invalid
    return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'D': // Days
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    case 'Y': // Years
      return new Date(now.getTime() + value * 365 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  }
}

function saveLicense(licenseKey, factoryName) {
  try {
    if (!validateLicense(licenseKey)) {
      console.log('Failed to save license: Validation failed');
      return false;
    }

    const parts = licenseKey.split('-');
    const durationCode = parts[4];
    const expiryDate = calculateExpiryDate(durationCode);
    const currentMachineId = getMachineId();

    const licenseData = {
      machineId: currentMachineId,
      licenseKey,
      factoryName,
      activatedAt: new Date().toISOString(),
      expiryDate: expiryDate.toISOString()
    };

    writeFileSync(LICENSE_FILE, JSON.stringify(licenseData, null, 2));
    console.log('License saved successfully, expires on:', expiryDate);
    return true;
  } catch (error) {
    console.error('Error saving license:', error);
    return false;
  }
}

function isLicensed() {
  try {
    if (!existsSync(LICENSE_FILE)) {
      return false;
    }

    const data = JSON.parse(readFileSync(LICENSE_FILE, 'utf-8'));

    // Check expiry first
    if (data.expiryDate) {
      const expiryDate = new Date(data.expiryDate);
      const now = new Date();
      if (now > expiryDate) {
        console.log('License has expired on', expiryDate);
        return false;
      }
    }

    return validateLicense(data.licenseKey);
  } catch (error) {
    console.error('Error checking license status:', error);
    return false;
  }
}

module.exports = {
  getMachineId,
  getLicenseInfo,
  validateLicense,
  saveLicense,
  isLicensed
};
