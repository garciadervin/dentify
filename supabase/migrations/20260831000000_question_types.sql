-- Question types (Duolingo-style), answer history, and themed levels.
-- Extends `questions` to 7 types, adds `answer_history` for "review mistakes",
-- and renames levels with themed titles per specialty.

-- ── 1. Question type columns ──
alter table public.questions alter column options drop not null;
alter table public.questions alter column correct_index drop not null;

alter table public.questions
  add column if not exists question_type text not null default 'mcq',
  add column if not exists correct_indexes int[],
  add column if not exists pairs jsonb,
  add column if not exists order_items jsonb,
  add column if not exists case_id text,
  add column if not exists case_text text,
  add column if not exists hint text,
  add column if not exists points int not null default 10,
  add column if not exists difficulty int not null default 1,
  add column if not exists tags text[];

alter table public.questions
  drop constraint if exists questions_question_type_check;
alter table public.questions
  add constraint questions_question_type_check check (
    question_type in ('mcq', 'true_false', 'fill_blank', 'multi_select', 'match', 'order', 'case')
  );

-- ── 2. Answer history (review mistakes + study analytics) ──
create table if not exists public.answer_history (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  correct boolean not null,
  answered_at timestamptz not null default now(),
  primary key (profile_id, question_id, answered_at)
);
create index if not exists idx_answer_history_profile_time on public.answer_history (profile_id, answered_at desc);
create index if not exists idx_answer_history_question on public.answer_history (question_id);

alter table public.answer_history enable row level security;
drop policy if exists "Users can select own answers" on public.answer_history;
create policy "Users can select own answers" on public.answer_history
  for select to authenticated using (auth.uid() = profile_id);
drop policy if exists "Users can insert own answers" on public.answer_history;
create policy "Users can insert own answers" on public.answer_history
  for insert to authenticated with check (auth.uid() = profile_id);

-- ── 3. Themed levels ──
update public.levels l set title = 'Fundamentos de la caries', description = 'Caries, esmalte, etiología y prevención.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'operatoria-dental' and l.level_number = 1;
update public.levels l set title = 'Restauraciones estéticas', description = 'Resinas compuestas, adhesión y técnica incremental.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'operatoria-dental' and l.level_number = 2;
update public.levels l set title = 'Casos clínicos avanzados', description = 'Diagnóstico y manejo integral de casos complejos.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'operatoria-dental' and l.level_number = 3;

update public.levels l set title = 'Diagnóstico pulpar', description = 'Anatomía del sistema de conductos y diagnóstico pulpar.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'endodoncia' and l.level_number = 1;
update public.levels l set title = 'Instrumentación y obturación', description = 'Técnicas de instrumentación, irrigación y obturación.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'endodoncia' and l.level_number = 2;
update public.levels l set title = 'Complicaciones y casos clínicos', description = 'Complicaciones, retratamientos y casos clínicos.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'endodoncia' and l.level_number = 3;

update public.levels l set title = 'Salud y gingivitis', description = 'Encía sana, gingivitis y clasificación 2017.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'periodoncia' and l.level_number = 1;
update public.levels l set title = 'Tratamiento no quirúrgico', description = 'RAR, instrumentos, cirugía resectiva y regeneración.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'periodoncia' and l.level_number = 2;
update public.levels l set title = 'Casos clínicos avanzados', description = 'Estadios/grados, implantes y periimplantitis.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'periodoncia' and l.level_number = 3;

update public.levels l set title = 'Maloclusiones y diagnóstico', description = 'Clasificación de Angle, cefalometría y diagnóstico.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'ortodoncia' and l.level_number = 1;
update public.levels l set title = 'Mecánica y aparatología', description = 'Anclaje, expansión, torque y retención.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'ortodoncia' and l.level_number = 2;
update public.levels l set title = 'Casos clínicos y quirúrgicos', description = 'Cirugía ortognática, impactaciones y complicaciones.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'ortodoncia' and l.level_number = 3;

update public.levels l set title = 'Morfología general', description = 'Generalidades, nomenclatura y tejidos del diente.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'anatomia-dental' and l.level_number = 1;
update public.levels l set title = 'Morfología por grupos', description = 'Anteriores, posteriores, raíces y conductos.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'anatomia-dental' and l.level_number = 2;
update public.levels l set title = 'Aplicaciones clínicas', description = 'Histología, desarrollo y aplicaciones clínicas.'
  from public.specialties s where s.id = l.specialty_id and s.slug = 'anatomia-dental' and l.level_number = 3;

