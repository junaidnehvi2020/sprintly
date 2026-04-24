
'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Home,
  ListChecks,
  Users,
  BarChart3,
  PanelLeft,
  Search,
  LogOut,
  Building2,
  Clock,
  Users2,
  Hand,
  Shield,
  PersonStanding,
  LayoutGrid,
  Info,
  Clapperboard,
  UserCog,
  Briefcase,
  Eye,
  CalendarDays,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import { Logo } from './logo';
import { useData } from '@/hooks/use-data';

const mainNavItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/dashboard/my-view', icon: UserIcon, label: 'My View' },
  { href: '/dashboard/tasks', icon: ListChecks, label: 'Tasks' },
  { href: '/dashboard/task-view', icon: Eye, label: 'Task View' },
  { href: '/dashboard/sprints', icon: Clock, label: 'Sprints' },
  { href: '/dashboard/tribes', icon: Users2, label: 'Tribes' },
  { href: '/dashboard/squad-planning', icon: Hand, label: 'Squad Planning' },
  { href: '/dashboard/resource-view', icon: PersonStanding, label: 'Resource View' },
  { href: '/dashboard/resource-calendar', icon: CalendarDays, label: 'Resource Calendar' },
  { href: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
];

const coreNavItems = [
  { href: '/dashboard/resources', icon: Users, label: 'Resources' },
  { href: '/dashboard/roles', icon: Shield, label: 'Roles' },
  { href: '/dashboard/applications', icon: Building2, label: 'Applications' },
];

const adminNavItems = [
    { href: '/dashboard/user-management', icon: UserCog, label: 'User Management', role: 'Admin' },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings', role: 'Admin' },
]


function UserProfile() {
    const { user, role, logout } = useAuth();
    const { resources, roles, applications, imageData } = useData();

    const linkedResource = resources.find(r => r.userId === user?.uid);
    const projectRole = roles.find(r => r.id === linkedResource?.roleId);
    const projectApp = applications.find(a => a.id === linkedResource?.applicationId);
    
    return (
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <p className="font-semibold">{linkedResource?.name || user?.email}</p>
            <p className="text-xs text-muted-foreground font-normal">{user?.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-sm text-muted-foreground space-y-1">
             <div className="flex items-center gap-2">
                <Users2 className="h-4 w-4" />
                <span>Access Role: <span className="font-medium text-foreground">{role}</span></span>
             </div>
              {projectRole && (
                <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    <span>Project Role: <span className="font-medium text-foreground">{projectRole.name}</span></span>
                </div>
              )}
              {projectApp && (
                <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>Application: <span className="font-medium text-foreground">{projectApp.name}</span></span>
                </div>
              )}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/about"><Info className="mr-2 h-4 w-4" />About Sprintly</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/ad-experience?from=dashboard"><Clapperboard className="mr-2 h-4 w-4" />Ad Experience</Link>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>Settings</DropdownMenuItem>
          <DropdownMenuItem disabled>Support</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
    )
}

function DynamicBreadcrumb() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { tasks } = useData();

    const from = searchParams.get('from');
    const pathParts = pathname.split('/').filter(Boolean);

    const isTaskPage = pathParts[1] === 'tasks' && pathParts.length > 2;
    const taskId = isTaskPage ? pathParts[2] : null;
    const task = taskId ? tasks.find(t => t.id === taskId) : null;
    
    const breadcrumbTrail: {label: string, href?: string}[] = [{ label: 'Dashboard', href: '/dashboard'}];

    if (taskId && task) {
        if (from === 'my-view') {
            breadcrumbTrail.push({ label: 'My View', href: '/dashboard/my-view' });
        } else if (from === 'task-view') {
            breadcrumbTrail.push({ label: 'Task View', href: '/dashboard/task-view' });
        } else if (from === 'resource-view') {
            breadcrumbTrail.push({ label: 'Resource View', href: '/dashboard/resource-view' });
        } else if (from === 'resource-calendar') {
            breadcrumbTrail.push({ label: 'Resource Calendar', href: '/dashboard/resource-calendar' });
        } else {
             breadcrumbTrail.push({ label: 'Tasks', href: '/dashboard/tasks' });
        }
        breadcrumbTrail.push({ label: task.title });
    } else {
        pathParts.slice(1).forEach((part, index) => {
            const isLast = index === pathParts.length - 2;
            breadcrumbTrail.push({
                label: part.replace(/-/g, ' '),
                href: isLast ? undefined : `/${pathParts.slice(0, index + 2).join('/')}`
            })
        });
    }

    return (
        <BreadcrumbList>
            {breadcrumbTrail.map((crumb, index) => {
                const isLast = index === breadcrumbTrail.length - 1;
                return (
                     <React.Fragment key={index}>
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                            {isLast || !crumb.href ? (
                                <BreadcrumbPage className="capitalize truncate max-w-20 md:max-w-xs">{crumb.label}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link href={crumb.href} className="capitalize">{crumb.label}</Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    </React.Fragment>
                )
            })}
        </BreadcrumbList>
    );
}

export function AppHeader() {
  const { user, logout, role } = useAuth();
  const { imageData } = useData();
  const pathname = usePathname();
  
  const isCoreSectionActive = coreNavItems.some(item => pathname.startsWith(item.href));
  const isAdminSectionActive = adminNavItems.some(item => pathname.startsWith(item.href));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <nav className="grid gap-6 text-lg font-medium">
            <div className="flex h-10 items-center border-b px-6">
                <Logo />
            </div>
            {mainNavItems.map(item => (
                 <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                </Link>
            ))}
            <Accordion type="single" collapsible defaultValue={isCoreSectionActive ? "core" : ""}>
                <AccordionItem value="core" className="border-b-0">
                    <AccordionTrigger className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground hover:no-underline">
                        <LayoutGrid className="h-5 w-5" />
                        Core
                    </AccordionTrigger>
                    <AccordionContent className="pl-9">
                        <nav className="grid gap-4 text-base font-medium">
                            {coreNavItems.map(item => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center gap-4 text-muted-foreground hover:text-foreground"
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            {role === 'Admin' && (
                <Accordion type="single" collapsible defaultValue={isAdminSectionActive ? "admin" : ""}>
                    <AccordionItem value="admin" className="border-b-0">
                        <AccordionTrigger className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground hover:no-underline">
                           <UserCog className="h-5 w-5" />
                            Admin
                        </AccordionTrigger>
                        <AccordionContent className="pl-9">
                            <nav className="grid gap-4 text-base font-medium">
                                {adminNavItems.map(item => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex items-center gap-4 text-muted-foreground hover:text-foreground"
                                    >
                                        <item.icon className="h-5 w-5" />
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
          </nav>
        </SheetContent>
      </Sheet>
      <Breadcrumb className="hidden md:flex">
        <DynamicBreadcrumb />
      </Breadcrumb>
      <div className="relative ml-auto flex-1 md:grow-0">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search..."
          className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full"
          >
            <Avatar>
              <AvatarImage 
                src={imageData.avatars.user.src} 
                data-ai-hint={imageData.avatars.user['data-ai-hint']} 
                alt={imageData.avatars.user.alt} 
              />
              <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <UserProfile />
      </DropdownMenu>
    </header>
  );
}
