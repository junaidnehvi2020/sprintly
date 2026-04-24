
'use client';
import { useEffect, useRef, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Role } from '@/lib/types';
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
import { Loader2, PlusCircle, Shield, Trash2 } from 'lucide-react';
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

function AddSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
      {isSubmitting ? <Loader2 className="animate-spin" /> : <><PlusCircle className="mr-2 h-4 w-4" /> Add Role</>}
    </Button>
  );
}

function DeleteSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
    return (
        <AlertDialogAction onClick={() => {}} disabled={isSubmitting}>
             {isSubmitting ? <Loader2 className="animate-spin" /> : 'Delete'}
        </AlertDialogAction>
    )
}

export function RoleManagement() {
  const { toast } = useToast();
  const { roles, resources, isLoading } = useData();
  const { isManagerOrAdmin } = useAuth();
  const canEdit = isManagerOrAdmin();
  const addFormRef = useRef<HTMLFormElement>(null);

  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleAddRole = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingAdd(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;

    if (!name) {
      toast({ title: 'Error', description: 'Role name is required.', variant: 'destructive' });
      setIsSubmittingAdd(false);
      return;
    }

    const rolesRef = collection(db, 'roles');
    const q = query(rolesRef, where('name', '==', name));
    
    try {
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        toast({ title: 'Error', description: 'A role with this name already exists.', variant: 'destructive' });
        return;
      }
      
      await addDoc(rolesRef, { name });
      toast({ title: 'Success', description: 'Role added successfully.' });
      addFormRef.current?.reset();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleDeleteClick = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteDialogOpen(true);
  };
  
  async function handleDelete() {
    if (!selectedRole) return;

    setIsSubmittingDelete(true);
    try {
      await deleteDoc(doc(db, "roles", selectedRole.id));
      toast({ title: 'Success', description: `Role "${selectedRole.name}" deleted.`});
      setIsDeleteDialogOpen(false);
      setSelectedRole(null);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to delete role.', variant: 'destructive' });
    } finally {
      setIsSubmittingDelete(false);
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
                <CardTitle className="font-headline">Add New Role</CardTitle>
                <CardDescription>
                  Create a new role to assign resources to.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={addFormRef} onSubmit={handleAddRole} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Role Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., QA Engineer"
                      required
                      disabled={isSubmittingAdd}
                    />
                  </div>
                  <AddSubmitButton isSubmitting={isSubmittingAdd} />
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        <div className={canEdit ? "lg:col-span-2" : "lg:col-span-3"}>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Project Roles</CardTitle>
              <CardDescription>
                A list of all roles in your project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Shield className="inline-block h-4 w-4 mr-1" /> Name</TableHead>
                    {canEdit && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => {
                    const isRoleInUse = resources.some(r => r.roleId === role.id);
                    return (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                             <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-block">
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(role)} disabled={isRoleInUse}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TooltipTrigger>
                                {isRoleInUse && (
                                  <TooltipContent>
                                    <p>Cannot delete role while it is assigned to a resource.</p>
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
                  This action cannot be undone. This will permanently delete the role "{selectedRole?.name}".
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
        )}
      </div>
    </TooltipProvider>
  );
}