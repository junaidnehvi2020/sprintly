'use client';
import { useEffect, useRef, useState } from 'react';
import type { Sprint } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/hooks/use-data';
import { format } from 'date-fns';
import { db } from '@/lib/firebase/config';
import { addDoc, collection, deleteDoc, doc, updateDoc, getDocs, query, where } from 'firebase/firestore';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  PlusCircle,
  Trash2,
  FilePenLine,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Clock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';

function SubmitButton({ isEditing, isSubmitting }: { isEditing: boolean, isSubmitting: boolean }) {
  return (
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? (
        <Loader2 className="animate-spin" />
      ) : isEditing ? (
        'Save Changes'
      ) : (
        <>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Sprint
        </>
      )}
    </Button>
  );
}

function DeleteSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <AlertDialogAction onClick={() => {}} disabled={isSubmitting}>
      {isSubmitting ? <Loader2 className="animate-spin" /> : 'Delete'}
    </AlertDialogAction>
  );
}

export function SprintManagement() {
  const { toast } = useToast();
  const { sprints, isLoading } = useData();
  const { isManagerOrAdmin } = useAuth();
  const canEdit = isManagerOrAdmin();
  const formRef = useRef<HTMLFormElement>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(null);
  
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const handleAddSprint = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canEdit) return;

    setIsSubmittingAdd(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const startDateStr = formData.get('startDate') as string;
    const endDateStr = formData.get('endDate') as string;

    if (!name || !startDateStr || !endDateStr) {
        toast({ title: 'Error', description: 'All fields are required.', variant: 'destructive' });
        setIsSubmittingAdd(false);
        return;
    }

    const sprintsRef = collection(db, 'sprints');
    const q = query(sprintsRef, where('name', '==', name));

    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            toast({ title: 'Error', description: 'A sprint with this name already exists.', variant: 'destructive' });
            return;
        }

        await addDoc(sprintsRef, {
            name,
            startDate: new Date(startDateStr),
            endDate: new Date(endDateStr),
        });

        toast({ title: 'Success', description: 'Sprint added successfully.'});
        formRef.current?.reset();
        setStartDate(undefined);
        setEndDate(undefined);
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsSubmittingAdd(false);
    }
  }


  const handleEditClick = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (sprint: Sprint) => {
    setSelectedSprint(sprint);
    setIsDeleteDialogOpen(true);
  };
  
  async function handleDelete() {
    if (!canEdit || !selectedSprint) return;
    setIsSubmittingDelete(true);
    try {
        await deleteDoc(doc(db, 'sprints', selectedSprint.id));
        toast({ title: 'Success', description: 'Sprint deleted.' });
        setIsDeleteDialogOpen(false);
        setSelectedSprint(null);
    } catch (error: any) {
        toast({ title: 'Error', description: 'Failed to delete sprint.', variant: 'destructive' });
    } finally {
        setIsSubmittingDelete(false);
    }
  }

  const handleUpdateSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedSprint(null);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {canEdit && (
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Add New Sprint</CardTitle>
              <CardDescription>
                Define a new sprint with a name and date range.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form ref={formRef} onSubmit={handleAddSprint} className="space-y-4">
                <div>
                  <Label htmlFor="name">Sprint Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="e.g., Sprint 3 (Q4)"
                    required
                    disabled={isSubmittingAdd}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <input type="hidden" name="startDate" value={startDate?.toISOString() || ''} />
                    <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !startDate && 'text-muted-foreground'
                          )}
                           disabled={isSubmittingAdd}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? (
                            format(startDate, 'dd-MMM-yyyy')
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => {
                            setStartDate(date);
                            setIsStartOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <input type="hidden" name="endDate" value={endDate?.toISOString() || ''} />
                    <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !endDate && 'text-muted-foreground'
                          )}
                           disabled={isSubmittingAdd}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? (
                            format(endDate, 'dd-MMM-yyyy')
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => {
                            setEndDate(date);
                            setIsEndOpen(false);
                          }}
                          month={startDate}
                          disabled={{ before: startDate }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <SubmitButton isEditing={false} isSubmitting={isSubmittingAdd} />
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className={canEdit ? "lg:col-span-2" : "lg:col-span-3"}>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Project Sprints</CardTitle>
            <CardDescription>
              A list of all sprints for this project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Clock className="mr-1 inline-block h-4 w-4" /> Name
                  </TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sprints
                  .slice()
                  .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
                  .map((sprint) => {
                  return (
                    <TableRow key={sprint.id}>
                      <TableCell className="font-medium">
                        {sprint.name}
                      </TableCell>
                      <TableCell>{format(sprint.startDate, 'dd-MMM-yyyy')}</TableCell>
                      <TableCell>{format(sprint.endDate, 'dd-MMM-yyyy')}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onSelect={() => handleEditClick(sprint)}
                              >
                                <FilePenLine className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => handleDeleteClick(sprint)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      {canEdit && (
        <>
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Sprint</DialogTitle>
                <DialogDescription>
                  Update the details for {selectedSprint?.name}.
                </DialogDescription>
              </DialogHeader>
              {selectedSprint && (
                <SprintEditForm 
                    sprint={selectedSprint} 
                    onSuccess={handleUpdateSuccess} 
                />
              )}
            </DialogContent>
          </Dialog>

          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  sprint "{selectedSprint?.name}".
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <div onClick={handleDelete}>
                  <DeleteSubmitButton isSubmitting={isSubmittingDelete} />
                </div>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}


function SprintEditForm({ sprint, onSuccess }: { sprint: Sprint, onSuccess: () => void }) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date | undefined>(sprint.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(sprint.endDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const startDateStr = formData.get('startDate') as string;
    const endDateStr = formData.get('endDate') as string;

    if (!name || !startDateStr || !endDateStr) {
        toast({ title: 'Error', description: 'All fields are required.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }
    
    const sprintRef = doc(db, 'sprints', sprint.id);

    try {
        await updateDoc(sprintRef, {
            name,
            startDate: new Date(startDateStr),
            endDate: new Date(endDateStr),
        });
        toast({ title: 'Success', description: 'Sprint updated successfully.'});
        onSuccess();
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  }
  
  return (
    <form onSubmit={handleUpdate} className="space-y-4">
        <input type="hidden" name="id" value={sprint.id} />
        <div>
            <Label htmlFor="edit-name">Sprint Name</Label>
            <Input id="edit-name" name="name" defaultValue={sprint.name} required disabled={isSubmitting} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
                <Label htmlFor="startDate">Start Date</Label>
                 <input type="hidden" name="startDate" value={startDate?.toISOString() || ''} />
                  <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? (
                          format(startDate, 'dd-MMM-yyyy')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                            setStartDate(date);
                            setIsStartOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
            </div>
            <div>
                <Label htmlFor="endDate">End Date</Label>
                <input type="hidden" name="endDate" value={endDate?.toISOString() || ''} />
                 <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                         disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? (
                          format(endDate, 'dd-MMM-yyyy')
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                            setEndDate(date);
                            setIsEndOpen(false);
                        }}
                        month={startDate}
                        disabled={{ before: startDate }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
            </div>
        </div>
        <div className="flex justify-end pt-4">
            <SubmitButton isEditing={true} isSubmitting={isSubmitting} />
        </div>
    </form>
  );
}
