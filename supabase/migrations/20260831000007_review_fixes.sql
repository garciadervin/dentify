-- Consolidated fixes from the adversarial review + database linter.
-- 1. Move `has_role` out of the exposed `public` schema (SECURITY DEFINER
--    helpers must not be callable via /rest/v1/rpc) and point the RLS policies
--    at the private helper.
-- 2. Fix clinical-case questions seeded without options/correct_index (the
--    level-3 quiz rendered an empty answer list and hard-locked).
-- 3. Storage: owner-scoped DELETE/UPDATE on diagnosis-images.

SET search_path TO public, extensions;

-- ── 1. has_role in a non-exposed schema ─────────────────────────────────────

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(required text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = required
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(text) TO anon, authenticated;

-- Release the old policies first: they depend on the public function we drop.
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view all progress" ON public.pedagogical_progress;
DROP POLICY IF EXISTS "Admins can update clinical manuals" ON public.clinical_manuals;

DROP FUNCTION IF EXISTS public.has_role(text);

CREATE POLICY "Teachers can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (private.has_role('teacher'));

CREATE POLICY "Teachers can view all progress"
  ON public.pedagogical_progress FOR SELECT
  TO authenticated
  USING (private.has_role('teacher'));

CREATE POLICY "Admins can update clinical manuals"
  ON public.clinical_manuals FOR UPDATE
  USING (private.has_role('admin'))
  WITH CHECK (private.has_role('admin'));

-- ── 2. Clinical-case questions: options + correct_index ─────────────────────

UPDATE public.questions SET options = '["Esmalte, dentina y pulpa", "Esmalte y dentina", "Solo esmalte", "Cemento y dentina"]', correct_index = 1 WHERE case_id = 'an-case-1' AND question = 'Según el caso, ¿qué tejidos del diente están comprometidos por la fractura?';
UPDATE public.questions SET options = '["los ameloblastos del esmalte", "las prolongaciones de los odontoblastos y el movimiento del líquido tubular", "las fibras de Sharpey del ligamento periodontal", "los cementocitos del cemento radicular"]', correct_index = 1 WHERE case_id = 'an-case-1' AND question = 'La sensibilidad al frío que refiere el paciente se explica principalmente por la estimulación de:';
UPDATE public.questions SET options = '["Presenta un único conducto, con frecuencia de sección oval", "Presenta siempre dos conductos separados", "Presenta un conducto en forma de C", "Presenta tres conductos independientes"]', correct_index = 0 WHERE case_id = 'an-case-1' AND question = 'Si en el seguimiento el diente desarrolla necrosis pulpar y se indica tratamiento de conducto, ¿qué característica anatómica de este diente facilita la instrumentación?';
UPDATE public.questions SET options = '["Fracaso endodóntico con lesión periapical sintomática que indica retratamiento", "Pulpitis reversible de origen cariogénico", "Diente vital y sano", "Periodontitis apical asintomática sin necesidad de tratamiento"]', correct_index = 0 WHERE case_id = 'en-case-retratamiento' AND question = '¿Cuál es el diagnóstico clínico más probable?';
UPDATE public.questions SET options = '["Extracción inmediata del diente", "Solo antibióticos sin tratamiento local", "Retratamiento endodóntico no quirúrgico del 36", "Observación con control radiográfico anual"]', correct_index = 2 WHERE case_id = 'en-case-retratamiento' AND question = '¿Cuál es el manejo más adecuado para este paciente?';
UPDATE public.questions SET options = '["Dejar el exceso extruido y obturar sobre él", "Remover el exceso, limpiar el conducto y realizar una nueva obturación", "Abandonar el retratamiento", "Extraer el diente de inmediato"]', correct_index = 1 WHERE case_id = 'en-case-retratamiento' AND question = 'Durante el retratamiento se confirma que el cono sobrepasa el ápice (sobreobturación). ¿Qué conducta es la correcta?';
UPDATE public.questions SET options = '["Caries recurrente bajo la restauración", "Fractura cuspídea", "Lesión cervical por erosión", "Atrición fisiológica"]', correct_index = 0 WHERE case_id = 'op-case-caries-recurrente' AND question = 'Según el cuadro, el diagnóstico más probable es:';
UPDATE public.questions SET options = '["Remover la restauración, eliminar la caries y restaurar con técnica adhesiva", "Extraer el molar", "Realizar endodoncia sin remover la caries", "Colocar una corona de acero sobre la restauración"]', correct_index = 0 WHERE case_id = 'op-case-caries-recurrente' AND question = 'Dado que la lesión es pequeña y limitada a dentina superficial, el tratamiento más conservador es:';
UPDATE public.questions SET options = '["Mejorar la higiene interproximal y controlar la frecuencia de azúcares", "Aumentar el consumo de azúcares entre comidas", "Evitar el uso de hilo dental", "No acudir a controles periódicos"]', correct_index = 0 WHERE case_id = 'op-case-caries-recurrente' AND question = '¿Qué medida contribuye a prevenir nuevas lesiones recurrentes en este paciente?';
UPDATE public.questions SET options = '["Erupción ectópica del primer molar permanente superior", "Anquilosis del primer molar temporal", "Agenesia del segundo molar temporal", "Fractura radicular del primer molar permanente"]', correct_index = 0 WHERE case_id = 'or-case-erupcion-ectopica' AND question = 'Con base en el caso, ¿cuál es el diagnóstico más probable?';
UPDATE public.questions SET options = '["Redirigir o distalizar el molar ectópico para liberar la vía de erupción", "Extraer de inmediato el primer molar permanente", "No tratar, porque se corrige siempre espontáneamente", "Colocar brackets sin ninguna otra medida"]', correct_index = 0 WHERE case_id = 'or-case-erupcion-ectopica' AND question = '¿Cuál es la conducta ortodóncica inicial más adecuada en este caso?';
UPDATE public.questions SET options = '["Pérdida prematura del segundo molar temporal y pérdida de espacio en el arco", "Sobreerupción del molar temporal afectado", "Formación de un diente supernumerario", "Aumento del tamaño de la corona del molar"]', correct_index = 0 WHERE case_id = 'or-case-erupcion-ectopica' AND question = 'Si el cuadro no se corrige a tiempo, ¿qué consecuencia es la más probable?';
UPDATE public.questions SET options = '["Absceso periodontal", "Absceso periapical (de origen endodóntico)", "Granuloma piógeno", "Fractura radicular vertical"]', correct_index = 0 WHERE case_id = 'pe-case-1' AND question = '¿Cuál es el diagnóstico más probable del 36?';
UPDATE public.questions SET options = '["Establecer drenaje del absceso y raspar la zona afectada", "Extraer el 36 de inmediato", "Indicar únicamente antibiótico sistémico", "Ferulizar el diente sin drenar"]', correct_index = 0 WHERE case_id = 'pe-case-1' AND question = '¿Cuál es la conducta inicial más apropiada en este momento?';
UPDATE public.questions SET options = '["Completar la terapia periodontal de toda la boca y reevaluar antes de decidir la cirugía o el mantenimiento", "Extraer todos los dientes con bolsas de 5 a 6 mm", "Iniciar regeneración tisular guiada de forma inmediata en cada sitio", "Indicar solo control radiográfico anual"]', correct_index = 0 WHERE case_id = 'pe-case-1' AND question = 'Una vez resuelta la urgencia, ¿cuál es el siguiente paso en el manejo integral de la paciente?';

-- ── 3. Storage: owner-scoped DELETE/UPDATE on diagnosis-images ──────────────
-- (the bucket itself was made private in 20260831000006_diagnosis_bucket_private)

DROP POLICY IF EXISTS "Users can delete own diagnosis images" ON storage.objects;
CREATE POLICY "Users can delete own diagnosis images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'diagnosis-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own diagnosis images" ON storage.objects;
CREATE POLICY "Users can update own diagnosis images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'diagnosis-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
