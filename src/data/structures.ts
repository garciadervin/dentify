/**
 * Selectable anatomical structures of the 3D simulator.
 * Each structure has a short educational description for the info card.
 */

export interface ToothStructure {
  id: string;
  name: string;
  description: string;
}

export const TOOTH_STRUCTURES: ToothStructure[] = [
  {
    id: 'corona',
    name: 'Corona',
    description:
      'Porción visible del diente cubierta por esmalte. Protege la dentina y la pulpa de la fricción y los ácidos.',
  },
  {
    id: 'cuello',
    name: 'Cuello',
    description:
      'Zona de unión entre corona y raíz donde termina el esmalte. Es el área más expuesta a la gingivitis y a la recesión gingival.',
  },
  {
    id: 'raiz',
    name: 'Raíz',
    description:
      'Porción del diente insertada en el hueso alveolar, cubierta por cemento y anclada por el ligamento periodontal.',
  },
  {
    id: 'pulpa',
    name: 'Pulpa',
    description:
      'Tejido blando interno que contiene nervios y vasos sanguíneos. Nutre al diente y origina la sensibilidad al dolor.',
  },
];

/** Finds a structure by name (case/partial-accent insensitive). */
export function findStructure(name: string | null): ToothStructure | undefined {
  if (!name) return undefined;
  const normalized = name.toLowerCase().trim();
  return TOOTH_STRUCTURES.find((s) =>
    s.name.toLowerCase() === normalized || normalized.includes(s.name.toLowerCase())
  );
}
