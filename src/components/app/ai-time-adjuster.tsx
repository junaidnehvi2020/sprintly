'use client';

import { useState, useEffect } from 'react';
import { getAiTimeAdjustment } from '@/lib/actions';
import type { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

type Adjustment = {
    adjustedEstimateDays: number;
    explanation: string;
};

export function AITimeAdjuster({ task }: { task: Task }) {
    const [isLoading, setIsLoading] = useState(false);
    const [adjustment, setAdjustment] = useState<Adjustment | null>(task.adjustedEstimateDays ? { adjustedEstimateDays: task.adjustedEstimateDays, explanation: task.adjustmentExplanation || '' } : null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    const handleGetAdjustment = async () => {
        setIsLoading(true);
        const result = await getAiTimeAdjustment(task);
        
        if (result.success && result.data) {
            try {
                const taskRef = doc(db, 'tasks', task.id);
                await updateDoc(taskRef, {
                    adjustedEstimateDays: result.data.adjustedEstimateDays,
                    adjustmentExplanation: result.data.explanation,
                });
                setAdjustment(result.data);
                setIsDialogOpen(true);
            } catch (error: any) {
                 toast({
                    title: 'Error updating task',
                    description: error.message,
                    variant: 'destructive',
                });
            } finally {
                setIsLoading(false);
            }
        } else {
            toast({
                title: 'Error from AI',
                description: result.error,
                variant: 'destructive',
            });
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setAdjustment(task.adjustedEstimateDays ? { adjustedEstimateDays: task.adjustedEstimateDays, explanation: task.adjustmentExplanation || '' } : null);
    }, [task]);

    return (
        <div>
            {adjustment ? (
                <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Original Estimate</p>
                        <p className="font-semibold">{task.estimatedDays} days</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">AI-Adjusted Estimate</p>
                        <p className="text-2xl font-bold text-primary">{adjustment.adjustedEstimateDays.toFixed(1)} days</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Explanation</p>
                        <p className="text-sm">{adjustment.explanation}</p>
                    </div>
                    <Button onClick={handleGetAdjustment} disabled={isLoading} variant="outline" size="sm">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Re-analyze
                    </Button>
                </div>

            ) : (
                <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <h3 className="font-semibold">Refine Estimate</h3>
                        <p className="text-sm text-muted-foreground">Use AI to get a more accurate time estimate.</p>
                    </div>
                    <Button onClick={handleGetAdjustment} disabled={isLoading}>
                        {isLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Analyze Task
                    </Button>
                </div>
            )}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="font-headline flex items-center gap-2"><Sparkles className="text-primary"/>AI Adjustment Complete</DialogTitle>
                        <DialogDescription>
                            Here is the refined time estimate for this task.
                        </DialogDescription>
                    </DialogHeader>
                    {adjustment && (
                         <div className="space-y-4 pt-4">
                             <div>
                                 <p className="text-sm text-muted-foreground">Original Estimate</p>
                                 <p className="font-semibold">{task.estimatedDays} days</p>
                             </div>
                             <div>
                                 <p className="text-sm text-muted-foreground">AI-Adjusted Estimate</p>
                                 <p className="text-3xl font-bold text-primary">{adjustment.adjustedEstimateDays.toFixed(1)} days</p>
                             </div>
                             <div>
                                 <p className="text-sm text-muted-foreground">Explanation</p>
                                 <p>{adjustment.explanation}</p>
                             </div>
                         </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
