# 🦷 Dentify — Asistente educativo de odontología con IA

**Dentify** es una aplicación educativa móvil desarrollada con **Expo SDK 54 (React Native)** que ayuda a estudiantes de odontología a practicar diagnóstico clínico, estudiar anatomía dental y recibir tutoría personalizada con IA. Es el proyecto de grado de la Maestría en Desarrollo de Software (UPT Aragua, Venezuela), con caso de estudio en la Facultad de Odontología de la UNERG.

Aplicación en español, con arquitectura **Edge-First**: visión (YOLO) y render 3D corren en el dispositivo; la nube (Supabase + Groq + OpenAI) se usa para inferencia de lenguaje, embeddings semánticos y persistencia.

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
- **IA**: Groq (`qwen/qwen3.8-27b` para chat y visión, `whisper-large-v3` para voz) · OpenAI (`text-embedding-3-small`) · YOLO26n-seg en dispositivo
- **Tests**: Jest + React Native Testing Library

## Arquitectura (Edge-First)

```
Dispositivo (Edge)                      Nube
┌────────────────────────────┐         ┌──────────────────────────────┐
│ Expo App (React Native)    │  HTTPS   │ Supabase                     │
│  UI · 3D (three/R3F)       │◄───────►│  Auth (JWT) · PostgreSQL      │
│  YOLO-seg (TFLite WebView) │          │  + pgvector (HNSW) · Storage  │
│  SQLite (conversaciones)   │          │  Edge Function: groq-proxy    │
└────────────┬───────────────┘          └──────────┬───────────────────┘
             │                                     │
             │                          ┌──────────▼──────────┐
             │                          │ Groq  qwen3.8-27b ·  │
             │                          │       whisper-large-v3│
             │                          └──────────┬──────────┘
             │                          ┌──────────▼──────────┐
             └─────────────────────────►│ OpenAI embeddings   │
                                        │  text-embedding-3-small│
                                        └─────────────────────┘
```

Las claves de API viven **solo en Supabase Secrets** (Edge Function `groq-proxy`); el cliente nunca las ve.

## Empezar

### Requisitos
- Node.js ≥ 20, npm
- Supabase CLI (para migraciones/functions) y un proyecto de Supabase activo
- Clave de **Groq** (chat/voz) y de **OpenAI** (embeddings)
- **Expo Go** (SDK 54) para probar en dispositivo, o `npx expo start --web`

### 1. Configuración

```bash
npm install
cp .env.example .env
# .env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY,
#       SUPABASE_SERVICE_ROLE_KEY (ingesta), OPENAI_API_KEY (ingesta)
```

### 2. Base de datos y Edge Function

```bash
supabase link --project-ref <ref>   # ya vinculado en este repo
supabase db push                    # aplica migraciones: esquema + pgvector + storage + seed
                                    # (especialidades, niveles y banco de ~409 preguntas en BD,
                                    #  con 7 tipos: mcq, true_false, fill_blank, multi_select,
                                    #  match, order y case)
supabase secrets set GROQ_API_KEY=<key>
supabase secrets set OPENAI_API_KEY=<key>
supabase secrets set TAVILY_API_KEY=<key>   # opcional: búsqueda web del chatbot (sin ella usa DuckDuckGo)
supabase functions deploy groq-proxy
supabase functions deploy denty-agent
```

> El banco de preguntas se genera desde `scripts/question-bank/*.json` (anexo de tesis):
> `npm run seed:questions` regenera la migración SQL a partir de esos JSON.

### 3. Cargar los manuales clínicos (RAG)

Los PDFs fuente van en `./docs/` (no se publican en git por derechos de autor). Para trocearlos, embederlos y cargarlos:

```bash
npm run ingest:rag -- --embedder openai      # carga a clinical_manuals
npm run ingest:rag -- --embedder openai --dry-run   # exporta a docs/rag-export.json
```

> **Nota (Venezuela):** la API de OpenAI bloquea la región; usa una VPN de EE. UU. solo para ejecutar la ingesta desde tu máquina. En la app, el embedding de consultas lo llama el Edge Function desde los servidores de Supabase, por lo que **no** necesitas VPN en el dispositivo.

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
  services/     agent, rag, groq, quiz, attachments, notifications, yolo, conversations, …
  hooks/        useAuth, useProgress, useBadges, useSettings
  lib/          cliente Supabase
  data/         structures (estructuras anatómicas del simulador 3D)
  types/        tipos de la BD (Database)
assets/
  models/       16 modelos GLB optimizados (KHR_mesh_quantization + JPEG)
  ml/           modelo YOLO26n-seg (TFLite) + runtime de inferencia
supabase/
  migrations/   esquema + pgvector + storage + banco de preguntas
  functions/    groq-proxy y denty-agent (Edge Functions)
scripts/
  ingest-rag.mjs, optimize-models.mjs, build-question-seed.mjs
  question-bank/   banco de preguntas en JSON (anexo de tesis)
docs/           manuales clínicos (locales, fuera de git)
```

## RAG y embeddings

- Corpus: manuales clínicos troceados a ~500 palabras con solape de 50 (Appendix A del PRD).
- Búsqueda semántica: `match_manuals` (pgvector HNSW, coseno) con `text-embedding-3-small` (1536 dim).
- Fallback léxico: `match_manuals_by_text` (`pg_trgm`) que matchea cualquier término.
- La consulta se embebe vía el Edge Function (clave de OpenAI server-side); si no está disponible, el RAG degrada a búsqueda léxica — nunca mezcla espacios vectoriales.

## Denty-AI (asistente agente)

- Edge Function **`denty-agent`** sobre `qwen/qwen3.8-27b` (multimodal: texto + imágenes).
- **Loop de agente** con herramientas: `retrieve_manuals` (RAG server-side), `web_search` (Tavily si `TAVILY_API_KEY`, si no DuckDuckGo), `get_my_profile` y `get_my_progress` (solo los datos del propio usuario, vía RLS).
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
- Los embeddings de OpenAI requieren VPN solo para re-ingesta desde Venezuela; la app en runtime no.
- El diagnóstico por visión es educativo y **no sustituye** evaluación clínica profesional.

---

Proyecto de grado — Maestría en Desarrollo de Software, UPT Aragua. Caso de estudio: Facultad de Odontología, UNERG.
