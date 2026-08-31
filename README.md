# 🦷 Dentify — Asistente educativo de odontología con IA

**Dentify** es una aplicación educativa móvil desarrollada con **Expo SDK 54 (React Native)** que ayuda a estudiantes de odontología a practicar diagnóstico clínico, estudiar anatomía dental y recibir tutoría personalizada con IA. Es el proyecto de grado de la Maestría en Desarrollo de Software (UPT Aragua, Venezuela), con caso de estudio en la Facultad de Odontología de la UNERG.

Aplicación en español, con arquitectura **Edge-First**: visión (YOLO) y render 3D corren en el dispositivo; la nube (Supabase + Google AI Studio + OpenAI) se usa para inferencia de lenguaje, embeddings semánticos y persistencia.

## Módulos

| Módulo | Descripción |
| --- | --- |
| **Denty-AI** | Asistente multimodal (texto/voz) con respuestas fundamentadas en manuales clínicos venezolanos mediante RAG (pgvector). Navegación por comandos de voz. |
| **Simulador 3D** | Visualización interactiva de 16 modelos de piezas dentales (`.glb` optimizados: `KHR_mesh_quantization` + texturas JPEG) con rotación, zoom, selección de estructuras y vista de capas anatómicas. |
| **Diagnóstico por visión** | Segmentación local (YOLO26n-seg, TFLite) de condiciones dentales en fotos: Abrasión, Obturación, Corona y clases de Caries 1–6, con descripción educativa vía RAG. |
| **Ruta pedagógica** | Progresión por especialidades (Operatoria, Endodoncia, Periodoncia…) con quizzes, insignias (badges) y XP. Vista para docentes. |

## Stack

- **Frontend**: Expo SDK 54 · React Native 0.81 · TypeScript · NativeWind (Tailwind) · expo-router · three.js / React Three Fiber
- **Backend**: Supabase (Auth, PostgreSQL + pgvector, Storage, Edge Functions)
- **IA**: Google AI Studio — `gemini-3.5-flash-lite` (chat + visión + voz) con fallback a `gemini-3.1-flash-lite` y `gemma-4-31b-it` · OpenAI (`text-embedding-3-small`, embeddings RAG) · Grounding con Google Search (búsqueda web) · YOLO26n-seg en dispositivo
- **Tests**: Jest + React Native Testing Library

## Arquitectura (Edge-First)

```
Dispositivo (Edge)                      Nube
┌────────────────────────────┐         ┌──────────────────────────────┐
│ Expo App (React Native)    │  HTTPS   │ Supabase                     │
│  UI · 3D (three/R3F)       │◄───────►│  Auth (JWT) · PostgreSQL      │
│  YOLO-seg (TFLite WebView) │          │  + pgvector (HNSW) · Storage  │
│  SQLite (conversaciones)   │          │  Edge Functions:              │
└────────────┬───────────────┘          │   denty-agent · denty-transcribe
             │                          └──────────┬───────────────────┘
             │                                     │
             │                          ┌──────────▼──────────┐
             └─────────────────────────►│ Google AI Studio    │
                                        │  gemini-3.5-flash-lite (chat/visión/voz)
                                        │  OpenAI text-embedding-3-small (RAG)
                                        │  Grounding Google Search (web)
                                        └─────────────────────┘
```

Las claves de API viven **solo en Supabase Secrets** (Edge Functions `denty-agent` y `denty-transcribe`); el cliente nunca las ve.

## Empezar

### Requisitos
- Node.js ≥ 20, npm
- Supabase CLI (para migraciones/functions) y un proyecto de Supabase activo
- Clave de **Google AI Studio** (`GEMINI_API_KEY`, free tier) para chat, voz y búsqueda web; y de **OpenAI** (`OPENAI_API_KEY`) para embeddings RAG
- **Expo Go** (SDK 54) para probar en dispositivo, o `npx expo start --web`

### 1. Configuración

```bash
npm install
cp .env.example .env
# .env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
#       SUPABASE_SERVICE_ROLE_KEY (ingesta RAG), OPENAI_API_KEY (ingesta RAG)
```

### 2. Base de datos y Edge Functions

```bash
supabase link --project-ref <ref>   # ya vinculado en este repo
supabase db push                    # aplica migraciones: esquema + pgvector + storage + seed
                                    # (especialidades, niveles y banco de ~409 preguntas en BD,
                                    #  con 7 tipos: mcq, true_false, fill_blank, multi_select,
                                    #  match, order y case)
supabase secrets set GEMINI_API_KEY=<key>       # chat/visión/voz (Google AI Studio)
supabase secrets set OPENAI_API_KEY=<key>       # embeddings RAG (denty-agent)
supabase functions deploy denty-agent       # asistente agente (chat, visión, RAG, web)
supabase functions deploy denty-transcribe  # transcripción de voz (dictado)
```

> El banco de preguntas se genera desde `scripts/question-bank/*.json` (anexo de tesis):
> `npm run seed:questions` regenera la migración SQL a partir de esos JSON.

### 3. Cargar los manuales clínicos (RAG)

Los PDFs fuente van en `./docs/` (no se publican en git por derechos de autor). Para trocearlos, embederlos y cargarlos:

```bash
npm run ingest:rag      # trocea, embebe con text-embedding-3-small y carga a clinical_manuals
npm run ingest:rag:dry  # modo export (sin BD): escribe docs/rag-export.json
```

