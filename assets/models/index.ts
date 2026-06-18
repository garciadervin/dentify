/**
 * Dental model mappings — FDI tooth numbering to file names and anatomical names.
 */

export interface CachedModel {
  number: number;
  file: string;
  name: string;
  cached: boolean;
  size: number; // bytes
}

export const DENTAL_MODELS: Record<number, { file: string; name: string }> = {
  11: { file: 'maxillary_left_central_incisor.glb', name: 'Incisivo Central Superior Izquierdo' },
  12: { file: 'maxillary_lateral_incisor.glb', name: 'Incisivo Lateral Superior Derecho' },
  13: { file: 'maxillary_canine.glb', name: 'Canino Superior Derecho' },
  14: { file: 'maxillary_first_premolar.glb', name: 'Primer Premolar Superior Derecho' },
  15: { file: 'maxillary_second_premolar.glb', name: 'Segundo Premolar Superior Derecho' },
  16: { file: 'maxillary_first_molar.glb', name: 'Primer Molar Superior Derecho' },
  17: { file: 'maxillary_second_molar.glb', name: 'Segundo Molar Superior Derecho' },
  18: { file: 'maxillary_third_molar.glb', name: 'Tercer Molar Superior Derecho' },
  21: { file: 'maxillary_left_central_incisor.glb', name: 'Maxillary Left Central Incisor' },
  22: { file: 'maxillary_lateral_incisor.glb', name: 'Incisivo Lateral Superior Izquierdo' },
  23: { file: 'maxillary_canine.glb', name: 'Canino Superior Izquierdo' },
  24: { file: 'maxillary_first_premolar.glb', name: 'Primer Premolar Superior Izquierdo' },
  25: { file: 'maxillary_second_premolar.glb', name: 'Segundo Premolar Superior Izquierdo' },
  26: { file: 'maxillary_first_molar.glb', name: 'Primer Molar Superior Izquierdo' },
  27: { file: 'maxillary_second_molar.glb', name: 'Segundo Molar Superior Izquierdo' },
  28: { file: 'maxillary_third_molar.glb', name: 'Tercer Molar Superior Izquierdo' },
  31: { file: 'mandibular_first_molar.glb', name: 'Primer Molar Inferior Izquierdo' },
  32: { file: 'mandibular_second_molar.glb', name: 'Segundo Molar Inferior Izquierdo' },
  33: { file: 'mandibular_third_molar.glb', name: 'Tercer Molar Inferior Izquierdo' },
  34: { file: 'mandibular_left_second_premolar.glb', name: 'Segundo Premolar Inferior Izquierdo' },
  35: { file: 'mandibular_first_premolar.glb', name: 'Primer Premolar Inferior Izquierdo' },
  36: { file: 'mandibular_left_canine.glb', name: 'Canino Inferior Izquierdo' },
  37: { file: 'mandibular_left_lateral_incisor.glb', name: 'Incisivo Lateral Inferior Izquierdo' },
  38: { file: 'mandibular_left_central_incisor.glb', name: 'Incisivo Central Inferior Izquierdo' },
  41: { file: 'mandibular_left_central_incisor.glb', name: 'Incisivo Central Inferior Derecho' },
  42: { file: 'mandibular_left_lateral_incisor.glb', name: 'Incisivo Lateral Inferior Derecho' },
  43: { file: 'mandibular_left_canine.glb', name: 'Canino Inferior Derecho' },
  44: { file: 'mandibular_first_premolar.glb', name: 'Primer Premolar Inferior Derecho' },
  45: { file: 'mandibular_left_second_premolar.glb', name: 'Segundo Premolar Inferior Derecho' },
  46: { file: 'mandibular_first_molar.glb', name: 'Primer Molar Inferior Derecho' },
  47: { file: 'mandibular_second_molar.glb', name: 'Segundo Molar Inferior Derecho' },
  48: { file: 'mandibular_third_molar.glb', name: 'Tercer Molar Inferior Derecho' },
};

/** All FDI tooth numbers in display order (maxillary then mandibular). */
export const FDI_TEETH = Object.keys(DENTAL_MODELS).map(Number).sort((a, b) => a - b);

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
