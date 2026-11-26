'use client';

import {useEffect, useState} from 'react';
import {toast} from 'sonner';
import {Plus} from 'lucide-react';

import {useUser} from '@/hooks/user';
import {Button} from '@/components/ui/button';
import LoadingPage from '@/components/loading-page';
import {PeopleTable} from '@/components/app/people-table';
import {PersonFormSheet, type PersonRecord} from '@/components/app/person-form-sheet';
import {PersonDetailSheet} from '@/components/app/person-detail-sheet';
import {DataTransferMenu} from '@/components/app/data-transfer-menu';
import {useStudent} from '@/hooks/student';
import type {StudentRecord} from '@/components/app/student-form-sheet';
import {StudentDetailSheet} from '@/components/app/student-detail-sheet';

export default function ParentsPage() {
    const {index} = useUser();
    const [isLoading, setIsLoading] = useState(true);
    const [parents, setParents] = useState<PersonRecord[]>([]);

    const [formOpen, setFormOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [activePerson, setActivePerson] = useState<PersonRecord | null>(null);
    // Students, to show each parent's children.
    const {index: indexStudents} = useStudent();
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [activeChild, setActiveChild] = useState<StudentRecord | null>(null);
    const children = activePerson ? students.filter((s) => s.parent_uuid === activePerson.uuid) : [];

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const response = await index('parent');
            if (response.success) {
                setParents((response.data.user || []).map((entry: any) => entry.user));
            } else {
                toast.error(response.message || 'Something went wrong');
            }
        } catch (error: any) {
            toast.error(error.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        indexStudents()
            .then((r) => r.success && setStudents(r.data.students || []))
            .catch(() => undefined);
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (isLoading) {
        return <LoadingPage/>;
    }

    return (
        <div className='space-y-6'>
            <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                    <h1 className='text-3xl font-bold tracking-tight'>Parents</h1>
                    <p className='text-muted-foreground'>
                        Manage school parent information and accounts
                    </p>
                </div>
                <div className='flex flex-wrap gap-2'>
                    <DataTransferMenu types={['parents']} onImported={fetchData}/>
                    <Button
                        size='sm'
                        onClick={() => {
                            setActivePerson(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus className='h-4 w-4'/>
                        Add parent
                    </Button>
                </div>
            </div>

            <PeopleTable
                role='PARENT'
                people={parents}
                fetchData={fetchData}
                onView={(person) => {
                    setActivePerson(person);
                    setDetailOpen(true);
                }}
                onEdit={(person) => {
                    setActivePerson(person);
                    setFormOpen(true);
                }}
            />

            <PersonFormSheet
                role='PARENT'
                open={formOpen}
                onOpenChange={setFormOpen}
                person={activePerson}
                onSaved={fetchData}
            />
            <PersonDetailSheet
                role='PARENT'
                open={detailOpen}
                onOpenChange={setDetailOpen}
                person={activePerson}
                extra={
                    <div className='py-3'>
                        <p className='mb-2 text-sm text-muted-foreground'>
                            {children.length === 1 ? 'Child' : `Children (${children.length})`}
                        </p>
                        {children.length === 0 ? (
                            <p className='px-2 text-sm text-muted-foreground'>No children linked yet.</p>
                        ) : (
                            <ul className='space-y-1'>
                                {children.map((child) => (
                                    <li key={child.uuid}>
                                        <button
                                            type='button'
                                            className='flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted'
                                            onClick={() => {
                                                setDetailOpen(false);
                                                setActiveChild(child);
                                            }}
                                        >
                                            <span className='font-medium'>{child.name}</span>
                                            <span className='text-muted-foreground'>{child.class?.name}</span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                }
            />
            <StudentDetailSheet
                open={!!activeChild}
                onOpenChange={(open) => !open && setActiveChild(null)}
                student={activeChild}
                onViewParent={() => {
                    setActiveChild(null);
                    setDetailOpen(true);
                }}
            />
        </div>
    );
}
