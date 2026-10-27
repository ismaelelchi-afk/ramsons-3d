
RAMSTORE3D

Tienda virtual interactiva en 3D para RAMSONS.

RAMSTORE3D es un proyecto web desarrollado con Three.js, TypeScript y Vite que busca ofrecer una experiencia de exploración de una tienda comercial en tres dimensiones.

Características

- Entorno comercial 3D con arquitectura y departamentos.
- Secciones de televisores, teléfonos, muebles y electrodomésticos.
- Cámara y controles para explorar la tienda.
- Modelos 3D y materiales para los productos.
- Ficha interactiva con información de televisores.
- Adaptación del renderizado para dispositivos con diferentes capacidades.

Tecnologías

- "Three.js" (https://threejs.org/)
- "TypeScript" (https://www.typescriptlang.org/)
- "Vite" (https://vite.dev/)
- npm

Requisitos

- Node.js compatible con la versión de Vite del proyecto.
- npm.
- Un navegador con soporte para WebGL.

Instalación

Clona el repositorio e instala las dependencias:

git clone https://github.com/ismaelelchi-afk/ramsons-3d.git
cd ramsons-3d
npm install

Desarrollo

Inicia el servidor local:

npm run dev

Para acceder desde otro dispositivo de la misma red, puedes iniciar Vite con:

npm run dev -- --host 0.0.0.0

Vite mostrará la dirección local disponible.

Compilación

Genera la versión de producción:

npm run build

Para previsualizar la compilación:

npm run preview

Pruebas

El proyecto incluye una prueba para la selección de televisores:

npm run test:tv

Estructura del proyecto

src/
├── core/          # Cámara, controles y renderizador
├── data/          # Especificaciones de televisores
├── scene/store/   # Escena, arquitectura y departamentos
├── ui/            # Interfaz y ficha de televisores
└── assets/models/ # Modelos 3D
scripts/           # Pruebas
index.html         # Documento principal
vite.config.ts     # Configuración de Vite

Estado del proyecto

RAMSTORE3D continúa en desarrollo. La estructura y las funciones pueden evolucionar a medida que avance la tienda virtual.

Autoría

Proyecto de RAMSONS desarrollado por CIOB-Mojito.
