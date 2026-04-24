'use server';
import { config } from 'dotenv';
config();

import { adminApp } from '@/lib/firebase/admin-config';
// This initializes the admin app
console.log('Firebase Admin App initialized for Genkit:', adminApp.name);


import '@/ai/flows/ai-powered-time-adjustment.ts';
