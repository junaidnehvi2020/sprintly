
'use client';
import React, { useState, useMemo, useEffect, forwardRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useData } from '@/hooks/use-data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  ListChecks,
  Loader,
  CheckCircle,
  CalendarClock,
  Clock,
  ClipboardList,
  Check,
  AlertTriangle,
  Briefcase,
  Building2,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { getBusinessDays } from '@/lib/utils';
import type { Task, ResourceAssignment, ImpactedApp, Application, TaskStatus } from '@/lib/types';
import {
  DndContext,
  rectIntersection,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ScrollArea } from '../ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';

function getStatusBadgeVariant(status: string) {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'default';
    case 'in progress':
      return 'secondary';
    case 'not started':
      return 'outline';
    default:
      return 'outline';
  }
}

const KANBAN_COLUMNS = ['Not Started', 'In Progress', 'Completed'];

const KanbanCardWrapper = forwardRef<HTMLDivElement, { task: Task; assignmentId: string }>(({ task, assignmentId, ...props }, ref) => (
    <div ref={ref} {...props}>
        <KanbanCard task={task} assignmentId={assignmentId} />
    </div>
));
KanbanCardWrapper.displayName = 'KanbanCardWrapper';


function KanbanCard({ task, assignmentId }: { task: Task; assignmentId?: string }) {
    const { applications } = useData();
    const { isManagerOrAdmin } = useAuth();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
      } = useSortable({ id: assignmentId || task.id, data: { type: 'task', task } });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
    };

    const allAssignments = [
        ...(task.impactedApps || []).flatMap(app => (app.resourceAssignments || []).map(a => ({...a, type: 'app', appId: app.applicationId}))),
        ...(task.crossFunctionalResourceAssignments || []).map(a => ({...a, type: 'cross-functional'}))
    ];
    
    const thisAssignment = allAssignments.find(a => (assignmentId || '').includes(a.resourceId) && (a.type === 'cross-functional' || (a.type === 'app' && (assignmentId || '').includes(a.appId))));
    
    const individualProgress = thisAssignment?.progress || 0;
    const canEdit = isManagerOrAdmin();

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-card p-3 rounded-lg border shadow-sm touch-none"
        >
          <div {...attributes} {...listeners} className="cursor-grab">
            <div className="flex justify-between items-start gap-2">
                <Link href={`/dashboard/tasks/${task.id}?from=my-view`} className="font-medium text-sm hover:underline pr-4">
                    {task.title}
                </Link>
                <span className="flex-shrink-0 text-xs text-muted-foreground pt-0.5">{task.referenceId}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {(task.impactedApps || []).map(ia => applications.find(a => a.id === ia.applicationId)?.name).join(', ')}
            </p>
            {thisAssignment && (
              <ProgressUpdateDialog assignment={thisAssignment} task={task} assignmentId={assignmentId!}>
                <div className="flex items-center justify-between mt-3 group cursor-pointer">
                    <span className="text-xs font-semibold">{thisAssignment.plannedDays.toFixed(1)}d</span>
                    <div className="flex-1 mx-2">
                        <Progress value={individualProgress} className="w-full h-2 group-hover:bg-primary/20" />
                    </div>
                    <span className="text-xs font-medium">{individualProgress}%</span>
                </div>
              </ProgressUpdateDialog>
            )}
          </div>
        </div>
    );
}

function KanbanColumn({ status, children, count }: { status: string, children: React.ReactNode, count: number }) {
    const { setNodeRef } = useSortable({ id: status, data: { type: 'column' } });
    
    return (
        <div ref={setNodeRef} className="flex flex-col bg-muted/50 rounded-lg">
            <div className="p-3 font-semibold text-center border-b sticky top-0 bg-muted/80 backdrop-blur-sm">
                {status} ({count})
            </div>
            <ScrollArea className="flex-grow p-2 min-h-48">
                 <SortableContext items={React.Children.map(children, child => (child as React.ReactElement).key) || []} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {children}
                        {count === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No tasks</div>}
                    </div>
                 </SortableContext>
            </ScrollArea>
        </div>
    );
}

