
'use client';
import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/hooks/use-data';
import type { Task, Sprint, Tribe, Squad, ResourceAssignment, TaskStatus } from '@/lib/types';
import { eachDayOfInterval, format, getDay } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, XCircle, CalendarDays, ChevronLeft, ChevronRight, GripHorizontal } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TooltipPortal } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { getBusinessDays } from '@/lib/utils';


const TASK_COLORS = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
    'bg-sky-500', 'bg-lime-500', 'bg-amber-500',
];

function getStatusColorClass(status?: TaskStatus): string {
    switch (status) {
        case 'Completed':
            return 'bg-green-500 hover:bg-green-500/90 border-transparent text-primary-foreground';
        case 'In Progress':
            return 'bg-amber-500 hover:bg-amber-500/90 border-transparent text-secondary-foreground';
        case 'Not Started':
        default:
            return 'bg-slate-400 hover:bg-slate-400/90 border-transparent text-primary-foreground';
    }
}

export function ResourceCalendarView() {
  const {
    sprints,
    tribes,
    squads,
    tasks,
    squadResourceAllocations,
    resources,
    roles,
    applications,
    settings,
    holidays,
    isLoading,
  } = useData();
  const { isManagerOrAdmin } = useAuth();
  const { toast } = useToast();
  const canEdit = isManagerOrAdmin();

  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [selectedTribe, setSelectedTribe] = useState<string>('all-tribes');
  const [selectedSquad, setSelectedSquad] = useState<string>('all-squads');
  const [shiftingTaskId, setShiftingTaskId] = useState<string | null>(null);

  const initialSprintId = useMemo(() => {
    if (sprints.length > 0) {
      const currentSprint = sprints.find(s => new Date() >= s.startDate && new Date() <= s.endDate);
      return currentSprint ? currentSprint.id : sprints[0].id;
    }
    return '';
  }, [sprints]);

  useEffect(() => {
    if (initialSprintId && !selectedSprint) {
      setSelectedSprint(initialSprintId);
    }
  }, [initialSprintId, selectedSprint]);

  const filteredSquads = useMemo(() => {
    if (selectedTribe === 'all-tribes') return squads;
    return squads.filter((s) => s.tribeId === selectedTribe);
  }, [squads, selectedTribe]);
  
  useEffect(() => {
    if (selectedTribe === 'all-tribes') {
      setSelectedSquad('all-squads');
    }
  }, [selectedTribe]);

  const resetFilters = () => {
    setSelectedSprint(initialSprintId);
    setSelectedTribe('all-tribes');
    setSelectedSquad('all-squads');
  };

  const calendarData = useMemo(() => {
    if (!selectedSprint || isLoading || !settings) return { days: [], resources: [] };
    
    const sprint = sprints.find(s => s.id === selectedSprint);
    if (!sprint) return { days: [], resources: [] };

    const sprintBusinessDays = getBusinessDays(sprint.startDate, sprint.endDate, settings, holidays);

    let relevantAllocations = squadResourceAllocations.filter(a => a.sprintId === selectedSprint);
    if (selectedTribe !== 'all-tribes') {
        const tribeSquadIds = new Set(squads.filter(s => s.tribeId === selectedTribe).map(s => s.id));
        relevantAllocations = relevantAllocations.filter(a => tribeSquadIds.has(a.squadId));
    }
    if (selectedSquad !== 'all-squads') {
        relevantAllocations = relevantAllocations.filter(a => a.squadId === selectedSquad);
    }

    const relevantResourceIds = new Set(relevantAllocations.map(a => a.resourceId));
    
    const resourcesWithTasks = Array.from(relevantResourceIds).map(resourceId => {
      const resource = resources.find(r => r.id === resourceId);
      if (!resource) return null;

      const role = roles.find(r => r.id === resource.roleId);
      const application = applications.find(app => app.id === resource.applicationId);

      const subline = `(${(application?.name || 'CrossApplication')}-${(role?.name || 'N/A')})`;

      const resourceTasks = tasks.filter(task => {
        const allAssignments = [
          ...(task.impactedApps || []).flatMap(app => app.resourceAssignments || []),
          ...(task.crossFunctionalResourceAssignments || [])
        ];
        return task.sprintId === selectedSprint && allAssignments.some(a => a && a.resourceId === resourceId);
      });

      const totalBooked = resourceTasks.reduce((sum, task) => {
        const allAssignments = [
          ...(task.impactedApps || []).flatMap(app => app.resourceAssignments || []),
          ...(task.crossFunctionalResourceAssignments || [])
        ];
        return sum + allAssignments.filter(a => a && a.resourceId === resourceId).reduce((taskSum, a) => taskSum + (a.plannedDays || 0), 0);
      }, 0);
      
      const totalAllocationPercentage = squadResourceAllocations
        .filter(a => a.sprintId === selectedSprint && a.resourceId === resourceId)
        .reduce((sum, a) => sum + (a.allocationType === 'Dedicated' ? 100 : (a.allocationPercentage || 0)), 0);
      
      const capacity = (sprintBusinessDays.length * Math.min(100, totalAllocationPercentage)) / 100;
      
      return {
        ...resource,
        subline,
        tasks: resourceTasks,
        capacity,
        totalBooked
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    return {
      days: sprintBusinessDays,
      resources: resourcesWithTasks,
    }

  }, [selectedSprint, selectedTribe, selectedSquad, tasks, sprints, squads, squadResourceAllocations, resources, isLoading, roles, applications, settings, holidays]);
  
  const handleShiftTask = async (task: Task, resourceId: string, assignmentIdentifier: string, direction: 'left' | 'right') => {
      const uniqueId = `${task.id}-${assignmentIdentifier}`;
      setShiftingTaskId(uniqueId);
      
      const shiftAmount = direction === 'left' ? -0.5 : 0.5;

      const updatedTask = JSON.parse(JSON.stringify(task)) as Task;

      let assignmentPath: { type: 'app'; appIndex: number; resIndex: number } | { type: 'crossFunctional'; resIndex: number } | null = null;
      let currentAssignment: ResourceAssignment | null = null;

      // Find the specific assignment being shifted
      for (const [appIndex, app] of updatedTask.impactedApps.entries()) {
          for (const [resIndex, res] of (app.resourceAssignments || []).entries()) {
              if (`${res.resourceId}-${app.applicationId}` === assignmentIdentifier) {
                  assignmentPath = { type: 'app', appIndex, resIndex };
                  currentAssignment = res;
                  break;
              }
          }
          if (assignmentPath) break;
      }
      if (!assignmentPath) {
          for (const [resIndex, res] of (updatedTask.crossFunctionalResourceAssignments || []).entries()) {
               if (`${res.resourceId}-cross` === assignmentIdentifier) {
                  assignmentPath = { type: 'crossFunctional', resIndex };
                  currentAssignment = res;
                  break;
              }
          }
      }

      if (!currentAssignment || !assignmentPath) {
          console.error("Could not find assignment to shift.");
          setShiftingTaskId(null);
          return;
      }
      
      const oldOffset = currentAssignment.startDayOffset || 0;
      let newOffset = Math.max(0, oldOffset + shiftAmount);
      
      const taskDuration = currentAssignment.plannedDays || 0;
      
      const otherTasksForResource = calendarData.resources.find(r => r.id === resourceId)?.tasks || [];
      const obstacles = otherTasksForResource.flatMap(otherTask => {
          const appAssignments = (otherTask.impactedApps || []).flatMap(app => 
              (app.resourceAssignments || []).filter(a => a.resourceId === resourceId).map(a => ({...a, id: `${otherTask.id}-${a.resourceId}-${app.applicationId}`}))
          );
          const crossFuncAssignments = (otherTask.crossFunctionalResourceAssignments || []).filter(a => a.resourceId === resourceId).map(a => ({...a, id: `${otherTask.id}-${a.resourceId}-cross`}));

          return [...appAssignments, ...crossFuncAssignments].map((otherAssignment) => {
              const otherId = otherAssignment.id;
              if (otherId === uniqueId) return null;
              
              const start = otherAssignment.startDayOffset ?? 0;
              const end = start + (otherAssignment.plannedDays || 0);
              return { start, end };
          }).filter((item): item is {start: number, end: number} => item !== null);
      });

      let hasCollision = true;
      let iterations = 0;
      while (hasCollision && iterations < 100) { // Iteration cap to prevent infinite loops
          hasCollision = false;
          for (const obs of obstacles) {
              // Check for overlap: new task starts before obstacle ends AND new task ends after obstacle starts
              if (newOffset < obs.end && newOffset + taskDuration > obs.start) {
                  hasCollision = true;
                  if (direction === 'right') {
                      newOffset = obs.end; // Jump to the end of the obstacle
                  } else { // 'left'
                      newOffset = obs.start - taskDuration; // Jump to the start of the obstacle
                  }
                  break; 
              }
          }
          iterations++;
      }

      newOffset = Math.max(0, newOffset);
      
      currentAssignment.startDayOffset = newOffset;

      if (assignmentPath.type === 'app') {
          updatedTask.impactedApps[assignmentPath.appIndex].resourceAssignments[assignmentPath.resIndex] = currentAssignment;
      } else {
          updatedTask.crossFunctionalResourceAssignments![assignmentPath.resIndex] = currentAssignment;
      }

      try {
          const taskRef = doc(db, 'tasks', task.id);
          await updateDoc(taskRef, {
              impactedApps: updatedTask.impactedApps,
              crossFunctionalResourceAssignments: updatedTask.crossFunctionalResourceAssignments
          });
      } catch (error: any) {
          toast({ title: 'Error', description: `Failed to update task: ${error.message}`, variant: 'destructive'});
      } finally {
          setShiftingTaskId(null);
      }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-[56px] sm:top-0 z-30 -mx-4 -mt-4 sm:mx-0 sm:mt-0 sm:pt-4 bg-muted/40 backdrop-blur-lg">
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><CalendarDays /> Resource Calendar</CardTitle>
            <CardDescription>
              A visual timeline of resource allocation for tasks within a sprint.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Select value={selectedSprint} onValueChange={setSelectedSprint}>
                <SelectTrigger><SelectValue placeholder="Select Sprint" /></SelectTrigger>
                <SelectContent>
                  {sprints.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedTribe} onValueChange={setSelectedTribe}>
                <SelectTrigger><SelectValue placeholder="Select Tribe" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-tribes">All Tribes</SelectItem>
                  {tribes.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedSquad} onValueChange={setSelectedSquad} disabled={selectedTribe === 'all-tribes'}>
                <SelectTrigger><SelectValue placeholder="Select Squad" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-squads">All Squads</SelectItem>
                  {filteredSquads.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="ghost" onClick={resetFilters}><XCircle className="mr-2 h-4 w-4" /> Clear Filters</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <TooltipProvider>
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <div className="relative">
            <Table className="min-w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-48 sticky left-0 bg-background z-20 font-medium">Resource</TableHead>
                  {calendarData.days.map(day => (
                    <TableHead key={day.toString()} className="w-24 text-center border-l border-dotted border-border">
                      <div className="text-xs">{format(day, 'E')}</div>
                      <div>{format(day, 'd')}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {calendarData.resources.length > 0 ? (
                  calendarData.resources.map(resource => {
                    
                    const assignmentsForResource = resource.tasks.flatMap(task => {
                        const appAssignments = (task.impactedApps || []).flatMap(app => 
                            (app.resourceAssignments || [])
                                .filter(a => a.resourceId === resource.id)
                                .map(a => ({ ...a, task, assignmentId: `${task.id}-${a.resourceId}-${app.applicationId}` }))
                        );
                        const crossFuncAssignments = (task.crossFunctionalResourceAssignments || [])
                            .filter(a => a.resourceId === resource.id)
                            .map(a => ({ ...a, task, assignmentId: `${task.id}-${a.resourceId}-cross` }));
                        return [...appAssignments, ...crossFuncAssignments];
                    });

                    // Pre-calculate layout
                    const dayTimeTracker: number[][] = Array.from({ length: 10 }, () => Array(calendarData.days.length * 2).fill(0));
                    const positionedAssignments = assignmentsForResource.map(assignment => {
                        let start = assignment.startDayOffset ?? -1;
                        if (start === -1) { // Auto-place if no offset
                            let placed = false;
                            for (let track = 0; track < dayTimeTracker.length; track++) {
                                let bestStart = -1;
                                for (let day = 0; day < dayTimeTracker[track].length; day++) {
                                    let canPlace = true;
                                    for (let i = 0; i < Math.ceil(assignment.plannedDays * 2); i++) {
                                        if (day + i >= dayTimeTracker[track].length || dayTimeTracker[track][day + i] === 1) {
                                            canPlace = false;
                                            break;
                                        }
                                    }
                                    if (canPlace) {
                                        bestStart = day / 2;
                                        placed = true;
                                        break;
                                    }
                                }
                                if (placed) {
                                    start = bestStart;
                                    break;
                                }
                            }
                             if (!placed) start = 0; // Fallback
                        }

                        let trackIndex = 0;
                        let placedOnTrack = false;
                        while(!placedOnTrack) {
                            let canPlaceOnTrack = true;
                            for(let i=0; i < Math.ceil(assignment.plannedDays * 2); i++) {
                                const dayIndex = Math.floor(start * 2) + i;
                                if (dayIndex >= dayTimeTracker[trackIndex].length || dayTimeTracker[trackIndex][dayIndex] === 1) {
                                    canPlaceOnTrack = false;
                                    break;
                                }
                            }
                            if(canPlaceOnTrack) {
                                placedOnTrack = true;
                                for(let i=0; i < Math.ceil(assignment.plannedDays * 2); i++) {
                                    const dayIndex = Math.floor(start * 2) + i;
                                     if(dayIndex < dayTimeTracker[trackIndex].length) dayTimeTracker[trackIndex][dayIndex] = 1;
                                }
                            } else {
                                trackIndex++;
                                if (trackIndex >= dayTimeTracker.length) dayTimeTracker.push(Array(calendarData.days.length * 2).fill(0));
                            }
                        }
                        
                        return { ...assignment, startDayOffset: start, track: trackIndex };
                    });

                    const totalTracks = Math.max(1, dayTimeTracker.filter(track => track.some(d => d === 1)).length);

                    return (
                      <TableRow key={resource.id}>
                        <TableCell className="w-48 sticky left-0 bg-background z-20 border-r">
                            <p className="font-medium truncate">{resource.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{resource.subline}</p>
                            <p className="text-xs text-muted-foreground">{resource.totalBooked.toFixed(1)}d / {resource.capacity.toFixed(1)}d</p>
                        </TableCell>
                        <td colSpan={calendarData.days.length} className="p-0" style={{ height: `${totalTracks * 4.5}rem`}}>
                            <div className="relative h-full w-full">
                                {positionedAssignments.map((assignment, taskIndex) => {
                                  const { task, plannedDays, startDayOffset, track, status } = assignment;
                                  const assignmentIdentifier = assignment.assignmentId.replace(`${task.id}-`, '');
                                  const uniqueId = `${task.id}-${assignmentIdentifier}`;
                                  const isShifting = shiftingTaskId === uniqueId;

                                  return (
                                    <div
                                        key={uniqueId}
                                        className="absolute h-12 top-2 z-10"
                                        style={{
                                            left: `calc(${startDayOffset} * 6rem)`,
                                            width: `calc(${plannedDays} * 6rem - 0.25rem)`,
                                            transform: `translateY(${track * 4.5}rem)`,
                                        }}
                                    >
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                              <div className={cn("h-full w-full rounded-md border border-white/20 flex items-center justify-between group", getStatusColorClass(status))}>
                                                <Link href={`/dashboard/tasks/${task.id}?from=resource-calendar`} className="flex-grow h-full px-2 py-1 overflow-hidden truncate">
                                                  <p className="text-white text-xs font-medium">{task.referenceId || task.id.substring(0,4)}: {task.title}</p>
                                                </Link>
                                                {canEdit && (
                                                    <div className="flex bg-black/20 h-full items-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                        <Button variant="ghost" size="icon" className="h-full w-8 rounded-none text-white hover:bg-black/30" onClick={() => handleShiftTask(task, resource.id, assignmentIdentifier, 'left')} disabled={isShifting}>
                                                            {isShifting ? <Loader2 className="animate-spin"/> : <ChevronLeft/>}
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-full w-8 rounded-none text-white hover:bg-black/30" onClick={() => handleShiftTask(task, resource.id, assignmentIdentifier, 'right')} disabled={isShifting}>
                                                             {isShifting ? <Loader2 className="animate-spin"/> : <ChevronRight/>}
                                                        </Button>
                                                    </div>
                                                )}
                                              </div>
                                          </TooltipTrigger>
                                          <TooltipPortal>
                                            <TooltipContent>
                                                <p className="font-bold">{task.title}</p>
                                                <p>Planned: {plannedDays.toFixed(1)} days</p>
                                                <p>Starts on day: {startDayOffset!.toFixed(1)}</p>
                                            </TooltipContent>
                                          </TooltipPortal>
                                      </Tooltip>
                                    </div>
                                  );
                              })}
                          </div>
                      </td>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={calendarData.days.length + 1} className="h-24 text-center">
                      No resources found for this selection.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
             <div
              className="absolute inset-0 top-[53px] left-48 pointer-events-none z-10"
            >
              <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${calendarData.days.length}, 6rem)` }}>
                {calendarData.days.map((day, index) => (
                  <div key={index} className="border-l border-dotted border-border h-full"></div>
                ))}\
              </div>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </TooltipProvider>
    </div>
  );
}
