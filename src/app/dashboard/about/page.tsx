'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useData } from "@/hooks/use-data";
import { Loader2 } from "lucide-react";
import Image from "next/image";


export default function AboutPage() {
    const { imageData, isLoading } = useData();

    const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
        <section className="mb-12 break-inside-avoid">
            <h2 className="font-headline text-3xl font-semibold mb-4 pb-2 border-b-2 border-primary">{title}</h2>
            <div className="prose prose-lg max-w-none text-foreground/90">
                {children}
            </div>
        </section>
    );

    const Screenshot = ({ imageKey }: { imageKey: keyof typeof imageData.screenshots }) => {
        if (!imageData || !imageData.screenshots[imageKey]) return null;
        const { src, alt, caption, width, height, "data-ai-hint": dataAiHint } = imageData.screenshots[imageKey];
        return (
            <figure className="my-8 break-inside-avoid">
                <div className="rounded-lg border overflow-hidden shadow-lg">
                    <Image 
                        src={src} 
                        alt={alt} 
                        width={width}
                        height={height}
                        className="object-cover object-top"
                        data-ai-hint={dataAiHint}
                    />
                </div>
                <figcaption className="text-center text-sm text-muted-foreground mt-2">{caption}</figcaption>
            </figure>
        )
    };

    if (isLoading || !imageData) {
      return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <header className="text-center mb-16 break-after-avoid-page">
        <h1 className="font-headline text-5xl font-extrabold tracking-tight text-primary mt-4">Sprintly</h1>
        <p className="mt-4 text-xl text-muted-foreground">Your Comprehensive Guide to Project & Resource Planning</p>
      </header>

      <Section title="Introduction">
        <p>Welcome to Sprintly, a powerful web-based tool designed to streamline your project planning, resource allocation, and task management processes. This guide provides a detailed overview of all the features and functionalities available in the current version of the tool. Whether you are a project manager, a team lead, or a developer, Sprintly provides the clarity and control you need to deliver projects on time.</p>
      </Section>

      <Section title="The Dashboard">
        <p>The Dashboard is your command center. It provides a high-level, real-time overview of your entire project landscape. Key components include:</p>
        <ul>
          <li><strong>Data Management:</strong> Quickly import, export, or reset your project data.</li>
          <li><strong>Bulk Upload:</strong> Efficiently upload resource allocations for sprints using a CSV file.</li>
          <li><strong>Metric Cards:</strong> At-a-glance statistics for critical project metrics like 'Tasks In Progress', 'Total Resources', 'Total Sprints', and 'Completed Tasks'.</li>
          <li><strong>Visual Charts:</strong> Interactive charts that visualize 'Resource Utilization' and 'Task Status Overview', helping you identify bottlenecks and track progress effectively.</li>
        </ul>
        <Screenshot imageKey="dashboard" />
      </Section>

      <Section title="Core Data Setup">
        <p>The foundation of any good plan is well-organized data. The 'Core' section allows you to define the building blocks of your projects.</p>
        <div className="ml-4">
            <h3 className="text-2xl font-semibold mt-6 mb-2">Sprints</h3>
            <p>Define the time-boxed periods for your development cycles. Each sprint requires a unique name, a start date, and an end date.</p>
            <Screenshot imageKey="sprints" />
            
            <h3 className="text-2xl font-semibold mt-6 mb-2">Tribes & Squads</h3>
            <p>Organize your teams hierarchically. Create 'Tribes' as high-level groups (e.g., Core Platform, Mobile) and then nest 'Squads' (e.g., Frontend Team, Backend Team) within them.</p>
            <Screenshot imageKey="tribes" />

            <h3 className="text-2xl font-semibold mt-6 mb-2">Applications</h3>
            <p>List all the distinct products, services, or applications your teams are working on. Tasks will be linked to these applications.</p>
            <Screenshot imageKey="applications" />

            <h3 className="text-2xl font-semibold mt-6 mb-2">Roles</h3>
            <p>Define the different roles within your teams, such as 'Developer', 'Designer', 'QA Engineer', or 'PM'.</p>
            <Screenshot imageKey="roles" />

            <h3 className="text-2xl font-semibold mt-6 mb-2">Resources</h3>
            <p>Create profiles for each team member. Each resource has a name, an assigned role, and can be optionally associated with a primary application for specialization.</p>
            <Screenshot imageKey="resources" />
        </div>
      </Section>

      <Section title="Planning & Execution">
        <p>Once your core data is set up, you can begin the planning and execution phase.</p>
         <div className="ml-4">
            <h3 className="text-2xl font-semibold mt-6 mb-2">Squad Planning</h3>
            <p>This is where you allocate resources to squads for a specific sprint. You can make a resource 'Dedicated' to a squad (100% of their time) or 'Shared' with a specific percentage of their capacity. The system prevents over-allocation beyond 100% for any resource within a sprint.</p>
            <Screenshot imageKey="planning" />

            <h3 className="text-2xl font-semibold mt-6 mb-2">Task Management</h3>
            <p>The Task Management view provides a central place to see all project tasks. You can create new tasks, which opens a detailed form to capture all necessary information.</p>
             <Screenshot imageKey="tasks" />
            <p className="mt-4">When creating or editing a task, you can specify:</p>
            <ul>
                <li>A title, reference ID, and detailed description.</li>
                <li>The sprint, tribe, and squad the task belongs to.</li>
                <li>The applications impacted by the task. For each application, you define the effort in days.</li>
                <li><strong>Detailed Resource Assignment:</strong> For each impacted application, you can assign specific resources and plan the exact number of days they will work on the task. The system validates this against the resource's remaining capacity for the sprint, preventing overbooking.</li>
            </ul>
             <Screenshot imageKey="taskResourceAssignment" />

            <h3 className="text-2xl font-semibold mt-6 mb-2">Task Detail View</h3>
            <p>Clicking on any task takes you to its detail page. Here you can update its title and description, track its progress with a slider, and manage the impacted applications and their assigned resources in detail. This view also features an **AI Time Adjuster**, which analyzes the task's progress and complexity to provide a refined time estimate.</p>
            <Screenshot imageKey="taskDetail" />
         </div>
      </Section>
       <Section title="Reporting">
        <p>Sprintly includes powerful reporting tools to give you insights into your project's execution.</p>
         <div className="ml-4">
            <h3 className="text-2xl font-semibold mt-6 mb-2">Team Allocation Report</h3>
            <p>This report provides a bar chart visualizing the allocation percentage of each resource. You can filter the view by sprint, tribe, squad, and application to get granular insights into how your team's capacity is being used.</p>
            <Screenshot imageKey="teamAllocationReport" />

            <h3 className="text-2xl font-semibold mt-6 mb-2">Resource View</h3>
            <p>This view gives a tabular breakdown of each resource's capacity for a selected sprint and team. It shows their total available days, how many days have been booked against tasks, and provides direct links to the tasks they are assigned to, making it easy to see who is working on what.</p>
            <Screenshot imageKey="reports" />
         </div>
      </Section>

    </div>
  );
}
