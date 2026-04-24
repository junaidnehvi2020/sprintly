import { TaskManagement } from '@/components/app/task-management'; // Revert to TaskManagement
 
 export default async function TasksPage() {
   return (
    <TaskManagement /> // Render TaskManagement again
   );
 }
