
'use client';
import { useState, useTransition } from 'react';
import type { Task } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { useData } from '@/hooks/use-data';

export function ProgressUpdater({ task }: { task: Task }) {
  const { toast } = useToast();
  const { user, isManagerOrAdmin } = useAuth();
  const { resources } = useData();
  const [progress, setProgress] = useState(task.progress);
  const [isPending, startTransition] = useTransition();

  const assignedResourceIds = task.impactedApps.flatMap(app => app.resourceAssignments.map(r => r.resourceId));
  const linkedUserId = resources.find(r => r.userId === user?.uid)?.id;
  const isAssignedToTask = linkedUserId ? assignedResourceIds.includes(linkedUserId) : false;
  const canUpdateProgress = isManagerOrAdmin() || (isAssignedToTask && assignedResourceIds.length === 1);


  const handleProgressUpdate = (newProgress: number) => {
    if (!canUpdateProgress) {
        toast({ title: 'Permission Denied', description: 'Only Managers, Admins, or a single assigned resource can update progress.', variant: 'destructive'});
        return;
    }
    setProgress(newProgress);
    startTransition(async () => {
      const taskRef = doc(db, 'tasks', task.id);
      const newStatus = newProgress === 100 ? 'Completed' : (newProgress > 0 ? 'In Progress' : 'Not Started');
      try {
        await updateDoc(taskRef, { progress: newProgress, status: newStatus });
        // No need to toast here, as the change will be reflected in real-time.
      } catch (error: any) {
        toast({ title: 'Error', description: 'Failed to update progress.', variant: 'destructive' });
        // Revert optimistic update on error
        setProgress(task.progress);
      }
    });
  };

  const handleProgressChange = (value: number[]) => {
    handleProgressUpdate(value[0]);
  };

  const handleSwitchChange = (checked: boolean) => {
    const newProgress = checked ? 100 : (task.progress === 100 ? 0 : task.progress);
    handleProgressUpdate(newProgress);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label>Completion Percentage</Label>
          <span className="text-sm font-medium">{progress}%</span>
        </div>
        <Progress value={progress} />
        <Slider
          value={[progress]}
          onValueChange={handleProgressChange}
          max={100}
          step={5}
          disabled={isPending || !canUpdateProgress}
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label>Mark as Complete</Label>
          <p className="text-sm text-muted-foreground">
            This will set the progress to 100%.
          </p>
        </div>
        <Switch
            checked={progress === 100}
            onCheckedChange={handleSwitchChange}
            disabled={isPending || !canUpdateProgress}
        />
      </div>
       {!canUpdateProgress && (
        <p className="text-xs text-center text-muted-foreground">
            Only Managers, Admins, or a single assigned member can update progress.
        </p>
       )}
    </div>
  );
}
