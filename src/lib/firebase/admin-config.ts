
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

const serviceAccount = {
  "type": "service_account",
  "project_id": "studio-2645670114-5471b",
  "private_key_id": "dcd773358d08bdf62f8ac9b7bdc76e6ca10b2915",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDWtqMaYPoM75mw\nCPWc4tADDKzINJYsXyIvuIvhA4+JRT4/dqmJWPJHBzOb0bz3SNsWxv8SeETC3cP0\nIFNgpnSLBsfOM4ZIijYxhVCgw7MyQzt9/9nHGDXY2UnRx2xUOGFvMfol90RF2r9t\nBPR/ei306mdp49xy63S2YnTp7AWYJg71puiKsK7exM3CC8ZwYPotO0P8ZEFou1Qr\noz3OiFwHbfIUkt7iYUJRZGK68x1Bx1pcLN1D6vyUuXNwDXuLo7wvUbtfYVgFNXEL\nnmHgCk6eTDbxKs5aLYiWo55qCX/CFT2ickEialnBV+QyB95kZGHWepFAegnfJKrf\nTN/1mSgpAgMBAAECggEAAXjlX6kOUeAjNkQrdfjOqxSvSxykMnfxBrF94Qw6k9sC\nESKVyUOvPpovqgf7QxlQakSxS03Aj/MAFNiTZchiaHEildj/2Ne8xSRoP//zhrrU\nCbpDQqSZeuwLf+kdhqrPzTjDIbdDNDTqpttXt1eNwN4KGT1nHbEcXuNIMLHt/GP0\nM0/yIZcwmH49FTNoowa9/svC0JZnvF6XLgRpBiORb3M0lA3JCJmyY/zTk99ByTFH\nQfC+c9CjVd0enrhukE4Fo3YSet1IlPgNt7jVyxMv0OYdH6XFP8XKuTGPuGa1T9gD\nWILfJpnyFJ1VQy0+rtG4mMHYWG8n/rpySrU0jvOM8QKBgQDu/GbHyd/95dU/W2y9\njt/R6HuQfVxWaT/vVU1Zy1TA/SIVtln5cXSyUzzeT/7nbOzK/AwbX9F+NA4O5rDo\nqB0Ggx5HyFT/ejQbWlcIZLNm3AAdc8gCae2qrqDYlWnaDYNoudLQprQjgdxKB2vL\n4NHk6KEGUqPcDb/7Jd673S7EMQKBgQDl/9xlGBQFZPwLw9cG7IowSyd2V4bFvbYv\ncIZus5uHqSgrHv6GgxgBd7qHXd/TTjrvht2GZaZ5mwQhMRpUO0eB6Zs879bl0n58\noTn0DwpYb4UgP5CShMUsmgQahUPg7CRYWTlyELML1/4hCFp/JNitgbcEwLBDrIoz\n35m2V7r9eQKBgQDN6GZd6Q+24Jl1dz4frMQnRVmBSqGOSiyt9x8oKMqjZPZDItQu\n2ZQkOReOq/oCR5VV5wg/ZbVIOW2LZTQzoPUxMTObwX2KiS3wC0xFjQ4Np6vptGI1\nwjLmBoPLWCDVoSMBzmlXIOrAVRkKJ463IMN3qP9kRTutU6N/rkdUMeQjYQKBgCb2\nRwGhKJMZXlEn5d84ZthzgsXbYetRjfFPYJaUOn6quzFC2N80ifaFr8WKs4X6NKWq\n9Q/1XFQxXGu7A7jNKfnp9vBFuOPJ2r+GGGktuxTsH2MtIXKQp0488QEFHlCV8Do/\nMyoNhic1eclivuHW/hW2aaiWc8WjDu5mrIVlKzoRAoGAQnPJPzpb/i3xJ700cl5o\nVejyep6Epn+Qndgm2SovAj5sP7ObKL65/tDi/gp8EDyFfkeFh81xA1H0LJ2jO/4V\n9vHEzoPXXTKm3jx+6cL5A790khl/snsD6dkukcGTqnmYSO1vs9wCKWxZS5wZTrh+\nroP1NdR9AkZtMCD7++g5xyg=\n-----END PRIVATE KEY-----\n".replace(/\\n/g, '\n'),
  "client_email": "firebase-adminsdk-fbsvc@studio-2645670114-5471b.iam.gserviceaccount.com",
  "client_id": "117742508797140709738",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40studio-2645670114-5471b.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

const adminApp: App = getApps().find(app => app.name === 'firebase-admin') || initializeApp({
    credential: credential.cert(serviceAccount),
}, 'firebase-admin');

export { adminApp };
