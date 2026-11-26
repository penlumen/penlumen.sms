'use client';

import {useEffect, useState} from 'react';
import {toast} from 'sonner';

import {useResult} from '@/hooks/result';
import {useCalendar} from '@/hooks/calendar';
import {useStudent} from '@/hooks/student';
import {termLabel} from '@/hooks/billing';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Sheet, SheetContent, SheetHeader, SheetTitle} from '@/components/ui/sheet';
import type {StudentRecord} from '@/components/app/student-form-sheet';
import {StudentPicker} from '@/components/app/student-picker';

type Term = { uuid: string; session: string; term: string | null; status: string };

/** Generate (or refresh) report cards for the students picked, for one session and term. */
export function GenerateReportsSheet({
    open,
    onOpenChange,
    onGenerated,
    classUuids,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGenerated: () => void;
    /** Only students in these classes (a teacher's own); all students when omitted. */
    classUuids?: string[];
}) {
    const {bulkCreate} = useResult();
    const {index: fetchTerms} = useCalendar();
    const {index: fetchStudents} = useStudent();
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [studentUuids, setStudentUuids] = useState<string[]>([]);
    const [terms, setTerms] = useState<Term[]>([]);
    const [calendarUuid, setCalendarUuid] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setStudentUuids([]);
        fetchStudents().then((r) => {
            if (!r.success) return;
            const list: StudentRecord[] = r.data.students || [];
            setStudents(classUuids ? list.filter((s) => s.class_uuid && classUuids.includes(s.class_uuid)) : list);
        });
        fetchTerms().then((r) => {
            if (!r.success) return;
            const list: Term[] = r.data.calendars || [];
            setTerms(list);
            setCalendarUuid(list.find((c) => c.status === 'ACTIVE')?.uuid || '');
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const selectedTerm = terms.find((t) => t.uuid === calendarUuid);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentUuids.length) return toast.error('Choose at least one student');
        if (!calendarUuid) return toast.error('Choose the session and term');
        setSaving(true);
        try {
            const response = await bulkCreate(studentUuids, calendarUuid);
            if (response.success) {
                if (response.data?.failed?.length) toast.warning(response.message);
                else toast.success(response.message);
                onGenerated();
                onOpenChange(false);
            } else {
                toast.error(response.message);
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error.message || 'Could not generate reports');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className='w-full overflow-y-auto sm:max-w-md'>
                <SheetHeader>
                    <SheetTitle className='text-xl font-medium'>Generate Report</SheetTitle>
                </SheetHeader>
                <form onSubmit={handleSubmit} className='flex flex-col gap-5 px-4 pb-6'>
                    <StudentPicker students={students} selected={studentUuids} onChange={setStudentUuids}/>
                    <div className='space-y-2'>
                        <Label htmlFor='report-term'>Session and term</Label>
                        <Select value={calendarUuid} onValueChange={(value) => value && setCalendarUuid(value)} disabled={!terms.length}>
                            <SelectTrigger id='report-term' className='w-full'>
                                <SelectValue placeholder={terms.length ? 'Select session and term' : 'No terms yet'}>
                                    {selectedTerm
                                        ? `${termLabel(selectedTerm)}${selectedTerm.status === 'ACTIVE' ? ' (current)' : ''}`
                                        : undefined}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {terms.map((t) => (
                                    <SelectItem key={t.uuid} value={t.uuid}>
                                        {termLabel(t)}{t.status === 'ACTIVE' ? ' (current)' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className='text-xs text-muted-foreground'>
                            {terms.length
                                ? 'One report per student and term: generating again refreshes it with the latest scores.'
                                : 'Add the session and term in Calendar first.'}
                        </p>
                    </div>
                    <Button type='submit' disabled={saving || !studentUuids.length || !calendarUuid}>
                        {saving
                            ? 'Generating...'
                            : `Generate ${studentUuids.length || ''} ${studentUuids.length === 1 ? 'report' : 'reports'}`.replace('  ', ' ')}
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}
