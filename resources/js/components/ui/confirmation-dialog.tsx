import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { type ReactNode } from 'react';

interface ConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    itemName?: string;
    warningMessage: string;
    loading?: boolean;
    onConfirm: () => void;
    actionLabel?: string;
    children?: ReactNode;
}

export function ConfirmationDialog({
    open,
    onOpenChange,
    title,
    description,
    itemName,
    warningMessage,
    loading = false,
    onConfirm,
    actionLabel = 'Delete',
    children,
}: ConfirmationDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                        <div className="mt-3 rounded-md bg-destructive/10 p-3 text-sm">
                            <AlertTriangle className="mr-2 inline h-4 w-4" />
                            <strong>Warning:</strong> {warningMessage}
                        </div>
                        {children}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {actionLabel.replace(/^Delete/, 'Deleting')}...
                            </>
                        ) : (
                            actionLabel
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
