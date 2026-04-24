'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import type { Sprint, Tribe, Squad, Resource, SquadResourceAllocation, Application, Role } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase/config';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';


import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Trash2, Users, Users2, Clock, Edit, XCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { getBusinessDays } from '@/lib/utils';

const allocationPercentages = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
    return (
        <Button type="submit" disabled={isSubmitting} size="sm">
            {isSubmitting ? <Loader2 className="animate-spin" /> : <><PlusCircle className="mr-2 h-4 w-4" /> Add</>}
        </Button>
    )
}

function RemoveButton({ isSubmitting }: { isSubmitting: boolean }) {
    return (
        <Button variant="ghost" size="icon" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 className="h-4 w-4 text-destructive" />}
        </Button>
    )
}


export function SquadPlanningManagement() {
  const { toast } = useToast();
  const { sprints, tribes, squads, resources, squadResourceAllocations, applications, roles, settings, holidays, isLoading } = useData();
  const { isManagerOrAdmin } = useAuth();
  const canEdit = isManagerOrAdmin();

  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [selectedTribe, setSelectedTribe] = useState<string>('');
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  const initialSprintId = useMemo(() => {
    if (sprints.length > 0) {
        const currentSprint = sprints.find(s => new Date() >= s.startDate && new Date() <= s.endDate);
        return currentSprint ? currentSprint.id : sprints[0].id;
    }
    return '';
  }, [sprints]);
  
  const initialTribeId = useMemo(() => (tribes.length > 0 ? tribes[0].id : ''), [tribes]);

  useEffect(() => {
    if (!isLoading) {
      if (initialSprintId && !selectedSprint) setSelectedSprint(initialSprintId);
      if (initialTribeId && !selectedTribe) setSelectedTribe(initialTribeId);
    }
  }, [isLoading, initialSprintId, selectedSprint, initialTribeId, selectedTribe]);


  const tribeSquads = useMemo(() => {
    return squads.filter(squad => squad.tribeId === selectedTribe);
  }, [squads, selectedTribe]);
  
  const sprintAllocations = useMemo(() => {
    return squadResourceAllocations.filter(alloc => alloc.sprintId === selectedSprint);
  }, [squadResourceAllocations, selectedSprint]);

  const sprintDuration = useMemo(() => {
      const sprint = sprints.find(s => s.id === selectedSprint);
      if (!sprint || !settings) return 0;
      return getBusinessDays(sprint.startDate, sprint.endDate, settings, holidays).length;
  }, [sprints, selectedSprint, settings, holidays]);

  const handleRemove = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canEdit) return;
    const formData = new FormData(e.currentTarget);
    const id = formData.get('id') as string;
    
    setIsRemoving(id);
    try {
        await deleteDoc(doc(db, 'squadResourceAllocations', id));
        toast({ title: 'Success', description: 'Allocation removed.' });
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsRemoving(null);
    }
  }
  
  const getResourceDisplayName = (resource: Resource) => {
    const app = applications.find(a => a.id === resource.applicationId);
    const role = roles.find(r => r.id === resource.roleId);
    return `${resource.name} (${role?.name || 'N/A'})${app ? ` - ${app.name}`: ' - Cross-Application'}`;
  }

  const resetFilters = () => {
    setSelectedSprint(initialSprintId);
    setSelectedTribe(initialTribeId);
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-[56px] sm:top-0 z-10 -mx-4 -mt-4 sm:mx-0 sm:mt-0 sm:pt-4 bg-muted/40 backdrop-blur-lg">
        <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
          <CardHeader>
            <CardTitle className="font-headline">Squad Planning</CardTitle>
            <CardDescription>
              Allocate resources to squads for a selected sprint and tribe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select value={selectedSprint} onValueChange={setSelectedSprint} disabled={!sprints.length}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select a Sprint" />
                </SelectTrigger>
                <SelectContent>
                  {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedTribe} onValueChange={setSelectedTribe} disabled={!tribes.length}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Select a Tribe" />
                </SelectTrigger>
                <SelectContent>
                  {tribes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
               <Button variant="ghost" onClick={resetFilters}>
                  <XCircle className="mr-2 h-4 w-4" /> Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {selectedSprint && selectedTribe ? (
        <Accordion type="multiple" className="w-full pt-4" defaultValue={tribeSquads.map(s => s.id)}>
          {tribeSquads.map(squad => {
            const squadAllocations = sprintAllocations.filter(alloc => alloc.squadId === squad.id);
            
            const getAvailableResources = () => {
                const allocatedInSprint = squadResourceAllocations.reduce((acc, alloc) => {
                    if(alloc.sprintId !== selectedSprint) return acc;

                    if (!acc[alloc.resourceId]) {
                        acc[alloc.resourceId] = { totalPercentage: 0, isDedicated: false, squads: [] };
                    }
                    if (alloc.allocationType === 'Dedicated') {
                        acc[alloc.resourceId].isDedicated = true;
                    }
                    if (alloc.allocationPercentage) {
                        acc[alloc.resourceId].totalPercentage += alloc.allocationPercentage;
                    }
                    (acc[alloc.resourceId].squads as string[]).push(alloc.squadId);
                    return acc;
                }, {} as Record<string, { totalPercentage: number, isDedicated: boolean, squads: string[] }>);

                return resources.filter(res => {
                    const allocation = allocatedInSprint[res.id];
                    if (!allocation) return true; // Not allocated in sprint at all
                    if (allocation.isDedicated) return false; // Already dedicated elsewhere
                    if (allocation.squads.includes(squad.id)) return false; // Already in THIS squad
                    if (allocation.totalPercentage >= 100) return false; // Fully allocated across other squads
                    return true;
                });
            };

            const availableResources = getAvailableResources();
            
            return (
              <AccordionItem value={squad.id} key={squad.id}>
                <AccordionTrigger className="text-lg font-medium hover:no-underline bg-background px-4 rounded-md">
                   <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <span>{squad.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 space-y-4">
                    <ul className="space-y-2">
                        {squadAllocations.map(alloc => {
                            const resource = resources.find(r => r.id === alloc.resourceId);
                            if (!resource) return null;
                            const allocationValue = alloc.allocationType === 'Dedicated' ? 100 : alloc.allocationPercentage || 0;
                            const capacity = (sprintDuration * allocationValue) / 100;
                            return (
                                <li key={alloc.id} className="flex items-center justify-between rounded-md border p-3">
                                    <div>
                                        <p className="font-medium">{getResourceDisplayName(resource)}</p>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Badge variant={alloc.allocationType === 'Dedicated' ? 'default' : 'secondary'}>
                                                {alloc.allocationType}
                                                {alloc.allocationType === 'Shared' && ` (${alloc.allocationPercentage}%)`}
                                            </Badge>
                                            <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/>{capacity.toFixed(1)} days</span>
                                        </div>
                                    </div>
                                    {canEdit && (
                                      <div className="flex items-center">
                                        <AllocationEditForm 
                                              allocation={alloc}
                                              sprintId={selectedSprint}
                                              allAllocations={squadResourceAllocations}
                                        />
                                          <form onSubmit={handleRemove}>
                                              <input type="hidden" name="id" value={alloc.id} />
                                              <RemoveButton isSubmitting={isRemoving === alloc.id} />
                                          </form>
                                      </div>
                                    )}
                                </li>
                            )
                        })}
                        {squadAllocations.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No resources allocated to this squad for this sprint.</p>}
                    </ul>
                    
                    {canEdit && (
                      <AllocationForm 
                          key={`${selectedSprint}-${squad.id}`}
                          sprintId={selectedSprint} 
                          squadId={squad.id} 
                          availableResources={availableResources} 
                          getResourceDisplayName={getResourceDisplayName}
                          allAllocations={squadResourceAllocations}
                      />
                    )}

                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>
      ): (
        <Card>
            <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Please select a sprint and a tribe to see squad allocations.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}

function AllocationForm({ sprintId, squadId, availableResources, getResourceDisplayName, allAllocations }: { sprintId: string, squadId: string, availableResources: Resource[], getResourceDisplayName: (resource: Resource) => string, allAllocations: SquadResourceAllocation[] }) {
    const { toast } = useToast();
    const [allocationType, setAllocationType] = useState<'Dedicated' | 'Shared'>('Dedicated');
    const [selectedResource, setSelectedResource] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    
    const availablePercentage = useMemo(() => {
        if (!selectedResource) return 100;
        const allocatedPercentage = allAllocations
            .filter(a => a.resourceId === selectedResource && a.sprintId === sprintId)
            .reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);
        return 100 - allocatedPercentage;
    }, [selectedResource, allAllocations, sprintId]);
    
    const availablePercentages = allocationPercentages.filter(p => p <= availablePercentage);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const resourceId = formData.get('resourceId') as string;
        const type = formData.get('allocationType') as 'Dedicated' | 'Shared';
        const percentageStr = formData.get('allocationPercentage') as string;

        if (!resourceId) {
            toast({ title: 'Error', description: 'Please select a resource.', variant: 'destructive'});
            setIsSubmitting(false);
            return;
        }

        if (type === 'Shared' && !percentageStr) {
            toast({ title: 'Error', description: 'Shared resources require an allocation percentage.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }

        try {
            await addDoc(collection(db, 'squadResourceAllocations'), {
                sprintId,
                squadId,
                resourceId,
                allocationType: type,
                allocationPercentage: type === 'Shared' ? parseInt(percentageStr, 10) : null,
            });
            toast({ title: 'Success', description: 'Resource allocated successfully.'});
            formRef.current?.reset();
            setSelectedResource('');
            setAllocationType('Dedicated');
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive'});
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form 
            ref={formRef}
            onSubmit={handleSubmit} 
            className="rounded-lg border bg-background p-4 space-y-4"
        >
            <h4 className="font-medium">Add Resource</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                    <Label htmlFor={`resource-${squadId}`}>Resource</Label>
                    <Select name="resourceId" required value={selectedResource} onValueChange={setSelectedResource}>
                        <SelectTrigger id={`resource-${squadId}`}>
                            <SelectValue placeholder="Select a resource" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableResources.length > 0 ? availableResources.map(res => (
                                <SelectItem key={res.id} value={res.id}>
                                    {getResourceDisplayName(res)}
                                </SelectItem>
                            )) : <p className="p-4 text-sm text-muted-foreground">No available resources.</p>}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Allocation Type</Label>
                    <RadioGroup 
                        name="allocationType"
                        value={allocationType}
                        onValueChange={(val: 'Dedicated' | 'Shared') => setAllocationType(val)}
                        className="flex items-center space-x-4"
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Dedicated" id={`dedicated-${squadId}`} disabled={availablePercentage < 100} />
                            <Label htmlFor={`dedicated-${squadId}`} className={availablePercentage < 100 ? 'text-muted-foreground' : ''}>Dedicated</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Shared" id={`shared-${squadId}`} />
                            <Label htmlFor={`shared-${squadId}`}>Shared</Label>
                        </div>
                    </RadioGroup>
                </div>
                {allocationType === 'Shared' && (
                    <div className="space-y-2">
                        <Label htmlFor={`percentage-${squadId}`}>Percentage (Up to {availablePercentage}% available)</Label>
                        <Select name="allocationPercentage" required>
                            <SelectTrigger id={`percentage-${squadId}`}>
                                <SelectValue placeholder="Select %" />
                            </SelectTrigger>
                            <SelectContent>
                                {availablePercentages.length > 0 ? availablePercentages.map(p => (
                                    <SelectItem key={p} value={p.toString()}>{p}%</SelectItem>
                                )) : <p className="p-4 text-sm text-muted-foreground">No allocation available.</p>}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                 <div className="flex justify-end">
                     <SubmitButton isSubmitting={isSubmitting} />
                </div>
            </div>
        </form>
    )
}

function AllocationEditForm({ allocation, sprintId, allAllocations }: { allocation: SquadResourceAllocation; sprintId: string; allAllocations: SquadResourceAllocation[] }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [allocationType, setAllocationType] = useState<'Dedicated' | 'Shared'>(allocation.allocationType);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availablePercentage = useMemo(() => {
        const allocatedPercentage = allAllocations
            .filter(a => a.resourceId === allocation.resourceId && a.sprintId === sprintId && a.id !== allocation.id)
            .reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);
        return 100 - allocatedPercentage;
    }, [allocation, sprintId, allAllocations]);

    const availablePercentages = allocationPercentages.filter(p => p <= availablePercentage);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const type = formData.get('allocationType') as 'Dedicated' | 'Shared';
        const percentageStr = formData.get('allocationPercentage') as string;

        if (type === 'Shared' && !percentageStr) {
            toast({ title: 'Error', description: 'Shared resources require an allocation percentage.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
        }

        const allocationPercentage = type === 'Shared' ? parseInt(percentageStr, 10) : null;

        try {
            const allocRef = doc(db, 'squadResourceAllocations', allocation.id);
            await updateDoc(allocRef, {
                allocationType: type,
                allocationPercentage: allocationPercentage
            });
            toast({ title: 'Success', description: 'Allocation updated successfully.' });
            setIsOpen(false);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Allocation</DialogTitle>
                    <DialogDescription>
                        Update the allocation for this resource in the squad.
                    </DialogDescription>
                </DialogHeader>
                <form id={`edit-alloc-form-${allocation.id}`} onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Allocation Type</Label>
                        <RadioGroup
                            name="allocationType"
                            value={allocationType}
                            onValueChange={(val: 'Dedicated' | 'Shared') => setAllocationType(val)}
                            className="flex items-center space-x-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Dedicated" id={`edit-dedicated-${allocation.id}`} disabled={availablePercentage < 100} />
                                <Label htmlFor={`edit-dedicated-${allocation.id}`} className={availablePercentage < 100 ? 'text-muted-foreground' : ''}>Dedicated</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Shared" id={`edit-shared-${allocation.id}`} />
                                <Label htmlFor={`edit-shared-${allocation.id}`}>Shared</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {allocationType === 'Shared' && (
                        <div className="space-y-2">
                            <Label htmlFor={`edit-percentage-${allocation.id}`}>Percentage (Up to {availablePercentage}% available)</Label>
                            <Select name="allocationPercentage" defaultValue={allocation.allocationPercentage?.toString()}>
                                <SelectTrigger id={`edit-percentage-${allocation.id}`}>
                                    <SelectValue placeholder="Select %" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availablePercentages.map(p => (
                                        <SelectItem key={p} value={p.toString()}>{p}%</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </form>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" form={`edit-alloc-form-${allocation.id}`} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

    