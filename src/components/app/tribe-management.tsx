'use client';
import { useEffect, useRef, useState } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, deleteDoc, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import type { Tribe, Squad } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/lib/auth';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Loader2, PlusCircle, Users, Users2, Trash2 } from 'lucide-react';
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

function SubmitButton({ text, isSubmitting }: { text: string; isSubmitting: boolean; }) {
  return (
    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
      {isSubmitting ? (
        <Loader2 className="animate-spin" />
      ) : (
        <>
          <PlusCircle className="mr-2 h-4 w-4" /> {text}
        </>
      )}
    </Button>
  );
}

function DeleteSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <AlertDialogAction disabled={isSubmitting}>
      {isSubmitting ? <Loader2 className="animate-spin" /> : 'Delete'}
    </AlertDialogAction>
  );
}

export function TribeManagement() {
  const { toast } = useToast();
  const { tribes, squads, isLoading } = useData();
  const { isManagerOrAdmin } = useAuth();
  const addTribeFormRef = useRef<HTMLFormElement>(null);
  
  const canEdit = isManagerOrAdmin();

  const [isSubmittingTribe, setIsSubmittingTribe] = useState(false);
  const [isSubmittingSquad, setIsSubmittingSquad] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'tribe' | 'squad', data: Tribe | Squad} | null>(null);

  const handleAddTribe = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingTribe(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    const tribesRef = collection(db, 'tribes');
    const q = query(tribesRef, where('name', '==', name));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      toast({ title: 'Error', description: 'A tribe with this name already exists.', variant: 'destructive' });
      setIsSubmittingTribe(false);
      return;
    }

    try {
      await addDoc(tribesRef, { name });
      toast({ title: 'Success', description: 'Tribe added successfully.' });
      addTribeFormRef.current?.reset();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmittingTribe(false);
    }
  };

  const handleAddSquad = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsSubmittingSquad(true);
      const form = e.currentTarget;
      const formData = new FormData(form);
      const name = formData.get('name') as string;
      const tribeId = formData.get('tribeId') as string;
      
      const squadsRef = collection(db, 'squads');
      const q = query(squadsRef, where('name', '==', name), where('tribeId', '==', tribeId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        toast({ title: 'Error', description: 'A squad with this name already exists in this tribe.', variant: 'destructive' });
        setIsSubmittingSquad(false);
        return;
      }
      
      try {
        await addDoc(squadsRef, { name, tribeId });
        toast({ title: 'Success', description: 'Squad added successfully.' });
        form.reset();
      } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive'});
      } finally {
        setIsSubmittingSquad(false);
      }
  };

  const handleDeleteClick = (type: 'tribe' | 'squad', data: Tribe | Squad) => {
    setItemToDelete({ type, data });
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    const { type, data } = itemToDelete;

    try {
        if (type === 'tribe') {
            const batch = writeBatch(db);
            const tribeRef = doc(db, 'tribes', data.id);
            batch.delete(tribeRef);

            const squadsQuery = query(collection(db, 'squads'), where('tribeId', '==', data.id));
            const squadsSnapshot = await getDocs(squadsQuery);
            squadsSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            toast({ title: 'Success', description: 'Tribe and its squads deleted.' });
        } else { // type === 'squad'
            await deleteDoc(doc(db, 'squads', data.id));
            toast({ title: 'Success', description: 'Squad deleted.' });
        }
    } catch (error: any) {
         toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
    }
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Add New Tribe</CardTitle>
            <CardDescription>
              Create a new tribe to organize your squads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              ref={addTribeFormRef}
              onSubmit={handleAddTribe}
              className="flex flex-col sm:flex-row items-end gap-4"
            >
              <div className="w-full">
                <Label htmlFor="tribe-name">Tribe Name</Label>
                <Input
                  id="tribe-name"
                  name="name"
                  placeholder="e.g., Core Platform"
                  required
                />
              </div>
              <SubmitButton text="Add Tribe" isSubmitting={isSubmittingTribe} />
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Tribes & Squads</CardTitle>
          <CardDescription>Manage your organizational structure.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full" defaultValue={tribes.map(t => t.id)}>
            {tribes.map((tribe) => (
              <AccordionItem value={tribe.id} key={tribe.id}>
                <AccordionTrigger className="text-lg font-medium hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Users2 className="h-5 w-5 text-primary" />
                    <span>{tribe.name}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pl-4">
                  <div className="flex items-center justify-between mb-4">
                     <p className="text-muted-foreground">Squads within {tribe.name}</p>
                     {canEdit && (
                       <Button variant="ghost" size="icon" onClick={() => handleDeleteClick('tribe', tribe)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                       </Button>
                     )}
                  </div>
                  <ul className="space-y-3 mb-6">
                    {squads
                      .filter((squad) => squad.tribeId === tribe.id)
                      .map((squad) => (
                        <li key={squad.id} className="flex items-center justify-between rounded-md border p-3">
                            <div className="flex items-center gap-3">
                               <Users className="h-5 w-5 text-muted-foreground" />
                               <span>{squad.name}</span>
                            </div>
                           {canEdit && (
                             <Button variant="ghost" size="icon" onClick={() => handleDeleteClick('squad', squad)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                             </Button>
                           )}
                        </li>
                      ))}
                  </ul>
                   {canEdit && (
                    <form 
                          onSubmit={handleAddSquad} 
                          className="flex flex-col sm:flex-row items-end gap-4 rounded-lg border p-4"
                      >
                        <input type="hidden" name="tribeId" value={tribe.id} />
                        <div className="w-full">
                          <Label htmlFor={`squad-name-${tribe.id}`}>New Squad Name</Label>
                          <Input id={`squad-name-${tribe.id}`} name="name" placeholder="e.g., Frontend Team" required />
                        </div>
                        <SubmitButton text="Add Squad" isSubmitting={isSubmittingSquad}/>
                    </form>
                   )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {itemToDelete?.type} "{itemToDelete?.data.name}". 
              {itemToDelete?.type === 'tribe' && ' All squads within this tribe will also be deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
             <div onClick={handleDelete}>
                <DeleteSubmitButton isSubmitting={isDeleting} />
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
