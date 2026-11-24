'use client';

import {useEffect, useState} from 'react';
import {toast} from 'sonner';

import {useSubject} from '@/hooks/subject';
import {useUser} from '@/hooks/user';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';

export interface SubjectRecord {
    uuid: string;
    name: string;
    description?: string;
    class_uuid: string;
    /** The teacher who teaches it in this class. */
    teacher_uuid?: string | null;
    teacher?: {uuid: string; name: string | null} | null;
}

const NO_TEACHER = 'none';

interface SubjectFormSheetProps {
    classUuid: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    subject?: SubjectRecord | null;
    onSaved: () => void;
}

export function SubjectFormSheet({classUuid, open, onOpenChange, subject, onSaved}: SubjectFormSheetProps) {
    const {create, update} = useSubject();
    const {index: indexUsers} = useUser();
    const [name, setName] = useState(() => subject?.name || '');
    const [description, setDescription] = useState(() => subject?.description || '');
    const [teacher, setTeacher] = useState(() => subject?.teacher_uuid || NO_TEACHER);
    const [teachers, setTeachers] = useState<{uuid: string; name: string}[]>([]);

    // Academic staff, as for a class's teachers.
    useEffect(() => {
        if (!open) return;
        indexUsers('staff').then((response) => {
            if (response.success) {
                setTeachers(
                    (response.data.user || [])
                        .map((entry: any) => entry.user)
                        .filter((user: any) => user.position === 'ACADEMIC'),
                );
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
    const [submitting, setSubmitting] = useState(false);

    const isEdit = !!subject;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            toast.error('Subject name is required');
            return;
        }

        setSubmitting(true);
        try {
            const teacherUuid = teacher === NO_TEACHER ? null : teacher;
            const response = isEdit
                ? await update(subject!.uuid, classUuid, name, description, teacherUuid)
                : await create(classUuid, name, description, teacherUuid);

            if (response.success) {
                toast.success(`Subject ${isEdit ? 'updated' : 'added'} successfully`);
                onOpenChange(false);
                onSaved();
            } else {
                toast.error(response.message || 'Something went wrong');
            }
        } catch (error: any) {
            toast.error(error.message || 'Something went wrong');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className='w-full sm:max-w-md'>
                <SheetHeader>
                    <SheetTitle>{isEdit ? 'Edit Subject' : 'Add Subject'}</SheetTitle>
                </SheetHeader>

                <form onSubmit={handleSubmit} className='flex flex-col gap-5 px-4 pb-6'>
                    <div className='space-y-2'>
                        <Label htmlFor='name'>Subject name</Label>
                        <Input
                            id='name'
                            placeholder='Enter name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className='space-y-2'>
                        <Label>Teacher</Label>
                        <Select value={teacher} onValueChange={setTeacher}>
                            <SelectTrigger className='w-full'>
                                <SelectValue placeholder='Select teacher' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={NO_TEACHER}>No teacher yet</SelectItem>
                                {teachers.map((t) => (
                                    <SelectItem key={t.uuid} value={t.uuid}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className='text-xs text-muted-foreground'>
                            They can set tests and exams for this subject in connected apps.
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='description'>Description</Label>
                        <Textarea
                            id='description'
                            placeholder='Enter subject description'
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <Button type='submit' disabled={submitting} className='w-full'>
                        {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add subject'}
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}
