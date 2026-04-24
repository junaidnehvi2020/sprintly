'use client';
import { useRef, useState } from 'react';
import type { Application } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase/config';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';


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
import { Loader2, PlusCircle, Building, Trash2 } from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

function AddSubmitButton({isSubmitting}: {isSubmitting: boolean}) {
  return (
    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
      {isSubmitting ? <Loader2 className="animate-spin" /> : <><PlusCircle className="mr-2 h-4 w-4" /> Add Application</>}
    </Button>
  );
}

function DeleteSubmitButton({isSubmitting}: {isSubmitting: boolean}) {
    return (
        <AlertDialogAction onClick={() => {}} disabled={isSubmitting}>
             {isSubmitting ? <Loader2 className="animate-spin" /> : 'Delete'}
        </AlertDialogAction>
    )
}

export function ApplicationManagement() {
  const { toast } = useToast();
  const { applications, resources, isLoading } = useData();
  const { isManagerOrAdmin } = useAuth();
  const canEdit = isManagerOrAdmin();
  const addFormRef = useRef<HTMLFormElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    if (!name) {
      toast({ title: 'Error', description: 'Application name is required.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    const applicationsRef = collection(db, 'applications');
    const q = query(applicationsRef, where('name', '==', name));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        toast({ title: 'Error', description: 'An application with the same name already exists.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    try {
      await addDoc(applicationsRef, { name });
      toast({ title: 'Success', description: 'Application added successfully.' });
      addFormRef.current?.reset();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleDeleteClick = (application: Application) => {
    setSelectedApplication(application);
    setIsDeleteDialogOpen(true);
  };
  
  async function handleDelete() {
    if (!selectedApplication) return;

    setIsSubmitting(true);
    try {
        await deleteDoc(doc(db, 'applications', selectedApplication.id));
        toast({ title: 'Success', description: 'Application deleted.' });
        setIsDeleteDialogOpen(false);
        setSelectedApplication(null);
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <TooltipProvider>
      <div className="grid gap-6 lg:grid-cols-3">
        {canEdit && (
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="font-headline">Add New Application</CardTitle>
                <CardDescription>
                  Create a new application to assign resources and tasks to.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={addFormRef} onSubmit={handleAddSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Application Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Mobile App v2"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                  <AddSubmitButton isSubmitting={isSubmitting} />
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <div className={canEdit ? "lg:col-span-2" : "lg:col-span-3"}>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Project Applications</CardTitle>
              <CardDescription>
                A list of all applications in your project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Building className="inline-block h-4 w-4 mr-1" /> Name</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => {
                    const isAppInUse = resources.some(r => r.applicationId === application.id);
                    return (
                      <TableRow key={application.id}>
                        <TableCell className="font-medium">{application.name}</TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                  <div className="inline-block">
                                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(application)} disabled={isAppInUse}>
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                  </div>
                              </TooltipTrigger>
                              {isAppInUse && (
                                <TooltipContent>
                                    <p>Cannot delete application while it is assigned to a resource.</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
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
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the application "{selectedApplication?.name}". Any resources or tasks associated with it will need to be reassigned.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <div onClick={handleDelete}>
                    <DeleteSubmitButton isSubmitting={isSubmitting} />
                </div>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

      </div>
    </TooltipProvider>
  );
}