-- ── 4. Canonical fixtures: one question per type, per specialty ──
-- (stable reference for tests and UI development; original vs the initial bank)

-- Operatoria Dental
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('operatoria-dental', 1, 'mcq', '¿En qué clase de la clasificación de Black se agrupan las cavidades del tercio cervical de las caras vestibular y lingual?', '["Clase I","Clase II","Clase III","Clase V"]', 3, 'La Clase V de Black comprende las cavidades del tercio cervical (gingival) de las caras vestibular o lingual/palatina de todos los dientes, originadas por caries, abrasión o erosión.', 10, 1, '{black,caries,cavidades}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('operatoria-dental', 1, 'true_false', 'El esmalte es un tejido avascular y sin inervación, por lo que las lesiones cariosas limitadas a él no producen dolor.', '["Verdadero","Falso"]', 0, 'El esmalte carece de vasos y terminaciones nerviosas. El dolor aparece cuando la caries alcanza la dentina, cuyos túbulos contienen prolongaciones odontoblásticas y fibras nerviosas.', 10, 1, '{esmalte,histologia}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('operatoria-dental', 2, 'fill_blank', 'En la técnica de grabado total, el ácido fosfórico se aplica sobre el esmalte durante ____ segundos.', '["15–30","60–90","2–5","120"]', 0, 'El grabado del esmalte con ácido fosfórico al 35–37% dura 15 a 30 segundos. En dentina no debe superar los 15 segundos para evitar daño pulpar.', 10, 2, '{adhesion,grabado}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_indexes, explanation, points, difficulty, tags)
  values ('operatoria-dental', 2, 'multi_select', 'Selecciona todas las propiedades deseables de un material de restauración directo.', '["Baja contracción de polimerización","Buena resistencia al desgaste","Alta solubilidad en el medio oral","Adhesión a la estructura dental"]', '{0,1,3}', 'Un material restaurador ideal debe tener baja contracción (para evitar microfiltración), buena resistencia al desgaste y adhesión a la estructura dental. La alta solubilidad es indeseable: degradaría el material en el medio oral.', 15, 2, '{materiales,restauracion}');
insert into public.questions (specialty_slug, level, question_type, question, pairs, explanation, points, difficulty, tags)
  values ('operatoria-dental', 2, 'match', 'Relaciona cada material restaurador con su característica principal.', '[{"left":"Composite híbrido","right":"Partículas de 0,4–5 μm"},{"left":"Composite nanoparticulado","right":"Partículas <100 nm"},{"left":"Ionómero de vidrio","right":"Libera flúor"},{"left":"Amalgama","right":"Alta resistencia al desgaste"}]', 'Los composites híbridos combinan partículas de tamaño medio; los nanoparticulados mejoran el pulido; el ionómero de vidrio libera flúor; la amalgama destaca en zonas de alta carga.', 15, 2, '{materiales,composite,amalgama}');
insert into public.questions (specialty_slug, level, question_type, question, order_items, explanation, points, difficulty, tags)
  values ('operatoria-dental', 3, 'order', 'Ordena los pasos de la técnica adhesiva de grabado total sobre esmalte.', '[{"text":"Grabar el esmalte con ácido fosfórico al 35–37%","position":1},{"text":"Lavar abundantemente con agua","position":2},{"text":"Secar la superficie sin deshidratar","position":3},{"text":"Aplicar el adhesivo","position":4},{"text":"Fotopolimerizar el adhesivo","position":5}]', 'Secuencia de grabado total: grabado (15–30 s), lavado abundante, secado, aplicación del adhesivo y fotopolimerización antes de colocar el composite.', 20, 3, '{adhesion,tecnica}');
insert into public.questions (specialty_slug, level, question_type, case_id, case_text, question, options, correct_index, explanation, points, difficulty, tags)
  values ('operatoria-dental', 3, 'case', 'op-case-1', 'Paciente de 22 años refiere dolor breve y agudo al tomar bebidas frías en el diente 36. No hay dolor espontáneo ni nocturno. Se observa una lesión cavitada en la fosa oclusal. La prueba de frío produce dolor agudo que cesa de inmediato al retirar el estímulo.', '¿Cuál es el diagnóstico clínico más probable?', '["Pulpitis irreversible","Pulpitis reversible","Necrosis pulpar","Periodontitis apical aguda"]', 1, 'El dolor breve que cede al retirar el estímulo, sin dolor espontáneo ni a la percusión, corresponde a pulpitis reversible.', 10, 3, '{diagnostico,pulpitis}');
insert into public.questions (specialty_slug, level, question_type, case_id, case_text, question, options, correct_index, explanation, points, difficulty, tags)
  values ('operatoria-dental', 3, 'case', 'op-case-1', 'Paciente de 22 años refiere dolor breve y agudo al tomar bebidas frías en el diente 36. No hay dolor espontáneo ni nocturno. Se observa una lesión cavitada en la fosa oclusal. La prueba de frío produce dolor agudo que cesa de inmediato al retirar el estímulo.', '¿Cuál es el tratamiento de elección?', '["Tratamiento de conductos","Remoción de caries y restauración con resina compuesta","Exodoncia","Antibioticoterapia sistémica"]', 1, 'En la pulpitis reversible el tratamiento es conservador: eliminar la caries y restaurar, protegiendo la pulpa.', 10, 3, '{tratamiento,restauracion}');

-- Endodoncia
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('endodoncia', 1, 'mcq', '¿Cuál es el principal microorganismo asociado a la periodontitis apical primaria?', '["Streptococcus mutans","Enterococcus faecalis","Anaerobios gramnegativos (Porphyromonas, Fusobacterium)","Candida albicans"]', 2, 'La infección primaria del conducto está dominada por anaerobios gramnegativos. Enterococcus faecalis predomina en retratamientos y fracasos, no en la infección primaria.', 10, 1, '{microbiologia,infeccion}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('endodoncia', 1, 'true_false', 'En dientes con ápice inmaduro y necrosis pulpar, la gutapercha es el único material indicado para el cierre apical.', '["Verdadero","Falso"]', 1, 'En ápices inmaduros se emplea la apexificación con hidróxido de calcio o una barrera de MTA, o la revascularización; la gutapercha convencional no logra sellar un ápice abierto.', 10, 1, '{apexificacion,apice-inmaduro}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('endodoncia', 2, 'fill_blank', 'La lima manual de calibre #____ se usa habitualmente para verificar la patencia apical.', '["10","40","80","120"]', 0, 'Las limas pequeñas #08–#15, sobre todo la #10, establecen la patencia apical pasando suavemente por el foramen sin sobreinstrumentar.', 10, 2, '{instrumentacion,patencia}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_indexes, explanation, points, difficulty, tags)
  values ('endodoncia', 2, 'multi_select', 'Selecciona las características del dolor de la pulpitis irreversible.', '["Dolor espontáneo y nocturno","Dolor que persiste minutos u horas tras el estímulo","Dolor breve que cesa al retirar el estímulo","Dolor agravado por el calor"]', '{0,1,3}', 'En la pulpitis irreversible el dolor es espontáneo, nocturno, persiste tras retirar el estímulo y suele agravarse con el calor. El dolor breve que cede al instante es de pulpitis reversible.', 15, 2, '{diagnostico,pulpitis}');
insert into public.questions (specialty_slug, level, question_type, question, pairs, explanation, points, difficulty, tags)
  values ('endodoncia', 1, 'match', 'Relaciona cada irrigante con su función principal.', '[{"left":"Hipoclorito de sodio","right":"Disuelve tejido orgánico"},{"left":"EDTA 17%","right":"Quela calcio y elimina el barro dentinario"},{"left":"Clorhexidina 2%","right":"Antiséptico de amplio espectro"},{"left":"Agua destilada","right":"Irrigante inerte de lavado"}]', 'El NaOCl disuelve tejido orgánico; el EDTA elimina la fase inorgánica del barro dentinario; la clorhexidina es antiséptica (no debe combinarse con NaOCl); el agua solo lava.', 15, 1, '{irrigacion,instrumentos}');
insert into public.questions (specialty_slug, level, question_type, question, order_items, explanation, points, difficulty, tags)
  values ('endodoncia', 2, 'order', 'Ordena la secuencia de una endodoncia convencional en una sola sesión.', '[{"text":"Aislamiento absoluto del diente","position":1},{"text":"Apertura cameral y localización de conductos","position":2},{"text":"Instrumentación con irrigación de hipoclorito","position":3},{"text":"Irrigación final con EDTA y secado","position":4},{"text":"Obturación con gutapercha y sellador","position":5}]', 'Secuencia estándar: aislamiento, acceso, instrumentación quimio-mecánica con NaOCl, irrigación final (EDTA + NaOCl) y secado, y obturación con gutapercha y sellador.', 20, 2, '{protocolo,tratamiento}');
insert into public.questions (specialty_slug, level, question_type, case_id, case_text, question, options, correct_index, explanation, points, difficulty, tags)
  values ('endodoncia', 3, 'case', 'endo-case-1', 'Paciente de 38 años acude por dolor intenso a la masticación en el diente 24, con sensación de diente alargado. Hay dolor agudo a la percusión y la prueba de frío es negativa. La radiografía muestra una imagen radiolúcida periapical.', '¿Cuál es el diagnóstico más probable?', '["Pulpitis reversible","Pulpitis irreversible","Periodontitis apical asintomática","Periodontitis apical sintomática (aguda)"]', 3, 'La percusión dolorosa, la ausencia de vitalidad y la imagen periapical indican periodontitis apical sintomática (aguda).', 10, 3, '{diagnostico,periodontitis-apical}');
insert into public.questions (specialty_slug, level, question_type, case_id, case_text, question, options, correct_index, explanation, points, difficulty, tags)
  values ('endodoncia', 3, 'case', 'endo-case-1', 'Paciente de 38 años acude por dolor intenso a la masticación en el diente 24, con sensación de diente alargado. Hay dolor agudo a la percusión y la prueba de frío es negativa. La radiografía muestra una imagen radiolúcida periapical.', '¿Cuál es el manejo inicial de elección?', '["Antibioticoterapia exclusiva por 7 días","Acceso endodóntico, drenaje e instrumentación en la misma sesión","Exodoncia del diente","Observación y control en 3 meses"]', 1, 'El manejo es endodóntico: acceso, drenaje e instrumentación. Los antibióticos solo se añaden si hay compromiso sistémico o celulitis.', 10, 3, '{tratamiento,drenaje}');

-- Periodoncia
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('periodoncia', 1, 'mcq', '¿Qué instrumento se utiliza para medir la profundidad de sondaje y el nivel de inserción clínica?', '["Sonda periodontal calibrada","Cureta de Gracey","Explorador dental","Espátula de cemento"]', 0, 'La sonda periodontal calibrada (p. ej., Williams, UNC-15) mide la profundidad del surco/bolsa y el nivel de inserción. Las curetas desbridan y el explorador detecta caries.', 10, 1, '{diagnostico,sondaje}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('periodoncia', 1, 'true_false', 'A diferencia de la periodontitis, la gingivitis no produce pérdida de inserción clínica ni de hueso alveolar.', '["Verdadero","Falso"]', 0, 'La gingivitis es una inflamación reversible limitada a la encía, sin pérdida de inserción ni ósea. Cuando hay pérdida de inserción y ósea, es periodontitis.', 10, 1, '{gingivitis,periodontitis}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('periodoncia', 2, 'fill_blank', 'El raspado y alisado radicular busca crear una superficie radicular ____ que permita la reinserción del tejido periodontal.', '["biocompatible","rugosa","calcificada","porosa"]', 0, 'El RAR elimina placa, cálculo y cemento contaminado para obtener una superficie lisa y biocompatible sobre la que puede formarse nueva inserción.', 10, 2, '{rar,instrumentacion}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_indexes, explanation, points, difficulty, tags)
  values ('periodoncia', 2, 'multi_select', 'Selecciona los factores de riesgo modificables de la periodontitis.', '["Tabaquismo","Diabetes descompensada","Edad avanzada","Higiene oral deficiente"]', '{0,1,3}', 'El tabaco, la diabetes no controlada y la higiene deficiente son modificables. La edad influye pero no es un factor controlable.', 15, 2, '{factores-riesgo}');
insert into public.questions (specialty_slug, level, question_type, question, pairs, explanation, points, difficulty, tags)
  values ('periodoncia', 2, 'match', 'Relaciona cada Clase de Hamp con su hallazgo en el sondaje de furca.', '[{"left":"Clase I","right":"Sondaje horizontal <3 mm"},{"left":"Clase II","right":"Sondaje horizontal >3 mm sin atravesar"},{"left":"Clase III","right":"La sonda atraviesa la furca por completo"}]', 'Hamp clasifica la afección de furca por el sondaje horizontal con la sonda de Nabers: Clase I (<3 mm), Clase II (>3 mm sin atravesar) y Clase III (through-and-through).', 15, 2, '{furca,sondaje}');
insert into public.questions (specialty_slug, level, question_type, question, order_items, explanation, points, difficulty, tags)
  values ('periodoncia', 1, 'order', 'Ordena el tratamiento inicial de la gingivitis inducida por placa.', '[{"text":"Instrucción de higiene oral (técnica de Bass e hilo dental)","position":1},{"text":"Tartrectomía supragingival","position":2},{"text":"Pulido coronal","position":3},{"text":"Reevaluación del índice de placa","position":4}]', 'El manejo básico: educación e higiene, eliminación profesional de placa y cálculo, pulido y reevaluación para confirmar el control de placa.', 20, 1, '{tratamiento,gingivitis}');
insert into public.questions (specialty_slug, level, question_type, case_id, case_text, question, options, correct_index, explanation, points, difficulty, tags)
  values ('periodoncia', 3, 'case', 'perio-case-1', 'Paciente de 48 años, fumador de 20 cigarrillos/día, presenta bolsas de 6–8 mm generalizadas, pérdida ósea mayor a 2/3 de la longitud radicular y afección de furca Clase III en varios molares. Ha perdido dientes por periodontitis.', 'Según la clasificación 2017, ¿cuál es el estadio y grado de la periodontitis?', '["Estadio II, Grado A","Estadio III, Grado B","Estadio IV, Grado C","Estadio I, Grado A"]', 2, 'La pérdida severa con furcas y pérdida dentaria corresponde a Estadio IV; el tabaquismo intenso y la progresión rápida sugieren Grado C.', 10, 3, '{clasificacion,estadio}');
insert into public.questions (specialty_slug, level, question_type, case_id, case_text, question, options, correct_index, explanation, points, difficulty, tags)
  values ('periodoncia', 3, 'case', 'perio-case-1', 'Paciente de 48 años, fumador de 20 cigarrillos/día, presenta bolsas de 6–8 mm generalizadas, pérdida ósea mayor a 2/3 de la longitud radicular y afección de furca Clase III en varios molares. Ha perdido dientes por periodontitis.', '¿Cuál es el objetivo del tratamiento periodontal no quirúrgico inicial?', '["Lograr BOP <25% y bolsas ≤4 mm","Eliminar todas las bolsas en una sola sesión","Colocar implantes inmediatamente","Aplicar antibióticos tópicos únicamente"]', 0, 'El objetivo del TPNQ es estabilizar: reducir la inflamación (BOP <25%) y las bolsas a ≤4 mm, y reevaluar antes de decidir cirugía.', 10, 3, '{tratamiento,objetivo}');

-- Ortodoncia
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('ortodoncia', 1, 'mcq', '¿Qué relación oclusal representa la Clase II de Angle?', '["El molar inferior ocluye en relación mesial (adelantado)","El molar inferior ocluye en posición distal (atrasado)","Relación molar normal con apiñamiento","Ausencia total de contacto molar"]', 1, 'En la Clase II el surco mesiovestibular del primer molar superior ocluye por delante de la cúspide mesiovestibular del inferior (el inferior queda distal).', 10, 1, '{angle,maloclusion}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('ortodoncia', 1, 'true_false', 'La mordida cruzada posterior unilateral con desviación mandibular debe corregirse idealmente en dentición decidua o mixta temprana.', '["Verdadero","Falso"]', 0, 'Si no se corrige a los 4–8 años, la desviación funcional puede fijarse como asimetría esquelética. Por eso se trata tempranamente.', 10, 1, '{mordida-cruzada,diagnostico}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('ortodoncia', 2, 'fill_blank', 'Los microtornillos (TADs) proporcionan un anclaje ____ absoluto sin depender de la cooperación del paciente.', '["esquelético","dentario","cervical","elástico"]', 0, 'Los TADs ofrecen anclaje esquelético (óseo) absoluto, sin movimiento recíproco y sin cooperación, a diferencia del arco extraoral.', 10, 2, '{anclaje,tads}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_indexes, explanation, points, difficulty, tags)
  values ('ortodoncia', 2, 'multi_select', 'Selecciona los factores que contribuyen a la recidiva tras el tratamiento de ortodoncia.', '["Memoria del ligamento periodontal","Presión de labios y lengua","Crecimiento mandibular tardío","Uso del retenedor"]', '{0,1,2}', 'La recidiva es favorecida por la memoria tisular del ligamento, las presiones musculares y el crecimiento residual. El retenedor previene la recidiva.', 15, 2, '{retencion,recidiva}');
insert into public.questions (specialty_slug, level, question_type, question, pairs, explanation, points, difficulty, tags)
  values ('ortodoncia', 2, 'match', 'Relaciona el valor del ángulo ANB con la relación esquelética.', '[{"left":"ANB = 2°","right":"Clase I esquelética (normal)"},{"left":"ANB > 4°","right":"Clase II esquelética"},{"left":"ANB < 0°","right":"Clase III esquelética"}]', 'El ANB es la diferencia entre SNA y SNB (normal 2°±2°). Valores altos indican clase II; valores negativos, clase III.', 15, 2, '{cefalometria,anb}');
insert into public.questions (specialty_slug, level, question_type, question, order_items, explanation, points, difficulty, tags)
  values ('ortodoncia', 3, 'order', 'Ordena la secuencia del tratamiento de un paciente con discrepancia esquelética severa que requiere cirugía ortognática.', '[{"text":"Diagnóstico cefalométrico y planificación virtual (VSP)","position":1},{"text":"Ortodoncia prequirúrgica","position":2},{"text":"Cirugía ortognática","position":3},{"text":"Ortodoncia postquirúrgica","position":4},{"text":"Retención","position":5}]', 'Protocolo: diagnóstico y planificación, descompensación con ortodoncia prequirúrgica, cirugía, afinamiento postquirúrgico y retención.', 20, 3, '{cirugia-ortognatica,protocolo}');
insert into public.questions (specialty_slug, level, question_type, case_id, case_text, question, options, correct_index, explanation, points, difficulty, tags)
  values ('ortodoncia', 3, 'case', 'orto-case-1', 'Paciente de 14 años con perfil cóncavo, ANB de −3° y prognatismo mandibular moderado con deficiencia maxilar. El análisis de maduración ósea indica escaso crecimiento residual.', '¿Cuál es la opción de tratamiento más adecuada?', '["Máscara facial de protracción maxilar","Diferir a cirugía ortognática a los 18–20 años con ortodoncia prequirúrgica","Extracción de premolares inferiores","Aparatología fija únicamente con elásticos clase III"]', 1, 'Sin crecimiento residual, la clase III esquelética severa se resuelve con cirugía ortognática precedida de ortodoncia prequirúrgica.', 10, 3, '{clase-iii,tratamiento}');
insert into public.questions (specialty_slug, level, question_type, case_id, case_text, question, options, correct_index, explanation, points, difficulty, tags)
  values ('ortodoncia', 3, 'case', 'orto-case-1', 'Paciente de 14 años con perfil cóncavo, ANB de −3° y prognatismo mandibular moderado con deficiencia maxilar. El análisis de maduración ósea indica escaso crecimiento residual.', '¿Qué análisis es indispensable para la planificación de la cirugía ortognática?', '["Cefalometría y planificación virtual","Índice de O Leary","Test de vitalidad pulpar","Radiografía bitewing"]', 0, 'La cefalometría y la planificación virtual son indispensables para diagnosticar y planificar la cirugía ortognática.', 10, 3, '{diagnostico,planificacion}');

-- Dental Anatomy
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('anatomia-dental', 1, 'mcq', '¿Cuál es el diente más frecuentemente impactado de la dentición humana?', '["Canino superior","Tercer molar inferior","Incisivo lateral","Segundo premolar"]', 1, 'El tercer molar (muela del juicio) es el diente más impactado; el canino superior ocupa el segundo lugar.', 10, 1, '{impactacion,molares}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('anatomia-dental', 1, 'true_false', 'La dentición temporal incluye premolares.', '["Verdadero","Falso"]', 1, 'La dentición temporal tiene 20 dientes (incisivos, caninos y molares deciduos) y no posee premolares.', 10, 1, '{denticion-temporal,generalidades}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_index, explanation, points, difficulty, tags)
  values ('anatomia-dental', 2, 'fill_blank', 'Los ____ son los dientes con la raíz más larga de la dentición.', '["caninos","molares","premolares","incisivos"]', 0, 'El canino superior posee la raíz más larga de toda la dentición (hasta 27 mm), relevante para su longevidad.', 10, 2, '{caninos,morfologia}');
insert into public.questions (specialty_slug, level, question_type, question, options, correct_indexes, explanation, points, difficulty, tags)
  values ('anatomia-dental', 2, 'multi_select', 'Selecciona los tejidos mineralizados del diente.', '["Esmalte","Dentina","Pulpa","Cemento"]', '{0,1,3}', 'Esmalte, dentina y cemento son tejidos mineralizados. La pulpa es tejido conectivo blando, vascularizado e inervado.', 15, 2, '{histologia,tejidos}');
insert into public.questions (specialty_slug, level, question_type, question, pairs, explanation, points, difficulty, tags)
  values ('anatomia-dental', 1, 'match', 'Relaciona cada tipo de dentina con su descripción.', '[{"left":"Dentina primaria","right":"Se forma durante el desarrollo del diente"},{"left":"Dentina secundaria","right":"Se deposita lentamente durante la vida"},{"left":"Dentina terciaria","right":"Respuesta reparadora a estímulos nocivos"}]', 'La dentina primaria se forma durante la odontogénesis; la secundaria, de forma lenta y fisiológica; la terciaria responde a caries, abrasión o preparación.', 15, 1, '{dentina,histologia}');
insert into public.questions (specialty_slug, level, question_type, question, order_items, explanation, points, difficulty, tags)
  values ('anatomia-dental', 3, 'order', 'Ordena las etapas del desarrollo dental (odontogénesis).', '[{"text":"Estadio de lámina dental","position":1},{"text":"Botón (yema)","position":2},{"text":"Caperuza (casquete)","position":3},{"text":"Campana (histodiferenciación)","position":4},{"text":"Formación de corona y raíz","position":5}]', 'La odontogénesis progresa de lámina, botón, caperuza y campana hasta la mineralización de la corona y la formación radicular, desde la 6.ª semana embrionaria.', 20, 3, '{odontogenesis,desarrollo}');
insert into public.questions (specialty_slug, level, question_type, case_id, case_text, question, options, correct_index, explanation, points, difficulty, tags)
  values ('anatomia-dental', 3, 'case', 'anat-case-1', 'Durante la endodoncia de un primer molar inferior, el operador no logra localizar un cuarto conducto y observa un istmo amplio en la raíz distal.', '¿Qué variación anatómica debe buscarse sistemáticamente en la raíz distal?', '["Conducto distolingual adicional","Raíz extra en la corona","Foramen apical en el centro","Cemento radicular excesivo"]', 0, 'El primer molar inferior presenta un conducto distolingual adicional en el 20–30% de los casos, causa frecuente de fracaso si no se trata.', 10, 3, '{morfologia,molar-inferior}');
insert into public.questions (specialty_slug, level, question_type, case_id, case_text, question, options, correct_index, explanation, points, difficulty, tags)
  values ('anatomia-dental', 3, 'case', 'anat-case-1', 'Durante la endodoncia de un primer molar inferior, el operador no logra localizar un cuarto conducto y observa un istmo amplio en la raíz distal.', '¿Qué ayuda a detectar este conducto adicional?', '["Magnificación (lupas/microscopio) y CBCT","Test de vitalidad pulpar","Sondaje periodontal","Fotografía intraoral"]', 0, 'La magnificación y la CBCT son las herramientas clave para localizar conductos adicionales e istmos y evitar fracasos endodónticos.', 10, 3, '{diagnostico,img-tridimensional}');
