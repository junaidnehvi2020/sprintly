'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, DocumentData, Unsubscribe } from 'firebase/firestore';
import type { Sprint, Application, Resource, Task, Tribe, Squad, SquadResourceAllocation, Role, ImageData, OrganizationSettings, Holiday, AccessRole } from '@/lib/types';
import { imageData as initialImageData } from '@/lib/data';
import { useAuth } from '@/lib/auth';

interface DataContextType {
    sprints: Sprint[];
    applications: Application[];
    resources: Resource[];
    tasks: Task[];
    tribes: Tribe[];
    squads: Squad[];
    squadResourceAllocations: SquadResourceAllocation[];
    roles: Role[];
    accessRoles: AccessRole[];
    settings: OrganizationSettings | null;
    holidays: Holiday[];
    imageData: ImageData;
    isLoading: boolean;
}

const DataContext = createContext<DataContextType>({
    sprints: [],
    applications: [],
    resources: [],
    tasks: [],
    tribes: [],
    squads: [],
    squadResourceAllocations: [],
    roles: [],
    accessRoles: [],
    settings: null,
    holidays: [],
    imageData: initialImageData,
    isLoading: true,
});

export function DataProvider({ children }: { children: ReactNode }) {
    const { user, isRoleLoading, isLoggingOut } = useAuth();
    const [sprints, setSprints] = useState<Sprint[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [resources, setResources] = useState<Resource[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [tribes, setTribes] = useState<Tribe[]>([]);
    const [squads, setSquads] = useState<Squad[]>([]);
    const [squadResourceAllocations, setSquadResourceAllocations] = useState<SquadResourceAllocation[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [accessRoles, setAccessRoles] = useState<AccessRole[]>([]);
    const [settings, setSettings] = useState<OrganizationSettings | null>(null);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let unsubscribes: Unsubscribe[] = [];

        function setupListeners() {
            setIsLoading(true);
            const collections = {
                sprints: { setter: setSprints, dateFields: ['startDate', 'endDate'] },
                applications: { setter: setApplications },
                resources: { setter: setResources },
                tasks: { setter: setTasks, dateFields: ['createdAt', 'updatedAt'] },
                tribes: { setter: setTribes },
                squads: { setter: setSquads },
                squadResourceAllocations: { setter: setSquadResourceAllocations },
                roles: { setter: setRoles },
                accessRoles: { setter: setAccessRoles },
                holidays: { setter: setHolidays, dateFields: ['date'] },
            };

            unsubscribes = Object.entries(collections).map(([path, { setter, dateFields }]) => {
                const q = query(collection(db, path));
                return onSnapshot(q, (querySnapshot) => {
                    const data = processSnapshot(querySnapshot, dateFields);
                    (setter as React.Dispatch<React.SetStateAction<any[]>>)(data);
                }, (error) => {
                    console.error(`Error fetching ${path}:`, error);
                });
            });
            
            const settingsQuery = query(collection(db, 'settings'));
            const unsubSettings = onSnapshot(settingsQuery, (snapshot) => {
                if (snapshot.empty) {
                    setSettings({ id: 'default', weekendDays: [0, 6]}); // Default to Sat/Sun if not set
                } else {
                    const settingsDoc = snapshot.docs[0];
                    setSettings({ id: settingsDoc.id, ...settingsDoc.data() } as OrganizationSettings);
                }
            });
            unsubscribes.push(unsubSettings);


            const timer = setTimeout(() => setIsLoading(false), 1500);
            unsubscribes.push(() => clearTimeout(timer));
        }

        function clearDataAndListeners() {
            unsubscribes.forEach(unsub => unsub());
            unsubscribes = [];
            setSprints([]);
            setApplications([]);
            setResources([]);
            setTasks([]);
            setTribes([]);
            setSquads([]);
            setSquadResourceAllocations([]);
            setRoles([]);
            setAccessRoles([]);
            setSettings(null);
            setHolidays([]);
            setIsLoading(false);
        }

        if (user && !isRoleLoading && !isLoggingOut) {
            setupListeners();
        } else {
            clearDataAndListeners();
        }
        
        return () => {
           clearDataAndListeners();
        };
    }, [user, isRoleLoading, isLoggingOut]);
    
    const value = {
        sprints,
        applications,
        resources,
        tasks,
        tribes,
        squads,
        squadResourceAllocations,
        roles,
        accessRoles,
        settings,
        holidays,
        imageData: initialImageData,
        isLoading,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function processSnapshot<T>(snapshot: DocumentData, dateFields: string[] = []): T[] {
    return snapshot.docs.map((doc: DocumentData) => {
        const data = doc.data();
        const docId = doc.id;

        for (const field of dateFields) {
            if (data[field]?.toDate) {
                data[field] = data[field].toDate();
            }
        }
        return { id: docId, ...data } as T;
    });
}

export function useData() {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
}
