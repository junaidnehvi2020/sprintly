'use server';

/**
 * @fileOverview An AI-powered time adjustment flow.
 *
 * - adjustTimeEstimate - A function that adjusts the time estimate for a task based on historical data.
 * - AdjustTimeEstimateInput - The input type for the adjustTimeEstimate function.
 * - AdjustTimeEstimateOutput - The return type for the adjustTimeEstimate function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AdjustTimeEstimateInputSchema = z.object({
  taskId: z.string().describe('The ID of the task to adjust the time estimate for.'),
  completedPercentage: z.number().describe('The percentage of the task that has been completed.'),
  originalEstimateDays: z.number().describe('The original estimated time for the task in days.'),
  resourceAllocation: z
    .array(z.object({resourceId: z.string(), role: z.string()}))
    .describe('The resources allocated to the task.'),
  taskDescription: z.string().describe('The description of the task.'),
});
export type AdjustTimeEstimateInput = z.infer<typeof AdjustTimeEstimateInputSchema>;

const AdjustTimeEstimateOutputSchema = z.object({
  adjustedEstimateDays: z
    .number()
    .describe('The adjusted estimated time for the task in days.'),
  explanation: z.string().describe('The explanation for the adjusted time estimate.'),
});
export type AdjustTimeEstimateOutput = z.infer<typeof AdjustTimeEstimateOutputSchema>;

export async function adjustTimeEstimate(
  input: AdjustTimeEstimateInput
): Promise<AdjustTimeEstimateOutput> {
  return adjustTimeEstimateFlow(input);
}

const adjustTimeEstimatePrompt = ai.definePrompt({
  name: 'adjustTimeEstimatePrompt',
  input: {schema: AdjustTimeEstimateInputSchema},
  output: {schema: AdjustTimeEstimateOutputSchema},
  prompt: `You are an experienced project manager. You will analyze the task details, resource allocation, and completion percentage of a task to provide a more realistic time estimate for future similar tasks.

Task Description: {{{taskDescription}}}
Original Estimate (days): {{{originalEstimateDays}}}
Completed Percentage: {{{completedPercentage}}}
Resource Allocation: {{#each resourceAllocation}}{{{resourceId}}} ({{{role}}}) {{/each}}

Based on this information, provide an adjusted time estimate in days and explain your reasoning. Focus on improving the accuracy of future estimates.

Adjusted Estimate (days): 
Explanation: `,
});

const adjustTimeEstimateFlow = ai.defineFlow(
  {
    name: 'adjustTimeEstimateFlow',
    inputSchema: AdjustTimeEstimateInputSchema,
    outputSchema: AdjustTimeEstimateOutputSchema,
  },
  async input => {
    const {output} = await adjustTimeEstimatePrompt(input);
    return output!;
  }
);
