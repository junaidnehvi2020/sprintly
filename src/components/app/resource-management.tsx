'use client';
import { useEffect, useRef, useState } from 'react';
import type { Resource, AuthUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/hooks/use-data';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, doc, updateDoc, deleteDoc, deleteField } from 'firebase/firestore';
import { getAuthUsers } from '@/lib/actions';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, User, Briefcase, Building2, Trash2, FilePenLine, MoreHorizontal, Link2 } from 'lucide-react';
import { Badge } from '../ui/badge';
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

function AddSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
      {isSubmitting ? <Loader2 className="animate-spin" /> : <><PlusCircle className="mr-2 h-4 w-4" /> Add Resource</>}
    </Button>
  );
}

function EditSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <Button type="submit" disabled={isSubmitting}>
      {isSubmitting ? <Loader2 className="animate-spin" /> : 'Save Changes'}
    </Button>
  );
}

function DeleteSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
    return (
        <AlertDialogAction disabled={isSubmitting} onClick={() => {}}>
             {isSubmitting ? <Loader2 className="animate-spin" /> : 'Delete'}
        </AlertDialogAction>
    )
}

function ResourceEditForm({ resource, onSuccess, authUsers }: { resource: Resource; onSuccess: () => void; authUsers: AuthUser[] }) {
    const { resources, roles, applications } = useData();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const linkedUserIds = resources.filter(r => r.id !== resource.id && r.userId).map(r => r.userId);
    const availableUsers = authUsers.filter(u => !linkedUserIds.includes(u.uid));

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const roleId = formData.get('roleId') as string;
        const applicationIdValue = formData.get('applicationId') as string;
        const userIdValue = formData.get('userId') as string;

        const data: { [key: string]: any } = { name, roleId };
        
        if (applicationIdValue && applicationIdValue !== 'none') {
            data.applicationId = applicationIdValue;
        } else {
            data.applicationId = deleteField();
        }

        if (userIdValue && userIdValue !== 'none') {
            data.userId = userIdValue;
        } else {
            data.userId = deleteField();
        }
        
        try {
            const resourceRef = doc(db, 'resources', resource.id);
            await updateDoc(resourceRef, data);
            toast({ title: 'Success', description: 'Resource updated successfully.' });
            onSuccess();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Resource Name</Label>
                <Input id="edit-name" name="name" defaultValue={resource.name} required disabled={isSubmitting} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-roleId">Role</Label>
                    <Select name="roleId" defaultValue={resource.roleId} required disabled={isSubmitting}>
                    <SelectTrigger id="edit-roleId"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-applicationId">Application</Label>
                    <Select name="applicationId" defaultValue={resource.applicationId || 'none'} disabled={isSubmitting}>
                    <SelectTrigger id="edit-applicationId"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None (Cross-Application)</SelectItem>
                        {applications.map((app) => <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>)}
                    </SelectContent>
                    </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-userId">Link to User Account</Label>
                 <Select name="userId" defaultValue={resource.userId || 'none'} disabled={isSubmitting}>
                  <SelectTrigger id="edit-userId"><SelectValue placeholder="Select a user" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Unlinked)</SelectItem>
                    {resource.userId && !availableUsers.some(u => u.uid === resource.userId) && (
                        <SelectItem value={resource.userId} disabled>
                            {authUsers.find(u => u.uid === resource.userId)?.email || 'Current User'}
                        </SelectItem>
                    )}
                    {availableUsers.map((user) => (
                      <SelectItem key={user.uid} value={user.uid}>{user.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end pt-4">
                <EditSubmitButton isSubmitting={isSubmitting} />
              </div>
            </form>
    );
}

export function ResourceManagement() {
  const { toast } = useToast();
  const { resources, applications, roles, isLoading } = useData();
  const { isManagerOrAdmin } = useAuth();
  const canEdit = isManagerOrAdmin();
  const addFormRef = useRef<HTMLFormElement>(null);

  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  useEffect(() => {
    async function fetchUsers() {
        if (!canEdit) return;
        const result = await getAuthUsers();
        if (result.success && result.users) {
            setAuthUsers(result.users);
        } else {
            toast({ title: "Error fetching users", description: result.error, variant: 'destructive'});
        }
    }
    fetchUsers();
  }, [toast, canEdit]);
  
  const linkedUserIds = resources.map(r => r.userId).filter(Boolean);
  const availableUsersForAdd = authUsers.filter(u => !linkedUserIds.includes(u.uid));

  const handleAddResource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmittingAdd(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const roleId = formData.get('roleId') as string;
    const applicationIdValue = formData.get('applicationId') as string;
    const userIdValue = formData.get('userId') as string;

    if (!name || !roleId) {
      toast({ title: 'Error', description: 'Name and Role are required.', variant: 'destructive'});
      setIsSubmittingAdd(false);
      return;
    }

    const data: Partial<Resource> = { name, roleId };
    if (applicationIdValue && applicationIdValue !== 'none') data.applicationId = applicationIdValue;
    if (userIdValue && userIdValue !== 'none') data.userId = userIdValue;

    try {
        await addDoc(collection(db, 'resources'), data);
        toast({ title: 'Success', description: 'Resource added successfully.'});
        addFormRef.current?.reset();
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive'});
    } finally {
        setIsSubmittingAdd(false);
    }
  }

  const handleEditClick = (resource: Resource) => {
    setSelectedResource(resource);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (resource: Resource) => {
    setSelectedResource(resource);
    setIsDeleteDialogOpen(true);
  };
  
  async function handleDelete() {
    if (!selectedResource) return;
    setIsSubmittingDelete(true);
    try {
        await deleteDoc(doc(db, 'resources', selectedResource.id));
        toast({ title: 'Success', description: 'Resource deleted.' });
        setIsDeleteDialogOpen(false);
        setSelectedResource(null);
    } catch (error: any) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
        setIsSubmittingDelete(false);
    }
  }
  
  const handleUpdateSuccess = () => {
      setIsEditDialogOpen(false);
      setSelectedResource(null);
  }

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {canEdit && (
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline">Add New Resource</CardTitle>
              <CardDescription>
                Create a new resource profile for your team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form ref={addFormRef} onSubmit={handleAddResource} className="space-y-4">
                <div>
                  <Label htmlFor="name">Resource Name</Label>
                  <Input id="name" name="name" placeholder="e.g., Jane Doe" required disabled={isSubmittingAdd} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="roleId">Role</Label>
                      <Select name="roleId" required disabled={isSubmittingAdd}>
                          <SelectTrigger id="roleId"><SelectValue placeholder="Select a role" /></SelectTrigger>
                          <SelectContent>
                              {roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                          </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="applicationId">Application</Label>
                      <Select name="applicationId" disabled={isSubmittingAdd} defaultValue="none">
                      <SelectTrigger id="applicationId"><SelectValue placeholder="Select an app" /></SelectTrigger>
                      <SelectContent>
                          <SelectItem value="none">None (Cross-Application)</SelectItem>
                          {applications.map((app) => <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>)}
                      </SelectContent>
                      </Select>
                    </div>
                </div>
                <div>
                  <Label htmlFor="userId">Link to User Account (Optional)</Label>
                  <Select name="userId" disabled={isSubmittingAdd} defaultValue="none">
                    <SelectTrigger id="userId"><SelectValue placeholder="Select a user" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Unlinked)</SelectItem>
                      {availableUsersForAdd.map((user) => (
                        <SelectItem key={user.uid} value={user.uid}>{user.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
            <CardTitle className="font-headline">Team Resources</CardTitle>
             <CardDescription>
              A list of all resources in your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><User className="inline-block h-4 w-4 mr-1" /> Name</TableHead>
                  <TableHead><Briefcase className="inline-block h-4 w-4 mr-1" /> Role</TableHead>
                  <TableHead><Building2 className="inline-block h-4 w-4 mr-1" /> Application</TableHead>
                  <TableHead><Link2 className="inline-block h-4 w-4 mr-1" /> Linked User</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((resource) => {
                  const app = applications.find((a) => a.id === resource.applicationId);
                  const role = roles.find(r => r.id === resource.roleId);
                  const user = authUsers.find(u => u.uid === resource.userId);
                  return (
                    <TableRow key={resource.id}>
                      <TableCell className="font-medium">{resource.name}</TableCell>
                      <TableCell><Badge variant={role?.name === 'PM' ? 'default' : 'secondary'}>{role?.name || 'N/A'}</Badge></TableCell>
                      <TableCell>{app?.name || <span className="text-muted-foreground">Cross-App</span>}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{user?.email || 'N/A'}</TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onSelect={() => handleEditClick(resource)}><FilePenLine className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => handleDeleteClick(resource)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
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
                <DialogTitle className="font-headline">Edit Resource</DialogTitle>
                <DialogDescription>
                  Update the details for {selectedResource?.name}.
                </DialogDescription>
              </DialogHeader>
              {selectedResource && (
              <ResourceEditForm resource={selectedResource} onSuccess={handleUpdateSuccess} authUsers={authUsers} />
              )}
            </DialogContent>
          </Dialog>
          
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the resource "{selectedResource?.name}".
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

    