'use client';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { getAuthUsers, updateUserRole } from '@/lib/actions';
import { useData } from '@/hooks/use-data';
import type { AuthUser, UserRoleDoc, UserRole, Resource, Role as ProjectRole, Application } from '@/lib/types';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

type CombinedUser = {
  uid: string;
  email: string;
  name: string;
  accessRole: UserRole;
  projectRole: string;
  projectApplication: string;
};

export default function UserManagementPage() {
  const { role, user: currentUser, isRoleLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { resources, roles: projectRoles, applications, accessRoles, isLoading: isDataLoading } = useData();

  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [userRoles, setUserRoles] = useState<Map<string, UserRole>>(new Map());
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [emailFilter, setEmailFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [accessRoleFilter, setAccessRoleFilter] = useState('');
  const [projectRoleFilter, setProjectRoleFilter] = useState('');
  const [applicationFilter, setApplicationFilter] = useState('');

  useEffect(() => {
    if (!isRoleLoading && role !== 'Admin') {
      router.replace('/dashboard');
      toast({ title: 'Access Denied', description: 'You do not have permission to view this page.', variant: 'destructive'});
    }
  }, [role, isRoleLoading, router, toast]);

  useEffect(() => {
    async function fetchUsers() {
      if (role !== 'Admin') return;
      setIsAuthLoading(true);
      const result = await getAuthUsers();
      if (result.success && result.users) {
        setAuthUsers(result.users);
      } else {
        toast({ title: "Error fetching users", description: result.error, variant: 'destructive'});
      }
      setIsAuthLoading(false);
    }
    fetchUsers();
  }, [role, toast]);

  useEffect(() => {
    if (role !== 'Admin') return;
    const q = query(collection(db, 'userRoles'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rolesMap = new Map<string, UserRole>();
      snapshot.forEach(doc => {
        rolesMap.set(doc.id, (doc.data() as UserRoleDoc).role);
      });
      setUserRoles(rolesMap);
    });
    return () => unsubscribe();
  }, [role]);

  const combinedUsers = useMemo<CombinedUser[]>(() => {
    return authUsers.map(user => {
      const resource = resources.find(r => r.userId === user.uid);
      const projectRole = projectRoles.find(pr => pr.id === resource?.roleId);
      const application = applications.find(a => a.id === resource?.applicationId);
      
      return {
        uid: user.uid,
        email: user.email || 'N/A',
        name: resource?.name || '-',
        accessRole: userRoles.get(user.uid) || 'Guest',
        projectRole: projectRole?.name || '-',
        projectApplication: application?.name || 'Cross-App',
      };
    });
  }, [authUsers, resources, userRoles, projectRoles, applications]);

  const filteredUsers = useMemo(() => {
    return combinedUsers.filter(user => {
      const lowerEmailFilter = emailFilter.toLowerCase();
      const lowerNameFilter = nameFilter.toLowerCase();
      const lowerAccessRoleFilter = accessRoleFilter.toLowerCase();
      const lowerProjectRoleFilter = projectRoleFilter.toLowerCase();
      const lowerApplicationFilter = applicationFilter.toLowerCase();
      return (
        user.email.toLowerCase().includes(lowerEmailFilter) &&
        user.name.toLowerCase().includes(lowerNameFilter) &&
        user.accessRole.toLowerCase().includes(lowerAccessRoleFilter) &&
        user.projectRole.toLowerCase().includes(lowerProjectRoleFilter) &&
        user.projectApplication.toLowerCase().includes(lowerApplicationFilter)
      );
    });
  }, [combinedUsers, emailFilter, nameFilter, accessRoleFilter, projectRoleFilter, applicationFilter]);

  const handleRoleChange = async (uid: string, email: string, newRole: UserRole) => {
    if (uid === currentUser?.uid && newRole !== 'Admin') {
        toast({ title: 'Action Denied', description: 'Admins cannot demote themselves.', variant: 'destructive'});
        return;
    }
    const result = await updateUserRole(uid, email, newRole);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };
  
  const resetFilters = () => {
    setEmailFilter('');
    setNameFilter('');
    setAccessRoleFilter('');
    setProjectRoleFilter('');
    setApplicationFilter('');
  };

  const isLoading = isAuthLoading || isDataLoading;

  if (isLoading || role !== 'Admin') {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">User Management</CardTitle>
          <CardDescription>Assign roles to users in your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="sticky top-[56px] sm:top-0 z-10 -mx-6 -mt-6 sm:mx-0 sm:mt-0 mb-6 bg-muted/40 backdrop-blur-lg">
            <div className="p-4 border-b">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Input placeholder="Filter by email..." value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} />
                    <Input placeholder="Filter by name..." value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} />
                    <Input placeholder="Filter by Access Role..." value={accessRoleFilter} onChange={(e) => setAccessRoleFilter(e.target.value)} />
                    <Input placeholder="Filter by Project Role..." value={projectRoleFilter} onChange={(e) => setProjectRoleFilter(e.target.value)} />
                    <Input placeholder="Filter by Application..." value={applicationFilter} onChange={(e) => setApplicationFilter(e.target.value)} />
                    <Button variant="ghost" onClick={resetFilters}>
                        <XCircle className="mr-2 h-4 w-4" /> Clear
                    </Button>
                </div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Access Role</TableHead>
                <TableHead>Project Role</TableHead>
                <TableHead>Project Application</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.uid}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>
                    <Select
                      value={user.accessRole}
                      onValueChange={(newRole) => handleRoleChange(user.uid, user.email, newRole as UserRole)}
                      disabled={user.uid === currentUser?.uid && user.accessRole === 'Admin'}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {accessRoles.map(r => (
                           <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{user.projectRole}</TableCell>
                  <TableCell>{user.projectApplication}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
