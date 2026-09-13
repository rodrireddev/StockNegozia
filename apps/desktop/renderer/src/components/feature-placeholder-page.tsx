import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeaturePlaceholderPageProps {
  title: string;
}

export function FeaturePlaceholderPage({ title }: FeaturePlaceholderPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          Este módulo todavía no implementa funcionalidad de negocio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Próximamente.</p>
      </CardContent>
    </Card>
  );
}
