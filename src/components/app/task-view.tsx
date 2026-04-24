'use client';

import { useState, useMemo, useEffect } from 'react';
import { useData } from '@/hooks/use-data';
import type { Task, Sprint, Tribe, Squad, TaskStatus } from '@/lib/types';
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
import { Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { getBusinessDays } from '@/lib/utils';
import { Input } from '../ui/input';

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

const calculateOverallStatus = (task: Task): TaskStatus => {
    const allAssignments = [
        ...(task.impactedApps || []).flatMap(app => app.resourceAssignments || []),
        ...(task.crossFunctionalResourceAssignments || [])
    ].filter(a => a && a.plannedDays > 0);

    if (allAssignments.length === 0) {
        return (task.status as TaskStatus) || 'Not Started';
    }

    if (allAssignments.every(a => (a.status || 'Not Started') === 'Completed')) {
        return 'Completed';
    } else if (allAssignments.some(a => (a.status || 'Not Started') === 'In Progress' || (a.progress || 0) > 0)) {
        return 'In Progress';
    } else {
        return 'Not Started';
    }
};


export function TaskView() {
  const {
    sprints,
    tribes,
    squads,
    tasks,
    squadResourceAllocations,
    resources,
    settings,
    holidays,
    isLoading,
  } = useData();

  const [selectedSprint, setSelectedSprint] = useState<string>('all-sprints');
  const [selectedTribe, setSelectedTribe] = useState<string>('all-tribes');
  const [selectedSquad, setSelectedSquad] = useState<string>('all-squads');
  const [searchTerm, setSearchTerm] = useState<string>('');

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
    setSelectedSprint('all-sprints');
    setSelectedTribe('all-tribes');
    setSelectedSquad('all-squads');
    setSearchTerm('');
  };

  const filteredData = useMemo(() => {
    if (!settings) return { tasks: [], totalEffort: 0, totalBooked: 0, totalCapacity: 0 };
    
    let filteredTasks = tasks;
    let relevantAllocations = squadResourceAllocations;
    let sprintDuration = 0;

    if (selectedSprint !== 'all-sprints') {
      filteredTasks = filteredTasks.filter((t) => t.sprintId === selectedSprint);
      relevantAllocations = relevantAllocations.filter(a => a.sprintId === selectedSprint);
      const sprint = sprints.find(s => s.id === selectedSprint);
      if (sprint) {
          sprintDuration = getBusinessDays(sprint.startDate, sprint.endDate, settings, holidays).length;
      }
    }

    if (selectedTribe !== 'all-tribes') {
        const tribeSquadIds = new Set(squads.filter(s => s.tribeId === selectedTribe).map(s => s.id));
        filteredTasks = filteredTasks.filter(t => t.tribeId === selectedTribe || (t.squadId && tribeSquadIds.has(t.squadId)));
        relevantAllocations = relevantAllocations.filter(a => tribeSquadIds.has(a.squadId));
    }
    
    if (selectedSquad !== 'all-squads') {
        filteredTasks = filteredTasks.filter(t => t.squadId === selectedSquad);
        relevantAllocations = relevantAllocations.filter(a => a.squadId === selectedSquad);
    }
    
    // Add search term filtering
    if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        filteredTasks = filteredTasks.filter(task => {
            const overallStatus = calculateOverallStatus(task);
            // For search, we need a way to get resource names and booked effort per task
            // This logic is duplicated from the TableBody, but necessary for filtering here.
            const resourceSummary = new Map<string, { name: string; totalDays: number }>();
            const allAssignments = [
                ...(task.impactedApps || []).flatMap(app => app.resourceAssignments || []),
                ...(task.crossFunctionalResourceAssignments || [])
            ];
            allAssignments.forEach(assignment => {
                if (!assignment) return;
                const resource = resources.find(r => r.id === assignment.resourceId);
                if (!resource) return;
                const existing = resourceSummary.get(assignment.resourceId);
                if (existing) {
                    existing.totalDays += assignment.plannedDays || 0;
                } else {
                    resourceSummary.set(assignment.resourceId, {
                        name: resource.name,
                        totalDays: assignment.plannedDays || 0
                    });
                }
            });
            const bookedEffort = Array.from(resourceSummary.values()).reduce((sum, res) => sum + res.totalDays, 0);
            const assignedResourceNames = Array.from(resourceSummary.values()).map(summary => summary.name.toLowerCase());

            return (
                task.title.toLowerCase().includes(lowerCaseSearchTerm) ||
                (task.description?.toLowerCase().includes(lowerCaseSearchTerm)) ||
                (task.referenceId?.toLowerCase().includes(lowerCaseSearchTerm)) ||
                overallStatus.toLowerCase().includes(lowerCaseSearchTerm) ||
                task.progress?.toString().includes(lowerCaseSearchTerm) ||
                task.estimatedDays.toFixed(2).includes(lowerCaseSearchTerm) ||
                bookedEffort.toFixed(2).includes(lowerCaseSearchTerm) ||
                assignedResourceNames.some(name => name.includes(lowerCaseSearchTerm))
            );
        });
    }
    
    const totalEffort = filteredTasks.reduce((sum, task) => sum + task.estimatedDays, 0);
    const totalBooked = filteredTasks.reduce((sum, task) => {
        const appBooked = (task.impactedApps || []).flatMap(app => app.resourceAssignments || []).reduce((appSum, assign) => appSum + (assign.plannedDays || 0), 0);
        const crossFuncBooked = (task.crossFunctionalResourceAssignments || []).reduce((cfSum, assign) => cfSum + (assign.plannedDays || 0), 0);
        return sum + appBooked + crossFuncBooked;
    }, 0);

    const totalCapacity = relevantAllocations.reduce((sum, alloc) => {
        if (selectedSprint === 'all-sprints') return sum; // Capacity is only relevant for a single sprint
        const allocationPercentage = alloc.allocationType === 'Dedicated' ? 100 : (alloc.allocationPercentage || 0);
        const resourceCapacity = (sprintDuration * allocationPercentage) / 100;
        return sum + resourceCapacity;
    }, 0);
    
    const uniqueCapacityResources = new Set(relevantAllocations.map(a => a.resourceId));
    const totalCapacityUnique = Array.from(uniqueCapacityResources).reduce((sum, resourceId) => {
        if (selectedSprint === 'all-sprints') return sum;
        const resourceAllocations = relevantAllocations.filter(a => a.resourceId === resourceId);
        const totalPercentage = resourceAllocations.reduce((percSum, alloc) => percSum + (alloc.allocationType === 'Dedicated' ? 100 : (alloc.allocationPercentage || 0)), 0);
        const resourceCapacity = (sprintDuration * Math.min(100, totalPercentage)) / 100;
        return sum + resourceCapacity;
    }, 0);


    return {
        tasks: filteredTasks,
        totalEffort,
        totalBooked,
        totalCapacity: totalCapacityUnique,
    }
  }, [selectedSprint, selectedTribe, selectedSquad, searchTerm, tasks, sprints, squads, squadResourceAllocations, settings, holidays, resources]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-[56px] sm:top-0 z-10 -mx-4 -mt-4 sm:mx-0 sm:mt-0 sm:pt-4 bg-muted/40 backdrop-blur-lg">
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
          <CardHeader>
            <CardTitle className="font-headline">Task View</CardTitle>
            <CardDescription>
              Analyze tasks and capacity by sprint, tribe, or squad.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={selectedSprint} onValueChange={setSelectedSprint}>
                <SelectTrigger><SelectValue placeholder="Select Sprint" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-sprints">All Sprints</SelectItem>
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
            <div className="mt-4">
                <Input
                    placeholder="Search tasks... (title, description, ID, status, progress, effort)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3 pt-4">
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Planned Capacity</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{selectedSprint === 'all-sprints' ? 'N/A' : `${filteredData.totalCapacity.toFixed(2)} days`}</p>
                <p className="text-xs text-muted-foreground">Total available resource days for selection.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Task Effort</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{filteredData.totalEffort.toFixed(2)} days</p>
                <p className="text-xs text-muted-foreground">Sum of estimated days for filtered tasks.</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Booked Effort</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-2xl font-bold">{filteredData.totalBooked.toFixed(2)} days</p>
                 <p className="text-xs text-muted-foreground">Sum of planned resource days on filtered tasks.</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Task Details</CardTitle>
          <CardDescription>
            A detailed list of tasks based on your filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sprint</TableHead>
                <TableHead>Tribe/Squad</TableHead>
                <TableHead>Assigned Resources</TableHead>
                <TableHead className="text-right">Effort (Days)</TableHead>
                <TableHead className="text-right">Booked (Days)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.tasks.length > 0 ? (
                filteredData.tasks.map((task) => {
                    const sprint = sprints.find(s => s.id === task.sprintId);
                    const tribe = tribes.find(t => t.id === task.tribeId);
                    const squad = squads.find(s => s.id === task.squadId);
                    
                    const resourceSummary = new Map<string, { name: string; totalDays: number }>();
                    
                    const allAssignments = [
                        ...(task.impactedApps || []).flatMap(app => app.resourceAssignments || []),
                        ...(task.crossFunctionalResourceAssignments || [])
                    ];

                    allAssignments.forEach(assignment => {
                      if (!assignment) return;
                      const resource = resources.find(r => r.id === assignment.resourceId);
                      if (!resource) return;

                      const existing = resourceSummary.get(assignment.resourceId);
                      if (existing) {
                          existing.totalDays += assignment.plannedDays || 0;
                      } else {
                          resourceSummary.set(assignment.resourceId, {
                              name: resource.name,
                              totalDays: assignment.plannedDays || 0
                          });
                      }
                    });

                    const assignedResources = Array.from(resourceSummary.values()).map(summary => `${summary.name} (${summary.totalDays.toFixed(1)}d)`);
                    const bookedEffort = Array.from(resourceSummary.values()).reduce((sum, res) => sum + res.totalDays, 0);
                    const overallStatus = calculateOverallStatus(task);

                    return (
                        <TableRow key={task.id}>
                            <TableCell>
                                <Link href={`/dashboard/tasks/${task.id}?from=task-view`} className="font-medium hover:underline">{task.title}</Link>
                                <div className="text-xs text-muted-foreground">{task.referenceId || task.id.substring(task.id.length - 6)}</div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusBadgeVariant(overallStatus)}>{overallStatus}</Badge>
                            </TableCell>
                            <TableCell>{sprint?.name || 'N/A'}</TableCell>
                            <TableCell>
                                <div>{tribe?.name || 'N/A'}</div>
                                <div className="text-sm text-muted-foreground">{squad?.name || 'N/A'}</div>
                            </TableCell>
                             <TableCell>
                                <div className="flex flex-col text-xs">
                                    {assignedResources.length > 0 ? assignedResources.map((res, i) => (
                                        <span key={i}>{res}</span>
                                    )) : <span className="text-muted-foreground">N/A</span>}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">{task.estimatedDays.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{bookedEffort.toFixed(2)}</TableCell>
                        </TableRow>
                    )
                })
              ) : (
                <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        No tasks found for the current selection.
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
