
# Local Project Setup Guide

This guide will walk you through the steps to set up this project on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 18 or higher is recommended)
- A code editor like [Visual Studio Code](https://code.visualstudio.com/)

## Step 1: Create Your Local Project Directory

On your local machine, create a **new, empty folder** for your project. For example:

```bash
mkdir my-sprintly-app
cd my-sprintly-app
```

## Step 2: Download the Core Files from Studio

From the file explorer in your Firebase Studio environment, you need to download three essential files from the **project's root directory** and place them into the `my-sprintly-app` folder you just created.

1.  `package.json`
2.  `project_archive.json`
3.  `unpacker.ts`

Your local folder should now look like this:

```
my-sprintly-app/
├── package.json
├── project_archive.json
└── unpacker.ts
```

## Step 3: Install Dependencies

Open a terminal or command prompt inside your new project folder (`my-sprintly-app`) and run the following command to install all the necessary packages defined in `package.json`:

```bash
npm install
```

This may take a few moments to complete.

## Step 4: Unpack the Project

Once the installation is complete, run the `unpack` script from your terminal:

```bash
npm run unpack
```

This command will execute the `unpacker.ts` script. It reads `project_archive.json` and recreates all the original directories and files for your project, exactly as they are in your Studio environment.

## Step 5: Configure Environment Variables

The project requires environment variables for Firebase and Genkit services.

1.  Locate the `.env` file that was created by the unpacker script.
2.  Open it and fill in the necessary values for your Firebase project and any AI service keys (like `GEMINI_API_KEY`).

Example `.env` content:
```
# Genkit - Google AI
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase - (This is usually handled by framework integration, but good to have)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... and other Firebase config keys
```
*Note: You can get these values from your Firebase project settings.*

## Step 6: Run the Application

You're all set! You can now run the local development server:

```bash
npm run dev
```

Open your browser and navigate to the local address provided in the terminal (usually `http://localhost:9003`) to see your Sprintly application running.
adminpass1234
lmi@AI2026
localpass1234
memberpass1234
testpass1234