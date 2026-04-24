
'use client';
import { useState, useMemo, useEffect } from 'react';
import type { Task, Sprint, Application, Resource, Tribe, Squad, SquadResourceAllocation, Role, TaskStatus } from '@/lib/types';
import { useData } from '@/hooks/use-data';
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
import { Loader2, Download, XCircle, Search } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { getBusinessDays } from '@/lib/utils';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';

function getStatusColorClass(status: TaskStatus | undefined): string {
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


export function ResourceView() {
  const { 
    sprints, 
    applications, 
    resources,
    roles,
    tribes, 
    squads, 
    squadResourceAllocations: allocations, 
    tasks,
    settings,
    holidays,
    isLoading 
  } = useData();
  const { toast } = useToast();
  const { isManagerOrAdmin } = useAuth();
  const canEdit = isManagerOrAdmin();

  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [selectedTribe, setSelectedTribe] = useState<string>('all-tribes');
  const [selectedSquad, setSelectedSquad] = useState<string>('all-squads');
  const [selectedApp, setSelectedApp] = useState<string>('all');
  const [freeTextFilter, setFreeTextFilter] = useState('');
  
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
    return squads.filter(s => s.tribeId === selectedTribe);
  }, [squads, selectedTribe]);

  useEffect(() => {
    // Reset squad selection when tribe changes
    setSelectedSquad('all-squads');
  }, [selectedTribe]);

  const resetFilters = () => {
    setSelectedSprint(initialSprintId);
    setSelectedTribe('all-tribes');
    setSelectedSquad('all-squads');
    setSelectedApp('all');
    setFreeTextFilter('');
  };

  const resourceData = useMemo(() => {
      if (!selectedSprint || !settings) return [];

      const sprint = sprints.find(s => s.id === selectedSprint);
      if (!sprint) return [];

      const sprintDuration = getBusinessDays(sprint.startDate, sprint.endDate, settings, holidays).length;
      
      let relevantAllocations = allocations.filter(a => a.sprintId === selectedSprint);

      if (selectedTribe !== 'all-tribes') {
          const tribeSquadIds = new Set(squads.filter(s => s.tribeId === selectedTribe).map(s => s.id));
          relevantAllocations = relevantAllocations.filter(a => tribeSquadIds.has(a.squadId));
      }
      
      if (selectedSquad !== 'all-squads') {
          relevantAllocations = relevantAllocations.filter(a => a.squadId === selectedSquad);
      }

      if (selectedApp !== 'all') {
          const appSpecificResourceIds = new Set(resources.filter(r => r.applicationId === selectedApp).map(r => r.id));
          const crossAppResourceIds = new Set(resources.filter(r => !r.applicationId).map(r => r.id));
          const relevantResourceIds = selectedApp === 'cross-app'
              ? crossAppResourceIds
              : new Set([...appSpecificResourceIds, ...crossAppResourceIds]);
          
          relevantAllocations = relevantAllocations.filter(a => relevantResourceIds.has(a.resourceId));
      }


      let finalResourceList: {
          allocationId: string;
          resourceName: string;
          sprintName: string;
          tribeName: string;
          squadName: string;
          roleName: string;
          applicationName: string;
          availableCapacity: number;
          bookedEfforts: number;
          taskLinks: {id: string, ref: string, status?: TaskStatus}[];
      }[] = [];
      
      relevantAllocations.forEach(allocation => {
          const resource = resources.find(r => r.id === allocation.resourceId);
          if (!resource) return;

          const squad = squads.find(s => s.id === allocation.squadId);
          if(!squad) return;

          const tribe = tribes.find(t => t.id === squad.tribeId);
          if(!tribe) return;

          const allocationPercentage = allocation.allocationType === 'Dedicated' ? 100 : (allocation.allocationPercentage || 0);
          const availableCapacity = (sprintDuration * allocationPercentage) / 100;
          
          const role = roles.find(r => r.id === resource.roleId);
          const application = applications.find(a => a.id === resource.applicationId);

          const allAssignmentsForResource = tasks
              .filter(task => task.sprintId === selectedSprint && task.squadId === squad.id)
              .flatMap(task => [
                  ...(task.impactedApps || []).flatMap(app => (app.resourceAssignments || []).map(a => ({...a, task}))),
                  ...(task.crossFunctionalResourceAssignments || []).map(a => ({...a, task}))
              ])
              .filter(assignment => assignment && assignment.resourceId === resource.id);
          
          const bookedEfforts = allAssignmentsForResource.reduce((sum, assignment) => sum + (assignment.plannedDays || 0), 0);

          const taskLinks = allAssignmentsForResource.map(a => ({
                id: a.task.id, 
                ref: a.task.referenceId || a.task.id.substring(a.task.id.length-4),
                status: a.status
            }));

          finalResourceList.push({
              allocationId: allocation.id,
              resourceName: resource.name,
              sprintName: sprint.name,
              tribeName: tribe.name,
              squadName: squad.name,
              roleName: role?.name || 'N/A',
              applicationName: application?.name || 'Cross-Application',
              availableCapacity,
              bookedEfforts,
              taskLinks,
          });
      });

      const sortedList = finalResourceList.sort((a, b) => a.resourceName.localeCompare(b.resourceName) || a.tribeName.localeCompare(b.tribeName));

      if (freeTextFilter) {
        const lowerCaseFilter = freeTextFilter.toLowerCase();
        return sortedList.filter(row => {
          return (
            row.resourceName.toLowerCase().includes(lowerCaseFilter) ||
            row.sprintName.toLowerCase().includes(lowerCaseFilter) ||
            row.tribeName.toLowerCase().includes(lowerCaseFilter) ||
            row.squadName.toLowerCase().includes(lowerCaseFilter) ||
            row.roleName.toLowerCase().includes(lowerCaseFilter) ||
            row.applicationName.toLowerCase().includes(lowerCaseFilter) ||
            row.taskLinks.some(link => link.ref.toLowerCase().includes(lowerCaseFilter))
          );
        });
      }
      
      return sortedList;

  }, [selectedSprint, selectedTribe, selectedSquad, selectedApp, freeTextFilter, sprints, allocations, resources, roles, applications, tasks, squads, tribes, settings, holidays]);
  
  const handleExport = () => {
    if (resourceData.length === 0) {
      toast({ title: 'No Data', description: 'There is no data to export for the current filter.', variant: 'destructive' });
      return;
    }

    const headers = [
      'Resource Name', 'Sprint', 'Tribe', 'Squad', 'Role', 'Application',
      'Available (Days)', 'Booked (Days)', 'Task IDs'
    ];
    const csvRows = [headers.join(',')];
    
    resourceData.forEach(row => {
      const taskRefs = row.taskLinks.map(link => link.ref).join('; ');
      const values = [
        `\"${row.resourceName}\"`, `\"${row.sprintName}\"`, `\"${row.tribeName}\"`, `\"${row.squadName}\"`,
        `\"${row.roleName}\"`, `\"${row.applicationName}\"`, row.availableCapacity.toFixed(2),
        row.bookedEfforts.toFixed(2), `\"${taskRefs}\"`
      ];
      csvRows.push(values.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
    
    const sprintName = (sprints.find(s => s.id === selectedSprint)?.name || 'AllSprints').replace(/\s+/g, '-');
    const tribeName = selectedTribe === 'all-tribes' ? 'AllTribes' : (tribes.find(t => t.id === selectedTribe)?.name || '').replace(/\s+/g, '-');
    const squadName = selectedSquad === 'all-squads' ? 'AllSquads' : (squads.find(s => s.id === selectedSquad)?.name || '').replace(/\s+/g, '-');

    const filename = `RD_${sprintName}_${tribeName}_${squadName}_${timestamp}.csv`;

    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: 'Success', description: 'Data exported to CSV.' });
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <div className="space-y-6">
       <div className="sticky top-[56px] sm:top-0 z-10 -mx-4 -mt-4 sm:mx-0 sm:mt-0 sm:pt-4 bg-muted/40 backdrop-blur-lg">
            <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                <CardHeader>
                    <CardTitle className="font-headline">Resource View</CardTitle>
                    <CardDescription>View resource capacity, booked efforts, and assigned tasks for a specific team.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                        <Select value={selectedSprint} onValueChange={setSelectedSprint}>
                            <SelectTrigger><SelectValue placeholder="Select Sprint" /></SelectTrigger>
                            <SelectContent>
                                {sprints.map(sprint => <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={selectedTribe} onValueChange={setSelectedTribe}>
                            <SelectTrigger><SelectValue placeholder="Select Tribe" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-tribes">All Tribes</SelectItem>
                                {tribes.map(tribe => <SelectItem key={tribe.id} value={tribe.id}>{tribe.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={selectedSquad} onValueChange={setSelectedSquad} disabled={selectedTribe === 'all-tribes'}>
                            <SelectTrigger><SelectValue placeholder="Select Squad (All)" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-squads">All Squads in Tribe</SelectItem>
                                {filteredSquads.map(squad => <SelectItem key={squad.id} value={squad.id}>{squad.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={selectedApp} onValueChange={setSelectedApp}>
                            <SelectTrigger><SelectValue placeholder="Select Application" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Applications</SelectItem>
                                {applications.map(app => <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>)}
                                <SelectItem value="cross-app">Cross-Application</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="ghost" onClick={resetFilters}>
                            <XCircle className="mr-2 h-4 w-4" /> Clear
                        </Button>
                    </div>
                     <div className="mt-4 relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search all fields..."
                            value={freeTextFilter}
                            onChange={(e) => setFreeTextFilter(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
      
        <Card className="pt-4">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline">Resource Details</CardTitle>
                    <CardDescription>Capacity and assignment details for the selected team and sprint.</CardDescription>
                </div>
                {canEdit && (
                    <Button onClick={handleExport} variant="outline">
                        <Download className="mr-2 h-4 w-4" />
                        Export
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Resource Name</TableHead>
                            <TableHead>Sprint</TableHead>
                            <TableHead>Tribe</TableHead>
                            <TableHead>Squad</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Application</TableHead>
                            <TableHead>Available (Days)</TableHead>
                            <TableHead>Booked (Days)</TableHead>
                            <TableHead>Task IDs</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {resourceData.length > 0 ? resourceData.map(res => (
                            <TableRow key={res.allocationId}>
                                <TableCell className="font-medium">{res.resourceName}</TableCell>
                                <TableCell>{res.sprintName}</TableCell>
                                <TableCell>{res.tribeName}</TableCell>
                                <TableCell>{res.squadName}</TableCell>
                                <TableCell>{res.roleName}</TableCell>
                                <TableCell>{res.applicationName}</TableCell>
                                <TableCell>{res.availableCapacity.toFixed(2)}</TableCell>
                                <TableCell>{res.bookedEfforts.toFixed(2)}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {res.taskLinks.map(link => (
                                            <Badge key={link.id} className={cn("font-mono", getStatusColorClass(link.status))} asChild>
                                                <Link href={`/dashboard/tasks/${link.id}?from=resource-view`}>{link.ref}</Link>
                                            </Badge>
                                        ))}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center text-muted-foreground h-24">
                                    {isLoading ? 'Loading...' : 'No resources allocated for this selection.'}
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
