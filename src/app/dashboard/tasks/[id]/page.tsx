
'use client';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { useData } from '@/hooks/use-data';
import { useState, useMemo, useEffect, useRef, type KeyboardEvent } from 'react';
import type { Task, Sprint, Application, Resource, Tribe, Squad, ImpactedApp, Role, ResourceAssignment, TaskStatus } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, BarChart, Bot, User, Users2, Building, NotebookText, MessageSquare, PlusCircle, Edit, AlertCircle, Briefcase } from 'lucide-react';
import { AITimeAdjuster } from '@/components/app/ai-time-adjuster';
import { Loader2, Trash2, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { getBusinessDays } from '@/lib/utils';


function DualListbox({ 
    allResources, 
    selectedAssignments, 
    onAssignmentChange, 
    disabled,
    getRemainingCapacity
}: {
    allResources: { id: string; displayName: string; capacity: number }[];
    selectedAssignments: ResourceAssignment[];
    onAssignmentChange: (assignments: ResourceAssignment[]) => void;
    disabled: boolean;
    getRemainingCapacity: (resourceId: string) => number;
}) {
    const [search, setSearch] = useState('');
    
    const [highlighted, setHighlighted] = useState<string[]>([]);
    
    const selectedResourceIds = (selectedAssignments || []).map(a => a.resourceId);

    const availableResources = useMemo(() => {
        return allResources
            .filter(res => !(selectedResourceIds || []).includes(res.id))
            .filter(res => res.displayName.toLowerCase().includes(search.toLowerCase()));
    }, [allResources, selectedResourceIds, search]);

    const selectedResources = useMemo(() => {
        return allResources.filter(res => (selectedResourceIds || []).includes(res.id));
    }, [allResources, selectedResourceIds]);

    const handleHighlight = (resourceId: string) => {
        setHighlighted(prev => 
            prev.includes(resourceId) 
                ? prev.filter(id => id !== resourceId) 
                : [...prev, resourceId]
        );
    };

    const moveSelected = () => {
        const toMove = highlighted.filter(id => availableResources.some(res => res.id === id));
        const newAssignments = toMove.map(id => ({ resourceId: id, plannedDays: 0, progress: 0, status: 'Not Started' as 'Not Started' }));
        onAssignmentChange([...(selectedAssignments || []), ...newAssignments]);
        setHighlighted([]);
    };

    const moveAll = () => {
        const newAssignments = availableResources.map(r => ({ resourceId: r.id, plannedDays: 0, progress: 0, status: 'Not Started' as 'Not Started' }));
        onAssignmentChange([...(selectedAssignments || []), ...newAssignments]);
    };
    
    const removeSelected = () => {
        const toKeep = (selectedAssignments || []).filter(a => !highlighted.includes(a.resourceId));
        onAssignmentChange(toKeep);
        setHighlighted([]);
    };

    const removeAll = () => {
        onAssignmentChange([]);
    };

    const handlePlannedDaysChange = (resourceId: string, value: string) => {
        const plannedDays = parseFloat(value) || 0;
        const remainingCapacity = getRemainingCapacity(resourceId);

        if (plannedDays > remainingCapacity) return; // Basic validation

        const newAssignments = (selectedAssignments || []).map(a => 
            a.resourceId === resourceId ? { ...a, plannedDays } : a
        );
        onAssignmentChange(newAssignments);
    };

    if (disabled) {
        return (
            <div className="text-center text-sm text-muted-foreground border rounded-lg p-4 h-64 flex items-center justify-center">
                Please select an Application to enable resource assignment.
            </div>
        )
    }

    return (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
            {/* Available List */}
            <div className="border rounded-lg h-64 flex flex-col">
                <div className="p-2 border-b">
                    <Input placeholder="Search available..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <ScrollArea className="flex-grow">
                    <ul className="p-2">
                        {availableResources.map(res => (
                            <li 
                                key={res.id} 
                                onClick={() => handleHighlight(res.id)}
                                onDoubleClick={moveSelected}
                                className={cn("p-2 rounded cursor-pointer hover:bg-muted", highlighted.includes(res.id) && "bg-accent text-accent-foreground")}
                            >
                                <div className="flex justify-between text-sm">
                                    <span>{res.displayName}</span>
                                    <span className="text-xs text-muted-foreground">{getRemainingCapacity(res.id).toFixed(1)}d left</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </ScrollArea>
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2">
                <Button type="button" size="icon" variant="outline" onClick={moveAll} title="Assign all"><ChevronsRight /></Button>
                <Button type="button" size="icon" variant="outline" onClick={moveSelected} title="Assign selected"><ChevronRight /></Button>
                <Button type="button" size="icon" variant="outline" onClick={removeSelected} title="Remove selected"><ChevronLeft /></Button>
                <Button type="button" size="icon" variant="outline" onClick={removeAll} title="Remove all"><ChevronsLeft /></Button>
            </div>

            {/* Assigned List */}
            <div className="border rounded-lg h-64 flex flex-col">
                <div className="p-2 border-b text-sm font-medium text-center">Assigned Resources</div>
                <ScrollArea className="flex-grow">
                    <ul className="p-2 space-y-2">
                        {(selectedAssignments || []).map(assignment => {
                            const resource = selectedResources.find(r => r.id === assignment.resourceId);
                            if (!resource) return null;
                            
                            const remainingCapacity = getRemainingCapacity(assignment.resourceId);
                            const isInvalid = assignment.plannedDays > remainingCapacity;

                            return (
                            <li 
                                key={assignment.resourceId} 
                                onClick={() => handleHighlight(assignment.resourceId)}
                                className={cn("p-2 rounded cursor-pointer hover:bg-muted", highlighted.includes(assignment.resourceId) && "bg-destructive/80 text-destructive-foreground")}
                            >
                               <div className="text-sm font-medium">{resource.displayName}</div>
                               <div className="flex items-center gap-2 mt-1">
                                    <Label htmlFor={`planned-${assignment.resourceId}`} className="text-xs whitespace-nowrap">Plan (d):</Label>
                                    <Input
                                        id={`planned-${assignment.resourceId}`}
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max={remainingCapacity.toFixed(1)}
                                        value={assignment.plannedDays}
                                        onChange={(e) => handlePlannedDaysChange(assignment.resourceId, e.target.value)}
                                        className={cn("h-7 text-xs", isInvalid && "border-destructive ring-destructive ring-1")}
                                        onClick={(e) => e.stopPropagation()} // prevent row highlight
                                    />
                               </div>
                                <p className={cn("text-xs text-muted-foreground mt-1", isInvalid && "text-destructive font-medium")}>
                                   Max: {remainingCapacity.toFixed(1)}d
                                </p>
                            </li>
                        )})}
                    </ul>
                </ScrollArea>
            </div>
        </div>
    );
}

function ManageImpactedApps({ task, tasks, onUpdate, canEdit }: { task: Task; tasks: Task[]; onUpdate: (data: Partial<Task>) => Promise<void>; canEdit: boolean; }) {
    const { applications, resources, squads, squadResourceAllocations, roles, sprints, settings, holidays } = useData();
    const { toast } = useToast();
    
    // Add state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newApp, setNewApp] = useState<Omit<ImpactedApp, 'resourceAssignments'> & { resourceAssignments: ResourceAssignment[] }>({ applicationId: '', effortType: 'Implementation', effort: 0, resourceAssignments: [] });

    // Update state
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [selectedAppToUpdate, setSelectedAppToUpdate] = useState<ImpactedApp | null>(null);

    const getResourceDisplayName = (resource: Resource) => {
        const role = roles.find(r => r.id === resource.roleId);
        const app = applications.find(a => a.id === resource.applicationId);
        return `${resource.name} - ${role?.name || 'N/A'} - ${app?.name || 'Cross-App'}`;
    };

    const getResourceCapacity = (resource: Resource) => {
        const sprint = sprints.find(s => s.id === task.sprintId);
        if (!sprint || !settings) return 0;
        const sprintDuration = getBusinessDays(sprint.startDate, sprint.endDate, settings, holidays).length;

        const allocations = squadResourceAllocations.filter(a => a.sprintId === task.sprintId && a.resourceId === resource.id);
        const totalPercentage = allocations.reduce((sum, alloc) => {
            if (alloc.allocationType === 'Dedicated') return 100;
            return sum + (alloc.allocationPercentage || 0);
        }, 0);
        return (sprintDuration * Math.min(totalPercentage, 100)) / 100;
    };
    
    const getRemainingResourceCapacity = (resourceId: string): number => {
        const totalCapacity = getResourceCapacity(resources.find(r => r.id === resourceId)!);
        
        const bookedOnOtherTasks = tasks
            .filter(t => t.id !== task.id && t.sprintId === task.sprintId)
            .flatMap(t => [...(t.impactedApps || []).flatMap(app => app.resourceAssignments || []), ...(t.crossFunctionalResourceAssignments || [])])
            .filter(assignment => assignment.resourceId === resourceId)
            .reduce((sum, assignment) => sum + assignment.plannedDays, 0);

        return totalCapacity - bookedOnOtherTasks;
    };

    const relevantResourcesForTask = useMemo(() => {
        if (!task.sprintId) return [];
        let relevantResources;

        if (task.squadId) {
            const squadResourceIds = new Set(squadResourceAllocations
                .filter(alloc => alloc.sprintId === task.sprintId && alloc.squadId === task.squadId)
                .map(alloc => alloc.resourceId));
            relevantResources = resources.filter(res => squadResourceIds.has(res.id));
        } else if (task.tribeId) {
            const tribeSquadIds = new Set(squads.filter(s => s.tribeId === task.tribeId).map(s => s.id));
            const tribeResourceIds = new Set(squadResourceAllocations
                .filter(alloc => alloc.sprintId === task.sprintId && tribeSquadIds.has(alloc.squadId))
                .map(alloc => alloc.resourceId));
            relevantResources = resources.filter(res => tribeResourceIds.has(res.id));
        } else {
             relevantResources = resources; // Or some other default if no tribe/squad
        }
        
        return relevantResources.map(resource => ({
            ...resource,
            displayName: getResourceDisplayName(resource),
            capacity: getResourceCapacity(resource)
        }));
    }, [task.sprintId, task.tribeId, task.squadId, resources, squadResourceAllocations, squads, roles, applications, settings, holidays]);
    
    const getResourcesForAppDualList = (applicationId: string) => {
      const appSpecificResources = relevantResourcesForTask.filter(res => res.applicationId === applicationId);
      return appSpecificResources;
    }

    const handleAddApp = async () => {
        if (!canEdit) return;
        if (!newApp.applicationId || !newApp.effortType || newApp.effort <= 0) {
            toast({ title: 'Error', description: 'Please fill all fields for the new application.', variant: 'destructive' });
            return;
        }

        const totalPlanned = newApp.resourceAssignments.reduce((sum, a) => sum + a.plannedDays, 0);
        if (totalPlanned > newApp.effort) {
            toast({ title: 'Validation Error', description: `Total planned days (${totalPlanned}) exceed the application effort (${newApp.effort}).`, variant: 'destructive'});
            return;
        }

        for (const assignment of newApp.resourceAssignments) {
            if (assignment.plannedDays > getRemainingResourceCapacity(assignment.resourceId)) {
                toast({ title: 'Validation Error', description: `Planned days for a resource exceed its available capacity.`, variant: 'destructive'});
                return;
            }
        }
        const updatedImpactedApps = [...task.impactedApps, newApp];
        const newEstimatedDays = updatedImpactedApps.reduce((sum, app) => sum + app.effort, 0) + (task.crossFunctionalResourceAssignments || []).reduce((sum, r) => sum + r.plannedDays, 0);

        try {
            await onUpdate({ impactedApps: updatedImpactedApps, estimatedDays: newEstimatedDays });
            toast({ title: 'Success', description: 'Application added to the task.' });
            setNewApp({ applicationId: '', effortType: 'Implementation', effort: 0, resourceAssignments: [] });
            setIsAddOpen(false);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to add application.', variant: 'destructive' });
        }
    };

    const handleOpenUpdateDialog = (app: ImpactedApp) => {
        if (!canEdit) return;
        setSelectedAppToUpdate(JSON.parse(JSON.stringify(app))); // Deep copy
        setIsUpdateOpen(true);
    };

    const handleUpdateApp = async () => {
        if (!canEdit || !selectedAppToUpdate) return;
        
        const totalPlanned = (selectedAppToUpdate.resourceAssignments || []).reduce((sum, a) => sum + a.plannedDays, 0);
        if (totalPlanned > selectedAppToUpdate.effort) {
            toast({ title: 'Validation Error', description: `Total planned days (${totalPlanned}) exceed the application effort (${selectedAppToUpdate.effort}).`, variant: 'destructive'});
            return;
        }
        for (const assignment of (selectedAppToUpdate.resourceAssignments || [])) {
            if (assignment.plannedDays > getRemainingResourceCapacity(assignment.resourceId)) {
                toast({ title: 'Validation Error', description: `Planned days for a resource exceed its available capacity.`, variant: 'destructive'});
                return;
            }
        }
        
        const updatedImpactedApps = task.impactedApps.map(app => app.applicationId === selectedAppToUpdate.applicationId ? selectedAppToUpdate : app);
        const newEstimatedDays = updatedImpactedApps.reduce((sum, app) => sum + app.effort, 0) + (task.crossFunctionalResourceAssignments || []).reduce((sum, r) => sum + r.plannedDays, 0);

        try {
            await onUpdate({ impactedApps: updatedImpactedApps, estimatedDays: newEstimatedDays });
            toast({ title: 'Success', description: 'Application updated successfully.'});
            setIsUpdateOpen(false);
            setSelectedAppToUpdate(null);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update application.', variant: 'destructive' });
        }
    };
    
    const handleDeleteApp = async () => {
        if (!canEdit || !selectedAppToUpdate) return;
        
        const updatedImpactedApps = task.impactedApps.filter(app => app.applicationId !== selectedAppToUpdate.applicationId);
        const newEstimatedDays = updatedImpactedApps.reduce((sum, app) => sum + app.effort, 0) + (task.crossFunctionalResourceAssignments || []).reduce((sum, r) => sum + r.plannedDays, 0);

        try {
            await onUpdate({ impactedApps: updatedImpactedApps, estimatedDays: newEstimatedDays });
            toast({ title: 'Success', description: 'Application removed from the task.'});
            setIsUpdateOpen(false);
            setSelectedAppToUpdate(null);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to remove application.', variant: 'destructive' });
        }
    }
    
    const alreadyAddedAppIds = task.impactedApps.map(ia => ia.applicationId);
    const availableAppsForAdd = applications.filter(app => !alreadyAddedAppIds.includes(app.id));

    const totalPlannedInAdd = newApp.resourceAssignments.reduce((sum, a) => sum + a.plannedDays, 0);
    const addEffortValidation = totalPlannedInAdd > newApp.effort;

    const totalPlannedInUpdate = (selectedAppToUpdate?.resourceAssignments || []).reduce((sum, a) => sum + a.plannedDays, 0);
    const updateEffortValidation = selectedAppToUpdate && totalPlannedInUpdate > selectedAppToUpdate.effort;
    
    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div className="space-y-1.5">
                    <CardTitle className="font-headline flex items-center gap-2"><Building className="h-5 w-5"/> Impacted Applications</CardTitle>
                    <CardDescription>Breakdown of effort and resources per application.</CardDescription>
                </div>
                 {canEdit && (
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button disabled={!canEdit}><PlusCircle className="mr-2"/>Add Application</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Add Impacted Application</DialogTitle>
                                <DialogDescription>Add a new application, define its effort, and assign resources.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Application</Label>
                                        <Select onValueChange={(v) => setNewApp(p => ({...p, applicationId: v, resourceAssignments: []}))} value={newApp.applicationId}>
                                            <SelectTrigger><SelectValue placeholder="Select App" /></SelectTrigger>
                                            <SelectContent>{availableAppsForAdd.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Effort Type</Label>
                                        <Select onValueChange={(v) => setNewApp(p => ({...p, effortType: v as any}))} value={newApp.effortType}>
                                            <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Implementation">Implementation</SelectItem>
                                                <SelectItem value="Support">Support</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Effort (Days)</Label>
                                        <Input type="number" step="0.1" max="9999" placeholder="e.g., 5.5" onChange={(e) => setNewApp(p => ({...p, effort: parseFloat(e.target.value) || 0}))} value={newApp.effort || ''} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                <Label>Assign App Resources</Label>
                                {addEffortValidation && (
                                    <div className="flex items-center gap-2 text-sm text-destructive font-medium p-2 bg-destructive/10 rounded-md">
                                        <AlertCircle className="h-4 w-4"/>
                                        <span>Total planned days ({totalPlannedInAdd}) exceed app effort ({newApp.effort}).</span>
                                    </div>
                                )}
                                <DualListbox
                                    allResources={getResourcesForAppDualList(newApp.applicationId)}
                                    selectedAssignments={newApp.resourceAssignments}
                                    onAssignmentChange={(assignments) => setNewApp(p => ({...p, resourceAssignments: assignments}))}
                                    disabled={!newApp.applicationId}
                                    getRemainingCapacity={getRemainingResourceCapacity}
                                />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddApp}>Add Application</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                 )}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Application</TableHead>
                            <TableHead>Effort Type</TableHead>
                            <TableHead>Effort (Days)</TableHead>
                            <TableHead>Assigned Resources</TableHead>
                            {canEdit && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {task.impactedApps?.map((ia, index) => {
                            const app = applications.find(a => a.id === ia.applicationId);
                            const assignedResources = (ia.resourceAssignments || []).map(ass => {
                                const resource = resources.find(r => r.id === ass.resourceId);
                                return resource ? `${resource.name} (${ass.plannedDays}d)` : '';
                            }).filter(Boolean);
                            
                            return (
                                <TableRow key={index}>
                                    <TableCell>{app?.name}</TableCell>
                                    <TableCell><Badge variant="secondary">{ia.effortType}</Badge></TableCell>
                                    <TableCell>{ia.effort.toFixed(2)}</TableCell>
                                    <TableCell>
                                      {assignedResources.length > 0 
                                        ? assignedResources.join(', ')
                                        : <span className="text-muted-foreground">N/A</span>
                                      }
                                    </TableCell>
                                    {canEdit && (
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleOpenUpdateDialog(ia)} disabled={!canEdit}>
                                                <Edit className="h-4 w-4"/>
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )
                        })}
                         {(!task.impactedApps || task.impactedApps.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground">No applications assigned.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>

             {selectedAppToUpdate && (
                <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
                    <DialogContent className="sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Update Impacted Application</DialogTitle>
                            <DialogDescription>Modify effort, manage resources, or remove the application from this task.</DialogDescription>
                        </DialogHeader>
                         <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Application</Label>
                                    <Input value={applications.find(a => a.id === selectedAppToUpdate.applicationId)?.name} disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label>Effort Type</Label>
                                    <Select onValueChange={(v) => setSelectedAppToUpdate(p => p ? {...p, effortType: v as any} : null)} value={selectedAppToUpdate.effortType}>
                                        <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Implementation">Implementation</SelectItem>
                                            <SelectItem value="Support">Support</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Effort (Days)</Label>
                                    <Input type="number" step="0.1" max="9999" placeholder="e.g., 5.5" onChange={(e) => setSelectedAppToUpdate(p => p ? {...p, effort: parseFloat(e.target.value) || 0} : null)} value={selectedAppToUpdate.effort || ''} />
                                </div>
                            </div>
                             <div className="space-y-2">
                              <Label>Assign App Resources</Label>
                               {updateEffortValidation && (
                                <div className="flex items-center gap-2 text-sm text-destructive font-medium p-2 bg-destructive/10 rounded-md">
                                    <AlertCircle className="h-4 w-4"/>
                                    <span>Total planned days ({totalPlannedInUpdate}) exceed app effort ({selectedAppToUpdate.effort}).</span>
                                </div>
                               )}
                              <DualListbox
                                allResources={getResourcesForAppDualList(selectedAppToUpdate.applicationId)}
                                selectedAssignments={selectedAppToUpdate.resourceAssignments}
                                onAssignmentChange={(assignments) => setSelectedAppToUpdate(p => p ? {...p, resourceAssignments: assignments} : null)}
                                disabled={!canEdit}
                                getRemainingCapacity={getRemainingResourceCapacity}
                               />
                            </div>
                        </div>
                        <DialogFooter className="justify-between">
                            <Button variant="destructive" onClick={handleDeleteApp} disabled={!canEdit}><Trash2 className="mr-2"/>Remove From Task</Button>
                            <div>
                                <Button variant="outline" className="mr-2" onClick={() => setIsUpdateOpen(false)}>Cancel</Button>
                                <Button onClick={handleUpdateApp} disabled={!canEdit}>Save Changes</Button>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </Card>
    );
}

function ManageCrossFunctionalResources({ task, tasks, onUpdate, canEdit }: { task: Task; tasks: Task[]; onUpdate: (data: Partial<Task>) => Promise<void>; canEdit: boolean; }) {
    const { resources, squads, squadResourceAllocations, roles, sprints, settings, holidays } = useData();
    const { toast } = useToast();
    
    const [isUpdateOpen, setIsUpdateOpen] = useState(false);
    const [currentAssignments, setCurrentAssignments] = useState<ResourceAssignment[]>(task.crossFunctionalResourceAssignments || []);

    const getResourceDisplayName = (resource: Resource) => {
        const role = roles.find(r => r.id === resource.roleId);
        return `${resource.name} - ${role?.name || 'N/A'}`;
    };

     const getResourceCapacity = (resource: Resource) => {
        const sprint = sprints.find(s => s.id === task.sprintId);
        if (!sprint || !settings) return 0;
        const sprintDuration = getBusinessDays(sprint.startDate, sprint.endDate, settings, holidays).length;

        const allocations = squadResourceAllocations.filter(a => a.sprintId === task.sprintId && a.resourceId === resource.id);
        const totalPercentage = allocations.reduce((sum, alloc) => {
            if (alloc.allocationType === 'Dedicated') return 100;
            return sum + (alloc.allocationPercentage || 0);
        }, 0);
        return (sprintDuration * Math.min(100, totalPercentage)) / 100;
    };

    const getRemainingResourceCapacity = (resourceId: string): number => {
        const totalCapacity = getResourceCapacity(resources.find(r => r.id === resourceId)!);
        
         const bookedOnOtherTasks = tasks
            .filter(t => t.id !== task.id && t.sprintId === task.sprintId)
            .flatMap(t => [...(t.impactedApps || []).flatMap(app => app.resourceAssignments || []), ...(t.crossFunctionalResourceAssignments || [])])
            .filter(assignment => assignment.resourceId === resourceId)
            .reduce((sum, assignment) => sum + assignment.plannedDays, 0);

        return totalCapacity - bookedOnOtherTasks;
    };

    const relevantResourcesForTask = useMemo(() => {
        if (!task.sprintId) return [];
        let relevantResources;

        if (task.squadId) {
            const squadResourceIds = new Set(squadResourceAllocations
                .filter(alloc => alloc.sprintId === task.sprintId && alloc.squadId === task.squadId)
                .map(alloc => alloc.resourceId));
            relevantResources = resources.filter(res => squadResourceIds.has(res.id));
        } else if (task.tribeId) {
            const tribeSquadIds = new Set(squads.filter(s => s.tribeId === task.tribeId).map(s => s.id));
            const tribeResourceIds = new Set(squadResourceAllocations
                .filter(alloc => alloc.sprintId === task.sprintId && tribeSquadIds.has(alloc.squadId))
                .map(alloc => alloc.resourceId));
            relevantResources = resources.filter(res => tribeResourceIds.has(res.id));
        } else {
             relevantResources = resources;
        }
        
        return relevantResources.map(resource => ({
            ...resource,
            displayName: getResourceDisplayName(resource),
            capacity: getResourceCapacity(resource)
        }));
    }, [task.sprintId, task.tribeId, task.squadId, resources, squadResourceAllocations, squads, roles, settings, holidays]);

    const getResourcesForDualList = () => {
      const crossFunctionalResourceIds = new Set((task.crossFunctionalResourceAssignments || []).map(r => r.resourceId));
      // Show non-app resources, OR any resource already assigned
      return relevantResourcesForTask.filter(res => !res.applicationId || crossFunctionalResourceIds.has(res.id));
    }
    
    const handleUpdate = async () => {
        if (!canEdit) return;

        for (const assignment of currentAssignments) {
            if (assignment.plannedDays > getRemainingResourceCapacity(assignment.resourceId)) {
                toast({ title: 'Validation Error', description: `Planned days for a resource exceed its available capacity.`, variant: 'destructive'});
                return;
            }
        }
        const newEstimatedDays = (task.impactedApps || []).reduce((sum, app) => sum + app.effort, 0) + currentAssignments.reduce((sum, r) => sum + r.plannedDays, 0);

        try {
            await onUpdate({ crossFunctionalResourceAssignments: currentAssignments, estimatedDays: newEstimatedDays });
            toast({ title: 'Success', description: 'Cross-functional resources updated.'});
            setIsUpdateOpen(false);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to update resources.', variant: 'destructive' });
        }
    }
    
    const assignedCrossFunctional = (task.crossFunctionalResourceAssignments || []);

    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div className="space-y-1.5">
                    <CardTitle className="font-headline flex items-center gap-2"><Briefcase className="h-5 w-5" />Cross-Functional Resources</CardTitle>
                    <CardDescription>Plan effort for resources not tied to a specific application (e.g., PMs).</CardDescription>
                </div>
                {canEdit && (
                    <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm"><Edit className="mr-2" />Manage</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Manage Cross-Functional Resources</DialogTitle>
                                <DialogDescription>Add, remove, or update planned days for cross-functional resources on this task.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                                <DualListbox 
                                    allResources={getResourcesForDualList()}
                                    selectedAssignments={currentAssignments}
                                    onAssignmentChange={setCurrentAssignments}
                                    disabled={!canEdit}
                                    getRemainingCapacity={getRemainingResourceCapacity}
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsUpdateOpen(false)}>Cancel</Button>
                                <Button onClick={handleUpdate}>Save Changes</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </CardHeader>
            <CardContent>
                <ul className="space-y-2 text-sm">
                    {assignedCrossFunctional.length > 0 ? (
                        assignedCrossFunctional.map(assignment => {
                            const resource = resources.find(r => r.id === assignment.resourceId);
                            if (!resource) return null;
                            return (
                                <li key={assignment.resourceId} className="flex justify-between">
                                    <span>{getResourceDisplayName(resource)}</span>
                                    <span className="font-medium">{assignment.plannedDays} days</span>
                                </li>
                            )
                        })
                    ) : (
                        <p className="text-muted-foreground text-center">No cross-functional resources assigned.</p>
                    )}
                </ul>
            </CardContent>
        </Card>
    )
}

function EditableField({ initialValue, onSave, component, inputType = 'text', canEdit }: { initialValue: string; onSave: (value: string) => void; component: 'input' | 'textarea', inputType?: string, canEdit: boolean }) {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(initialValue);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    useEffect(() => {
        setValue(initialValue);
    }, [initialValue]);

    useEffect(() => {
        if (isEditing && canEdit) {
            inputRef.current?.focus();
            inputRef.current?.select();
        }
    }, [isEditing, canEdit]);
    
    const handleSave = () => {
        setIsEditing(false);
        if (value !== initialValue) {
            onSave(value);
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && component === 'input') {
            handleSave();
        } else if (e.key === 'Escape') {
            setValue(initialValue);
            setIsEditing(false);
        }
    }
    
    const handleEditClick = () => {
        if (canEdit) {
            setIsEditing(true);
        }
    }

    if (isEditing && canEdit) {
        if (component === 'textarea') {
            return <Textarea ref={inputRef as React.Ref<HTMLTextAreaElement>} value={value} onChange={e => setValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className="text-sm" />;
        }
        return <Input ref={inputRef as React.Ref<HTMLInputElement>} type={inputType} value={value} onChange={e => setValue(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} className="text-2xl font-bold p-1 h-auto" />;
    }

    if (component === 'textarea') {
        return <p onClick={handleEditClick} className={cn("prose prose-sm max-w-none min-h-[40px]", canEdit && "cursor-pointer")}>{value || <span className="text-muted-foreground">Click to add description...</span>}</p>;
    }
    return <h1 onClick={handleEditClick} className={cn("font-headline text-2xl font-semibold leading-none tracking-tight", canEdit && "cursor-pointer")}>{value}</h1>;
}

function SubTaskProgress({ task, onUpdate, canEdit }: { task: Task; onUpdate: (data: Partial<Task>) => void; canEdit: boolean;}) {
    const { resources, roles, applications } = useData();

    const allAssignments = [
        ...(task.impactedApps || []).flatMap(app => 
            (app.resourceAssignments || []).map(a => ({
                ...a,
                assignmentId: `${task.id}-${a.resourceId}-${app.applicationId}`,
                context: applications.find(x => x.id === app.applicationId)?.name || 'N/A'
            }))
        ),
        ...(task.crossFunctionalResourceAssignments || []).map(a => ({
            ...a,
            assignmentId: `${task.id}-${a.resourceId}-cross`,
            context: 'Cross-Functional'
        }))
    ];

    const handleProgressChange = async (assignmentId: string, newProgress: number) => {
        const updatedTask = JSON.parse(JSON.stringify(task)) as Task;
        let assignmentUpdated = false;
    
        const updateLogic = (assignment: ResourceAssignment) => {
            assignment.progress = newProgress;
            assignment.status = newProgress === 100 ? 'Completed' : newProgress > 0 ? 'In Progress' : 'Not Started';
        };
    
        for (const app of updatedTask.impactedApps) {
            for (const res of app.resourceAssignments) {
                if (`${task.id}-${res.resourceId}-${app.applicationId}` === assignmentId) {
                    updateLogic(res);
                    assignmentUpdated = true;
                    break;
                }
            }
            if (assignmentUpdated) break;
        }
    
        if (!assignmentUpdated && updatedTask.crossFunctionalResourceAssignments) {
            for (const res of updatedTask.crossFunctionalResourceAssignments) {
                 if (`${task.id}-${res.resourceId}-cross` === assignmentId) {
                    updateLogic(res);
                    assignmentUpdated = true;
                    break;
                }
            }
        }
        
        if(assignmentUpdated) {
            // Recalculate overall task progress and status
            const allAssignments = [
                ...(updatedTask.impactedApps || []).flatMap(app => app.resourceAssignments || []),
                ...(updatedTask.crossFunctionalResourceAssignments || [])
            ].filter(a => a && a.plannedDays > 0);
    
            let calculatedProgress = 0;
            let calculatedStatus: TaskStatus = 'Not Started';
    
            if (allAssignments.length > 0) {
                const totalPlannedDays = allAssignments.reduce((sum, a) => sum + a.plannedDays, 0);
                const weightedProgress = allAssignments.reduce((sum, a) => sum + (a.plannedDays * (a.progress || 0)), 0);
                calculatedProgress = totalPlannedDays > 0 ? Math.round(weightedProgress / totalPlannedDays) : 0;
                
                if (allAssignments.every(a => (a.status || 'Not Started') === 'Completed')) {
                    calculatedStatus = 'Completed';
                } else if (allAssignments.some(a => (a.status || 'Not Started') === 'In Progress' || (a.progress || 0) > 0)) {
                    calculatedStatus = 'In Progress';
                } else {
                    calculatedStatus = 'Not Started';
                }
            } else {
                // If no assignments, keep the existing task status/progress or default
                calculatedStatus = updatedTask.status || 'Not Started';
                calculatedProgress = updatedTask.progress || 0;
            }
            console.log('Sending to onUpdate from SubTaskProgress:', { ...updatedTask, progress: calculatedProgress, status: calculatedStatus });
            await onUpdate({
                ...updatedTask,
                progress: calculatedProgress,
                status: calculatedStatus,
            });
        }
    };
    
    
    return (
        <div className="space-y-4">
            {allAssignments.map(assignment => {
                const resource = resources.find(r => r.id === assignment.resourceId);
                const role = roles.find(r => r.id === resource?.roleId);

                return (
                    <div key={assignment.assignmentId} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{resource?.name} ({role?.name})</span>
                            <span className="text-muted-foreground">{assignment.context}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Slider
                                value={[assignment.progress || 0]}
                                onValueChange={(val) => handleProgressChange(assignment.assignmentId, val[0])}
                                max={100}
                                step={5}
                                disabled={!canEdit}
                                className="flex-1"
                            />
                             <span className="text-sm font-bold w-12 text-right">
                                {assignment.progress || 0}%
                            </span>
                        </div>
                    </div>
                )
            })}
             {allAssignments.length === 0 && <p className="text-sm text-center text-muted-foreground">No resources assigned.</p>}
        </div>
    )
}

export default function TaskDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const { user, isManagerOrAdmin } = useAuth();
  
  const { tasks, sprints, applications, resources, tribes, squads, squadResourceAllocations, isLoading } = useData();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const task: Task | undefined = useMemo(() => tasks.find(t => t.id === params.id), [tasks, params.id]);
  
  const assignedResource = useMemo(() => resources.find(r => r.userId === user?.uid), [resources, user]);
  const isAssignedToTask = useMemo(() => {
    if (!task || !assignedResource) return false;
    return task.impactedApps.some(app => app.resourceAssignments.some(ra => ra.resourceId === assignedResource?.id))
  }, [task, assignedResource]);

  const canEdit = useMemo(() => isManagerOrAdmin(), [isManagerOrAdmin]);
  const canEditProgress = useMemo(() => canEdit || isAssignedToTask, [canEdit, isAssignedToTask]);

  const availableSquadsForTask = useMemo(() => {
    if (!task?.tribeId) return [];
    return squads.filter(s => s.tribeId === task.tribeId);
  }, [task?.tribeId, squads]);

  const { overallStatus, overallProgress } = useMemo(() => {
    if (!task) return { overallStatus: 'Not Started' as TaskStatus, overallProgress: 0 };
    const allAssignments = [
        ...(task.impactedApps || []).flatMap(app => app.resourceAssignments || []),
        ...(task.crossFunctionalResourceAssignments || [])
    ].filter(a => a && a.plannedDays > 0);

    if (allAssignments.length === 0) {
        return { overallStatus: (task.status as TaskStatus) || 'Not Started', overallProgress: task.progress || 0 };
    }

    const totalPlannedDays = allAssignments.reduce((sum, a) => sum + a.plannedDays, 0);
    const weightedProgress = allAssignments.reduce((sum, a) => sum + (a.plannedDays * (a.progress || 0)), 0);
    const calculatedProgress = totalPlannedDays > 0 ? Math.round(weightedProgress / totalPlannedDays) : 0;
    
    let calculatedStatus: TaskStatus;
    if (allAssignments.every(a => (a.status || 'Not Started') === 'Completed')) {
        calculatedStatus = 'Completed';
    } else if (allAssignments.some(a => (a.status || 'Not Started') === 'In Progress' || (a.progress || 0) > 0)) {
        calculatedStatus = 'In Progress';
    } else {
        calculatedStatus = 'Not Started';
    }

    return { overallStatus: calculatedStatus, overallProgress: calculatedProgress };
  }, [task]);

  if (!task) {
    notFound();
  }

  const handleUpdate = async (data: Partial<Task>) => {
    if (!canEdit) {
        toast({ title: 'Permission Denied', description: 'You do not have permission to update tasks.', variant: 'destructive' });
        return;
    }
    const taskRef = doc(db, 'tasks', task.id);
    try {
        console.log('Sending to updateDoc (Firestore) from TaskDetailPage:', data);
        await updateDoc(taskRef, { ...data, updatedAt: new Date() });
        console.log('Firestore update successful for task:', task.id);
    } catch(error: any) {
        console.error("Failed to update task", error);
        toast({title: "Update Failed", description: error.message, variant: 'destructive'});
    }
  }

  const handleFieldSave = (field: keyof Task, value: string) => {
    handleUpdate({ [field]: value });
    toast({ title: "Task Updated", description: `Task ${field} has been saved.` });
  }

  const getTaskResourceIds = () => {
    const appResourceIds = (task.impactedApps || []).flatMap(app => (app.resourceAssignments || []).map(ra => ra.resourceId));
    const crossFuncResourceIds = (task.crossFunctionalResourceAssignments || []).map(ra => ra.resourceId);
    return [...appResourceIds, ...crossFuncResourceIds];
  }
  
  const handleTribeChange = (newTribeId: string) => {
    const tribeIdToSet = newTribeId === 'none' ? '' : newTribeId;

    if (tribeIdToSet) {
        const taskResourceIds = getTaskResourceIds();
        if (taskResourceIds.length > 0) {
            const tribeSquadIds = squads.filter(s => s.tribeId === tribeIdToSet).map(s => s.id);
            const resourcesInTribe = squadResourceAllocations
                .filter(alloc => alloc.sprintId === task.sprintId && tribeSquadIds.includes(alloc.squadId))
                .map(alloc => alloc.resourceId);
            
            const uniqueResourcesInTribe = [...new Set(resourcesInTribe)];
            const missingResources = taskResourceIds.filter(resId => !uniqueResourcesInTribe.includes(resId));

            if (missingResources.length > 0) {
                const missingResourceNames = missingResources.map(id => resources.find(r => r.id === id)?.name).filter(Boolean);
                toast({ title: 'Assignment Failed', description: `Cannot assign to this tribe. The following assigned resources are not allocated to any squad in this tribe for this sprint: ${missingResourceNames.join(', ')}.`, variant: 'destructive', duration: 8000 });
                return;
            }
        }
    }

    handleUpdate({ tribeId: tribeIdToSet, squadId: '' });
    toast({ title: "Task Updated", description: "Tribe has been updated. Please re-select a squad if needed."});
  };

  const handleSquadChange = (newSquadId: string) => {
    const squadIdToSet = newSquadId === 'none' ? '' : newSquadId;

    if (squadIdToSet) {
        const taskResourceIds = getTaskResourceIds();
        if (taskResourceIds.length > 0) {
            const resourcesInSquad = squadResourceAllocations
                .filter(alloc => alloc.sprintId === task.sprintId && alloc.squadId === squadIdToSet)
                .map(alloc => alloc.resourceId);
            
            const uniqueResourcesInSquad = [...new Set(resourcesInSquad)];
            const missingResources = taskResourceIds.filter(resId => !uniqueResourcesInSquad.includes(resId));

            if (missingResources.length > 0) {
                const missingResourceNames = missingResources.map(id => resources.find(r => r.id === id)?.name).filter(Boolean);
                toast({ title: 'Assignment Failed', description: `Cannot assign to this squad. The following assigned resources are not allocated to this squad for this sprint: ${missingResourceNames.join(', ')}.`, variant: 'destructive', duration: 8000 });
                return;
            }
        }
    }

    handleUpdate({ squadId: squadIdToSet });
    toast({ title: "Task Updated", description: "Squad has been updated." });
  };
  
  const sprint: Sprint | undefined = sprints.find(s => s.id === task.sprintId);
  const tribe: Tribe | undefined = tribes.find(t => t.id === task.tribeId);
  const squad: Squad | undefined = squads.find(s => s.id === task.squadId);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            {task.referenceId && <CardDescription>#{task.referenceId}</CardDescription>}
            <EditableField 
                initialValue={task.title} 
                onSave={(value) => handleFieldSave('title', value)}
                component="input"
                canEdit={canEdit}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {sprint?.name}</span>
                
                {canEdit ? (
                    <div className="flex items-center gap-2">
                        <Users2 className="h-4 w-4" />
                        <Select onValueChange={handleTribeChange} value={task.tribeId || 'none'} disabled={!canEdit}>
                            <SelectTrigger className="h-7 text-xs w-auto border-dashed">
                                <SelectValue placeholder="Assign Tribe" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No Tribe</SelectItem>
                                {tribes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <span className="flex items-center gap-1.5"><Users2 className="h-4 w-4" /> {tribe?.name || 'No Tribe'}</span>
                )}
                
                {canEdit ? (
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <Select onValueChange={handleSquadChange} value={task.squadId || 'none'} disabled={!canEdit || !task.tribeId}>
                            <SelectTrigger className="h-7 text-xs w-auto border-dashed">
                                <SelectValue placeholder="Assign Squad" />
                            </SelectTrigger>
                            <SelectContent>
                                 <SelectItem value="none">No Squad</SelectItem>
                                {availableSquadsForTask.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {squad?.name || 'No Squad'}</span>
                )}
                
                <span className="flex items-center gap-1.5"><BarChart className="h-4 w-4" /> Total Effort: {task.estimatedDays.toFixed(2)} days</span>
            </div>
          </CardHeader>
          <CardContent>
            <EditableField 
                initialValue={task.description}
                onSave={(value) => handleFieldSave('description', value)}
                component="textarea"
                canEdit={canEdit}
            />
          </CardContent>
        </Card>

        <ManageImpactedApps task={task} tasks={tasks} onUpdate={handleUpdate} canEdit={canEdit} />
        
        <ManageCrossFunctionalResources task={task} tasks={tasks} onUpdate={handleUpdate} canEdit={canEdit} />

        {task.remarks && (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><MessageSquare className="h-5 w-5"/> Remarks</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm">{task.remarks}</p>
                </CardContent>
            </Card>
        )}
      </div>

      <div className="lg:col-span-1 space-y-6">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Overall Progress</CardTitle>
                 <CardDescription>{overallStatus}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                    <Progress value={overallProgress} className="h-3" />
                    <span className="font-bold text-lg">{overallProgress}%</span>
                </div>
                 <SubTaskProgress task={task} onUpdate={handleUpdate} canEdit={canEditProgress} />
            </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><Bot className="h-5 w-5" /> AI Assistance</CardTitle>
          </CardHeader>
          <CardContent>
            <AITimeAdjuster task={task} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
