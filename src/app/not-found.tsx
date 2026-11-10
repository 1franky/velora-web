import { NotFoundContent } from "@/components/not-found-content";

/** Rutas inexistentes fuera de la app (sin navegación). */
export default function NotFound() {
  return (
    <main id="contenido" className="flex-1">
      <NotFoundContent />
    </main>
  );
}
