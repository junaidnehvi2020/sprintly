
import * as fs from 'fs/promises';
import * as path from 'path';

interface ProjectArchive {
  [filePath: string]: string;
}

async function unpackProject() {
  console.log('Starting to unpack project...');

  try {
    const archiveContent = await fs.readFile('project_archive.json', 'utf-8');
    const archive: ProjectArchive = JSON.parse(archiveContent);

    const fileCount = Object.keys(archive).length;
    console.log(`Found ${fileCount} files in the archive.`);

    if (archive.NOTE) {
      console.warn("Warning: project_archive.json seems to be a placeholder. Run 'npm run pack' in your Studio environment to generate the full archive first.");
    }

    for (const filePath in archive) {
      if (filePath === 'NOTE') continue; // Skip the placeholder note

      const content = archive[filePath];
      const dir = path.dirname(filePath);

      try {
        if (dir !== '.' && dir !== '') {
          // Create directory if it doesn't exist
          await fs.mkdir(dir, { recursive: true });
        }
        await fs.writeFile(filePath, content);
        console.log(`Unpacked: ${filePath}`);
      } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
      }
    }

    console.log('\nProject successfully unpacked!');
    console.log("Next steps: Run 'npm install' and then 'npm run dev'");
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error('Error: project_archive.json not found. Please make sure the file is in the root directory.');
    } else {
      console.error('Error reading or parsing archive file:', error);
    }
  }
}

unpackProject();
