'use client';

import {useEffect, useState} from 'react';
import {toast} from 'sonner';

import {
    type BillingTemplate,
    balanceOf,
    INVOICE_STATUS_LABEL,
    type InvoiceListItem,
    type InvoiceStatus,
    naira,
    templateTotal,
    toNumber,
    useBilling,
    termLabel,
} from '@/hooks/billing';
import {useCalendar} from '@/hooks/calendar';
import {useStudent} from '@/hooks/student';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Sheet, SheetContent, SheetHeader, SheetTitle} from '@/components/ui/sheet';
import {DateField} from '@/components/ui/date-field';
import type {StudentRecord} from '@/components/app/student-form-sheet';
import {StudentPicker} from '@/components/app/student-picker';

export function CreateInvoiceSheet({
    open,
    onOpenChange,
    onCreated,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: (invoices: InvoiceListItem[]) => void;
}) {
    const {templates: fetchTemplates, createInvoices} = useBilling();
    const {index: fetchTerms} = useCalendar();
    const {index: fetchStudents} = useStudent();
    const [templates, setTemplates] = useState<BillingTemplate[]>([]);
    const [students, setStudents] = useState<StudentRecord[]>([]);
    const [studentUuids, setStudentUuids] = useState<string[]>([]);
    const [templateUuid, setTemplateUuid] = useState('');
    const [dueAt, setDueAt] = useState('');
    const [terms, setTerms] = useState<{ uuid: string; session: string; term: string | null; status: string }[]>([]);
    const [calendarUuid, setCalendarUuid] = useState('');
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setStudentUuids([]);
        setTemplateUuid('');
        setDueAt('');
        setNote('');
        fetchTemplates().then((r) => r.success && setTemplates(r.data.templates.filter((t: BillingTemplate) => t.status === 'ACTIVE')));
        fetchStudents().then((r) => r.success && setStudents(r.data.students || []));
        fetchTerms().then((r) => {
            if (!r.success) return;
            const list = r.data.calendars || [];
            setTerms(list);
            // Bill the active term unless staff pick another (e.g. next term's fees sent early).
            setCalendarUuid(list.find((c: { status: string }) => c.status === 'ACTIVE')?.uuid || '');        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const template = templates.find((t) => t.uuid === templateUuid);
    const total = template ? templateTotal(template) : 0;
    const selectedTerm = terms.find((t) => t.uuid === calendarUuid);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentUuids.length) return toast.error('Choose at least one student');
        if (!templateUuid) return toast.error('Choose a billing template');
        if (!calendarUuid) return toast.error('Choose the session and term to bill');
        setSaving(true);
        try {
            const response = await createInvoices({
                student_uuids: studentUuids,
                template_uuid: templateUuid,
                calendar_uuid: calendarUuid,
                due_at: dueAt || undefined,
                note,
            });
            if (response.success) {
                // e.g. "3 invoices created, 1 invoice updated, 2 already up to date".
                toast.success(response.message);
                onCreated(response.data.invoices);
                onOpenChange(false);
            } else {
                toast.error(response.message);
            }
        } catch (error: any) {
            toast.error(error.message || 'Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className='w-full overflow-y-auto sm:max-w-md'>
                <SheetHeader>
                    <SheetTitle className='text-xl font-medium'>Create Invoice</SheetTitle>
                </SheetHeader>
                <form onSubmit={handleSubmit} className='flex flex-col gap-5 px-4 pb-6'>
                    <StudentPicker students={students} selected={studentUuids} onChange={setStudentUuids}/>
                    <div className='space-y-2'>
                        <Label>Billing template</Label>
                        <Select value={templateUuid} onValueChange={setTemplateUuid}>
                            <SelectTrigger className='w-full'>
                                <SelectValue placeholder={templates.length ? 'Select template' : 'No active templates'}/>
                            </SelectTrigger>
                            <SelectContent>
                                {templates.map((t) => (
                                    <SelectItem key={t.uuid} value={t.uuid}>
                                        {t.name} · {naira(templateTotal(t))}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='invoice-term'>Session and term</Label>
                        {/* Empty changes are ignored: the select can report one as it mounts, wiping the default term. */}
                        <Select value={calendarUuid} onValueChange={(value) => value && setCalendarUuid(value)} disabled={!terms.length}>
                            <SelectTrigger id='invoice-term' className='w-full'>
                                {/* Named here: the current term is chosen before the list has ever opened. */}
                                <SelectValue placeholder={terms.length ? 'Choose a term' : 'No terms yet'}>
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
                                ? 'One invoice per student, template and term: billing them again updates it with the current fees.'
                                : 'Add the session and term in Calendar first.'}
                        </p>
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='invoice-due'>Due date (optional)</Label>
                        <DateField id='invoice-due' value={dueAt} onChange={setDueAt}/>
                    </div>
                    <div className='space-y-2'>
                        <Label htmlFor='invoice-note'>Note to parent (optional)</Label>
                        <Textarea
                            id='invoice-note'
                            placeholder='e.g. Please pay within 15 days of receiving this invoice.'
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    {template && (
                        <div className='space-y-2 rounded-[10px] border border-border p-4 text-sm'>
                            {template.items.map((item, i) => (
                                <div key={item.uuid || i} className='flex justify-between gap-3'>
                                    <span className='text-muted-foreground'>{item.description}</span>
                                    <span>{naira(item.amount)}</span>
                                </div>
                            ))}
                            <div className='flex justify-between border-t border-border pt-2 font-medium'>
                                <span>Total per student</span>
                                <span>{naira(total)}</span>
                            </div>
                            {studentUuids.length > 1 && (
                                <p className='text-xs text-muted-foreground'>
                                    {studentUuids.length} invoices · {naira(total * studentUuids.length)} in total
                                </p>
                            )}
                        </div>
                    )}

                    <Button type='submit' className='w-full' disabled={saving}>
                        {saving ? 'Creating...' : studentUuids.length > 1 ? `Create ${studentUuids.length} invoices` : 'Create invoice'}
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}

const STATUS_OPTIONS = Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[];

export function UpdateStatusSheet({
    invoice,
    onOpenChange,
    onUpdated,
}: {
    invoice: InvoiceListItem | null;
    onOpenChange: (open: boolean) => void;
    onUpdated: (invoice: InvoiceListItem) => void;
}) {
    const {updateStatus} = useBilling();
    const [status, setStatus] = useState<InvoiceStatus>('PENDING');
    const [amount, setAmount] = useState('');
    const [discount, setDiscount] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!invoice) return;
        setStatus(invoice.status);
        setAmount('');
        setDiscount('');
        setDescription('');
    }, [invoice]);

    const balance = invoice ? balanceOf(invoice) : 0;
    // A discount goes with a part or full payment, and comes off the balance.
    const paying = status === 'PART_PAYMENT' || status === 'FULL_PAYMENT';
    const discountValue = paying ? toNumber(discount.replace(/,/g, '')) : 0;
    const balanceAfterDiscount = Math.max(0, balance - discountValue);
    const amountLabel =
        status === 'REFUNDED' ? 'Amount refunded' : status === 'PART_PAYMENT' || status === 'FULL_PAYMENT' ? 'Amount received' : 'Amount';
    const amountDisabled = status === 'PENDING' || status === 'CANCELLED';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoice) return;
        setSaving(true);
        try {
            const response = await updateStatus(invoice.uuid, {
                status,
                amount: amountDisabled ? undefined : amount.replace(/,/g, ''),
                discount: paying && discount ? discount.replace(/,/g, '') : undefined,
                description,
            });
            if (response.success) {
                toast.success('Invoice status updated');
                onUpdated(response.data.invoice);
                onOpenChange(false);
            } else {
                toast.error(response.message);
            }
        } catch (error: any) {
            toast.error(error.message || 'Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Sheet open={!!invoice} onOpenChange={onOpenChange}>
            <SheetContent className='w-full sm:max-w-md'>
                <SheetHeader>
                    <SheetTitle className='text-xl font-medium'>Update invoice status</SheetTitle>
                </SheetHeader>
                {invoice && (
                    <form onSubmit={handleSubmit} className='flex flex-col gap-5 px-4 pb-6'>
                        <div className={`grid gap-2 rounded-[10px] bg-muted/50 p-3 text-xs ${toNumber(invoice.discount) > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
                            <div>
                                <p className='text-muted-foreground'>Total</p>
                                <p className='mt-0.5 text-sm font-medium'>{naira(invoice.total)}</p>
                            </div>
                            {toNumber(invoice.discount) > 0 && (
                                <div>
                                    <p className='text-muted-foreground'>Discount</p>
                                    <p className='mt-0.5 text-sm font-medium'>{naira(invoice.discount)}</p>
                                </div>
                            )}
                            <div>
                                <p className='text-muted-foreground'>Paid</p>
                                <p className='mt-0.5 text-sm font-medium'>{naira(invoice.paid)}</p>
                            </div>
                            <div>
                                <p className='text-muted-foreground'>Balance</p>
                                <p className='mt-0.5 text-sm font-medium'>{naira(balance)}</p>
                            </div>
                        </div>
                        <div className='space-y-2'>
                            <Label>Status</Label>
                            <Select value={status} onValueChange={(value) => setStatus(value as InvoiceStatus)}>
                                <SelectTrigger className='w-full'>
                                    <SelectValue/>
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{INVOICE_STATUS_LABEL[s]}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='space-y-2'>
                            <Label htmlFor='status-amount'>{amountLabel}</Label>
                            <div className='relative'>
                                <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>₦</span>
                                <Input
                                    id='status-amount'
                                    inputMode='decimal'
                                    placeholder={status === 'FULL_PAYMENT' ? String(balanceAfterDiscount) : '00'}
                                    className='pl-7'
                                    disabled={amountDisabled}
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                                />
                            </div>
                            {status === 'FULL_PAYMENT' && (
                                <p className='text-xs text-muted-foreground'>Leave blank to record the outstanding balance as paid.</p>
                            )}
                        </div>
                        {paying && (
                            <div className='space-y-2'>
                                <Label htmlFor='status-discount'>Discount (optional)</Label>
                                <div className='relative'>
                                    <span className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground'>₦</span>
                                    <Input
                                        id='status-discount'
                                        inputMode='decimal'
                                        placeholder='00'
                                        className='pl-7'
                                        value={discount}
                                        onChange={(e) => setDiscount(e.target.value.replace(/[^\d.,]/g, ''))}
                                    />
                                </div>
                                <p className='text-xs text-muted-foreground'>
                                    {discountValue > balance
                                        ? `At most ${naira(balance)}, the balance.`
                                        : discountValue > 0
                                            ? `Comes off the balance: ${naira(balanceAfterDiscount)} left to pay.`
                                            : 'Taken off what the parent owes. It shows on the invoice.'}
                                </p>
                            </div>
                        )}
                        <div className='space-y-2'>
                            <Label htmlFor='status-description'>Description</Label>
                            <Textarea
                                id='status-description'
                                placeholder='Enter description'
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <Button type='submit' className='w-full' disabled={saving}>
                            {saving ? 'Saving...' : 'Submit'}
                        </Button>
                    </form>
                )}
            </SheetContent>
        </Sheet>
    );
}
