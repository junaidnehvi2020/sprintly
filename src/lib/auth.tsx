
'use client';

import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, type User, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, onSnapshot, getDoc, collection, query, where, getDocs, writeBatch, addDoc } from 'firebase/firestore';
import { db } from './firebase/config';
import { firebase_app } from './firebase/config';
import { Loader2 } from 'lucide-react';
import type { UserRole, AccessRole, Permission } from './types';

const auth = getAuth(firebase_app);

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  isLoading: boolean;
  isRoleLoading: boolean;
  isManagerOrAdmin: () => boolean;
  isMember: () => boolean;
  login: (email: string, pass: string) => Promise<any>;
  signup: (email: string, pass: string) => Promise<any>;
  logout: () => void;
  isLoggingOut: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultPermissions: Record<UserRole, Permission[]> = {
    Admin: ['*'],
    Manager: [
        'page:dashboard', 'page:my-view', 'page:sprints', 'page:tribes', 'page:squad-planning',
        'page:tasks', 'page:task-view', 'page:resource-view', 'page:resource-calendar',
        'page:reports', 'page:applications', 'page:roles', 'page:resources',
        'task:create', 'task:edit', 'task:delete', 'task:assign',
        'sprint:create', 'sprint:edit', 'sprint:delete',
        'core:applications', 'core:roles', 'core:resources', 'core:tribes', 'core:squads',
        'planning:squads',
    ],
    Member: [
        'page:dashboard', 'page:my-view', 'page:task-view', 'page:resource-view', 'page:resource-calendar',
        'task:edit:status', // Example of a more granular permission
    ],
    Guest: ['page:dashboard'],
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAuthLoading(false);
      if (user) {
        setIsRoleLoading(true);
        const unsubscribeRole = onSnapshot(doc(db, 'userRoles', user.uid), async (roleDoc) => {
          const userRole = (roleDoc.exists() ? roleDoc.data().role : 'Guest') as UserRole;
          setRole(userRole);
          
          const accessRolesRef = collection(db, 'accessRoles');
          const accessRoleQuery = query(accessRolesRef, where('name', '==', userRole));
          const accessRoleSnapshot = await getDocs(accessRoleQuery);
          
          if (!accessRoleSnapshot.empty) {
              const accessRoleData = accessRoleSnapshot.docs[0].data() as AccessRole;
              setPermissions(accessRoleData.permissions || []);
          } else if (['Admin', 'Manager', 'Member', 'Guest'].includes(userRole)) {
              // The role exists in userRoles, but not in accessRoles. Create it.
              console.log(`Default role "${userRole}" not found. Creating it now.`);
              const newRoleDoc: Omit<AccessRole, 'id'> = {
                  name: userRole,
                  description: `Default ${userRole} role`,
                  isDefault: true,
                  permissions: defaultPermissions[userRole] || [],
              };
              const newRoleRef = await addDoc(accessRolesRef, newRoleDoc);
              setPermissions(newRoleDoc.permissions);
          } else {
              setPermissions([]);
          }
          setIsRoleLoading(false);
        }, () => {
          setRole('Guest');
          setPermissions([]);
          setIsRoleLoading(false);
        });
        return () => unsubscribeRole();
      } else {
        setRole(null);
        setPermissions([]);
        setIsRoleLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const signup = async (email: string, pass: string) => {
    return createUserWithEmailAndPassword(auth, email, pass);
  };

  const logout = () => {
    setIsLoggingOut(true);
  };

  useEffect(() => {
    if (isLoggingOut) {
      signOut(auth).finally(() => {
        setIsLoggingOut(false);
      });
    }
  }, [isLoggingOut]);

  const isManagerOrAdmin = () => {
    return role === 'Admin' || role === 'Manager';
  };

  const isMember = () => {
    return role === 'Member';
  }

  const hasPermission = (permission: Permission): boolean => {
    if (role === 'Admin') return true;
    return permissions.includes(permission);
  }

  const isLoading = isAuthLoading || isRoleLoading;
  const isProtectedRoute = pathname.startsWith('/dashboard');

  useEffect(() => {
    if (!isLoading && !user && isProtectedRoute) {
      router.replace('/login');
    }
  }, [isLoading, user, isProtectedRoute, router]);
  
  const value = {
    user,
    role,
    permissions,
    hasPermission,
    isLoading,
    isRoleLoading,
    isManagerOrAdmin,
    isMember,
    login,
    signup,
    logout,
    isLoggingOut,
  };

  if (isLoading && isProtectedRoute) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
