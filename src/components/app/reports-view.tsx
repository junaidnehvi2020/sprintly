'use client';
import { useState, useMemo, useEffect } from 'react';
import type { Task, Sprint, Application, Resource, Tribe, Squad, SquadResourceAllocation } from '@/lib/types';
import { useData } from '@/hooks/use-data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { Loader2, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { getBusinessDays } from '@/lib/utils';


export function ReportsView() {
  const { 
    sprints, 
    applications, 
    resources,
    roles,
    tribes, 
    squads, 
    squadResourceAllocations: allocations, 
    tasks,
    settings,
    holidays,
    isLoading 
  } = useData();

  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [selectedTribe, setSelectedTribe] = useState<string>('all-tribes');
  const [selectedSquad, setSelectedSquad] = useState<string>('all-squads');
  const [selectedApp, setSelectedApp] = useState<string>('all');
  
  const initialSprintId = useMemo(() => {
    if (sprints.length > 0) {
        const currentSprint = sprints.find(s => new Date() >= s.startDate && new Date() <= s.endDate);
        return currentSprint ? currentSprint.id : sprints[0].id;
    }
    return '';
  }, [sprints]);

  useEffect(() => {
    if (initialSprintId && !selectedSprint) {
        setSelectedSprint(initialSprintId);
    }
  }, [initialSprintId, selectedSprint]);

  const filteredSquads = useMemo(() => {
    if (selectedTribe === 'all-tribes') return squads;
    return squads.filter(s => s.tribeId === selectedTribe);
  }, [squads, selectedTribe]);

  useEffect(() => {
    // Reset squad selection when tribe changes
    setSelectedSquad('all-squads');
  }, [selectedTribe]);
  
  const resetFilters = () => {
    setSelectedSprint(initialSprintId);
    setSelectedTribe('all-tribes');
    setSelectedSquad('all-squads');
    setSelectedApp('all');
  };
  
  const reportData = useMemo(() => {
    if (!settings) return { teamAllocation: [], capacityVsLoad: [], velocity: [], burndown: [] };
    
    let filteredTasks = tasks;
     if (selectedTribe !== 'all-tribes') {
        const tribeSquadIds = squads.filter(s => s.tribeId === selectedTribe).map(s => s.id);
        filteredTasks = filteredTasks.filter(t => t.tribeId === selectedTribe || (t.squadId && tribeSquadIds.includes(t.squadId)));
    }
    if (selectedSquad !== 'all-squads') {
        filteredTasks = filteredTasks.filter(t => t.squadId === selectedSquad);
    }
    if (selectedApp !== 'all') {
      filteredTasks = filteredTasks.filter(t => {
          const impactedAppIds = (t.impactedApps || []).map(ia => ia.applicationId);
          if (selectedApp === 'cross-app') {
              const resourceIdsInTask = (t.impactedApps || []).flatMap(ia => (ia.resourceAssignments || [])).map(ra => ra.resourceId);
              const resourcesInTask = resources.filter(r => resourceIdsInTask.includes(r.id));
              return resourcesInTask.some(r => !r.applicationId);
          }
          return impactedAppIds.includes(selectedApp);
      });
    }

    const sprintAllocations = allocations.filter(a => a.sprintId === selectedSprint);

    // Team Allocation Data
    const resourceMap = new Map<string, { name: string, allocation: number, appName: string, roleName: string }>();
    resources.forEach(r => {
        const app = applications.find(a => a.id === r.applicationId);
        const role = roles.find(role => role.id === r.roleId);
        const appName = app?.name || 'Cross-Application';
        const displayName = `${r.name}`;
        resourceMap.set(r.id, { name: displayName, allocation: 0, appName: appName, roleName: role?.name || 'N/A' });
    });
    
    const calculatedAllocations = new Map<string, number>();
    sprintAllocations.forEach(alloc => {
        const currentAlloc = calculatedAllocations.get(alloc.resourceId) || 0;
        if (alloc.allocationType === 'Dedicated') {
            calculatedAllocations.set(alloc.resourceId, 100);
        } else if (alloc.allocationPercentage) {
            calculatedAllocations.set(alloc.resourceId, Math.min(100, currentAlloc + alloc.allocationPercentage));
        }
    });

    let teamAllocationData = Array.from(resourceMap.keys()).map(resourceId => {
        const baseInfo = resourceMap.get(resourceId)!;
        const allocation = calculatedAllocations.get(resourceId) || 0;
        return { ...baseInfo, id: resourceId, allocation };
    }).filter(d => d.allocation > 0);

    if (selectedTribe !== 'all-tribes') {
        const tribeSquadIds = new Set(filteredSquads.map(s => s.id));
        const tribeResourceIds = new Set(sprintAllocations.filter(a => tribeSquadIds.has(a.squadId)).map(a => a.resourceId));
        teamAllocationData = teamAllocationData.filter(d => tribeResourceIds.has(d.id));
    }
     if (selectedSquad !== 'all-squads') {
        const squadResourceIds = new Set(sprintAllocations.filter(a => a.squadId === selectedSquad).map(a => a.resourceId));
        teamAllocationData = teamAllocationData.filter(d => squadResourceIds.has(d.id));
    }
    if (selectedApp !== 'all') {
        let appNameToFilter = selectedApp === 'cross-app' ? 'Cross-Application' : applications.find(a => a.id === selectedApp)?.name;
        teamAllocationData = teamAllocationData.filter(r => r.appName === appNameToFilter);
    }
    
    const capacityAndLoadData = (() => {
      const sprintTasks = filteredTasks.filter(t => t.sprintId === selectedSprint);
      const resourcesInFilteredTasks = new Set(
          sprintTasks
              .flatMap(t => t.impactedApps || [])
              .flatMap(ia => ia.resourceAssignments || [])
              .map(ra => ra.resourceId)
      );

      return Array.from(resourcesInFilteredTasks).map(resourceId => {
          const resource = resources.find(r => r.id === resourceId);
          if (!resource) return null;

          const sprint = sprints.find(s => s.id === selectedSprint);
          let availableDays = 0;
          if (sprint) {
              const sprintDuration = getBusinessDays(sprint.startDate, sprint.endDate, settings, holidays).length;
              const totalAllocation = allocations
                  .filter(a => a.sprintId === selectedSprint && a.resourceId === resourceId)
                  .reduce((sum, alloc) => sum + (alloc.allocationType === 'Dedicated' ? 100 : (alloc.allocationPercentage || 0)), 0);
              availableDays = (sprintDuration * Math.min(100, totalAllocation)) / 100;
          }

          const bookedDays = sprintTasks
              .flatMap(t => t.impactedApps || [])
              .flatMap(app => app.resourceAssignments || [])
              .filter(assign => assign && assign.resourceId === resourceId)
              .reduce((sum, assign) => sum + (assign.plannedDays || 0), 0);

          return { name: resource.name, available: availableDays, booked: bookedDays };
      }).filter((item): item is { name: string; available: number; booked: number } => !!item).sort((a,b) => b.available - a.available);
    })();
    
    // Velocity Data
    const velocityData = sprints
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
        .map(sprint => {
            const completedEffort = filteredTasks 
                .filter(t => t.sprintId === sprint.id && t.status === 'Completed')
                .reduce((sum, t) => sum + t.estimatedDays, 0);
            return { name: sprint.name, Completed: completedEffort };
        });

    // Burndown data
    let burndownData: any[] = [];
    const currentSprint = sprints.find(s => s.id === selectedSprint);
    if (currentSprint) {
        const sprintTasks = filteredTasks.filter(t => t.sprintId === currentSprint.id); // Use already-filtered tasks
        const totalEffort = sprintTasks.reduce((sum, t) => sum + t.estimatedDays, 0);
        const sprintBusinessDays = getBusinessDays(currentSprint.startDate, currentSprint.endDate, settings, holidays);
        const sprintDuration = sprintBusinessDays.length;

        const dailyEffort = [];
        for (let i = 0; i <= sprintDuration; i++) {
            const dayDate = i > 0 ? sprintBusinessDays[i - 1] : new Date(currentSprint.startDate.getTime() - 86400000);

            const completedOnDay = sprintTasks
                .filter(t => t.status === 'Completed' && t.updatedAt && new Date(t.updatedAt).getTime() <= dayDate.getTime())
                .reduce((sum, t) => sum + t.estimatedDays, 0);
            
            if (sprintDuration > 0) {
              dailyEffort.push({
                  day: `Day ${i}`,
                  Remaining: totalEffort - completedOnDay,
                  Ideal: totalEffort - (totalEffort / sprintDuration) * i,
              })
            }
        }
        burndownData = dailyEffort;
    }

    return {
      teamAllocation: teamAllocationData.sort((a, b) => b.allocation - a.allocation),
      capacityVsLoad: capacityAndLoadData,
      velocity: velocityData,
      burndown: burndownData,
    }

  }, [allocations, resources, applications, selectedSprint, selectedTribe, selectedSquad, selectedApp, squads, roles, tasks, sprints, filteredSquads, settings, holidays]);
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <div className="space-y-6">
        <div className="sticky top-[56px] sm:top-0 z-10 -mx-4 -mt-4 sm:mx-0 sm:mt-0 sm:pt-4 bg-muted/40 backdrop-blur-lg">
            <Card className="rounded-none sm:rounded-lg border-x-0 sm:border-x">
                <CardHeader>
                    <CardTitle className="font-headline">Reports</CardTitle>
                    <CardDescription>Analyze project performance with these reports.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Select value={selectedSprint} onValueChange={setSelectedSprint}>
                            <SelectTrigger><SelectValue placeholder="Select Sprint" /></SelectTrigger>
                            <SelectContent>
                                {sprints.map(sprint => <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={selectedTribe} onValueChange={(value) => { setSelectedTribe(value); setSelectedSquad('all-squads'); }}>
                            <SelectTrigger><SelectValue placeholder="Select Tribe" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-tribes">All Tribes</SelectItem>
                                {tribes.map(tribe => <SelectItem key={tribe.id} value={tribe.id}>{tribe.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={selectedSquad} onValueChange={setSelectedSquad} disabled={selectedTribe === 'all-tribes'}>
                            <SelectTrigger><SelectValue placeholder="Select Squad" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-squads">All Squads in Tribe</SelectItem>
                                {filteredSquads.map(squad => <SelectItem key={squad.id} value={squad.id}>{squad.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={selectedApp} onValueChange={setSelectedApp}>
                            <SelectTrigger><SelectValue placeholder="Select Application" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Applications</SelectItem>
                                {applications.map(app => <SelectItem key={app.id} value={app.id}>{app.name}</SelectItem>)}
                                 <SelectItem value="cross-app">Cross-Application</SelectItem>
                            </SelectContent>
                        </Select>
                         <Button variant="ghost" onClick={resetFilters}>
                            <XCircle className="mr-2 h-4 w-4" /> Clear
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          <Card>
              <CardHeader>
                  <CardTitle className="font-headline">Capacity vs. Load</CardTitle>
                  <CardDescription>Compares available resource days with planned/booked days for the selected sprint.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={reportData.capacityVsLoad} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={80} />
                          <Tooltip
                              contentStyle={{
                                  background: "hsl(var(--background))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "var(--radius)",
                              }}
                          />
                          <Legend />
                          <Bar dataKey="available" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="booked" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                  </ResponsiveContainer>
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle className="font-headline">Sprint Burndown</CardTitle>
                  <CardDescription>Tracks remaining work in the selected sprint against an ideal trajectory.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={reportData.burndown} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip
                              contentStyle={{
                                  background: "hsl(var(--background))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "var(--radius)",
                              }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="Remaining" stroke="hsl(var(--primary))" strokeWidth={2} />
                          <Line type="monotone" dataKey="Ideal" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                      </LineChart>
                  </ResponsiveContainer>
              </CardContent>
          </Card>
          
          <Card className="lg:col-span-2">
              <CardHeader>
                  <CardTitle className="font-headline">Team Velocity</CardTitle>
                  <CardDescription>Shows the total effort (in days) completed in each sprint over time.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={reportData.velocity} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip
                              contentStyle={{
                                  background: "hsl(var(--background))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "var(--radius)",
                              }}
                          />
                          <Legend />
                          <Bar dataKey="Completed" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                  </ResponsiveContainer>
              </CardContent>
          </Card>

          <Card className="lg:col-span-2">
              <CardHeader>
                  <CardTitle className="font-headline">Team Allocation by Percentage</CardTitle>
                  <CardDescription>Resource allocation percentage for the selected filters.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(400, reportData.teamAllocation.length * 40)}>
                      <BarChart data={reportData.teamAllocation} layout="vertical" margin={{ top: 5, right: 50, left: 50, bottom: 5 }}>
                          <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} domain={[0, 100]} tickFormatter={(tick) => `${tick}%`} />
                          <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={200} tickLine={false} axisLine={false} />
                          <Tooltip
                              contentStyle={{
                                  background: "hsl(var(--background))",
                                  border: "1px solid hsl(var(--border))",
                                  borderRadius: "var(--radius)",
                              }}
                              formatter={(value) => `${value}%`}
                          />
                          <Legend wrapperStyle={{fontSize: "12px"}}/>
                          <Bar dataKey="allocation" name="Allocation %" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                  </ResponsiveContainer>
              </CardContent>
          </Card>
        </div>
    </div>
  );
}

    