export function MyView() {
  const { user, role: accessRole, isManagerOrAdmin } = useAuth();
  const {
    sprints,
    tasks,
    resources,
    squadResourceAllocations,
    settings,
    holidays,
    isLoading,
    roles: projectRoles,
    applications,
  } = useData();
  const { toast } = useToast();

  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {})
  );

  const initialSprintId = useMemo(() => {
    if (sprints.length > 0) {
      const currentSprint = sprints.find(
        (s) => new Date() >= s.startDate && new Date() <= s.endDate
      );
      return currentSprint ? currentSprint.id : sprints[0].id;
    }
    return '';
  }, [sprints]);

  useEffect(() => {
    if (initialSprintId && !selectedSprint) {
      setSelectedSprint(initialSprintId);
    }
  }, [initialSprintId, selectedSprint]);

  const userResource = useMemo(() => {
    return resources.find((r) => r.userId === user?.uid);
  }, [resources, user]);
  
  const userProjectRole = useMemo(() => {
    if (!userResource) return null;
    return projectRoles.find(pr => pr.id === userResource.roleId);
  }, [userResource, projectRoles]);

  const userApplication = useMemo(() => {
    if (!userResource?.applicationId) return null;
    return applications.find(app => app.id === userResource.applicationId);
  }, [userResource, applications]);

  const userMetrics = useMemo(() => {
    if (!userResource || !selectedSprint || !settings || selectedSprint === 'all-sprints') {
      return { planned: 0, booked: 0, available: 0 };
    }

    const sprint = sprints.find((s) => s.id === selectedSprint);
    if (!sprint) return { planned: 0, booked: 0, available: 0 };

    const sprintDuration = getBusinessDays(sprint.startDate, sprint.endDate, settings, holidays).length;
    
    const totalAllocation = squadResourceAllocations
      .filter((a) => a.sprintId === selectedSprint && a.resourceId === userResource.id)
      .reduce((sum, a) => sum + (a.allocationType === 'Dedicated' ? 100 : a.allocationPercentage || 0), 0);

    const plannedCapacity = (sprintDuration * Math.min(100, totalAllocation)) / 100;

    const userTasksInSprint = tasks.filter(task => {
        const allAssignments = [
          ...(task.impactedApps || []).flatMap(app => app.resourceAssignments || []),
          ...(task.crossFunctionalResourceAssignments || [])
        ];
        return task.sprintId === selectedSprint && allAssignments.some(a => a && a.resourceId === userResource.id);
    });

    const bookedCapacity = userTasksInSprint.reduce((sum, task) => {
        const allAssignments = [
          ...(task.impactedApps || []).flatMap(app => app.resourceAssignments || []),
          ...(task.crossFunctionalResourceAssignments || [])
        ];
        return sum + allAssignments
            .filter(a => a && a.resourceId === userResource.id)
            .reduce((taskSum, a) => taskSum + (a.plannedDays || 0), 0);
    }, 0);

    return {
      planned: plannedCapacity,
      booked: bookedCapacity,
      available: plannedCapacity - bookedCapacity,
    };
  }, [userResource, selectedSprint, sprints, squadResourceAllocations, tasks, settings, holidays]);

  const { myTaskAssignments, teamTasks } = useMemo(() => {
    if (!userResource) return { myTaskAssignments: [], teamTasks: [] };
    
    const mySquads = new Set(squadResourceAllocations
        .filter(alloc => alloc.sprintId === selectedSprint && alloc.resourceId === userResource.id)
        .map(alloc => alloc.squadId));
    
    const sprintFilter = (task: Task) => selectedSprint === 'all-sprints' || task.sprintId === selectedSprint;

    const myAssignments = tasks.filter(sprintFilter).flatMap(task => {
      const appAssignments = (task.impactedApps || []).flatMap(app => 
        (app.resourceAssignments || [])
          .filter(a => a.resourceId === userResource.id)
          .map(a => ({...a, task, assignmentId: `${task.id}-${userResource.id}-${app.applicationId}`}))
      );
      const crossFuncAssignments = (task.crossFunctionalResourceAssignments || [])
        .filter(a => a.resourceId === userResource.id)
        .map(a => ({...a, task, assignmentId: `${task.id}-${userResource.id}-cross`}));

      return [...appAssignments, ...crossFuncAssignments];
    });

    const tasksForMyTeam = tasks.filter(task => {
        return sprintFilter(task) && task.squadId && mySquads.has(task.squadId);
    });

    const tasksNotAssignedToMe = tasksForMyTeam.filter(task => {
        const allAssignments = [
            ...(task.impactedApps || []).flatMap(app => app.resourceAssignments || []),
            ...(task.crossFunctionalResourceAssignments || []),
        ];
        return !allAssignments.some(a => a.resourceId === userResource.id);
    });


    return { myTaskAssignments: myAssignments, teamTasks: tasksNotAssignedToMe };

  }, [userResource, tasks, selectedSprint, squadResourceAllocations]);

  async function handleAssignmentStatusChange(assignmentId: string, newStatus: TaskStatus) {
    const [taskId, resourceId, appId] = assignmentId.split('-');
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const updatedTask = JSON.parse(JSON.stringify(task)) as Task;

    let assignmentUpdated = false;

    const updateSubTask = (assignment: ResourceAssignment) => {
        assignment.status = newStatus;
        if ((assignment.progress || 0) === 0 && newStatus === 'In Progress') {
            assignment.progress = 10;
        } else if (newStatus === 'Completed') {
            assignment.progress = 100;
        } else if (newStatus === 'Not Started') {
            assignment.progress = 0;
        }
    };

    if (appId === 'cross') {
        const crossFuncIndex = (updatedTask.crossFunctionalResourceAssignments || []).findIndex(a => a.resourceId === resourceId);
        if (crossFuncIndex > -1) {
            updateSubTask(updatedTask.crossFunctionalResourceAssignments![crossFuncIndex]);
            assignmentUpdated = true;
        }
    } else {
        const appIndex = updatedTask.impactedApps.findIndex(app => app.applicationId === appId);
        if (appIndex > -1) {
            const resIndex = (updatedTask.impactedApps[appIndex].resourceAssignments || []).findIndex(a => a.resourceId === resourceId);
            if (resIndex > -1) {
                updateSubTask(updatedTask.impactedApps[appIndex].resourceAssignments[resIndex]);
                assignmentUpdated = true;
            }
        }
    }
        
    if (assignmentUpdated) {
        try {
            const taskRef = doc(db, 'tasks', taskId);
            await updateDoc(taskRef, {
                impactedApps: updatedTask.impactedApps,
                crossFunctionalResourceAssignments: updatedTask.crossFunctionalResourceAssignments,
                updatedAt: new Date(),
            });
            toast({ title: 'Status Updated', description: `Your status for "${task.title}" is now "${newStatus}".` });
        } catch (error: any) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        }
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const assignment = myTaskAssignments.find(a => a.assignmentId === active.id);
    if (assignment) {
      setActiveTask(assignment.task);
      setActiveAssignmentId(assignment.assignmentId);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    setActiveAssignmentId(null);
    const { active, over } = event;
    
    if (!over || !KANBAN_COLUMNS.includes(over.id as string)) {
      return;
    }
    
    const assignmentId = active.id as string;
    const newStatus = over.id as TaskStatus;
    const assignment = myTaskAssignments.find(a => a.assignmentId === assignmentId);

    if (assignment && (assignment.status || 'Not Started') !== newStatus) {
      handleAssignmentStatusChange(assignmentId, newStatus);
    }
  }

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!userResource) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your user account is not linked to a resource profile yet. Please
            contact an administrator to get set up.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const assignmentsByStatus = {
    'Not Started': myTaskAssignments.filter(a => !a.status || a.status === 'Not Started'),
    'In Progress': myTaskAssignments.filter(a => a.status === 'In Progress'),
    'Completed': myTaskAssignments.filter(a => a.status === 'Completed'),
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <CardTitle className="font-headline">My View</CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                {userResource.name && <Badge variant="default" className="bg-blue-600 hover:bg-blue-700"><UserIcon className="mr-1.5 h-3 w-3"/>{userResource.name}</Badge>}
                {accessRole && <Badge variant="destructive"><Shield className="mr-1.5 h-3 w-3"/>{accessRole}</Badge>}
                {userProjectRole && <Badge variant="secondary" className="bg-purple-600 hover:bg-purple-700"><Briefcase className="mr-1.5 h-3 w-3"/>{userProjectRole.name}</Badge>}
                {userApplication && <Badge variant="outline" className="border-green-600 text-green-600"><Building2 className="mr-1.5 h-3 w-3"/>{userApplication.name}</Badge>}
            </div>
          </div>
          <CardDescription>
            Your personal dashboard for tasks and capacity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label>Select Sprint:</Label>
            <Select value={selectedSprint} onValueChange={setSelectedSprint}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select Sprint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-sprints">All Sprints</SelectItem>
                {sprints.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {selectedSprint !== 'all-sprints' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planned Capacity</CardTitle>
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userMetrics.planned.toFixed(1)} days</div>
              <p className="text-xs text-muted-foreground">Your total allocated time for this sprint.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Booked Capacity</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userMetrics.booked.toFixed(1)} days</div>
              <p className="text-xs text-muted-foreground">Time committed to tasks.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Capacity</CardTitle>
              <Check className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userMetrics.available.toFixed(1)} days</div>
              <p className="text-xs text-muted-foreground">Remaining time for new tasks.</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h3 className="font-headline text-xl font-semibold mb-4">My Tasks</h3>
        <DndContext 
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd} 
            collisionDetection={rectIntersection}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-1">
                {KANBAN_COLUMNS.map(status => (
                    <KanbanColumn key={status} status={status} count={assignmentsByStatus[status as keyof typeof assignmentsByStatus].length}>
                        {assignmentsByStatus[status as keyof typeof assignmentsByStatus].map(assignment => (
                           <KanbanCardWrapper key={assignment.assignmentId} task={assignment.task} assignmentId={assignment.assignmentId} />
                        ))}
                    </KanbanColumn>
                ))}
            </div>
            <DragOverlay>
                {activeTask ? <KanbanCard task={activeTask} assignmentId={activeAssignmentId!} /> : null}
            </DragOverlay>
        </DndContext>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="font-headline">Team's Tasks</CardTitle>
          <CardDescription>
            Tasks from your squad(s) that you are not assigned to.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Sprint</TableHead>
                <TableHead className="text-right">Effort (Days)</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamTasks.length > 0 ? (
                teamTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Link href={`/dashboard/tasks/${task.id}?from=my-view`} className="font-medium hover:underline">{task.title}</Link>
                    </TableCell>
                    <TableCell>{sprints.find(s => s.id === task.sprintId)?.name}</TableCell>
                    <TableCell className="text-right">{task.estimatedDays.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                       <AssignTaskDialog
                        task={task}
                        userResource={userResource}
                        userApplication={userApplication}
                        availableCapacity={userMetrics.available}
                       />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No other tasks found for your squads.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AssignTaskDialog({ task, userResource, userApplication, availableCapacity }: { task: Task; userResource: any; userApplication: Application | null; availableCapacity: number; }) {
  const [isOpen, setIsOpen] = useState(false);
  const [plannedDays, setPlannedDays] = useState<number>(0);
  const [effort, setEffort] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const isAppSpecificUser = !!userResource.applicationId;
  const isTaskMissingApp = task.impactedApps.length === 0;
  const requiresEffortInput = isAppSpecificUser && isTaskMissingApp;

  const handleSelfAssign = async () => {
    if (plannedDays <= 0) {
      toast({ title: "Invalid Input", description: "Planned days must be greater than 0.", variant: "destructive" });
      return;
    }
    if (requiresEffortInput && effort <= 0) {
      toast({ title: "Invalid Input", description: "Effort must be greater than 0.", variant: "destructive" });
      return;
    }
    if (plannedDays > availableCapacity) {
      toast({ title: "Capacity Exceeded", description: `You only have ${availableCapacity.toFixed(1)} days available.`, variant: "destructive" });
      return;
    }
    if (requiresEffortInput && plannedDays > effort) {
      toast({ title: "Invalid Input", description: "Your planned days cannot be greater than the total effort for the application.", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    const updatedTask = JSON.parse(JSON.stringify(task)) as Task;
    const newAssignment: ResourceAssignment = {
        resourceId: userResource.id,
        plannedDays,
        status: 'Not Started',
        progress: 0
    };
    
    if (requiresEffortInput) {
        // Create a new impacted app and add the user to it
        const newImpactedApp: ImpactedApp = {
            applicationId: userResource.applicationId,
            effortType: 'Implementation', // Default value
            effort: effort,
            resourceAssignments: [newAssignment],
        };
        updatedTask.impactedApps.push(newImpactedApp);
    } else {
        let assigned = false;
        // Try to assign to a matching impacted app if one exists
        if (userResource.applicationId && updatedTask.impactedApps?.length > 0) {
            const matchingAppIndex = updatedTask.impactedApps.findIndex((app: any) => app.applicationId === userResource.applicationId);
            if (matchingAppIndex > -1) {
                if (!updatedTask.impactedApps[matchingAppIndex].resourceAssignments) {
                    updatedTask.impactedApps[matchingAppIndex].resourceAssignments = [];
                }
                updatedTask.impactedApps[matchingAppIndex].resourceAssignments.push(newAssignment);
                assigned = true;
            }
        }
        // Fallback to cross-functional
        if (!assigned) {
            if (!updatedTask.crossFunctionalResourceAssignments) {
                updatedTask.crossFunctionalResourceAssignments = [];
            }
            updatedTask.crossFunctionalResourceAssignments.push(newAssignment);
        }
    }
    
    // Recalculate total estimated days for the task
    const appEffort = (updatedTask.impactedApps || []).reduce((sum: number, app: any) => sum + app.effort, 0);
    const crossFuncEffort = (updatedTask.crossFunctionalResourceAssignments || []).reduce((sum: number, res: any) => sum + res.plannedDays, 0);
    updatedTask.estimatedDays = appEffort + crossFuncEffort;

    try {
        const taskRef = doc(db, 'tasks', task.id);
        await updateDoc(taskRef, {
            impactedApps: updatedTask.impactedApps,
            crossFunctionalResourceAssignments: updatedTask.crossFunctionalResourceAssignments,
            estimatedDays: updatedTask.estimatedDays,
        });
        toast({ title: "Success!", description: `You have been assigned to task: ${task.title}`});
        setIsOpen(false);
        setPlannedDays(0);
        setEffort(0);
    } catch (error: any) {
        toast({ title: "Error", description: `Failed to assign task: ${error.message}`, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Assign to Me</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Task: {task.title}</DialogTitle>
          <DialogDescription>
            Enter your planned effort. You have {availableCapacity.toFixed(1)} days available in this sprint.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            {requiresEffortInput && userApplication && (
              <div className="space-y-2">
                <Label htmlFor="effort-days">Effort for Application (Days)</Label>
                <Input 
                    id="effort-days"
                    type="number"
                    value={effort || ''}
                    onChange={(e) => setEffort(parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 5"
                />
                <p className="text-xs text-muted-foreground">Total effort for the {userApplication.name} application on this task.</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="planned-days">Your Planned Days</Label>
              <Input 
                  id="planned-days"
                  type="number"
                  value={plannedDays || ''}
                  onChange={(e) => setPlannedDays(parseFloat(e.target.value) || 0)}
                  placeholder="e.g., 2.5"
                  max={availableCapacity}
              />
               <p className="text-xs text-muted-foreground">How many of your available days you will spend on this task.</p>
              {plannedDays > availableCapacity && (
                  <p className="text-sm text-destructive">Planned days cannot exceed your available capacity.</p>
              )}
               {requiresEffortInput && plannedDays > effort && (
                  <p className="text-sm text-destructive">Your planned days cannot exceed the total effort for the application.</p>
              )}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSelfAssign} disabled={isSubmitting || plannedDays <= 0 || plannedDays > availableCapacity || (requiresEffortInput && effort <= 0) || (requiresEffortInput && plannedDays > effort)}>
            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirm Assignment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProgressUpdateDialog({ assignment, task, assignmentId, children }: { assignment: ResourceAssignment; task: Task, assignmentId: string, children: React.ReactNode; }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [progress, setProgress] = useState(assignment.progress || 0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        setIsSubmitting(true);
        const [taskId, resourceId, appId] = assignmentId.split('-');
        const updatedTask = JSON.parse(JSON.stringify(task)) as Task;

        let assignmentUpdated = false;

        const updateSubTaskProgress = (subAssignment: ResourceAssignment) => {
            subAssignment.progress = progress;
            if (progress > 0 && progress < 100) {
                subAssignment.status = 'In Progress';
            } else if (progress === 100) {
                subAssignment.status = 'Completed';
            } else {
                subAssignment.status = 'Not Started';
            }
        };

        if (appId === 'cross') {
            const crossFuncIndex = (updatedTask.crossFunctionalResourceAssignments || []).findIndex(a => a.resourceId === resourceId);
            if (crossFuncIndex > -1) {
                updateSubTaskProgress(updatedTask.crossFunctionalResourceAssignments![crossFuncIndex]);
                assignmentUpdated = true;
            }
        } else {
            const appIndex = updatedTask.impactedApps.findIndex(app => app.applicationId === appId);
            if (appIndex > -1) {
                const resIndex = (updatedTask.impactedApps[appIndex].resourceAssignments || []).findIndex(a => a.resourceId === resourceId);
                if (resIndex > -1) {
                    updateSubTaskProgress(updatedTask.impactedApps[appIndex].resourceAssignments[resIndex]);
                    assignmentUpdated = true;
                }
            }
        }
        
        if (assignmentUpdated) {
             try {
                const taskRef = doc(db, 'tasks', taskId);
                await updateDoc(taskRef, {
                    impactedApps: updatedTask.impactedApps,
                    crossFunctionalResourceAssignments: updatedTask.crossFunctionalResourceAssignments,
                    updatedAt: new Date(),
                });
                toast({ title: 'Progress Updated', description: `Your progress for "${task.title}" is now ${progress}%.` });
                setIsOpen(false);
            } catch (error: any) {
                toast({ title: "Update Failed", description: error.message, variant: "destructive" });
            } finally {
                setIsSubmitting(false);
            }
        } else {
             toast({ title: "Error", description: "Could not find assignment to update.", variant: "destructive" });
             setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Your Progress</DialogTitle>
                    <DialogDescription>
                        Update your individual progress for the task: "{task.title}".
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex justify-between items-center">
                        <Label htmlFor="progress-slider">Progress</Label>
                        <span className="font-bold text-lg">{progress}%</span>
                    </div>
                    <Slider
                        id="progress-slider"
                        value={[progress]}
                        onValueChange={(value) => setProgress(value[0])}
                        max={100}
                        step={5}
                    />
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : 'Save Progress'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

    