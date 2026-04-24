'use client';

import { useData } from '@/hooks/use-data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ListChecks, Users, Clock, CheckCircle, Loader2, Download, Upload, Trash2, AlertTriangle, Info, Building2, Users2, Shield, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRef, useState, useMemo, useEffect } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { db } from '@/lib/firebase/config';
import { collection, writeBatch, getDocs, doc } from 'firebase/firestore';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { useAuth } from '@/lib/auth';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


function SortableCard({ id, cardData }: { id: string; cardData: CardData }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const { Icon, title, value } = cardData;

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground">
                <GripVertical className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </div>
  );
}

type CardData = {
  id: string;
  title: string;
  value: number | string;
  Icon: React.ElementType;
}

export default function DashboardPage() {
  const { 
    sprints, 
    applications,
    resources,
    roles,
    tribes,
    squads,
    squadResourceAllocations,
    tasks,
    isLoading 
  } = useData();
  //console.log('Dashboard tasks:', tasks);
  
  const { role } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{success: string[], errors: string[]}>({ success: [], errors: [] });
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isWashoutAlertOpen, setIsWashoutAlertOpen] = useState(false);
  
  const isAdmin = role === 'Admin';

 

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const initialCardData: CardData[] = useMemo(() => {
    const tasksInProgress = tasks.filter(t => t.status === 'In Progress').length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    //console.log('Calculated tasksInProgress:', tasksInProgress);
    //console.log('Calculated completedTasks:', completedTasks);

    return [
      { id: 'tasksInProgress', title: 'Tasks In Progress', value: tasksInProgress, Icon: ListChecks },
      { id: 'completedTasks', title: 'Completed Tasks', value: completedTasks, Icon: CheckCircle },
      { id: 'totalSprints', title: 'Total Sprints', value: sprints.length, Icon: Clock },
      { id: 'totalResources', title: 'Total Resources', value: resources.length, Icon: Users },
      { id: 'totalApplications', title: 'Total Applications', value: applications.length, Icon: Building2 },
      { id: 'totalTribes', title: 'Total Tribes', value: tribes.length, Icon: Users2 },
      { id: 'totalSquads', title: 'Total Squads', value: squads.length, Icon: Users },
      { id: 'totalRoles', title: 'Total Roles', value: roles.length, Icon: Shield },
    ];
  }, [tasks, sprints, resources, applications, tribes, squads, roles]);

  useEffect(() => {
    //console.log('Cards state after useEffect:', cards);
    setCards(currentCards => {
      const newCardDataMap = new Map(initialCardData.map(c => [c.id, c]));
      return currentCards.map(c => newCardDataMap.get(c.id) || c);
    });
  }, [initialCardData]);
  const [cards, setCards] = useState<CardData[]>(initialCardData);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCards((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const handleExport = () => {
    try {
      const dataToExport: Record<string, any> = {
        sprints,
        applications,
        resources,
        roles,
        tribes,
        squads,
        squadResourceAllocations,
        tasks,
      };

      if (Object.values(dataToExport).every(arr => arr.length === 0)) {
          toast({ title: 'No data to export', description: 'There is no data to export.', variant: 'destructive'});
          return;
      }
      
      const now = new Date();
      const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
      const filename = `sprintly-data-${timestamp}.json`;

      const serializedData = JSON.stringify(dataToExport, (key, value) => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value;
      }, 2);


      const blob = new Blob([serializedData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Success', description: 'Data exported successfully.' });
    } catch (error) {
       console.error('Failed to export data:', error);
       toast({ title: 'Error', description: 'Failed to export data.', variant: 'destructive'});
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
            toast({ title: 'Error', description: 'Could not read file content.', variant: 'destructive' });
            return;
        }
        const importedData = JSON.parse(text, (key, value) => {
          if (typeof value === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(value)) {
            return new Date(value);
          }
          return value;
        });
        
        const dataKeys: (keyof typeof importedData)[] = ['sprints', 'applications', 'resources', 'tasks', 'tribes', 'squads', 'squadResourceAllocations', 'roles'];

        const batch = writeBatch(db);
        let keysFound = 0;

        for (const key of dataKeys) {
            if (importedData[key] && Array.isArray(importedData[key])) {
                keysFound++;
                const collectionRef = collection(db, key);
                // First delete all existing documents in the collection
                const existingDocs = await getDocs(collectionRef);
                existingDocs.forEach(doc => batch.delete(doc.ref));
                
                // Then add new documents
                for (const item of importedData[key]) {
                    const { id, ...itemData } = item;
                    const docRef = id ? doc(collectionRef, id) : doc(collectionRef);
                    batch.set(docRef, itemData);
                }
            }
        }
        
        if (keysFound === 0) {
            toast({ title: 'Import Failed', description: 'The selected file does not contain valid application data arrays.', variant: 'destructive' });
            return;
        }

        await batch.commit();

        toast({ title: 'Success', description: 'Data imported successfully. Data will refresh shortly.' });
        
      } catch (error) {
        console.error('Failed to import data:', error);
        toast({ title: 'Error', description: 'Failed to parse JSON or import data.', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleCsvImportClick = () => {
    csvInputRef.current?.click();
  }

  const processCsv = async (text: string) => {
    setIsProcessingCsv(true);

    const successMessages: string[] = [];
    const errorMessages: string[] = [];
    
    const batch = writeBatch(db);
    const tempRoles: Record<string, { id: string; name: string }> = {};
    const tempResources: Record<string, { id: string; name: string; roleId: string, applicationId?: string }> = {};
    const tempAllocations: any[] = [];

    const rows = text.split('\n').filter(row => row.trim() !== '');

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1;
      const values = rows[i].split(',').map(v => v.trim());
      
      if (values.length !== 7) {
        errorMessages.push(`Row ${rowNum}: Invalid number of columns. Expected 7, found ${values.length}.`);
        continue;
      }
      
      const [resourceName, roleName, appName, sprintName, tribeName, squadName, allocationValue] = values;

      // 1. Validate required entities that must pre-exist
      const sprint = sprints.find(s => s.name === sprintName);
      if (!sprint) {
        errorMessages.push(`Row ${rowNum}: Sprint '${sprintName}' not found. Please create it first. Skipping record.`);
        continue;
      }
      const tribe = tribes.find(t => t.name === tribeName);
       if (!tribe) {
        errorMessages.push(`Row ${rowNum}: Tribe '${tribeName}' not found. Please create it first. Skipping record.`);
        continue;
      }
      const squad = squads.find(s => s.name === squadName && s.tribeId === tribe.id);
       if (!squad) {
        errorMessages.push(`Row ${rowNum}: Squad '${squadName}' in tribe '${tribeName}' not found. Please create it first. Skipping record.`);
        continue;
      }

      // 2. Validate Allocation
      const isDedicated = allocationValue.toLowerCase() === 'dedicated';
      const allocationPercentage = parseInt(allocationValue, 10);
      const isShared = !isDedicated && !isNaN(allocationPercentage) && allocationPercentage > 0 && allocationPercentage <= 100;

      if (!isDedicated && !isShared) {
        errorMessages.push(`Row ${rowNum}: Invalid allocation type '${allocationValue}'. Must be 'Dedicated' or a percentage. Skipping record.`);
        continue;
      }

      // 3. Find or Create Role
      let role = roles.find(r => r.name.toLowerCase() === roleName.toLowerCase()) || tempRoles[roleName.toLowerCase()];
      if (!role) {
        const newRoleRef = doc(collection(db, 'roles'));
        const newRoleData = { id: newRoleRef.id, name: roleName };
        batch.set(newRoleRef, { name: roleName });
        role = newRoleData;
        tempRoles[roleName.toLowerCase()] = newRoleData;
        successMessages.push(`Row ${rowNum}: New role '${roleName}' will be created.`);
      }

      // 4. Find Application (optional)
      const application = appName ? applications.find(a => a.name.toLowerCase() === appName.toLowerCase()) : undefined;

      // 5. Find or Create Resource
      const resourceKey = `${resourceName.toLowerCase()}-${role.id}-${application?.id || 'none'}`;
      let resource = resources.find(r => 
        r.name.toLowerCase() === resourceName.toLowerCase() && 
        r.roleId === role.id &&
        (r.applicationId || 'none') === (application?.id || 'none')
      ) || tempResources[resourceKey];

      if (!resource) {
        const newResourceRef = doc(collection(db, 'resources'));
        const newResourceData: {name: string, roleId: string, applicationId?: string} = { name: resourceName, roleId: role.id };
        if (application) {
          newResourceData.applicationId = application.id;
        }
        batch.set(newResourceRef, newResourceData);
        resource = { id: newResourceRef.id, ...newResourceData };
        tempResources[resourceKey] = resource;
        successMessages.push(`Row ${rowNum}: New resource '${resourceName}' will be created.`);
      }
      
      // 6. Comprehensive allocation validation
      const allExistingAllocations = [...squadResourceAllocations, ...tempAllocations];
      const allocationsForResourceInSprint = allExistingAllocations.filter(
        a => a.sprintId === sprint.id && a.resourceId === resource!.id
      );

      if (allocationsForResourceInSprint.length > 0) {
          if (allocationsForResourceInSprint.some(a => a.allocationType === 'Dedicated')) {
              errorMessages.push(`Row ${rowNum}: Resource '${resourceName}' is already Dedicated in this sprint. Skipping.`);
              continue;
          }
          if (isDedicated) {
              errorMessages.push(`Row ${rowNum}: Resource '${resourceName}' already has a Shared allocation and cannot be 'Dedicated'. Skipping.`);
              continue;
          }
          const currentTotal = allocationsForResourceInSprint.reduce((sum, a) => sum + (a.allocationPercentage || 0), 0);
          if (currentTotal + allocationPercentage > 100) {
              errorMessages.push(`Row ${rowNum}: Allocation for '${resourceName}' would exceed 100% in sprint '${sprintName}'. Current: ${currentTotal}%, Adding: ${allocationPercentage}%. Skipping.`);
              continue;
          }
          if (allocationsForResourceInSprint.some(a => a.squadId === squad.id)) {
              errorMessages.push(`Row ${rowNum}: Resource '${resourceName}' is already allocated to squad '${squadName}' in this sprint. Skipping.`);
              continue;
          }
      }

      // 7. Create Allocation
      const newAllocationRef = doc(collection(db, 'squadResourceAllocations'));
      const newAllocationData = {
          sprintId: sprint.id,
          squadId: squad.id,
          resourceId: resource.id,
          allocationType: isDedicated ? 'Dedicated' as 'Shared' | 'Dedicated' : 'Shared' as 'Shared' | 'Dedicated',
          allocationPercentage: isShared ? allocationPercentage : null,
      };
      batch.set(newAllocationRef, newAllocationData);
      tempAllocations.push({id: newAllocationRef.id, ...newAllocationData}); // Add to temp cache for this run

      successMessages.push(`Row ${rowNum}: Allocation for ${resourceName} to squad ${squadName} prepared.`);
    };

    try {
        if(errorMessages.length === 0){
            await batch.commit();
            toast({title: "Bulk Upload Complete", description: "CSV data has been processed and saved."});
        } else {
             toast({title: "Bulk Upload Failed", description: "Errors found in CSV. No data was saved.", variant: 'destructive'});
        }
    } catch (error) {
        console.error("Bulk upload failed", error);
        toast({title: "Bulk Upload Failed", description: "An error occurred during the database write.", variant: 'destructive'});
    } finally {
        setUploadSummary({ success: successMessages, errors: errorMessages });
        setIsSummaryOpen(true);
        setIsProcessingCsv(false);
    }
  }

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
            toast({ title: 'Error', description: 'Could not read CSV file content.', variant: 'destructive' });
            return;
        }
        await processCsv(text);
      } catch (error) {
        console.error('Failed to process CSV:', error);
        toast({ title: 'Error', description: 'An unexpected error occurred while processing the CSV file.', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    if (csvInputRef.current) {
        csvInputRef.current.value = '';
    }
  };

  const handleWashout = async () => {
    try {
        handleExport(); // Backup existing data
        
        const batch = writeBatch(db);
        const collectionsToWash = ['sprints', 'applications', 'resources', 'tasks', 'tribes', 'squads', 'squadResourceAllocations', 'roles'];

        for (const key of collectionsToWash) {
            const snapshot = await getDocs(collection(db, key));
            snapshot.forEach(doc => batch.delete(doc.ref));
        }

        await batch.commit();
        toast({ title: 'Success', description: 'All project data has been reset.'});
    } catch (error) {
        console.error('Failed to washout data:', error);
        toast({ title: 'Error', description: 'Failed to reset data.', variant: 'destructive' });
    }
    setIsWashoutAlertOpen(false);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  const taskStatusData = [
    { name: 'Not Started', value: tasks.filter(t => t.status === 'Not Started').length },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'In Progress').length },
    { name: 'Completed', value: tasks.filter(t => t.status === 'Completed').length },
  ];

  const COLORS = ['hsl(var(--muted-foreground)/.5)', 'hsl(var(--primary))', 'hsl(var(--accent))'];

  const resourceUtilizationData = resources.map(resource => {
    const totalDays = tasks.flatMap(task => task.impactedApps || [])
      .flatMap(app => app.resourceAssignments || [])
      .filter(assignment => (assignment?.resourceId) === resource.id)
      .reduce((sum, assignment) => sum + (assignment?.plannedDays || 0), 0);

    return { name: resource.name, days: totalDays };
  }).filter(r => r.days > 0);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {isAdmin && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Data Management</CardTitle>
                    <CardDescription>Save or load your project data to/from a local JSON file.</CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2 flex-wrap">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="application/json"
                        className="hidden"
                    />
                    <Button variant="outline" size="sm" onClick={handleImportClick}>
                        <Upload className="mr-2 h-4 w-4" /> Import
                    </Button>
                    <Button size="sm" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" /> Export
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setIsWashoutAlertOpen(true)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Washout
                    </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Bulk Upload</CardTitle>
                    <CardDescription>Upload resource allocations from a CSV file.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 items-center">
                        <input
                            type="file"
                            ref={csvInputRef}
                            onChange={handleCsvFileChange}
                            accept=".csv,.txt"
                            className="hidden"
                        />
                        <Button onClick={handleCsvImportClick} disabled={isProcessingCsv}>
                            {isProcessingCsv ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            Upload CSV
                        </Button>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                                <p className="font-bold mb-2">CSV Format:</p>
                                <p className="font-mono text-xs bg-muted p-2 rounded">
                                    resourceName,roleName,appName,sprintName,tribeName,squadName,allocationValue
                                </p>
                                <p className="text-xs mt-2">
                                    Note: `appName` can be empty for cross-app resources. `allocationValue` must be 'Dedicated' or a percentage (e.g., 50).
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </CardContent>
            </Card>
          </div>
        )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={cards.map(c => c.id)} strategy={rectSortingStrategy}>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      {cards.map(card => (
                          <SortableCard key={card.id} id={card.id} cardData={card} />
                      ))}
                  </div>
              </SortableContext>
          </DndContext>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="font-headline">Resource Utilization</CardTitle>
                <CardDescription>Estimated days assigned per resource.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={resourceUtilizationData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                    <Bar dataKey="days" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
      
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="font-headline">Task Status Overview</CardTitle>
                <CardDescription>Distribution of tasks by their current status.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                          if (percent === 0) return null;
                          const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                          const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                          const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                          return (
                              <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14}>
                                  {`${(percent * 100).toFixed(0)}%`}
                              </text>
                          );
                      }}
                    >
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "var(--radius)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          {isAdmin && (
            <AlertDialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
                <AlertDialogContent className="max-h-[80vh] flex flex-col">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Upload Summary</AlertDialogTitle>
                        <AlertDialogDescription>
                            Processed {uploadSummary.success.length + uploadSummary.errors.length} rows. 
                            ({uploadSummary.success.length} successful operations, {uploadSummary.errors.length} errors).
                            {uploadSummary.errors.length > 0 && " No data was saved due to errors."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex-grow overflow-y-auto pr-4 text-sm">
                        {uploadSummary.errors.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-destructive">Errors:</h3>
                                <ul className="list-disc list-inside space-y-1 text-destructive">
                                    {uploadSummary.errors.map((err, i) => <li key={`err-${i}`}>{err}</li>)}
                                </ul>
                            </div>
                        )}
                        {uploadSummary.success.length > 0 && uploadSummary.errors.length > 0 && <hr className="my-4" />}
                        {uploadSummary.success.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold text-primary">Log:</h3>
                                <ul className="list-disc list-inside space-y-1">
                                    {uploadSummary.success.map((msg, i) => <li key={`msg-${i}`}>{msg}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setIsSummaryOpen(false)}>Close</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          )}
          {isAdmin && (
            <AlertDialog open={isWashoutAlertOpen} onOpenChange={setIsWashoutAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action is irreversible. It will first export your current data as a backup, then permanently delete all project data from Firestore. Do you want to proceed?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleWashout} className="bg-destructive hover:bg-destructive/90">
                            Confirm Washout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          )}
      </div>
    </TooltipProvider>
  );
}
