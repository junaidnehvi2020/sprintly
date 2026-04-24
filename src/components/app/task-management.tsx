
'use client';

import { useState, useEffect, useMemo, useRef, forwardRef } from 'react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/hooks/use-data';
import type { Task, Sprint, Application, Resource, Tribe, Squad, ImpactedApp, Role, ResourceAssignment, TaskStatus } from '@/lib/types';
import { db } from '@/lib/firebase/config';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, PlusCircle, Trash2, MoreHorizontal, FilePenLine, X, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft, AlertCircle, Clock, Users2, Users, GripVertical, AlertTriangle, Search } from 'lucide-react';
import { Slider } from '../ui/slider';
import { Checkbox } from '../ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle as AlertDialogTitleComponent } from '../ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth';
import { getBusinessDays } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

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

type CreateTaskFormState = {
    referenceId?: string;
    title: string;
    description: string;
    sprintId: string;
    tribeId: string;
    squadId: string;
    status: string;
    progress: number;
    remarks?: string;
    impactedApps: ImpactedApp[];
    crossFunctionalResourceAssignments: ResourceAssignment[];
};

const defaultTaskValues: CreateTaskFormState = {
  referenceId: '',
  title: '',
  description: '',
  sprintId: '',
  tribeId: 'all-tribes',
  squadId: 'all-squads',
  status: 'Not Started',
  progress: 0,
  remarks: '',
  impactedApps: [],
  crossFunctionalResourceAssignments: [],
};

