
'use server';
import 'dotenv/config';

import { revalidatePath } from 'next/cache';
import { adjustTimeEstimate } from '@/ai/flows/ai-powered-time-adjustment';
import type { Task, UserRole } from './types';
import { adminApp } from './firebase/admin-config';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

const adminDb = getFirestore(adminApp);
const adminAuth = getAuth(adminApp);


export async function getAiTimeAdjustment(task: Task) {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
        return { success: false, error: 'GEMINI_API_KEY is not configured. Please add it to your .env file.'}
    }

    if (task.progress === 0) {
        return { success: false, error: 'Cannot adjust estimate for a task that has not been started.' };
    }
    
    const input = {
        taskId: task.id,
        completedPercentage: task.progress,
        originalEstimateDays: task.estimatedDays,
        resourceAllocation: [], // This is simplified as we don't pass this from client
        taskDescription: task.description,
    };

    try {
        const result = await adjustTimeEstimate(input);
        revalidatePath(`/dashboard/tasks/${task.id}`);
        return { success: true, data: result };
    } catch (error) {
        console.error(error);
        return { success: false, error: 'Failed to get AI-powered time adjustment. Please ensure your GEMINI_API_KEY is valid.' };
    }
}


export async function getAuthUsers() {
    try {
        const userRecords = await adminAuth.listUsers();
        const users = userRecords.users.map(user => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
        }));
        return { success: true, users };
    } catch (error: any) {
        console.error("Error fetching users:", error.message);
        return { success: false, error: "Failed to fetch users. Ensure the service account key is configured correctly." };
    }
}


export async function updateUserRole(uid: string, email: string, role: UserRole) {
    try {
        const userRoleRef = adminDb.collection('userRoles').doc(uid);
        await userRoleRef.set({ email, role });
        
        revalidatePath('/dashboard/user-management');
        return { success: true, message: `Role for ${email} updated to ${role}.` };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
