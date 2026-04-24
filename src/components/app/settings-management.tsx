
'use client';

import { useData } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase/config";
import { doc, collection, addDoc, deleteDoc, setDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Button } from "../ui/button";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../ui/table";
import { Input } from "../ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "../ui/popover";
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const weekdays = [
    { id: 0, label: 'Sunday' },
    { id: 1, label: 'Monday' },
    { id: 2, label: 'Tuesday' },
    { id: 3, label: 'Wednesday' },
    { id: 4, label: 'Thursday' },
    { id: 5, label: 'Friday' },
    { id: 6, label: 'Saturday' },
]

export function SettingsManagement() {
    const { settings, holidays, isLoading } = useData();
    const { toast } = useToast();
    
    const [currentWeekend, setCurrentWeekend] = useState<number[]>([]);
    const [overbooking, setOverbooking] = useState<number>(0);
    const [isSaving, setIsSaving] = useState(false);
    
    const [newHolidayName, setNewHolidayName] = useState('');
    const [newHolidayDate, setNewHolidayDate] = useState<Date | undefined>();
    const [isAddingHoliday, setIsAddingHoliday] = useState(false);

    useEffect(() => {
        if (settings) {
            setCurrentWeekend(settings.weekendDays || [0, 6]);
            setOverbooking(settings.overbookingPercentage || 0);
        }
    }, [settings]);

    const handleWeekendChange = (day: number) => {
        setCurrentWeekend(prev => 
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    }

    const saveSettings = async () => {
        const settingsId = settings?.id || 'default';
        setIsSaving(true);
        try {
            const settingsRef = doc(db, 'settings', settingsId);
            await setDoc(settingsRef, { 
                weekendDays: currentWeekend,
                overbookingPercentage: overbooking
            }, { merge: true });
            toast({ title: "Success", description: "Organization settings saved."});
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive'});
        } finally {
            setIsSaving(false);
        }
    }
    
    const handleAddHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHolidayName || !newHolidayDate) {
            toast({ title: "Error", description: "Please provide a name and date for the holiday.", variant: 'destructive'});
            return;
        }
        setIsAddingHoliday(true);
        try {
            await addDoc(collection(db, 'holidays'), {
                name: newHolidayName,
                date: newHolidayDate
            });
            toast({ title: "Success", description: "Holiday added."});
            setNewHolidayName('');
            setNewHolidayDate(undefined);
        } catch (error: any) {
             toast({ title: "Error", description: error.message, variant: 'destructive'});
        } finally {
            setIsAddingHoliday(false);
        }
    }
    
    const handleDeleteHoliday = async (holidayId: string) => {
        try {
            await deleteDoc(doc(db, 'holidays', holidayId));
            toast({ title: "Success", description: "Holiday deleted."});
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: 'destructive'});
        }
    }

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin h-8 w-8" /></div>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Organization Settings</CardTitle>
                    <CardDescription>Define your company's working days, holidays, and capacity rules.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-medium mb-2">Weekend Settings</h3>
                            <p className="text-sm text-muted-foreground mb-4">Select the days of the week that are considered non-working days.</p>
                            <div className="flex flex-wrap gap-4 sm:gap-6">
                                {weekdays.map(day => (
                                    <div key={day.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`day-${day.id}`} 
                                            checked={currentWeekend.includes(day.id)}
                                            onCheckedChange={() => handleWeekendChange(day.id)}
                                        />
                                        <Label htmlFor={`day-${day.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {day.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-medium mb-2">Capacity Headroom</h3>
                            <p className="text-sm text-muted-foreground mb-4">Set a global default for how much resources can be overbooked.</p>
                            <div className="flex items-center gap-2 max-w-xs">
                                <Input 
                                    id="overbooking"
                                    type="number"
                                    value={overbooking}
                                    onChange={e => setOverbooking(parseInt(e.target.value, 10) || 0)}
                                />
                                <span className="text-muted-foreground">%</span>
                            </div>
                        </div>
                        <Button onClick={saveSettings} disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin" /> : 'Save Settings'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>Holiday Management</CardTitle>
                    <CardDescription>Add or remove company-wide holidays. These days will not be counted as working days.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddHoliday} className="flex flex-col sm:flex-row items-end gap-4 mb-6">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="holiday-name">Holiday Name</Label>
                            <Input id="holiday-name" value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} placeholder="e.g., New Year's Day" />
                        </div>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label>Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-[280px] justify-start text-left font-normal",
                                    !newHolidayDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {newHolidayDate ? format(newHolidayDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={newHolidayDate}
                                    onSelect={setNewHolidayDate}
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <Button type="submit" disabled={isAddingHoliday}>
                            {isAddingHoliday ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                            Add Holiday
                        </Button>
                    </form>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Holiday</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {holidays.sort((a,b) => a.date.getTime() - b.date.getTime()).map(holiday => (
                                <TableRow key={holiday.id}>
                                    <TableCell className="font-medium">{holiday.name}</TableCell>
                                    <TableCell>{format(holiday.date, "PPP")}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteHoliday(holiday.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
