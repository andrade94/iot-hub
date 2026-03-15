import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { MapPin } from 'lucide-react';

export default function SiteSelector() {
    const { accessible_sites, current_site } = usePage<SharedData>().props;

    if (accessible_sites.length <= 1) {
        return null;
    }

    function handleChange(value: string) {
        const siteId = value === 'all' ? null : Number(value);
        router.post(
            '/site/switch',
            { site_id: siteId },
            { preserveState: true, preserveScroll: true },
        );
    }

    return (
        <div className="px-3 py-2">
            <Select
                value={current_site ? String(current_site.id) : 'all'}
                onValueChange={handleChange}
            >
                <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="All sites" />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All sites</SelectItem>
                    {accessible_sites.map((site) => (
                        <SelectItem key={site.id} value={String(site.id)}>
                            {site.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
