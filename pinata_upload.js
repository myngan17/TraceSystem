// pinata_upload.js (fixed for Pinata SDK metadata requirement)
const fs = require('fs');
const path = require('path');
const pinataSDK = require('@pinata/sdk');

const KEY = process.env.PINATA_KEY;
const SECRET = process.env.PINATA_SECRET;

if (!KEY || !SECRET) {
  console.error('ERROR: Set PINATA_KEY and PINATA_SECRET env vars in PowerShell');
  process.exit(1);
}

// IMPORTANT: use "new"
const pinata = new pinataSDK(KEY, SECRET);

async function pinFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const fileName = path.basename(filePath);
  const readableStream = fs.createReadStream(filePath);

  const pinOptions = {
    pinataMetadata: {
      name: fileName  // REQUIRED by new Pinata SDK
    }
  };

  console.log(`Uploading ${fileName}...`);

  // Add pinOptions to fix the error
  const result = await pinata.pinFileToIPFS(readableStream, pinOptions);

  console.log(`${fileName} → ${result.IpfsHash}`);
  return result.IpfsHash;
}

(async () => {
  try {
    const metadataCID = await pinFile(path.join(__dirname, 'metadata.json'));
    const photoCID = await pinFile(path.join(__dirname, 'photo.jpg'));
    const reportCID = await pinFile(path.join(__dirname, 'report.pdf'));

    console.log('--- UPLOAD COMPLETED ---');
    console.log('metadataCID:', metadataCID);
    console.log('photoCID:', photoCID);
    console.log('reportCID:', reportCID);
  } catch (e) {
    console.error('Upload error:', e && (e.message || e));
  }
})();
