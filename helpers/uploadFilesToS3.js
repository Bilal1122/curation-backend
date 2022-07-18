const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const AWS = require('aws-sdk');
const path = require('path');
const { sendEmail } = require('./Email');
const moment = require('moment');

const BUCKET_NAME = 'tempo-storage';
const IAM_USER_KEY = 'AKIA6FXUL7JKNNPDE7BR';
const IAM_USER_SECRET = '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';

const s3 = new AWS.S3({
  secretAccessKey: IAM_USER_SECRET,
  accessKeyId: IAM_USER_KEY,
  region: 'us-east-2',
  signatureVersion: 'v4',
});

const uploadToS3 = (path, filename, type) => {
  if (!path) return;
  const fileStream = fs.createReadStream(path);
  const params = {
    Bucket: BUCKET_NAME,
    Key: filename,
    ACL: 'public-read',
    Body: fileStream,
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) return reject(err);
      console.log({ data });
      resolve({
        ...data,
        type,
      });
    });
  });
};

let processFile = async (
  fileName,
  email,
  reportType,
  groupName,
  startFileName,
  endFileName,
  title
) => {
  let filePath = path.join(__dirname, `../logs/${fileName}`);
  fileName = `TEMPO${reportType} - Tracks Not Available - ${groupName} - (${moment(
    startFileName
  ).format('YYYY-MM-DD')} - ${moment(endFileName).format('YYYY-MM-DD')}).csv`;
  let file_uploaded = null;

  let emails = email && email.replace(/ /gm, '').split(',') || '';
  if (emails.length) {
    file_uploaded = await uploadToS3(filePath, fileName, 'text');
  }

  for (let i = 0; i < emails.length; i++) {
    await sendEmail(
      emails[i],
      null,
      'sendReports',
      null,
      null,
      null,
      file_uploaded.Location,
      reportType,
      title,
      groupName
    );
  }
  // fs.unlinkSync(filePath);
  return true;
};

module.exports = { processFile };
