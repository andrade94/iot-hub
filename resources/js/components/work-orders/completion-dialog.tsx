import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLang } from '@/hooks/use-lang';
import { router } from '@inertiajs/react';
import { CheckCircle2, ImagePlus, X } from 'lucide-react';
import { useRef, useState } from 'react';

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workOrderId: number;
    workOrderTitle: string;
}

export function CompletionDialog({ open, onOpenChange, workOrderId, workOrderTitle }: Props) {
    const { t } = useLang();
    const [notes, setNotes] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    function reset() {
        setNotes('');
        setPhoto(null);
        if (fileRef.current) fileRef.current.value = '';
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!notes.trim()) return;

        setProcessing(true);
        const data: Record<string, string | File> = { completion_notes: notes };
        if (photo) data.photo = photo;

        router.post(`/work-orders/${workOrderId}/complete`, data, {
            forceFormData: !!photo,
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onOpenChange(false);
            },
            onFinish: () => setProcessing(false),
        });
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        {t('Complete Work Order')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('Finalize')}{' '}
                        <span className="font-medium text-foreground">{workOrderTitle}</span>.{' '}
                        {t('Add completion notes and optional sign-off photo.')}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-[11px]">
                            {t('Completion notes')} <span className="text-rose-500">*</span>
                        </Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t('What was done? Parts used, time spent, observations...')}
                            rows={4}
                            required
                        />
                        <p className="font-mono text-[9px] text-muted-foreground/60">
                            {notes.length} / 2000
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[11px]">
                            {t('Sign-off photo')} <span className="text-muted-foreground/50">({t('optional')})</span>
                        </Label>
                        {photo ? (
                            <div className="flex items-center justify-between rounded-md border border-border/50 bg-muted/30 px-3 py-2">
                                <div className="flex items-center gap-2 text-[11px]">
                                    <ImagePlus className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="truncate font-mono">{photo.name}</span>
                                    <span className="text-muted-foreground/60">
                                        ({(photo.size / 1024).toFixed(0)}kb)
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setPhoto(null); if (fileRef.current) fileRef.current.value = ''; }}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground">
                                <ImagePlus className="h-3.5 w-3.5" />
                                {t('Choose photo')}
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
                                />
                            </label>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={processing || !notes.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            {processing ? t('Completing...') : t('Mark as Completed')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
