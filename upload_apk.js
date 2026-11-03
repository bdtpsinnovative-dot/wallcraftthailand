const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const r2Client = new S3Client({
  region: 'auto',
  endpoint: 'https://b2d8a39465363e6ce28ce8a0d9da0288.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '925d8cdf8398089cdc80b8c657295751',
    secretAccessKey: '33545ba66dcaf6d4c6c9e1888b79fc257d8ef81aca9149e243eba06ae57ee227',
  },
});

async function upload() {
  const apkPath = 'C:\\Users\\Por Woodden\\Desktop\\the_best\\hello_app\\build\\app\\outputs\\flutter-apk\\app-release.apk';
  if (!fs.existsSync(apkPath)) {
    console.error('APK file not found at:', apkPath);
    process.exit(1);
  }
  const fileStat = fs.statSync(apkPath);
  console.log(`Uploading ${apkPath} (${(fileStat.size / (1024 * 1024)).toFixed(2)} MB)...`);

  const fileStream = fs.createReadStream(apkPath);
  const uploadParams = {
    Bucket: 'wallcraft-storage-apk',
    Key: 'app-release.apk',
    Body: fileStream,
    ContentType: 'application/vnd.android.package-archive',
    ContentLength: fileStat.size,
  };

  await r2Client.send(new PutObjectCommand(uploadParams));
  console.log('Upload to R2 complete! URL: https://app.wallcraftthailand.com/app-release.apk');
}

upload().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});
