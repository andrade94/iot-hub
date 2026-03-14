export default function HeadingSmall({
    title,
    description,
}: {
    title: string;
    description?: string;
}) {
    return (
        <header>
            <h3 className="mb-0.5 text-base font-semibold tracking-tight">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            )}
        </header>
    );
}
