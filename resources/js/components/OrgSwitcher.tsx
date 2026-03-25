import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Building2 } from 'lucide-react';

/**
 * OrgSwitcher — lets super_admin switch the active organization context.
 *
 * Reads `all_organizations` and `current_organization` from shared Inertia data.
 * Posts to `org/switch` to update the session-based org scope.
 * Only rendered when the user has the super_admin role.
 */
export function OrgSwitcher() {
    const { auth, all_organizations, current_organization } =
        usePage<SharedData>().props;

    const isSuperAdmin = auth.roles?.includes('super_admin');

    if (!isSuperAdmin || !all_organizations || all_organizations.length === 0) {
        return null;
    }

    const currentValue = current_organization?.id
        ? String(current_organization.id)
        : 'all';

    function handleSwitch(value: string) {
        const orgId = value === 'all' ? null : Number(value);
        router.post(
            '/org/switch',
            { org_id: orgId },
            { preserveScroll: true },
        );
    }

    return (
        <Select value={currentValue} onValueChange={handleSwitch}>
            <SelectTrigger className="h-8 w-[180px] gap-1.5 border-dashed text-xs">
                <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="All Organizations" />
            </SelectTrigger>
            <SelectContent align="end">
                <SelectItem value="all" className="text-xs">
                    All Organizations
                </SelectItem>
                {all_organizations.map((org) => (
                    <SelectItem
                        key={org.id}
                        value={String(org.id)}
                        className="text-xs"
                    >
                        {org.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
