'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ListChecks,
  Users,
  BarChart3,
  LogOut,
  Building2,
  Clock,
  Users2,
  Hand,
  Shield,
  PersonStanding,
  LayoutGrid,
  UserCog,
  Eye,
  CalendarDays,
  Settings,
  User as UserIcon,
  KeyRound
} from 'lucide-react';
import { Logo } from './logo';
import { useAuth } from '@/lib/auth';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { ScrollArea } from '../ui/scroll-area';

const mainNavItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard', permission: 'page:dashboard' },
  { href: '/dashboard/my-view', icon: UserIcon, label: 'My View', permission: 'page:my-view' },
  { href: '/dashboard/sprints', icon: Clock, label: 'Sprints', permission: 'page:sprints' },
  { href: '/dashboard/tribes', icon: Users2, label: 'Tribes', permission: 'page:tribes' },
  { href: '/dashboard/squad-planning', icon: Hand, label: 'Squad Planning', permission: 'page:squad-planning' },
  { href: '/dashboard/tasks', icon: ListChecks, label: 'Tasks', permission: 'page:tasks' },
  { href: '/dashboard/task-view', icon: Eye, label: 'Task View', permission: 'page:task-view' },
  { href: '/dashboard/resource-view', icon: PersonStanding, label: 'Resource View', permission: 'page:resource-view' },
  { href: '/dashboard/resource-calendar', icon: CalendarDays, label: 'Resource Calendar', permission: 'page:resource-calendar'},
  { href: '/dashboard/reports', icon: BarChart3, label: 'Reports', permission: 'page:reports' },
];

const coreNavItems = [
  { href: '/dashboard/applications', icon: Building2, label: 'Applications', permission: 'page:applications' },
  { href: '/dashboard/roles', icon: Shield, label: 'Roles', permission: 'page:roles' },
  { href: '/dashboard/resources', icon: Users, label: 'Resources', permission: 'page:resources' },
];

const adminNavItems = [
    { href: '/dashboard/user-management', icon: UserCog, label: 'User Management', permission: 'page:user-management' },
    { href: '/dashboard/settings', icon: Settings, label: 'Org Settings', permission: 'page:settings' },
    { href: '/dashboard/settings/access-control', icon: KeyRound, label: 'Access Control', permission: 'page:access-control' },
]

export function AppSidebar() {
  const pathname = usePathname();
  const { logout, role, hasPermission } = useAuth();
  
  const isCoreSectionActive = coreNavItems.some(item => pathname.startsWith(item.href));
  const isAdminSectionActive = adminNavItems.some(item => pathname.startsWith(item.href));
  
  const visibleMainNavItems = mainNavItems.filter(item => hasPermission(item.permission));
  const visibleCoreNavItems = coreNavItems.filter(item => hasPermission(item.permission));


  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r bg-background sm:flex">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className='flex items-center gap-2 font-semibold'>
          <Logo />
        </Link>
      </div>
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <nav className="flex flex-col gap-2 px-4 py-4 sm:py-5">
            {visibleMainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    pathname === item.href
                        ? 'bg-primary text-primary-foreground hover:text-primary-foreground'
                        : 'hover:bg-muted'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
            {visibleCoreNavItems.length > 0 && (
              <Accordion type="single" collapsible defaultValue={isCoreSectionActive ? "core" : ""}>
                  <AccordionItem value="core" className="border-b-0">
                      <AccordionTrigger className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:no-underline',
                          isCoreSectionActive && 'text-primary'
                      )}>
                          <div className="flex items-center gap-3">
                              <LayoutGrid className="h-4 w-4" />
                              Core
                          </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-4">
                          <nav className="grid gap-1">
                              {visibleCoreNavItems.map(item => (
                                  <Link
                                      key={item.href}
                                      href={item.href}
                                      className={cn(
                                          'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                                          pathname.startsWith(item.href) && 'bg-muted text-primary'
                                      )}
                                  >
                                      <item.icon className="h-4 w-4" />
                                      {item.label}
                                  </Link>
                              ))}
                          </nav>
                      </AccordionContent>
                  </AccordionItem>
              </Accordion>
            )}
            {role === 'Admin' && (
                <Accordion type="single" collapsible defaultValue={isAdminSectionActive ? "admin" : ""}>
                    <AccordionItem value="admin" className="border-b-0">
                        <AccordionTrigger className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:no-underline',
                            isAdminSectionActive && 'text-primary'
                        )}>
                            <div className="flex items-center gap-3">
                                <UserCog className="h-4 w-4" />
                                Admin
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-4">
                            <nav className="grid gap-1">
                                {adminNavItems.map(item => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                                            pathname.startsWith(item.href) && 'bg-muted text-primary'
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                ))}
                            </nav>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
          </nav>
        </ScrollArea>
      </div>
      <div className="mt-auto border-t p-4">
          <Button onClick={logout} variant="ghost" className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              Logout
          </Button>
      </div>
    </aside>
  );
}
