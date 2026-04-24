'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/hooks/use-data';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import type { AccessRole, Permission } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2, PlusCircle, Trash2, KeyRound, Shield, FilePenLine } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
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
import { Textarea } from '../ui/textarea';

const PERMISSION_CATEGORIES: Record<string, Permission[]> = {
    'Pages': [
        'page:dashboard', 'page:my-view', 'page:sprints', 'page:tribes', 'page:squad-planning',
        'page:tasks', 'page:task-view', 'page:resource-view', 'page:resource-calendar',
        'page:reports', 'page:applications', 'page:roles', 'page:resources',
        'page:user-management', 'page:settings', 'page:access-control'
    ],
    'Tasks': ['task:create', 'task:edit', 'task:delete', 'task:assign'],
    'Sprints': ['sprint:create', 'sprint:edit', 'sprint:delete'],
    'Core Data': ['core:applications', 'core:roles', 'core:resources', 'core:tribes', 'core:squads'],
    'Planning': ['planning:squads'],
    'Admin': ['admin:users', 'admin:roles', 'admin:washout'],
};

function RoleForm({ role, onSave, onCancel }: { role?: AccessRole, onSave: (data: Partial<AccessRole>) => Promise<void>, onCancel: () => void }) {
    const [name, setName] = useState(role?.name || '');
    const [description, setDescription] = useState(role?.description || '');
    const [permissions, setPermissions] = useState<Permission[]>(role?.permissions || []);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePermissionChange = (permission: Permission, checked: boolean) => {
        setPermissions(prev => 
            checked ? [...prev, permission] : prev.filter(p => p !== permission)
        );
    }
    
    const handleSelectAll = (category: string, checked: boolean) => {
        const categoryPermissions = PERMISSION_CATEGORIES[category];
        if (checked) {
            setPermissions(prev => [...new Set([...prev, ...categoryPermissions])]);
        } else {
            setPermissions(prev => prev.filter(p => !categoryPermissions.includes(p)));
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onSave({ name, description, permissions });
        setIsSubmitting(false);
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="name">Role Name</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                 <div className="space-y-1.5">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                <h3 className="font-medium text-lg">Permissions</h3>
                <ScrollArea className="h-72 border rounded-md p-4">
                    <div className="space-y-4">
                        {Object.entries(PERMISSION_CATEGORIES).map(([category, perms]) => {
                           const allInCategorySelected = perms.every(p => permissions.includes(p));
                           const someInCategorySelected = perms.some(p => permissions.includes(p));

                           return (
                            <div key={category}>
                                <div className="flex items-center space-x-2 mb-2">
                                     <Checkbox
                                        id={`select-all-${category}`}
                                        checked={allInCategorySelected ? true : (someInCategorySelected ? 'indeterminate' : false)}
                                        onCheckedChange={(checked) => handleSelectAll(category, !!checked)}
                                    />
                                    <Label htmlFor={`select-all-${category}`} className="font-semibold">{category}</Label>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pl-6">
                                    {perms.map(p => (
                                        <div key={p} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={p}
                                                checked={permissions.includes(p)}
                                                onCheckedChange={(checked) => handlePermissionChange(p, !!checked)}
                                            />
                                            <label htmlFor={p} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                {p.split(':')[1]}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                           )
                        })}
                    </div>
                </ScrollArea>
            </div>
            <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Save Role'}
                </Button>
            </DialogFooter>
        </form>
    );
}

export function AccessControlManagement() {
    const { toast } = useToast();
    const { accessRoles, isLoading } = useData();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<AccessRole | undefined>(undefined);
    
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [roleToDelete, setRoleToDelete] = useState<AccessRole | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleOpenForm = (role?: AccessRole) => {
        setSelectedRole(role);
        setIsFormOpen(true);
    }
    
    const handleCloseForm = () => {
        setSelectedRole(undefined);
        setIsFormOpen(false);
    }
    
    const handleSaveRole = async (data: Partial<AccessRole>) => {
        try {
            if (selectedRole?.id) {
                const roleRef = doc(db, 'accessRoles', selectedRole.id);
                await updateDoc(roleRef, data);
                toast({ title: 'Success', description: 'Role updated successfully.' });
            } else {
                await addDoc(collection(db, 'accessRoles'), { ...data, isDefault: false });
                toast({ title: 'Success', description: 'Role created successfully.' });
            }
            handleCloseForm();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive'});
        }
    }
    
    const handleDeleteClick = (role: AccessRole) => {
        setRoleToDelete(role);
        setIsDeleteDialogOpen(true);
    }
    
    const handleDeleteConfirm = async () => {
        if (!roleToDelete) return;
        setIsDeleting(true);
        try {
            const userRolesQuery = query(collection(db, 'userRoles'), where('role', '==', roleToDelete.name));
            const usersWithRole = await getDocs(userRolesQuery);

            if (!usersWithRole.empty) {
                toast({ title: 'Cannot Delete Role', description: 'This role is still assigned to users. Please reassign them first.', variant: 'destructive' });
                setIsDeleting(false);
                setIsDeleteDialogOpen(false);
                return;
            }

            await deleteDoc(doc(db, 'accessRoles', roleToDelete.id));
            toast({ title: 'Success', description: `Role "${roleToDelete.name}" has been deleted.`});
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive'});
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
            setRoleToDelete(null);
        }
    }

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline flex items-center gap-2"><KeyRound />Access Control</CardTitle>
                    <CardDescription>Manage user roles and their permissions across the application.</CardDescription>
                </div>
                <Button onClick={() => handleOpenForm()}><PlusCircle className="mr-2"/>New Role</Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {accessRoles.map(role => (
                        <div key={role.id} className="border rounded-lg p-4 flex justify-between items-center">
                            <div className="space-y-1">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Shield className={role.isDefault ? "text-muted-foreground" : "text-primary"}/> 
                                    {role.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">{role.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleOpenForm(role)}>
                                    <FilePenLine className="mr-2 h-4 w-4" />
                                    Edit
                                </Button>
                                {!role.isDefault && (
                                     <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(role)}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>

             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{selectedRole ? 'Edit' : 'Create'} Role</DialogTitle>
                        <DialogDescription>
                            {selectedRole ? `Update the details and permissions for the "${selectedRole.name}" role.` : 'Define a new access role and set its permissions.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                       <RoleForm 
                            role={selectedRole}
                            onSave={handleSaveRole}
                            onCancel={handleCloseForm}
                       />
                    </div>
                </DialogContent>
            </Dialog>
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the role "{roleToDelete?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                             {isDeleting ? <Loader2 className="animate-spin" /> : 'Confirm Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