> Requiere `OPENAI_API_KEY` en `.env` (también `SUPABASE_SERVICE_ROLE_KEY` para escribir en la BD).
> Si OpenAI bloquea tu región, activa una VPN solo para ejecutar la ingesta; en runtime el
> embedding de consultas lo llama el Edge Function desde los servidores de Supabase.

### 4. Ejecutar

```bash
npx expo start            # Expo dev server (QR para Expo Go)
npx expo start --web      # versión web
npm test                  # suite de pruebas
```

## Scripts

| Script | Descripción |
| --- | --- |
| `npx expo start` | Levanta el dev server de Expo |
| `npx expo start --web` | Dev server web |
| `npm test` | Ejecuta Jest |
| `npm run ingest:rag` | Ingesta RAG (usa `.env`) |
| `npm run ingest:rag:dry` | Ingesta en modo export (sin BD) |
| `npm run lint` | ESLint |
| `npm run optimize:models` | Optimiza los modelos 3D (quantize + JPEG) |
| `npm run optimize:models:restore` | Restaura los `.glb` originales |
| `npm run seed:questions` | Regenera la migración SQL del banco desde `scripts/question-bank/*.json` |

## Estructura

```
app/            Rutas (tabs, auth, quiz, teacher) — expo-router
components/     UI (AppHeader, ChatInput, ModelViewer, DetectionOverlay, quiz/*, …)
src/
  services/     agent, voice, quiz, attachments, notifications, yolo, conversations, …
  hooks/        useAuth, useProgress, useBadges, useSettings
  lib/          cliente Supabase
  data/         structures (estructuras anatómicas del simulador 3D)
  types/        tipos de la BD (Database)
assets/
  models/       16 modelos GLB optimizados (KHR_mesh_quantization + JPEG)
  ml/           modelo YOLO26n-seg (TFLite) + runtime de inferencia
supabase/
  migrations/   esquema + pgvector + storage + banco de preguntas
  functions/    denty-agent y denty-transcribe (Edge Functions)
scripts/
  ingest-rag.mjs, optimize-models.mjs, build-question-seed.mjs
  question-bank/   banco de preguntas en JSON (anexo de tesis)
docs/           manuales clínicos (locales, fuera de git)
```

## RAG y embeddings

- Corpus: manuales clínicos troceados a ~500 palabras con solape de 50 (Appendix A del PRD).
- Búsqueda semántica: `match_manuals` (pgvector HNSW, coseno) con `text-embedding-3-small` (1536 dim).
- Fallback léxico: `match_manuals_by_text` (`pg_trgm`) que matchea cualquier término.
- La consulta se embebe en el Edge Function (clave de Google server-side); si no está disponible, el RAG degrada a búsqueda léxica — nunca mezcla espacios vectoriales.

## Denty-AI (asistente agente)

- Edge Function **`denty-agent`** sobre `gemini-3.5-flash-lite` (multimodal: texto + imágenes + voz).
- **Cadena de fallback**: si el modelo principal está saturado (429/límites), la petición pasa a `gemini-3.1-flash-lite` y finalmente a `gemma-4-31b-it` (modo degradado, sin herramientas).
- **Loop de agente** con herramientas: `retrieve_manuals` (RAG server-side), `web_search` (Grounding con Google Search, 5.000 búsquedas/mes gratis), `get_my_profile` y `get_my_progress` (solo los datos del propio usuario, vía RLS).
- **Adjuntos tipo ChatGPT**: imágenes (visión del modelo) y archivos PDF, DOCX, txt, md, csv, json, rtf y html (el servidor extrae el texto).
- **Respuestas con Markdown** (encabezados, listas, negritas, código, citas) renderizadas limpias en la burbuja.
- **Sesiones administrables**: nueva conversación, historial, y borrado individual — estilo ChatGPT.
- System prompt acotado al dominio odontológico, con disclaimer clínico y cita de fuentes.
- El JWT de sesión se verifica en el servidor; nunca se exponen credenciales ni datos de otros usuarios.

## Ruta académica

- Banco de ~409 preguntas con **7 tipos** (mcq, verdadero/falso, completar, selección múltiple, emparejar, ordenar y casos clínicos) en 5 especialidades × 3 niveles temáticos.
- Sesiones **sorteadas del pool** (rejugables), gamificación sin vidas: **XP por pregunta con combo** (racha de aciertos), racha diaria, insignias y **"Repasar errores"** (registro en `answer_history`).
- El banco se genera por IA desde `scripts/question-bank/*.json`; se recomienda una revisión clínica por el tutor antes de uso docente formal.

## Documentación

- [`PRD.md`](PRD.md) — Product Requirements Document (IEEE 830) con trazabilidad de requisitos.
- [`DESIGN.md`](DESIGN.md) — Design system *Clinical Clarity*.

## Limitaciones conocidas

- La selección de estructuras en el simulador 3D usa el raycast de R3F (mapping aproximado del toque en dispositivo).
- El free tier de Google AI Studio limita el chatbot a ~15 RPM / 500 RPD por clave; el agente y la cadena de fallback están diseñados para convivir con ese techo.
- El diagnóstico por visión es educativo y **no sustituye** evaluación clínica profesional.

---

Proyecto de grado — Maestría en Desarrollo de Software, UPT Aragua. Caso de estudio: Facultad de Odontología, UNERG.
