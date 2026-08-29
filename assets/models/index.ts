/**
 * Dental model catalog — 16 modelos únicos (8 superiores + 8 inferiores).
 *
 * Cada entrada es un `.glb` real de assets/models/ con su número FDI canónico
 * (superiores 11–18, inferiores 31–38) y nombre anatómico en español.
 */

export interface DentalModel {
  number: number;
  file: string;
  name: string;
  shortName: string;
  arch: 'superior' | 'inferior';
}

export interface CachedModel {
  number: number;
  file: string;
  name: string;
  cached: boolean;
  size: number; // bytes
}

export const DENTAL_MODELS: Record<number, Omit<DentalModel, 'number'>> = {
  11: { file: 'maxillary_left_central_incisor.glb', name: 'Incisivo Central Superior', shortName: 'Incisivo Central Sup.', arch: 'superior' },
  12: { file: 'maxillary_lateral_incisor.glb', name: 'Incisivo Lateral Superior', shortName: 'Incisivo Lateral Sup.', arch: 'superior' },
  13: { file: 'maxillary_canine.glb', name: 'Canino Superior', shortName: 'Canino Sup.', arch: 'superior' },
  14: { file: 'maxillary_first_premolar.glb', name: 'Primer Premolar Superior', shortName: '1er Premolar Sup.', arch: 'superior' },
  15: { file: 'maxillary_second_premolar.glb', name: 'Segundo Premolar Superior', shortName: '2do Premolar Sup.', arch: 'superior' },
  16: { file: 'maxillary_first_molar.glb', name: 'Primer Molar Superior', shortName: '1er Molar Sup.', arch: 'superior' },
  17: { file: 'maxillary_second_molar.glb', name: 'Segundo Molar Superior', shortName: '2do Molar Sup.', arch: 'superior' },
  18: { file: 'maxillary_third_molar.glb', name: 'Tercer Molar Superior', shortName: '3er Molar Sup.', arch: 'superior' },
  31: { file: 'mandibular_first_molar.glb', name: 'Primer Molar Inferior', shortName: '1er Molar Inf.', arch: 'inferior' },
  32: { file: 'mandibular_second_molar.glb', name: 'Segundo Molar Inferior', shortName: '2do Molar Inf.', arch: 'inferior' },
  33: { file: 'mandibular_third_molar.glb', name: 'Tercer Molar Inferior', shortName: '3er Molar Inf.', arch: 'inferior' },
  34: { file: 'mandibular_left_second_premolar.glb', name: 'Segundo Premolar Inferior', shortName: '2do Premolar Inf.', arch: 'inferior' },
  35: { file: 'mandibular_first_premolar.glb', name: 'Primer Premolar Inferior', shortName: '1er Premolar Inf.', arch: 'inferior' },
  36: { file: 'mandibular_left_canine.glb', name: 'Canino Inferior', shortName: 'Canino Inf.', arch: 'inferior' },
  37: { file: 'mandibular_left_lateral_incisor.glb', name: 'Incisivo Lateral Inferior', shortName: 'Incisivo Lateral Inf.', arch: 'inferior' },
  38: { file: 'mandibular_left_central_incisor.glb', name: 'Incisivo Central Inferior', shortName: 'Incisivo Central Inf.', arch: 'inferior' },
};

/** All FDI tooth numbers in display order (maxillary then mandibular). */
export const FDI_TEETH = Object.keys(DENTAL_MODELS).map(Number).sort((a, b) => a - b);

/** List of the 16 unique models (in display order). */
export const MODEL_LIST: DentalModel[] = FDI_TEETH.map((num) => ({
  number: num,
  ...DENTAL_MODELS[num],
}));

/**
 * Static require map for Metro bundler compatibility.
 * Metro requires static `require()` calls, so we pre-declare
 * all model module references here.
 */
export function getModelModule(toothNumber: number): number | null {
  const file = DENTAL_MODELS[toothNumber]?.file;
  if (!file) return null;
  const modules: Record<string, number> = {
    'maxillary_left_central_incisor.glb': require('./maxillary_left_central_incisor.glb') as number,
    'maxillary_lateral_incisor.glb': require('./maxillary_lateral_incisor.glb') as number,
    'maxillary_canine.glb': require('./maxillary_canine.glb') as number,
    'maxillary_first_premolar.glb': require('./maxillary_first_premolar.glb') as number,
    'maxillary_second_premolar.glb': require('./maxillary_second_premolar.glb') as number,
    'maxillary_first_molar.glb': require('./maxillary_first_molar.glb') as number,
    'maxillary_second_molar.glb': require('./maxillary_second_molar.glb') as number,
    'maxillary_third_molar.glb': require('./maxillary_third_molar.glb') as number,
    'mandibular_first_molar.glb': require('./mandibular_first_molar.glb') as number,
    'mandibular_second_molar.glb': require('./mandibular_second_molar.glb') as number,
    'mandibular_third_molar.glb': require('./mandibular_third_molar.glb') as number,
    'mandibular_left_second_premolar.glb': require('./mandibular_left_second_premolar.glb') as number,
    'mandibular_first_premolar.glb': require('./mandibular_first_premolar.glb') as number,
    'mandibular_left_canine.glb': require('./mandibular_left_canine.glb') as number,
    'mandibular_left_lateral_incisor.glb': require('./mandibular_left_lateral_incisor.glb') as number,
    'mandibular_left_central_incisor.glb': require('./mandibular_left_central_incisor.glb') as number,
  };
  return modules[file] ?? null;
}
