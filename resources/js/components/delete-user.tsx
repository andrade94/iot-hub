import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import HeadingSmall from '@/components/ui/heading-small';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { router } from '@inertiajs/react';
import { useState } from 'react';

export default function DeleteUser() {
    const [deletingUser, setDeletingUser] = useState(false);
    const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const handleDelete = () => {
        // Clear any previous errors
        setPasswordError('');

        // Validate password
        if (!password) {
            setPasswordError('Password is required to delete your account.');
            return;
        }

        setLoadingUserId('current-user');

        // Use router.delete for Inertia navigation
        router.delete(
            ProfileController.destroy.url(),
            {
                data: { password },
                preserveState: true,
                onSuccess: () => {
                    setDeletingUser(false);
                    setPassword('');
                },
                onError: (errors) => {
                    if (errors.password) {
                        setPasswordError(errors.password);
                    }
                },
                onFinish: () => {
                    setLoadingUserId(null);
                },
            },
        );
    };

    return (
        <div className="space-y-6">
            <HeadingSmall
                title="Delete account"
                description="Delete your account and all of its resources"
            />
            <div className="space-y-4 rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-200/10 dark:bg-red-700/10">
                <div className="relative space-y-0.5 text-red-600 dark:text-red-100">
                    <p className="font-medium">Warning</p>
                    <p className="text-sm">
                        Please proceed with caution, this cannot be undone.
                    </p>
                </div>

                <Button
                    variant="destructive"
                    onClick={() => setDeletingUser(true)}
                    data-test="delete-user-button"
                >
                    Delete account
                </Button>
            </div>

            <ConfirmationDialog
                open={deletingUser}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingUser(false);
                        setPassword('');
                        setPasswordError('');
                    }
                }}
                title="Delete Account?"
                description="Once your account is deleted, all of its resources and data will be permanently deleted."
                warningMessage="This action cannot be undone. All your data will be permanently lost."
                loading={loadingUserId !== null}
                onConfirm={handleDelete}
                actionLabel="Delete Account"
            >
                <div className="mt-4 space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                        Please enter your password to confirm
                    </Label>
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={loadingUserId !== null}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleDelete();
                            }
                        }}
                    />
                    {passwordError && (
                        <p className="text-sm text-destructive">{passwordError}</p>
                    )}
                </div>
            </ConfirmationDialog>
        </div>
    );
}