function CreateTaskForm({ onClose }: { onClose: () => void }) {
  const { tasks, sprints, applications, resources, tribes, squads, squadResourceAllocations, roles, settings, holidays, isLoading } = useData();
  const [formState, setFormState] = useState<CreateTaskFormState>(defaultTaskValues);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [showOverbookingAlert, setShowOverbookingAlert] = useState(false);
  
  useEffect(() => {
    if (!isLoading && sprints.length > 0) {
        const currentSprint = sprints.find(s => new Date() >= s.startDate && new Date() <= s.endDate) || sprints[0];
        setFormState(prev => ({ ...defaultTaskValues, sprintId: currentSprint.id}));
    }
  }, [isLoading, sprints]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormState(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
      setFormState(prev => {
        const newState: CreateTaskFormState = { ...prev, [name]: value };
        
        if (name === 'tribeId') {
            newState.squadId = 'all-squads';
        }
        
        if (name === 'sprintId' || name === 'squadId' || name === 'tribeId') {
          newState.impactedApps = newState.impactedApps.map(app => ({...app, resourceAssignments: []}));
          newState.crossFunctionalResourceAssignments = [];
        }
        return newState;
      });
  };
  
  const handleSliderChange = (value: number[]) => {
    setFormState(prev => ({ ...prev, progress: value[0] }));
  }

  const handleImpactedAppChange = (index: number, field: keyof Omit<ImpactedApp, 'resourceAssignments'>, value: any) => {
      setFormState(prev => {
          const newApps = [...prev.impactedApps];
          const currentApp = { ...newApps[index] };
          
          if (field === 'effort') {
            currentApp[field] = parseFloat(value) || 0;
          } else {
            (currentApp as any)[field] = value;
          }

          if (field === 'applicationId') currentApp.resourceAssignments = [];

          newApps[index] = currentApp;
          return { ...prev, impactedApps: newApps };
      });
  };

  const handleAssignmentChange = (index: number, resourceAssignments: ResourceAssignment[]) => {
     setFormState(prev => {
          const newApps = [...prev.impactedApps];
          newApps[index] = { ...newApps[index], resourceAssignments };
          return { ...prev, impactedApps: newApps };
      });
  }

  const handleCrossFunctionalAssignmentChange = (assignments: ResourceAssignment[]) => {
    setFormState(prev => ({ ...prev, crossFunctionalResourceAssignments: assignments }));
  };

  const addImpactedApp = () => {
      setFormState(prev => ({
          ...prev,
          impactedApps: [...prev.impactedApps, { applicationId: '', effortType: 'Implementation', effort: 0, resourceAssignments: [] }]
      }));
  };

  const removeImpactedApp = (index: number) => {
      setFormState(prev => ({
          ...prev,
          impactedApps: prev.impactedApps.filter((_, i) => i !== index)
      }));
  };

  const availableSquads = useMemo(() => {
    if (formState.tribeId === 'all-tribes') return squads;
    return squads.filter(squad => squad.tribeId === formState.tribeId);
  }, [squads, formState.tribeId]);

    const squadCapacity = useMemo(() => {
        if (!formState.sprintId || formState.squadId === 'all-squads' || formState.tribeId === 'all-tribes' || !settings) return null;

        const sprint = sprints.find(s => s.id === formState.sprintId);
        if (!sprint) return null;
        
        const sprintDuration = getBusinessDays(sprint.startDate, sprint.endDate, settings, holidays).length;

        // Calculate Planned Capacity
        const squadResources = squadResourceAllocations
            .filter(alloc => alloc.sprintId === formState.sprintId && alloc.squadId === formState.squadId);
        
        const plannedCapacity = squadResources.reduce((total, alloc) => {
            const percentage = alloc.allocationType === 'Dedicated' ? 100 : alloc.allocationPercentage || 0;
            return total + (sprintDuration * percentage) / 100;
        }, 0);

        // Calculate Booked Capacity
        const bookedCapacity = tasks
            .filter(task => task.sprintId === formState.sprintId && task.squadId === formState.squadId)
            .reduce((total, task) => total + task.estimatedDays, 0);

        return {
            planned: plannedCapacity,
            booked: bookedCapacity,
            available: plannedCapacity - bookedCapacity,
        }
    }, [formState.sprintId, formState.squadId, formState.tribeId, sprints, squadResourceAllocations, tasks, settings, holidays]);
  
  const getResourceDisplayName = (resource: Resource) => {
    const role = roles.find(r => r.id === resource.roleId);
    const app = applications.find(a => a.id === resource.applicationId);
    return `${resource.name} - ${role?.name || 'N/A'} - ${app?.name || 'Cross-App'}`;
  }

    const getResourceCapacity = (resource: Resource) => {
        const sprint = sprints.find(s => s.id === formState.sprintId);
        if (!sprint || !settings) return 0;
        const sprintDuration = getBusinessDays(sprint.startDate, sprint.endDate, settings, holidays).length;

        const allocations = squadResourceAllocations.filter(a => a.sprintId === formState.sprintId && a.resourceId === resource.id);
        const totalPercentage = allocations.reduce((sum, alloc) => {
            if (alloc.allocationType === 'Dedicated') return 100;
            return sum + (alloc.allocationPercentage || 0);
        }, 0);
        return (sprintDuration * Math.min(totalPercentage, 100)) / 100;
    };
    
    const getRemainingCapacity = (resourceId: string): number => {
        const resource = resources.find(r => r.id === resourceId);
        if (!resource) return 0;
        const totalCapacity = getResourceCapacity(resource);
        
        const bookedOnOtherTasks = tasks
            .filter(t => t.sprintId === formState.sprintId)
            .flatMap(t => t.impactedApps || [])
            .flatMap(app => app.resourceAssignments || [])
            .filter(assignment => assignment.resourceId === resourceId)
            .reduce((sum, assignment) => sum + assignment.plannedDays, 0);

        const bookedCrossFunc = tasks
            .filter(t => t.sprintId === formState.sprintId)
            .flatMap(t => t.crossFunctionalResourceAssignments || [])
            .filter(assignment => assignment.resourceId === resourceId)
            .reduce((sum, assignment) => sum + assignment.plannedDays, 0);

        return totalCapacity - bookedOnOtherTasks - bookedCrossFunc;
    };

    const relevantResourcesForTask = useMemo(() => {
        if (!formState.sprintId) return [];
        let relevantResources;

        const squadId = formState.squadId === 'all-squads' ? '' : formState.squadId;
        const tribeId = formState.tribeId === 'all-tribes' ? '' : formState.tribeId;

        if (squadId) {
            const squadResourceIds = new Set(squadResourceAllocations
                .filter(alloc => alloc.sprintId === formState.sprintId && alloc.squadId === squadId)
                .map(alloc => alloc.resourceId));
            relevantResources = resources.filter(res => squadResourceIds.has(res.id));
        } else if (tribeId) {
            const tribeSquadIds = new Set(squads.filter(s => s.tribeId === tribeId).map(s => s.id));
            const tribeResourceIds = new Set(squadResourceAllocations
                .filter(alloc => alloc.sprintId === formState.sprintId && tribeSquadIds.has(alloc.squadId))
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
    }, [formState.sprintId, formState.tribeId, formState.squadId, resources, squadResourceAllocations, squads, roles, applications, settings, holidays]);
    
    const getResourcesForAppDualList = (applicationId: string) => {
      return relevantResourcesForTask.filter(res => res.applicationId === applicationId);
    }
    
    const getResourcesForCrossFunctionalDualList = () => {
      return relevantResourcesForTask.filter(res => !res.applicationId);
    }
  
 const totalEffort = useMemo(() => {
    const appEffort = formState.impactedApps.reduce((sum, app) => sum + app.effort, 0);
    const crossFunctionalEffort = (formState.crossFunctionalResourceAssignments || []).reduce((sum, assignment) => sum + assignment.plannedDays, 0);
    return appEffort + crossFunctionalEffort;
 }, [formState.impactedApps, formState.crossFunctionalResourceAssignments]);
 
 const isOverbooked = squadCapacity && totalEffort > squadCapacity.available;

 const performSave = async () => {
    setIsSubmitting(true);
    try {
      const newTask = {
          referenceId: formState.referenceId || '',
          title: formState.title,
          description: formState.description,
          sprintId: formState.sprintId,
          tribeId: formState.tribeId === 'all-tribes' ? '' : formState.tribeId,
          squadId: formState.squadId === 'all-squads' ? '' : formState.squadId,
          status: formState.status,
          progress: formState.progress,
          remarks: formState.remarks || '',
          impactedApps: formState.impactedApps,
          crossFunctionalResourceAssignments: formState.crossFunctionalResourceAssignments,
          estimatedDays: totalEffort,
          createdAt: new Date(),
          updatedAt: new Date(),
      };
      await addDoc(collection(db, 'tasks'), newTask);
      toast({ title: 'Success', description: 'Task created successfully.' });
      onClose();
    } catch (error) {
        console.error("Error creating task:", error);
        toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
 }

 const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formState.title || !formState.description || !formState.sprintId) {
        toast({ title: 'Error', description: 'Please fill all required fields.', variant: 'destructive' });
        return;
    }
    if (formState.squadId === 'all-squads' || formState.tribeId === 'all-tribes') {
        toast({ title: 'Error', description: 'Please select a specific Tribe and Squad.', variant: 'destructive' });
        return;
    }

    if (formState.referenceId) {
        const existingTask = tasks.find(task => task.referenceId === formState.referenceId);
        if (existingTask) {
            toast({ title: 'Error', description: `A task with Reference ID "${formState.referenceId}" already exists.`, variant: 'destructive' });
            return;
        }
    }
    
    // Validation
    const allAssignments = [
        ...formState.impactedApps.flatMap(app => app.resourceAssignments || []),
        ...(formState.crossFunctionalResourceAssignments || [])
    ];

    for (const app of formState.impactedApps) {
        const totalPlanned = app.resourceAssignments.reduce((sum, a) => sum + a.plannedDays, 0);
        if (totalPlanned > app.effort) {
             toast({ title: 'Validation Error', description: `In app ${applications.find(a=>a.id === app.applicationId)?.name}, total planned days (${totalPlanned}) exceed the app effort (${app.effort}).`, variant: 'destructive'});
             return;
        }
    }

    for (const assignment of allAssignments) {
        if (assignment.plannedDays > getRemainingCapacity(assignment.resourceId)) {
            toast({ title: 'Validation Error', description: `Planned days for a resource exceed its available capacity.`, variant: 'destructive'});
            return;
        }
    }
    
    if(isOverbooked) {
        setShowOverbookingAlert(true);
    } else {
        performSave();
    }
 };


  return (
    <>
    <form onSubmit={handleSubmit} className="grid auto-rows-auto gap-6 p-1 max-h-[80vh] overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="title">Task Title</Label>
                <Input id="title" name="title" placeholder="One line description" required maxLength={200} value={formState.title} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="referenceId">Reference ID</Label>
                <Input id="referenceId" name="referenceId" placeholder="Optional reference ID" maxLength={20} value={formState.referenceId || ''} onChange={handleInputChange} />
            </div>
        </div>
        <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Detailed task content" required maxLength={2000} rows={3} value={formState.description} onChange={handleInputChange} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
                <Label htmlFor="sprintId">Sprint</Label>
                <Select name="sprintId" required onValueChange={(v) => handleSelectChange('sprintId', v)} value={formState.sprintId}>
                    <SelectTrigger><SelectValue placeholder="Select a sprint" /></SelectTrigger>
                    <SelectContent>{sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="tribeId">Tribe</Label>
                <Select name="tribeId" required onValueChange={(v) => handleSelectChange('tribeId', v)} value={formState.tribeId}>
                    <SelectTrigger><SelectValue placeholder="Select a tribe" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all-tribes" disabled>Select a Tribe</SelectItem>
                        {tribes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="squadId">Squad</Label>
                <Select name="squadId" required onValueChange={(v) => handleSelectChange('squadId', v)} value={formState.squadId} disabled={formState.tribeId === 'all-tribes'}>
                    <SelectTrigger><SelectValue placeholder="Select a squad" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all-squads" disabled>Select a Squad</SelectItem>
                        {availableSquads.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
            </div>
        </div>
        {squadCapacity && (
            <Card className="bg-muted/50">
                <CardHeader className="pb-4">
                    <CardTitle className="text-base">Squad Capacity for Sprint</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-around text-center">
                    <div>
                        <p className="text-2xl font-bold">{squadCapacity.planned.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Planned (Days)</p>
                    </div>
                     <div>
                        <p className="text-2xl font-bold">{squadCapacity.booked.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Booked (Days)</p>
                    </div>
                     <div>
                        <p className="text-2xl font-bold">{squadCapacity.available.toFixed(1)}</p>
                        <p className="text-xs text-muted-foreground">Available (Days)</p>
                    </div>
                </CardContent>
                {isOverbooked && (
                    <div className="px-6 pb-4">
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" />
                            <div>
                                <p className="font-semibold">Warning: This task's effort ({totalEffort.toFixed(1)}d) exceeds available capacity ({squadCapacity.available.toFixed(1)}d).</p>
                                <p>Squad will be overbooked by {(totalEffort - squadCapacity.available).toFixed(1)} days.</p>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Input id="status" name="status" required maxLength={20} value={formState.status} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <Label>Progress</Label>
                    <span className="text-sm font-medium">{formState.progress}%</span>
                </div>
                <Slider value={[formState.progress]} onValueChange={handleSliderChange} max={100} step={1} />
            </div>
        </div>

        <div className="space-y-4">
            <h3 className="font-medium">Impacted Apps (Total App Effort: {formState.impactedApps.reduce((sum, app) => sum + app.effort, 0).toFixed(1)} days)</h3>
            <div className="space-y-4">
                {formState.impactedApps.map((impactedApp, index) => {
                    const totalPlanned = impactedApp.resourceAssignments.reduce((sum, a) => sum + a.plannedDays, 0);
                    const effortValidation = totalPlanned > impactedApp.effort;

                    return (
                    <div key={index} className="space-y-4 border rounded-lg p-4 relative">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                              <Label>Application</Label>
                              <Select onValueChange={(v) => handleImpactedAppChange(index, 'applicationId', v)} value={impactedApp.applicationId || ''}>
                                  <SelectTrigger><SelectValue placeholder="Select App" /></SelectTrigger>
                                  <SelectContent>{applications.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                              </Select>
                          </div>
                          <div className="space-y-2">
                              <Label>Effort Type</Label>
                              <Select onValueChange={(v) => handleImpactedAppChange(index, 'effortType', v)} value={impactedApp.effortType || 'Implementation'}>
                                  <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="Implementation">Implementation</SelectItem>
                                      <SelectItem value="Support">Support</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>
                          <div className="space-y-2">
                              <Label>Effort (Days)</Label>
                              <Input type="number" step="0.1" max="9999" placeholder="e.g., 5.5" onChange={(e) => handleImpactedAppChange(index, 'effort', e.target.value)} value={impactedApp.effort || ''} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Assign App-Specific Resources</Label>
                           {effortValidation && (
                            <div className="flex items-center gap-2 text-sm text-destructive font-medium p-2 bg-destructive/10 rounded-md">
                                <AlertCircle className="h-4 w-4"/>
                                <span>Total planned days ({totalPlanned}) exceed app effort ({impactedApp.effort}).</span>
                            </div>
                           )}
                          <DualListbox
                            allResources={getResourcesForAppDualList(impactedApp.applicationId)}
                            selectedAssignments={impactedApp.resourceAssignments || []}
                            onAssignmentChange={(assignments) => handleAssignmentChange(index, assignments)}
                            disabled={!formState.sprintId || !impactedApp.applicationId}
                            getRemainingCapacity={getRemainingCapacity}
                           />
                        </div>

                        {formState.impactedApps.length > 0 && (
                            <div className="absolute top-2 right-2">
                                <Button variant="ghost" size="icon" type="button" onClick={() => removeImpactedApp(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        )}
                    </div>
                )})}
            </div>
            <Button variant="outline" size="sm" type="button" onClick={addImpactedApp}><PlusCircle className="mr-2 h-4 w-4" /> Add another App</Button>
        </div>
        
        <div className="space-y-2">
            <h3 className="font-medium">Assign Cross-Functional Resources</h3>
            <DualListbox
                allResources={getResourcesForCrossFunctionalDualList()}
                selectedAssignments={formState.crossFunctionalResourceAssignments || []}
                onAssignmentChange={handleCrossFunctionalAssignmentChange}
                disabled={!formState.sprintId}
                getRemainingCapacity={getRemainingCapacity}
            />
        </div>

        <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" name="remarks" placeholder="Capture any additional information" maxLength={2000} rows={3} value={formState.remarks || ''} onChange={handleInputChange} />
        </div>
        <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create Task'}
            </Button>
        </DialogFooter>
    </form>
    {showOverbookingAlert && squadCapacity && (
        <AlertDialog open={showOverbookingAlert} onOpenChange={setShowOverbookingAlert}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitleComponent className="flex items-center gap-2"><AlertTriangle className="text-destructive" /> Confirm Over-allocation</AlertDialogTitleComponent>
                    <AlertDialogDescription>
                        This task requires {totalEffort.toFixed(1)} days of effort, but the squad only has {squadCapacity.available.toFixed(1)} days available. Proceeding will overbook the squad by {(totalEffort - squadCapacity.available).toFixed(1)} days.
                        <br/><br/>
                        Are you sure you want to create this task?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={performSave} className="bg-destructive hover:bg-destructive/90">
                         {isSubmitting ? <Loader2 className="animate-spin" /> : 'Proceed Anyway'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )}
    </>
  );
}


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
            .filter(res => !selectedResourceIds.includes(res.id))
            .filter(res => res.displayName.toLowerCase().includes(search.toLowerCase()));
    }, [allResources, selectedResourceIds, search]);

    const selectedResources = useMemo(() => {
        return allResources.filter(res => selectedResourceIds.includes(res.id));
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
        const newAssignments = toMove.map(id => ({ resourceId: id, plannedDays: 0, progress: 0, status: 'Not Started' as const }));
        onAssignmentChange([...(selectedAssignments || []), ...newAssignments]);
        setHighlighted([]);
    };

    const moveAll = () => {
        const newAssignments = availableResources.map(r => ({ resourceId: r.id, plannedDays: 0, progress: 0, status: 'Not Started' as const }));
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
        
        if (plannedDays > remainingCapacity) return;

        const newAssignments = (selectedAssignments || []).map(a => 
            a.resourceId === resourceId ? { ...a, plannedDays } : a
        );
        onAssignmentChange(newAssignments);
    };

    if (disabled) {
        return (
            <div className="text-center text-sm text-muted-foreground border rounded-lg p-4 h-64 flex items-center justify-center">
                Please select a Sprint to enable resource assignment.
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
                                   Max: {getRemainingCapacity(assignment.resourceId).toFixed(1)}d
                               </p>
                            </li>
                        )})}
                    </ul>
                </ScrollArea>
            </div>
        </div>
    );
}

const KANBAN_COLUMNS = ['Not Started', 'In Progress', 'Completed'];

const KanbanCardWrapper = forwardRef<HTMLDivElement, { task: Task }>(({ task, ...props }, ref) => (
    <div ref={ref} {...props}>
        <KanbanCard task={task} />
    </div>
));
KanbanCardWrapper.displayName = 'KanbanCardWrapper';

function KanbanBoard({ tasks, onTaskStatusChange }: { tasks: Task[], onTaskStatusChange: (taskId: string, newStatus: string) => void }) {
    const [activeTask, setActiveTask] = useState<Task | null>(null);

    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 8,
        },
      }),
      useSensor(KeyboardSensor, {})
    );
    
    function handleDragStart(event: DragStartEvent) {
        const { active } = event;
        const task = tasks.find(t => t.id === active.id);
        if (task) {
          setActiveTask(task);
        }
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveTask(null);
        const { active, over } = event;
        if (over && KANBAN_COLUMNS.includes(over.id as string)) {
            const taskId = active.id as string;
            const newStatus = over.id as string;
            
            const task = tasks.find(t => t.id === taskId);
            
            // This is a top-level status change, so we check the existing top-level status
            const { overallStatus } = calculateOverallProgress(task!);
            if (task && overallStatus !== newStatus) {
                onTaskStatusChange(taskId, newStatus);
            }
        }
    }

    return (
        <DndContext 
            sensors={sensors}
            onDragStart={handleDragStart} 
            onDragEnd={handleDragEnd} 
            collisionDetection={rectIntersection}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-1">
                {KANBAN_COLUMNS.map(status => {
                     const columnTasks = tasks.filter(task => {
                        const { overallStatus } = calculateOverallProgress(task);
                        return overallStatus === status;
                    });
                    return (
                        <KanbanColumn key={status} status={status} tasks={columnTasks} />
                    )
                })}
            </div>
            <DragOverlay>
                {activeTask ? <KanbanCard task={activeTask} /> : null}
            </DragOverlay>
        </DndContext>
    );
}

function KanbanColumn({ status, tasks }: { status: string, tasks: Task[] }) {
    const { setNodeRef } = useSortable({ id: status, data: { type: 'column' } });
    const count = tasks.length;
    
    return (
        <div ref={setNodeRef} className="flex flex-col bg-muted/50 rounded-lg">
            <div className="p-3 font-semibold text-center border-b sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                {status} ({count})
            </div>
            <ScrollArea className="flex-grow p-2">
                 <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {tasks.map(task => (
                            <KanbanCardWrapper key={task.id} task={task} />
                        ))}
                        {count === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No tasks</div>}
                    </div>
                 </SortableContext>
            </ScrollArea>
        </div>
    );
}

function KanbanCard({ task }: { task: Task }) {
    const { applications } = useData();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
      } = useSortable({ id: task.id, data: { type: 'task', task } });
    
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 999 : 'auto',
    };

    const { overallProgress } = calculateOverallProgress(task);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="bg-card p-3 rounded-lg border shadow-sm touch-none"
        >
             <div {...attributes} {...listeners} className="cursor-grab">
                <div className="flex justify-between items-start gap-2">
                    <Link href={`/dashboard/tasks/${task.id}`} className="font-medium text-sm hover:underline pr-4">
                        {task.title}
                    </Link>
                    <span className="flex-shrink-0 text-xs text-muted-foreground pt-0.5">{task.referenceId}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {(task.impactedApps || []).map(ia => applications.find(a => a.id === ia.applicationId)?.name).join(', ')}
                </p>
                <div className="flex items-center justify-between mt-3">
                    <span className="text-xs font-semibold">{task.estimatedDays.toFixed(1)}d</span>
                    <Progress value={overallProgress} className="w-20 h-2" />
                </div>
            </div>
        </div>
    );
}

const calculateOverallProgress = (task: Task) => {
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
    const overallProgress = totalPlannedDays > 0 ? Math.round(weightedProgress / totalPlannedDays) : 0;
    
    let overallStatus: TaskStatus;
    if (overallProgress === 100) {
        overallStatus = 'Completed';
    } else if (overallProgress > 0) {
        overallStatus = 'In Progress';
    } else {
        overallStatus = 'Not Started';
    }

    return { overallStatus, overallProgress };
};


export function TaskManagement() {
  const { tasks: allTasks, sprints, applications, tribes, squads, isLoading } = useData();
  const { isManagerOrAdmin } = useAuth();
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [tasksToDelete, setTasksToDelete] = useState<string[]>([]);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("list");

  // Filters
  const [selectedSprint, setSelectedSprint] = useState('all-sprints');
  const [selectedTribe, setSelectedTribe] = useState('all-tribes');
  const [selectedSquad, setSelectedSquad] = useState('all-squads');
  const [freeTextFilter, setFreeTextFilter] = useState('');
  
  const { toast } = useToast();
  const canEdit = isManagerOrAdmin();

  const filteredSquads = useMemo(() => {
    if (selectedTribe === 'all-tribes') return squads;
    return squads.filter(s => s.tribeId === selectedTribe);
  }, [squads, selectedTribe]);

  useEffect(() => {
    if (selectedTribe === 'all-tribes') setSelectedSquad('all-squads');
  }, [selectedTribe]);

  const tasks = useMemo(() => {
      return allTasks.filter(task => {
          if (selectedSprint !== 'all-sprints' && task.sprintId !== selectedSprint) return false;
          if (selectedTribe !== 'all-tribes' && task.tribeId !== selectedTribe) return false;
          if (selectedSquad !== 'all-squads' && task.squadId !== selectedSquad) return false;

          if (freeTextFilter) {
              const lowerCaseFilter = freeTextFilter.toLowerCase();
              const sprint = sprints.find(s => s.id === task.sprintId);
              const tribe = tribes.find(t => t.id === task.tribeId);
              const squad = squads.find(s => s.id === task.squadId);
              return (
                  task.title.toLowerCase().includes(lowerCaseFilter) ||
                  (task.referenceId || '').toLowerCase().includes(lowerCaseFilter) ||
                  (sprint?.name || '').toLowerCase().includes(lowerCaseFilter) ||
                  (tribe?.name || '').toLowerCase().includes(lowerCaseFilter) ||
                  (squad?.name || '').toLowerCase().includes(lowerCaseFilter)
              );
          }
          return true;
      });
  }, [allTasks, selectedSprint, selectedTribe, selectedSquad, freeTextFilter, sprints, tribes, squads]);

  const resetFilters = () => {
      setSelectedSprint('all-sprints');
      setSelectedTribe('all-tribes');
      setSelectedSquad('all-squads');
      setFreeTextFilter('');
  }

  const handleCreateClick = () => {
    setIsCreateFormOpen(true);
  }
  
  const handleDeleteClick = (task: Task) => {
      setTasksToDelete([task.id]);
      setIsDeleteAlertOpen(true);
  }

  const handleMultiDeleteClick = () => {
      if (selectedRowIds.length === 0) return;
      setTasksToDelete(selectedRowIds);
      setIsDeleteAlertOpen(true);
  }
  
  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    if (!canEdit) {
      toast({ title: 'Permission Denied', description: 'You do not have permission to change task status.', variant: 'destructive'});
      return;
    }
    const task = tasks.find(t => t.id === taskId);
     if (task) {
      const taskRef = doc(db, "tasks", taskId);
      
      // This is a bulk update from the Kanban view. Update all sub-items.
      const updatedTask = JSON.parse(JSON.stringify(task)) as Task;
      const newProgressValue = newStatus === 'Completed' ? 100 : (newStatus === 'Not Started' ? 0 : 50); // Default to 50% for In Progress
      const newAssignmentStatus = newStatus === 'Completed' ? 'Completed' : (newStatus === 'Not Started' ? 'Not Started' : 'In Progress');

      updatedTask.impactedApps.forEach(app => {
          app.resourceAssignments.forEach(res => {
              res.progress = newProgressValue;
              res.status = newAssignmentStatus;
          });
      });

      if (updatedTask.crossFunctionalResourceAssignments) {
          updatedTask.crossFunctionalResourceAssignments.forEach(res => {
              res.progress = newProgressValue;
              res.status = newAssignmentStatus;
          });
      }

      // Recalculate overall task progress and status based on updated assignments
      const allAssignments = [
          ...(updatedTask.impactedApps || []).flatMap(app => app.resourceAssignments || []),
          ...(updatedTask.crossFunctionalResourceAssignments || [])
      ].filter(a => a && a.plannedDays > 0);

      let calculatedOverallProgress = 0;
      let calculatedOverallStatus: TaskStatus = 'Not Started';

      if (allAssignments.length > 0) {
          const totalPlannedDays = allAssignments.reduce((sum, a) => sum + a.plannedDays, 0);
          const weightedProgress = allAssignments.reduce((sum, a) => sum + (a.plannedDays * (a.progress || 0)), 0);
          calculatedOverallProgress = totalPlannedDays > 0 ? Math.round(weightedProgress / totalPlannedDays) : 0;
          
          if (allAssignments.every(a => (a.status || 'Not Started') === 'Completed')) {
              calculatedOverallStatus = 'Completed';
          } else if (allAssignments.some(a => (a.status || 'Not Started') === 'In Progress' || (a.progress || 0) > 0)) {
              calculatedOverallStatus = 'In Progress';
          } else {
              calculatedOverallStatus = 'Not Started';
          }
      } else {
          calculatedOverallStatus = newStatus as TaskStatus; // Fallback to newStatus if no assignments
          calculatedOverallProgress = newProgressValue; // Fallback to newProgressValue if no assignments
      }

      try {
        await updateDoc(taskRef, { 
          status: calculatedOverallStatus, 
          progress: calculatedOverallProgress,
          impactedApps: updatedTask.impactedApps,
          crossFunctionalResourceAssignments: updatedTask.crossFunctionalResourceAssignments,
          updatedAt: new Date(),
        });
        toast({ title: 'Success', description: `Task status updated to ${newStatus}.` });
    } catch (error: any) {
        toast({ title: 'Error', description: 'Failed to update task status.', variant: 'destructive'});
      }
    }
};
  
  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
        const deletePromises = tasksToDelete.map(id => deleteDoc(doc(db, "tasks", id)));
        await Promise.all(deletePromises);
        toast({ title: 'Success', description: `${tasksToDelete.length} task(s) deleted.` });
    } catch (error) {
        toast({ title: 'Error', description: 'Failed to delete tasks.', variant: 'destructive' });
    } finally {
        setIsDeleting(false);
        setIsDeleteAlertOpen(false);
        setTasksToDelete([]);
        setSelectedRowIds([]);
    }
  }

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
      if (checked === true) {
        setSelectedRowIds(tasks.map(t => t.id));
      } else {
        setSelectedRowIds([]);
      }
  };

  const handleSelectRow = (taskId: string, checked: boolean) => {
      setSelectedRowIds(prev => checked ? [...prev, taskId] : prev.filter(id => id !== taskId));
  };

  useEffect(() => {
    setSelectedRowIds([]);
  }, [tasks]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  const numSelected = selectedRowIds.length;
  const rowCount = tasks.length;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Card>
          <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-headline">Project Tasks</CardTitle>
              <CardDescription>
                An overview of all tasks planned for your project.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <TabsList>
                  <TabsTrigger value="list">List</TabsTrigger>
                  <TabsTrigger value="board">Board</TabsTrigger>
                </TabsList>
                {canEdit && <Button onClick={handleCreateClick} size="sm"><PlusCircle className="mr-2 h-4 w-4"/>Create Task</Button>}
            </div>
          </CardHeader>
          <CardContent>
            <Collapsible className="mb-4">
                <CollapsibleTrigger asChild>
                    <Button variant="outline" size="sm">Filter Tasks</Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">
                     <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Select value={selectedSprint} onValueChange={setSelectedSprint}>
                                <SelectTrigger><SelectValue placeholder="Filter by Sprint..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all-sprints">All Sprints</SelectItem>
                                    {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                             <Select value={selectedTribe} onValueChange={setSelectedTribe}>
                                <SelectTrigger><SelectValue placeholder="Filter by Tribe..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all-tribes">All Tribes</SelectItem>
                                    {tribes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={selectedSquad} onValueChange={setSelectedSquad} disabled={selectedTribe === 'all-tribes'}>
                                <SelectTrigger><SelectValue placeholder="Filter by Squad..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all-squads">All Squads in Tribe</SelectItem>
                                    {filteredSquads.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Button variant="ghost" onClick={resetFilters} className="self-end"><X className="mr-2" />Clear</Button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search tasks by title, ID, or team..."
                                value={freeTextFilter}
                                onChange={(e) => setFreeTextFilter(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
            
            <TabsContent value="list">
              <div className="flex items-center gap-2 my-4">
                  {canEdit && numSelected > 0 && (
                      <Button variant="destructive" size="sm" onClick={handleMultiDeleteClick}>
                          <Trash2 className="mr-2 h-4 w-4"/>
                          Delete ({numSelected})
                      </Button>
                  )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    {canEdit && (
                        <TableHead className="w-[40px]">
                        <Checkbox
                            checked={rowCount > 0 && numSelected === rowCount ? true : (numSelected > 0 ? 'indeterminate' : false)}
                            onCheckedChange={(checked) => handleSelectAll(checked)}
                            aria-label="Select all"
                        />
                        </TableHead>
                    )}
                    <TableHead>Task ID</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead className="hidden lg:table-cell">Tribe/Squad</TableHead>
                    <TableHead className="hidden md:table-cell">Sprint</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="hidden md:table-cell text-right">Effort (Days)</TableHead>
                    {canEdit && <TableHead><span className="sr-only">Actions</span></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const sprint = sprints.find((s) => s.id === task.sprintId);
                    const tribe = tribes.find((t) => t.id === task.tribeId);
                    const squad = squads.find((s) => s.id === task.squadId);
                    const isSelected = selectedRowIds.includes(task.id);

                    const { overallStatus, overallProgress } = calculateOverallProgress(task);

                    return (
                      <TableRow key={task.id} data-state={canEdit && isSelected ? "selected" : undefined}>
                        {canEdit && (
                            <TableCell>
                            <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => handleSelectRow(task.id, !!checked)}
                                aria-label={`Select task ${task.title}`}
                            />
                            </TableCell>
                        )}
                        <TableCell className="font-mono text-xs text-muted-foreground">{task.referenceId}</TableCell>
                        <TableCell>
                          <Link href={`/dashboard/tasks/${task.id}`} className="font-medium hover:underline">{task.title}</Link>
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {(task.impactedApps || []).map(ia => applications.find(a => a.id === ia.applicationId)?.name).join(', ')}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="font-medium">{tribe?.name || '-'}</div>
                          <div className="text-sm text-muted-foreground">{squad?.name || '-'}</div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{sprint?.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={getStatusBadgeVariant(overallStatus)}>{overallStatus}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                              <Progress value={overallProgress} className="w-24" />
                              <span className="text-sm text-muted-foreground">{overallProgress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-right">{task.estimatedDays.toFixed(2)}</TableCell>
                        {canEdit && (
                            <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => handleDeleteClick(task)} className="text-destructive"><Trash2 className="mr-2"/>Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="board">
                <KanbanBoard tasks={tasks} onTaskStatusChange={handleTaskStatusChange} />
            </TabsContent>
          </CardContent>

           <Dialog open={isCreateFormOpen} onOpenChange={setIsCreateFormOpen}>
            <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                <DialogTitle className="font-headline">Create New Task</DialogTitle>
                <DialogDescription>
                  Fill in the details to add a new task.
                </DialogDescription>
              </DialogHeader>
              <CreateTaskForm onClose={() => setIsCreateFormOpen(false)} />
            </DialogContent>
          </Dialog>
          
          <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitleComponent>Are you absolutely sure?</AlertDialogTitleComponent>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete {tasksToDelete.length > 1 ? `${tasksToDelete.length} tasks` : 'this task'}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? <Loader2 className="animate-spin" /> : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
          </AlertDialog>
        </Card>
    </Tabs>
  );
}
