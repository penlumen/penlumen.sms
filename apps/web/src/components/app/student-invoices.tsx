'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {Plus} from 'lucide-react';

import {balanceOf, type InvoiceListItem, naira, termLabel, toNumber, useBilling} from '@/hooks/billing';
import {Button} from '@/components/ui/button';
import {Skeleton} from '@/components/ui/skeleton';
import {InvoiceStatusBadge} from '@/components/app/billing-ui';
import {CreateInvoiceSheet} from '@/components/app/invoice-sheets';

/** A student's invoices, for the Invoice tab of their profile, with "Generate invoice" for them. */
export function StudentInvoices({studentUuid}: { studentUuid: string }) {
    const {invoices: fetchInvoices} = useBilling();
    const [invoices, setInvoices] = useState<InvoiceListItem[] | null>(null);
    const [createOpen, setCreateOpen] = useState(false);

    const load = async () => {
        try {
            const response = await fetchInvoices(studentUuid);
            setInvoices(response.success ? response.data.invoices || [] : []);
        } catch {
            setInvoices([]);
        }
    };

    useEffect(() => {
        setInvoices(null);
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentUuid]);

    return (
        <div className='space-y-3'>
            <div className='flex justify-end'>
                <Button size='sm' onClick={() => setCreateOpen(true)}>
                    <Plus className='h-4 w-4'/>
                    Generate invoice
                </Button>
            </div>

            {invoices === null ? (
                <div className='space-y-2'>
                    <Skeleton className='h-14 w-full'/>
                    <Skeleton className='h-14 w-full'/>
                </div>
            ) : invoices.length === 0 ? (
                <p className='py-6 text-center text-sm text-muted-foreground'>No invoices yet.</p>
            ) : (
                <div className='space-y-2'>
                    {invoices.map((invoice) => {
                        const balance = balanceOf(invoice);
                        return (
                            <Link
                                key={invoice.uuid}
                                href={`/staff/invoices/${invoice.uuid}`}
                                className='block rounded-md border px-3 py-2 transition-colors hover:bg-muted/50'
                            >
                                <div className='flex items-start justify-between gap-3'>
                                    <div className='min-w-0'>
                                        <p className='text-sm font-medium'>{invoice.number}</p>
                                        <p className='truncate text-xs text-muted-foreground'>
                                            {[invoice.calendar ? termLabel(invoice.calendar) : null, invoice.template?.name]
                                                .filter(Boolean)
                                                .join(' · ') || '—'}
                                        </p>
                                    </div>
                                    <InvoiceStatusBadge status={invoice.status}/>
                                </div>
                                <div className='mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground'>
                                    <span>Total <span className='text-foreground'>{naira(toNumber(invoice.total))}</span></span>
                                    <span>Paid <span className='text-foreground'>{naira(toNumber(invoice.paid))}</span></span>
                                    {balance > 0 && invoice.status !== 'CANCELLED' && (
                                        <span>Balance <span className='font-medium text-foreground'>{naira(balance)}</span></span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            <CreateInvoiceSheet
                open={createOpen}
                onOpenChange={setCreateOpen}
                studentUuids={[studentUuid]}
                onCreated={() => void load()}
            />
        </div>
    );
}
